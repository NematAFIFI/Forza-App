/*
# Fix SECURITY DEFINER audit findings (10 functions)

## Strategy
All 10 functions were flagged because `authenticated` can execute
SECURITY DEFINER functions via REST. Two approaches:

1. **Trigger-only / edge-function-only functions** (assign_user_role,
   get_role_defaults): revoke EXECUTE from authenticated. Triggers run
   with the owner's privileges regardless; edge functions use the service
   role which bypasses all privilege checks.

2. **App-RPC functions** (8 functions): switch from SECURITY DEFINER to
   SECURITY INVOKER. All tables they touch have `auth.uid() = user_id`
   RLS policies, so the caller's own RLS enforces isolation. The functions
   already use `auth.uid()` internally, so behavior is unchanged.

3. **ensure_buyer_linked**: rewrite to read the caller's email from
   `auth.jwt()` instead of `auth.users`, then switch to SECURITY INVOKER.
   Add two RLS policies on system_clients so a buyer can SELECT/UPDATE
   an unlinked row matching their own JWT email (verified by Supabase auth).

## Functions changed to SECURITY INVOKER
- auto_archive_old_records()
- close_fiscal_period(uuid, text)
- generate_fiscal_year(integer)
- next_financial_doc_number(text)
- post_financial_document(uuid)
- post_journal_entry(uuid)
- seed_default_chart_template()
- ensure_buyer_linked()

## Functions with EXECUTE revoked from authenticated
- assign_user_role()  — trigger only
- get_role_defaults(integer)  — edge-function only (service role)

## New RLS policies on system_clients
- select_unlinked_by_email: buyer can see unlinked rows matching their JWT email
- update_unlinked_by_email: buyer can link a row matching their JWT email
*/

-- ============================================================
-- 1. assign_user_role — trigger only, revoke authenticated
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.assign_user_role() FROM authenticated;

-- ============================================================
-- 2. get_role_defaults — edge-function only, revoke authenticated
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.get_role_defaults(integer) FROM authenticated;

-- ============================================================
-- 3. auto_archive_old_records — switch to INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_archive_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Archive bookings whose checkout passed more than 90 days ago
  UPDATE bookings
  SET archived = true, archived_at = now()
  WHERE archived = false
    AND check_out < now() - interval '90 days';

  -- Archive invoices older than 180 days
  UPDATE invoices
  SET archived = true, archived_at = now()
  WHERE archived = false
    AND created_at < now() - interval '180 days';

  -- Archive customers with no active bookings and older than 365 days
  UPDATE customers
  SET archived = true, archived_at = now()
  WHERE archived = false
    AND created_at < now() - interval '365 days'
    AND NOT EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.customer_id = customers.id
        AND bookings.archived = false
    );
END;
$$;

