/*
# Switch chart template functions to SECURITY INVOKER

## Why
The security scanner flags both `replace_default_chart_template()` and
`seed_default_chart_template()` as "Signed-In Users Can Execute SECURITY
DEFINER Function". SECURITY DEFINER runs with the function owner's
privileges, bypassing the caller's RLS — a privilege-escalation risk.

## Fix
Recreate both functions as SECURITY INVOKER. Under INVOKER the function
executes with the *caller's* privileges, so RLS policies on chart_accounts
and cost_centers apply. Both tables have full CRUD policies scoped to
`auth.uid() = user_id`, and both functions only ever write rows for
`auth.uid()` — so the caller can only touch their own tenant's data.

## Verification
- chart_accounts: SELECT/INSERT/UPDATE/DELETE policies on auth.uid() = user_id ✓
- cost_centers:    SELECT/INSERT/UPDATE/DELETE policies on auth.uid() = user_id ✓
- Both functions scope all writes to v_uid = auth.uid() ✓
*/

CREATE OR REPLACE FUNCTION public.seed_default_chart_template()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_map jsonb := '{}'::jsonb;
  v_parent_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  -- Cost centers (unchanged)
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

  -- ===== 1. ASSETS (1000) =====
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '1000', 'الأصول', 'Assets', 'asset', '1', 1),
    (v_uid, '1100', 'الأصول المتداولة', 'Current Assets', 'asset', '11', 2),
    (v_uid, '1101', 'الصندوق', 'Cash', 'asset', '11', 3),
    (v_uid, '110101', 'صندوق الاستقبال', 'Front Desk Cash', 'asset', '11', 4),
    (v_uid, '110102', 'صندوق المبيعات', 'Sales Cash', 'asset', '11', 5),
    (v_uid, '110103', 'عملات أجنبية', 'Foreign Currency', 'asset', '11', 6),
    (v_uid, '1102', 'البنوك', 'Banks', 'asset', '11', 7),
    (v_uid, '110201', 'بنك رئيسي - ريال', 'Main Bank - SAR', 'asset', '11', 8),
    (v_uid, '110202', 'بنك رئيسي - عملات', 'Main Bank - Foreign', 'asset', '11', 9),
    (v_uid, '110203', 'شيكات تحت التحصيل', 'Cheques for Collection', 'asset', '11', 10),
    (v_uid, '1103', 'الذمم المدينة', 'Receivables', 'asset', '11', 11),
    (v_uid, '110301', 'نزلاء', 'Guests', 'asset', '11', 12),
    (v_uid, '110302', 'عملاء ومؤسسات', 'Clients & Corporates', 'asset', '11', 13),
    (v_uid, '110303', 'أوراق قبض', 'Notes Receivable', 'asset', '11', 14),
    (v_uid, '1104', 'المخزون', 'Inventory', 'asset', '11', 15),
    (v_uid, '110401', 'مواد غذائية', 'Food', 'asset', '11', 16),
    (v_uid, '110402', 'مشروبات', 'Beverages', 'asset', '11', 17),
    (v_uid, '110403', 'لوازم تنظيف ومطبخ', 'Cleaning & Kitchen Supplies', 'asset', '11', 18),
    (v_uid, '1105', 'حسابات مدينة أخرى', 'Other Receivables', 'asset', '11', 19),
    (v_uid, '1106', 'مصروفات مدفوعة مقدماً', 'Prepaid Expenses', 'asset', '11', 20),
    (v_uid, '1200', 'الأصول غير المتداولة', 'Non-Current Assets', 'asset', '12', 21),
    (v_uid, '1201', 'الأراضي', 'Land', 'asset', '12', 22),
    (v_uid, '1202', 'المباني والإنشاءات', 'Buildings', 'asset', '12', 23),
    (v_uid, '1203', 'الآلات والمعدات', 'Machinery & Equipment', 'asset', '12', 24),
    (v_uid, '1204', 'الأثاث والتجهيزات', 'Furniture & Fixtures', 'asset', '12', 25),
    (v_uid, '1205', 'أجهزة كمبيوتر وأنظمة', 'Computers & Systems', 'asset', '12', 26),
    (v_uid, '1206', 'سيارات ووسائل نقل', 'Vehicles', 'asset', '12', 27),
    (v_uid, '1207', 'مشاريع تحت التنفيذ', 'Projects in Progress', 'asset', '12', 28),
    (v_uid, '1208', 'مجمع الإهلاكات (مطروح)', 'Accumulated Depreciation', 'asset', '12', 29),
    (v_uid, '120801', 'إهلاك مباني', 'Dep. Buildings', 'asset', '12', 30),
    (v_uid, '120802', 'إهلاك أجهزة ومعدات', 'Dep. Equipment', 'asset', '12', 31)
  ON CONFLICT (user_id, account_code) DO NOTHING;

  -- ===== 2. LIABILITIES (2000) =====
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '2000', 'الخصوم', 'Liabilities', 'liability', '2', 32),
    (v_uid, '2100', 'الخصوم المتداولة', 'Current Liabilities', 'liability', '21', 33),
    (v_uid, '2101', 'الذمم الدائنة - موردين', 'Payables - Suppliers', 'liability', '21', 34),
    (v_uid, '2102', 'القروض قصيرة الأجل', 'Short-term Loans', 'liability', '21', 35),
    (v_uid, '2103', 'المصروفات المستحقة', 'Accrued Expenses', 'liability', '21', 36),
    (v_uid, '210301', 'رواتب مستحقة', 'Accrued Payroll', 'liability', '21', 37),
    (v_uid, '210302', 'خدمات ومرافق مستحقة', 'Accrued Utilities', 'liability', '21', 38),
    (v_uid, '2104', 'إيرادات مقبوضة مقدماً (حجوزات)', 'Advance Bookings', 'liability', '21', 39),
    (v_uid, '2105', 'ضريبة القيمة المضافة', 'VAT', 'liability', '21', 40),
    (v_uid, '210501', 'ضريبة مخرجات', 'Output VAT', 'liability', '21', 41),
    (v_uid, '210502', 'ضريبة مدخلات', 'Input VAT', 'liability', '21', 42),
    (v_uid, '2106', 'التأمينات الاجتماعية والاقتطاعات', 'Social Insurance', 'liability', '21', 43),
    (v_uid, '2107', 'أمانات نزلاء وموظفين', 'Guest & Staff Deposits', 'liability', '21', 44),
    (v_uid, '2200', 'الخصوم طويلة الأجل', 'Long-term Liabilities', 'liability', '22', 45),
    (v_uid, '2201', 'قروض وتسهيلات طويلة الأجل', 'Long-term Loans', 'liability', '22', 46),
    (v_uid, '2202', 'التزامات عقود إيجار', 'Lease Liabilities', 'liability', '22', 47),
    (v_uid, '2203', 'مخصصات ومزايا نهاية الخدمة', 'End of Service Provisions', 'liability', '22', 48)
  ON CONFLICT (user_id, account_code) DO NOTHING;

  -- ===== 3. EQUITY (3000) =====
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '3000', 'حقوق الملكية', 'Equity', 'equity', '3', 49),
    (v_uid, '3101', 'رأس المال', 'Capital', 'equity', '31', 50),
    (v_uid, '3102', 'الاحتياطيات النظامية والاختيارية', 'Reserves', 'equity', '32', 51),
    (v_uid, '3103', 'الأرباح/الخسائر المرحلة', 'Retained Earnings', 'equity', '33', 52),
    (v_uid, '3104', 'صافي نتيجة الفترة الحالية', 'Current Period P&L', 'equity', '34', 53),
    (v_uid, '3105', 'المسحوبات الشخصية', 'Owner Withdrawals', 'equity', '35', 54)
  ON CONFLICT (user_id, account_code) DO NOTHING;

  -- ===== 4. REVENUE (4000) =====
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '4000', 'الإيرادات', 'Revenue', 'revenue', '4', 55),
    (v_uid, '4101', 'إيرادات الغرف', 'Room Revenue', 'revenue', '41', 56),
    (v_uid, '410101', 'غرف مفردة', 'Single Rooms', 'revenue', '41', 57),
    (v_uid, '410102', 'أجنحة وفاخرة', 'Suites & Deluxe', 'revenue', '41', 58),
    (v_uid, '410103', 'خصومات وملاحقات (مطروح)', 'Discounts (Contra)', 'revenue', '41', 59),
    (v_uid, '4102', 'إيرادات المطعم والمشروبات', 'F&B Revenue', 'revenue', '42', 60),
    (v_uid, '4103', 'إيرادات خدمات إضافية', 'Additional Services Revenue', 'revenue', '43', 61),
    (v_uid, '410301', 'مغسلة وكي', 'Laundry', 'revenue', '43', 62),
    (v_uid, '410302', 'نقل ومواصلات', 'Transport', 'revenue', '43', 63),
    (v_uid, '410303', 'قاعات ومناسبات', 'Halls & Events', 'revenue', '43', 64),
    (v_uid, '4104', 'إيرادات تشغيل أخرى', 'Other Operating Revenue', 'revenue', '44', 65),
    (v_uid, '4105', 'إيرادات استثمار وأرباح غير تشغيلية', 'Non-operating Income', 'revenue', '45', 66)
  ON CONFLICT (user_id, account_code) DO NOTHING;

  -- ===== 5. EXPENSES & COSTS (5000) =====
  INSERT INTO chart_accounts (user_id, account_code, account_name, account_name_en, account_type, category_code, sort_order)
  VALUES
    (v_uid, '5000', 'المصروفات والتكاليف', 'Expenses & Costs', 'direct_cost', '5', 67),
    (v_uid, '5100', 'تكلفة الإيرادات المباشرة', 'Direct Cost of Revenue', 'direct_cost', '51', 68),
    (v_uid, '5101', 'تكلفة مواد ومستلزمات مستهلكة', 'Materials Consumed', 'direct_cost', '51', 69),
    (v_uid, '5102', 'أجور عمال التشغيل المباشر', 'Direct Labor', 'direct_cost', '51', 70),
    (v_uid, '5103', 'إهلاك الأصول التشغيلية', 'Operating Asset Depreciation', 'direct_cost', '51', 71),
    (v_uid, '5200', 'المصروفات العمومية والإدارية', 'General & Admin Expenses', 'admin_expense', '52', 72),
    (v_uid, '5201', 'رواتب ومزايا الإدارة', 'Admin Salaries', 'admin_expense', '52', 73),
    (v_uid, '5202', 'إيجارات ومياه وكهرباء واتصالات', 'Rent & Utilities', 'admin_expense', '52', 74),
    (v_uid, '5203', 'صيانة وترميم وقطع غيار', 'Maintenance & Repairs', 'admin_expense', '52', 75),
    (v_uid, '5204', 'قرطاسية ومطبوعات ورسوم حكومية', 'Stationery & Govt Fees', 'admin_expense', '52', 76),
    (v_uid, '5205', 'تأمينات وأتعاب واستشارات', 'Insurance & Consulting', 'admin_expense', '52', 77),
    (v_uid, '5300', 'مصروفات البيع والتسويق', 'Sales & Marketing', 'operating_expense', '53', 78),
    (v_uid, '5301', 'عمولات وكلاء ومنصات حجز', 'Booking Commissions', 'operating_expense', '53', 79),
    (v_uid, '5302', 'دعاية وإعلان وترويج', 'Advertising', 'operating_expense', '53', 80),
    (v_uid, '5303', 'سفر وضيافة واستقبال', 'Travel & Hospitality', 'operating_expense', '53', 81),
    (v_uid, '5400', 'مصروفات وخسائر أخرى', 'Other Expenses & Losses', 'other', '54', 82),
    (v_uid, '5401', 'فوائد وعمولات بنكية', 'Bank Interest & Charges', 'other', '54', 83),
    (v_uid, '5402', 'خسائر هبوط قيمة وغرامات', 'Impairment & Penalties', 'other', '54', 84)
  ON CONFLICT (user_id, account_code) DO NOTHING;

  -- ===== Resolve parent_id links =====
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '1000')
    WHERE user_id = v_uid AND account_code = '1100';
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '1200')
    WHERE user_id = v_uid AND account_code IN ('1201','1202','1203','1204','1205','1206','1207','1208');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '1100')
    WHERE user_id = v_uid AND account_code IN ('1101','1102','1103','1104','1105','1106');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '1101')
    WHERE user_id = v_uid AND account_code IN ('110101','110102','110103');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '1102')
    WHERE user_id = v_uid AND account_code IN ('110201','110202','110203');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '1103')
    WHERE user_id = v_uid AND account_code IN ('110301','110302','110303');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '1104')
    WHERE user_id = v_uid AND account_code IN ('110401','110402','110403');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '1208')
    WHERE user_id = v_uid AND account_code IN ('120801','120802');

  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '2000')
    WHERE user_id = v_uid AND account_code IN ('2100','2200');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '2100')
    WHERE user_id = v_uid AND account_code IN ('2101','2102','2103','2104','2105','2106','2107');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '2103')
    WHERE user_id = v_uid AND account_code IN ('210301','210302');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '2105')
    WHERE user_id = v_uid AND account_code IN ('210501','210502');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '2200')
    WHERE user_id = v_uid AND account_code IN ('2201','2202','2203');

  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '3000')
    WHERE user_id = v_uid AND account_code IN ('3101','3102','3103','3104','3105');

  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '4000')
    WHERE user_id = v_uid AND account_code IN ('4101','4102','4103','4104','4105');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '4101')
    WHERE user_id = v_uid AND account_code IN ('410101','410102','410103');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '4103')
    WHERE user_id = v_uid AND account_code IN ('410301','410302','410303');

  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '5000')
    WHERE user_id = v_uid AND account_code IN ('5100','5200','5300','5400');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '5100')
    WHERE user_id = v_uid AND account_code IN ('5101','5102','5103');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '5200')
    WHERE user_id = v_uid AND account_code IN ('5201','5202','5203','5204','5205');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '5300')
    WHERE user_id = v_uid AND account_code IN ('5301','5302','5303');
  UPDATE chart_accounts SET parent_id = (SELECT id FROM chart_accounts ca2 WHERE ca2.user_id = v_uid AND ca2.account_code = '5400')
    WHERE user_id = v_uid AND account_code IN ('5401','5402');
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_default_chart_template()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  DELETE FROM chart_accounts WHERE user_id = v_uid;
  DELETE FROM cost_centers WHERE user_id = v_uid;

  PERFORM public.seed_default_chart_template();
END;
$$;

-- Keep execute restricted to authenticated only (anon already revoked)
REVOKE EXECUTE ON FUNCTION public.replace_default_chart_template() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.replace_default_chart_template() FROM anon;
GRANT EXECUTE ON FUNCTION public.replace_default_chart_template() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_chart_template() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_chart_template() FROM anon;
GRANT EXECUTE ON FUNCTION public.seed_default_chart_template() TO authenticated;
