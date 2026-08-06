/*
# Add Hotel Cost Centers and Unified Chart of Accounts

## What this does
Creates two new owner-scoped tables that implement the hotel cost-center structure
and the unified hotel chart of accounts (دليل الحسابات الفندقي الموحد), compliant
with USALI and ZATCA. Each tenant (authenticated owner) manages their own set of
cost centers and accounts.

## New Tables

### 1. cost_centers — مراكز التكلفة والأقسام الفندقية
- id (uuid PK)
- user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK → auth.users, owner scope)
- code (text, NOT NULL) — e.g. 101, 201, 301 (unique per user)
- name (text, NOT NULL) — Arabic/English name
- name_en (text) — optional English name
- category (text, NOT NULL) — 'profit' | 'service' | 'general'
  (100 = مراكز ربح, 200 = خدمة وتكلفة, 300 = إدارة عامة ومشتركات)
- parent_id (uuid, nullable, FK → cost_centers.id) — for sub-units
- description (text)
- distribution_method (text) — how costs are distributed (for service centers)
- is_active (boolean, default true)
- sort_order (integer, default 0)
- created_at (timestamptz)

### 2. chart_accounts — دليل الحسابات الفندقي الموحد
- id (uuid PK)
- user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK → auth.users, owner scope)
- account_code (text, NOT NULL) — e.g. 1101, 4101 (unique per user)
- account_name (text, NOT NULL)
- account_name_en (text)
- account_type (text, NOT NULL) — 'asset' | 'liability' | 'equity' | 'revenue' | 'direct_cost' | 'operating_expense' | 'admin_expense' | 'other'
  (1=أصول, 2=خصوم, 3=حقوق ملكية, 4=إيرادات, 5=تكاليف مباشرة, 6=مصروفات تشغيلية, 7=مصروفات إدارية, 8=أخرى)
- category_code (text) — group code e.g. '11', '41' for grouping
- parent_id (uuid, nullable, FK → chart_accounts.id) — tree structure
- cost_center_id (uuid, nullable, FK → cost_centers.id) — link account to cost center
- is_active (boolean, default true)
- sort_order (integer, default 0)
- created_at (timestamptz)

## Security
- RLS enabled on both tables.
- Owner-scoped CRUD (4 policies each): auth.uid() = user_id.
- user_id defaults to auth.uid() so frontend inserts work without passing it.

## Notes
- Idempotent: uses IF NOT EXISTS / DO $$ blocks.
- Default seed data is inserted by a follow-up migration so each new tenant can
  copy the standard template.
*/

-- ============================================================
-- 1. cost_centers
-- ============================================================
CREATE TABLE IF NOT EXISTS cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  name_en text,
  category text NOT NULL DEFAULT 'profit' CHECK (category IN ('profit', 'service', 'general')),
  parent_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
  description text,
  distribution_method text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, code)
);

ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cost_centers" ON cost_centers;
CREATE POLICY "select_own_cost_centers" ON cost_centers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_cost_centers" ON cost_centers;
CREATE POLICY "insert_own_cost_centers" ON cost_centers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_cost_centers" ON cost_centers;
CREATE POLICY "update_own_cost_centers" ON cost_centers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_cost_centers" ON cost_centers;
CREATE POLICY "delete_own_cost_centers" ON cost_centers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cost_centers_user_id ON cost_centers(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent_id ON cost_centers(parent_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_category ON cost_centers(category);

-- ============================================================
-- 2. chart_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS chart_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  account_code text NOT NULL,
  account_name text NOT NULL,
  account_name_en text,
  account_type text NOT NULL DEFAULT 'revenue' CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'direct_cost', 'operating_expense', 'admin_expense', 'other')),
  category_code text,
  parent_id uuid REFERENCES chart_accounts(id) ON DELETE SET NULL,
  cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, account_code)
);

ALTER TABLE chart_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chart_accounts" ON chart_accounts;
CREATE POLICY "select_own_chart_accounts" ON chart_accounts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_chart_accounts" ON chart_accounts;
CREATE POLICY "insert_own_chart_accounts" ON chart_accounts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_chart_accounts" ON chart_accounts;
CREATE POLICY "update_own_chart_accounts" ON chart_accounts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_chart_accounts" ON chart_accounts;
CREATE POLICY "delete_own_chart_accounts" ON chart_accounts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chart_accounts_user_id ON chart_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_parent_id ON chart_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_type ON chart_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_cost_center_id ON chart_accounts(cost_center_id);

-- ============================================================
-- 3. Helper: seed default template for a given user
-- ============================================================
-- SECURITY DEFINER so it can insert rows referencing the caller's uid even
-- though the caller is invoking via RPC. It only inserts for the caller.
CREATE OR REPLACE FUNCTION public.seed_default_chart_template()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION public.seed_default_chart_template() TO authenticated;