-- ============================================================
-- 4. close_fiscal_period — switch to INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.close_fiscal_period(p_period_id uuid, p_close_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_end_date date;
BEGIN
  SELECT user_id, end_date INTO v_user_id, v_end_date FROM fiscal_periods WHERE id = p_period_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Period not found'; END IF;
  IF auth.uid() <> v_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF p_close_type = 'daily' THEN
    UPDATE fiscal_periods SET status = 'closed_daily', lock_date = CURRENT_DATE, closed_by = auth.uid(), closed_at = now() WHERE id = p_period_id;
  ELSIF p_close_type = 'monthly' THEN
    UPDATE fiscal_periods SET status = 'closed_monthly', lock_date = v_end_date, closed_by = auth.uid(), closed_at = now() WHERE id = p_period_id;
  ELSIF p_close_type = 'lock' THEN
    UPDATE fiscal_periods SET status = 'locked', lock_date = v_end_date, closed_by = auth.uid(), closed_at = now() WHERE id = p_period_id;
  ELSIF p_close_type = 'reopen' THEN
    UPDATE fiscal_periods SET status = 'open', lock_date = NULL, closed_by = NULL, closed_at = NULL WHERE id = p_period_id;
  END IF;
END;
$$;

-- ============================================================
-- 5. ensure_buyer_linked — rewrite + switch to INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_buyer_linked()
RETURNS TABLE(id uuid, name text, password_set boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller_uid uuid := auth.uid();
  caller_email text;
  linked_id uuid;
BEGIN
  IF caller_uid IS NULL THEN
    RETURN;
  END IF;

  -- Read email from the verified JWT instead of querying auth.users
  caller_email := auth.jwt() ->> 'email';

  IF caller_email IS NULL THEN
    RETURN;
  END IF;

  -- Find an unlinked system_clients row matching this email
  SELECT id INTO linked_id
  FROM system_clients
  WHERE email = caller_email
    AND buyer_user_id IS NULL
  LIMIT 1;

  IF linked_id IS NULL THEN
    RETURN;
  END IF;

  -- Link it
  UPDATE system_clients
  SET buyer_user_id = caller_uid
  WHERE id = linked_id;

  -- Return the linked record (now visible via select_buyer_own_client)
  RETURN QUERY
  SELECT system_clients.id, system_clients.name, system_clients.password_set
  FROM system_clients
  WHERE system_clients.id = linked_id;
END;
$$;

-- RLS policies so a buyer can find and link their unlinked system_clients row
DROP POLICY IF EXISTS "select_unlinked_by_email" ON system_clients;
CREATE POLICY "select_unlinked_by_email" ON system_clients
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email') AND buyer_user_id IS NULL);

DROP POLICY IF EXISTS "update_unlinked_by_email" ON system_clients;
CREATE POLICY "update_unlinked_by_email" ON system_clients
  FOR UPDATE TO authenticated
  USING (email = (auth.jwt() ->> 'email') AND buyer_user_id IS NULL)
  WITH CHECK (buyer_user_id = auth.uid());

-- ============================================================
-- 6. generate_fiscal_year — switch to INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_fiscal_year(p_year integer)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_month integer;
  v_start date;
  v_end date;
  v_code text;
  v_name text;
  ar_names text[] := ARRAY['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  FOR v_month IN 1..12 LOOP
    v_start := make_date(p_year, v_month, 1);
    v_end := (make_date(p_year, v_month + 1, 1) - 1)::date;
    v_code := p_year::text || '-' || lpad(v_month::text, 2, '0');
    v_name := ar_names[v_month] || ' ' || p_year::text;
    INSERT INTO fiscal_periods (user_id, period_code, period_name, fiscal_year, period_number, start_date, end_date, status)
    VALUES (v_uid, v_code, v_name, p_year, v_month, v_start, v_end, 'open')
    ON CONFLICT (user_id, period_code) DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================================
-- 7. next_financial_doc_number — switch to INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.next_financial_doc_number(p_doc_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_next integer;
  v_prefix text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO financial_doc_sequences (user_id, doc_type, last_number)
  VALUES (v_uid, p_doc_type, 1)
  ON CONFLICT (user_id, doc_type)
  DO UPDATE SET last_number = financial_doc_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  v_prefix := CASE p_doc_type
    WHEN 'receipt' THEN 'RCV'
    WHEN 'payment' THEN 'PAY'
    WHEN 'transfer' THEN 'TRF'
    WHEN 'reverse' THEN 'REV'
    ELSE 'DOC'
  END;

  RETURN v_prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_next::text, 5, '0');
END;
$$;

-- ============================================================
-- 8. post_financial_document — switch to INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_financial_document(p_doc_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_doc record;
  v_entry_id uuid;
  v_entry_number text;
  v_period_code text;
  v_debit_account uuid;
  v_credit_account uuid;
  v_desc text;
BEGIN
  SELECT * INTO v_doc FROM financial_documents WHERE id = p_doc_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Document not found'; END IF;
  IF v_doc.status = 'posted' THEN RAISE EXCEPTION 'Document already posted'; END IF;

  v_period_code := to_char(v_doc.doc_date, 'YYYY-MM');

  -- Determine debit/credit accounts based on doc_type
  IF v_doc.doc_type = 'receipt' THEN
    v_debit_account := v_doc.cash_bank_account_id;
    v_credit_account := v_doc.counterparty_account_id;
    v_desc := 'سند قبض - ' || COALESCE(v_doc.payee_name, '');
  ELSIF v_doc.doc_type = 'payment' THEN
    v_debit_account := v_doc.counterparty_account_id;
    v_credit_account := v_doc.cash_bank_account_id;
    v_desc := 'سند صرف - ' || COALESCE(v_doc.payee_name, '');
  ELSIF v_doc.doc_type = 'transfer' THEN
    v_debit_account := v_doc.to_account_id;
    v_credit_account := v_doc.from_account_id;
    v_desc := 'إشعار تحويل بنكي';
  ELSIF v_doc.doc_type = 'reverse' THEN
    v_debit_account := v_doc.counterparty_account_id;
    v_credit_account := v_doc.cash_bank_account_id;
    v_desc := 'إشعار عكسي - ' || COALESCE(v_doc.description, '');
  END IF;

  IF v_debit_account IS NULL OR v_credit_account IS NULL THEN
    RAISE EXCEPTION 'Missing account assignments';
  END IF;

  -- Create journal entry header
  v_entry_number := 'JE-FD-' || upper(substr(v_doc.doc_type, 1, 3)) || '-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(p_doc_id::text, 1, 8);

  INSERT INTO journal_entries (user_id, entry_number, entry_date, period_code, description, reference_type, reference_id, status)
  VALUES (v_doc.user_id, v_entry_number, v_doc.doc_date, v_period_code, v_desc || ' (' || v_doc.doc_number || ')', 'payment', p_doc_id, 'draft')
  RETURNING id INTO v_entry_id;

  -- Create journal lines: debit line + credit line
  INSERT INTO journal_lines (entry_id, user_id, account_id, cost_center_id, debit, credit, description, line_order)
  VALUES
    (v_entry_id, v_doc.user_id, v_debit_account, v_doc.cost_center_id, v_doc.amount, 0, v_desc, 0),
    (v_entry_id, v_doc.user_id, v_credit_account, v_doc.cost_center_id, 0, v_doc.amount, v_desc, 1);

  -- Post the journal entry
  PERFORM public.post_journal_entry(v_entry_id);

  -- Link document to journal entry and mark posted
  UPDATE financial_documents
  SET status = 'posted', journal_entry_id = v_entry_id, posted_at = now()
  WHERE id = p_doc_id;

  RETURN v_entry_id;
END;
$$;

-- ============================================================
-- 9. post_journal_entry — switch to INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_journal_entry(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total_debit numeric(14,2);
  v_total_credit numeric(14,2);
  v_entry_date date;
  v_period_code text;
  v_user_id uuid;
  v_period_status text;
  v_lock_date date;
BEGIN
  SELECT entry_date, period_code, user_id INTO v_entry_date, v_period_code, v_user_id
  FROM journal_entries WHERE id = p_entry_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Entry not found'; END IF;

  SELECT status, lock_date INTO v_period_status, v_lock_date
  FROM fiscal_periods
  WHERE user_id = v_user_id AND period_code = v_period_code;

  IF FOUND THEN
    IF v_period_status IN ('closed_monthly', 'locked') THEN
      RAISE EXCEPTION 'Period % is closed. Cannot post entries.', v_period_code;
    END IF;
    IF v_period_status = 'closed_daily' AND v_lock_date IS NOT NULL AND v_entry_date <= v_lock_date THEN
      RAISE EXCEPTION 'Daily closing active until %. Cannot post entries before that date.', v_lock_date;
    END IF;
  END IF;

  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM journal_lines WHERE entry_id = p_entry_id;

  IF v_total_debit <> v_total_credit THEN
    RAISE EXCEPTION 'Entry is not balanced. Debits: %, Credits: %', v_total_debit, v_total_credit;
  END IF;
  IF v_total_debit = 0 THEN
    RAISE EXCEPTION 'Cannot post a zero-value entry';
  END IF;

  UPDATE journal_entries
  SET status = 'posted', total_debit = v_total_debit, total_credit = v_total_credit, posted_at = now()
  WHERE id = p_entry_id;
END;
$$;

-- ============================================================
-- 10. seed_default_chart_template — switch to INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_default_chart_template()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Cost centers (100 = profit, 200 = service, 300 = general)
  INSERT INTO cost_centers (user_id, code, name, name_en, category, sort_order, description)
  VALUES
    (v_uid, '101', 'قسم الغرف والإقامة', 'Rooms & Accommodation', 'profit', 1, 'الاستقبال، الحجز، خدمات الغرف، التدبير المنزلي'),
    (v_uid, '102', 'قسم الأغذية والمشروبات', 'Food & Beverage', 'profit', 2, 'المطبخ الرئيسي، المطعم، المقاهي، خدمة الغرف، قاعات الولائم'),
    (v_uid, '103', 'قسم المناسبات والمؤتمرات', 'Events & Conferences', 'profit', 3, 'قاعات اجتماعات، مساحات معارض، تنظيم فعاليات'),
    (v_uid, '104', 'قسم الخدمات الأخرى', 'Other Services', 'profit', 4, 'العافية والسبا، غسيل الملابس، النقل، محلات الإيجار'),
    (v_uid, '201', 'الصيانة والمرافق', 'Maintenance & Facilities', 'service', 5, 'المباني، الأجهزة، الكهرباء، المياه، التكييف، الوقود'),
    (v_uid, '202', 'المشتريات والمخازن', 'Purchasing & Stores', 'service', 6, 'طلبات الشراء، الاستلام، التخزين، الرقابة على المخزون'),
    (v_uid, '203', 'الأمن والسلامة', 'Security & Safety', 'service', 7, 'حراسة المداخل، أنظمة إطفاء الحريق، التأمين'),
    (v_uid, '204', 'التسويق والمبيعات', 'Marketing & Sales', 'service', 8, 'الحجوزات الخارجية، العقود مع الشركات، الدعاية، العلاقات العامة'),
    (v_uid, '301', 'الإدارة العليا', 'Executive Management', 'general', 9, 'رواتب المدير العام، المدراء التنفيذيين، استشارات ورسوم قانونية'),
    (v_uid, '302', 'الشؤون المالية والإدارية', 'Finance & Administration', 'general', 10, 'محاسبة، خزينة، رواتب، موارد بشرية، خدمات حاسوب'),
    (v_uid, '303', 'المرافق والمصروفات المشتركة', 'Shared Facilities & Expenses', 'general', 11, 'كهرباء ومياه ومناطق عامة، استهلاك الأصول، التأمين العام')
  ON CONFLICT (user_id, code) DO NOTHING;

  -- Chart of accounts — Assets (1)
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '1101', 'الصندوق الرئيسي', 'Main Cash', 'asset', '11', 1),
    (v_uid, '1102', 'خزينة استقبال النزلاء', 'Front Desk Cash', 'asset', '11', 2),
    (v_uid, '1110', 'البنوك - حسابات جارية', 'Banks - Current', 'asset', '11', 3),
    (v_uid, '1111', 'بنوك - ودائع', 'Banks - Deposits', 'asset', '11', 4),
    (v_uid, '1120', 'ذمم مدينة - نزلاء', 'Receivables - Guests', 'asset', '11', 5),
    (v_uid, '1121', 'ذمم مدينة - شركات ووكالات سفر', 'Receivables - Travel Agencies', 'asset', '11', 6),
    (v_uid, '1122', 'ذمم مدينة - بطاقات ائتمان', 'Receivables - Credit Cards', 'asset', '11', 7),
    (v_uid, '1130', 'مخزون مواد غذائية', 'Food Inventory', 'asset', '11', 8),
    (v_uid, '1131', 'مخزون مشروبات', 'Beverage Inventory', 'asset', '11', 9),
    (v_uid, '1132', 'مخزون مستلزمات غرف ونظافة', 'Room Supplies Inventory', 'asset', '11', 10),
    (v_uid, '1133', 'مخزون قطع غيار ومواد صيانة', 'Maintenance Parts Inventory', 'asset', '11', 11),
    (v_uid, '1140', 'عربون ودفعات مقدمة لموردين', 'Advances to Suppliers', 'asset', '11', 12),
    (v_uid, '1150', 'مصروفات مدفوعة مقدماً', 'Prepaid Expenses', 'asset', '11', 13),
    (v_uid, '1160', 'إيرادات مستحقة غير مقبوضة', 'Accrued Revenue', 'asset', '11', 14),
    (v_uid, '1201', 'الأراضي', 'Land', 'asset', '12', 15),
    (v_uid, '1202', 'المباني والمنشآت', 'Buildings', 'asset', '12', 16),
    (v_uid, '1203', 'آلات ومعدات مطابخ', 'Kitchen Equipment', 'asset', '12', 17),
    (v_uid, '1204', 'أثاث ومفروشات الغرف', 'Furniture & Fixtures', 'asset', '12', 18),
    (v_uid, '1205', 'أجهزة تكييف وإنارة', 'AC & Lighting', 'asset', '12', 19),
    (v_uid, '1206', 'سيارات نقل ضيوف وعمل', 'Vehicles', 'asset', '12', 20),
    (v_uid, '1207', 'أنظمة حاسوب وبرامج', 'Computer Systems', 'asset', '12', 21),
    (v_uid, '1208', 'أصول أخرى', 'Other Assets', 'asset', '12', 22),
    (v_uid, '1250', 'مجمع استهلاك - مباني', 'Acc. Dep. - Buildings', 'asset', '12', 23),
    (v_uid, '1251', 'مجمع استهلاك - أثاث ومعدات', 'Acc. Dep. - Furniture', 'asset', '12', 24),
    (v_uid, '1252', 'مجمع استهلاك - سيارات وأنظمة', 'Acc. Dep. - Vehicles', 'asset', '12', 25)
  ON CONFLICT (user_id, account_code) DO NOTHING;

  -- Liabilities (2)
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '2101', 'ذمم دائنة - موردين مواد', 'Payables - Suppliers', 'liability', '21', 26),
    (v_uid, '2102', 'ذمم دائنة - موردين خدمات ومقاولين', 'Payables - Contractors', 'liability', '21', 27),
    (v_uid, '2110', 'عربون نزلاء وحجوزات مقدمة', 'Guest Deposits', 'liability', '21', 28),
    (v_uid, '2120', 'رواتب وأجور مستحقة', 'Accrued Payroll', 'liability', '21', 29),
    (v_uid, '2121', 'استقطاعات الموظفين مستحقة', 'Employee Deductions', 'liability', '21', 30),
    (v_uid, '2130', 'ضريبة القيمة المضافة مستحقة (خارجية)', 'VAT Payable (External)', 'liability', '21', 31),
    (v_uid, '2131', 'ضريبة قيمة مضافة مستحقة (داخلية)', 'VAT Payable (Internal)', 'liability', '21', 32),
    (v_uid, '2132', 'ضرائب ورسوم بلدية وسياحة', 'Municipal & Tourism Tax', 'liability', '21', 33),
    (v_uid, '2140', 'إيجارات مستحقة ومصروفات واجبة السداد', 'Accrued Rent & Expenses', 'liability', '21', 34),
    (v_uid, '2150', 'تسهيلات بنكية قصيرة الأجل', 'Short-term Bank Loans', 'liability', '21', 35),
    (v_uid, '2201', 'قروض طويلة الأجل', 'Long-term Loans', 'liability', '22', 36),
    (v_uid, '2202', 'التزامات إيجار تمويلي', 'Finance Lease Liabilities', 'liability', '22', 37),
    (v_uid, '2210', 'مخصصات مكافآت نهاية الخدمة', 'End of Service Provisions', 'liability', '22', 38),
    (v_uid, '2211', 'مخصصات ضريبية ومخاطر متنوعة', 'Tax & Risk Provisions', 'liability', '22', 39)
  ON CONFLICT (user_id, account_code) DO NOTHING;

  -- Equity (3)
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '3101', 'رأس المال - نقدي وعيني', 'Capital', 'equity', '31', 40),
    (v_uid, '3201', 'احتياطي نظامي', 'Statutory Reserve', 'equity', '32', 41),
    (v_uid, '3202', 'احتياطيات أخرى', 'Other Reserves', 'equity', '32', 42),
    (v_uid, '3300', 'أرباح/خسائر مرحلة', 'Retained Earnings', 'equity', '33', 43),
    (v_uid, '3400', 'صافي ربح/خسارة الفترة الحالية', 'Current Period P&L', 'equity', '34', 44)
  ON CONFLICT (user_id, account_code) DO NOTHING;

  -- Revenue (4)
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '4101', 'إيرادات الغرف الفردية', 'Single Room Revenue', 'revenue', '41', 45),
    (v_uid, '4102', 'إيرادات الغرف المزدوجة والأجنحة', 'Double & Suite Revenue', 'revenue', '41', 46),
    (v_uid, '4103', 'إيرادات أسرّة إضافية وخدمات خاصة', 'Extra Bed Revenue', 'revenue', '41', 47),
    (v_uid, '4104', 'خصومات وعمولات حجز (مطروح)', 'Booking Discounts (Contra)', 'revenue', '41', 48),
    (v_uid, '4105', 'إلغاءات وتعديلات', 'Cancellations', 'revenue', '41', 49),
    (v_uid, '4201', 'مبيعات المطعم الرئيسي', 'Main Restaurant Sales', 'revenue', '42', 50),
    (v_uid, '4202', 'مبيعات المقاهي والبارات', 'Cafe & Bar Sales', 'revenue', '42', 51),
    (v_uid, '4203', 'مبيعات خدمة الغرف', 'Room Service Sales', 'revenue', '42', 52),
    (v_uid, '4204', 'مبيعات البوفيهات والمناسبات الداخلية', 'Buffet & Event Sales', 'revenue', '42', 53),
    (v_uid, '4301', 'تأجير قاعات اجتماعات', 'Meeting Room Rental', 'revenue', '43', 54),
    (v_uid, '4302', 'حفلات زفاف وتجمعات خارجية', 'Weddings & Events', 'revenue', '43', 55),
    (v_uid, '4303', 'خدمات ضيافة ومساعدات فنية', 'Hospitality Services', 'revenue', '43', 56),
    (v_uid, '4401', 'سبا ومساج وعناية صحية', 'Spa & Wellness', 'revenue', '44', 57),
    (v_uid, '4402', 'غسيل وكوي ملابس', 'Laundry', 'revenue', '44', 58),
    (v_uid, '4403', 'نقل ومواصلات وسيارات فاخرة', 'Transport', 'revenue', '44', 59),
    (v_uid, '4404', 'مواقف إنترنت وهواتف وغيرها', 'Internet & Phone', 'revenue', '44', 60),
    (v_uid, '4501', 'إيرادات إيجار محلات ومساحات', 'Shop Rental Revenue', 'revenue', '45', 61),
    (v_uid, '4502', 'أرباح بيع أصول', 'Asset Sale Gains', 'revenue', '45', 62),
    (v_uid, '4503', 'إيرادات متنوعة وغرامات وتعويضات', 'Misc Revenue', 'revenue', '45', 63)
  ON CONFLICT (user_id, account_code) DO NOTHING;

  -- Direct costs (5)
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '5101', 'تكلفة مواد غذائية ومشروبات مستهلكة', 'Food & Beverage Cost', 'direct_cost', '51', 64),
    (v_uid, '5102', 'تكلفة مستلزمات الغرف والمنظفات', 'Room Supplies Cost', 'direct_cost', '51', 65),
    (v_uid, '5103', 'رواتب عمالة مباشرة', 'Direct Labor', 'direct_cost', '51', 66),
    (v_uid, '5104', 'تكلفة خدمات مقاولين خارجيين', 'Contractor Services Cost', 'direct_cost', '51', 67),
    (v_uid, '5105', 'هدر وعوادم مخزون مسموح بها', 'Allowed Waste', 'direct_cost', '51', 68)
  ON CONFLICT (user_id, account_code) DO NOTHING;

  -- Operating expenses (6)
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '6101', 'كهرباء ومياه ووقود', 'Electricity, Water & Fuel', 'operating_expense', '61', 69),
    (v_uid, '6102', 'صيانة وتشغيل أجهزة ومباني دورية', 'Maintenance & Operations', 'operating_expense', '61', 70),
    (v_uid, '6103', 'نظافة وتعقيم', 'Cleaning & Sanitation', 'operating_expense', '61', 71),
    (v_uid, '6201', 'عمولات منصات حجز ووكالات', 'Booking Commissions', 'operating_expense', '62', 72),
    (v_uid, '6202', 'دعاية وإعلان وترويج سياحي', 'Advertising', 'operating_expense', '62', 73),
    (v_uid, '6203', 'سفر وانتدابات ومبيعات', 'Travel & Sales', 'operating_expense', '62', 74)
  ON CONFLICT (user_id, account_code) DO NOTHING;

  -- Admin expenses (7)
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '7001', 'رواتب وأجور الإدارة', 'Admin Salaries', 'admin_expense', '70', 75),
    (v_uid, '7002', 'تأمينات اجتماعية وصحية ومكافآت', 'Insurance & Benefits', 'admin_expense', '70', 76),
    (v_uid, '7003', 'إيجارات ومصروفات مكاتب', 'Rent & Office', 'admin_expense', '70', 77),
    (v_uid, '7004', 'رسوم قانونية واستشارية ومحاسبية', 'Legal & Accounting', 'admin_expense', '70', 78),
    (v_uid, '7005', 'اتصالات وبريد ومستلزمات مكتبية', 'Communications & Supplies', 'admin_expense', '70', 79),
    (v_uid, '7006', 'استهلاك أصول ثابتة', 'Depreciation', 'admin_expense', '70', 80),
    (v_uid, '7007', 'أتعاب مهنية واشتراكات', 'Professional Fees', 'admin_expense', '70', 81)
  ON CONFLICT (user_id, account_code) DO NOTHING;

  -- Other (8)
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '8100', 'مشتريات ومردودات', 'Purchases & Returns', 'other', '81', 82),
    (v_uid, '8200', 'أرباح وخسائر استبعاد أصول', 'Asset Disposal G/L', 'other', '82', 83),
    (v_uid, '8300', 'تسويات سنوات سابقة', 'Prior Year Adjustments', 'other', '83', 84),
    (v_uid, '8900', 'ملخص الدخل - إغلاق نهائي', 'Income Summary', 'other', '89', 85)
  ON CONFLICT (user_id, account_code) DO NOTHING;
END;
$$;
