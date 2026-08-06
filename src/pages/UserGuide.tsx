import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../lib/i18n';
import {
  BookOpen, LayoutDashboard, CalendarDays, BedDouble, Building2, Users,
  FileText, BarChart3, UtensilsCrossed, Dumbbell, ConciergeBell, Boxes,
  Calendar, UserCog, Network, BookOpen as ChartIcon, CalendarClock,
  Receipt, Zap, Scale, Shield, Download, Plug, Sparkles, Bell, Settings,
  ChevronDown, Lightbulb, CheckCircle2, ListOrdered, Search,
} from 'lucide-react';

type TFunc = (ar: string, en: string) => string;

interface GuideStep {
  ar: string;
  en: string;
}
interface GuideModule {
  id: string;
  icon: typeof LayoutDashboard;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  steps: GuideStep[];
  tips: GuideStep[];
  audience: 'both' | 'owner' | 'buyer';
}

const MODULES: GuideModule[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    titleAr: 'لوحة التحكم',
    titleEn: 'Dashboard',
    descAr: 'الشاشة الرئيسية التي تعطيك نظرة سريعة على أداء فندقك — الإيرادات، الإشغال، الحجوزات الأخيرة، والتنبيهات.',
    descEn: 'The main screen giving you a quick overview of your hotel performance — revenue, occupancy, recent bookings, and alerts.',
    audience: 'both',
    steps: [
      { ar: 'عند دخولك للنظام، تظهر لوحة التحكم تلقائياً كأول شاشة.', en: 'When you log in, the dashboard appears automatically as the first screen.' },
      { ar: 'في الأعلى ترى بطاقات المؤشرات: إجمالي الإيرادات، عدد الحجوزات، نسبة الإشغال، والوحدات المتاحة.', en: 'At the top you see KPI cards: total revenue, bookings count, occupancy rate, and available units.' },
      { ar: 'الرسم البياني في المنتصف يعرض الحجوزات الشهرية — مرر الماوس فوق الأعمدة لرؤية التفاصيل.', en: 'The chart in the middle shows monthly bookings — hover over bars to see details.' },
      { ar: 'قسم "أحدث الحجوزات" يعرض آخر 5 حجوزات مع حالة كل واحدة.', en: 'The "Latest Bookings" section shows the 5 most recent bookings with their status.' },
      { ar: 'التنبيهات في الأسفل تخبرك بالمهام العاجلة مثل غرف تحتاج تنظيف أو فواتير غير مدفوعة.', en: 'Alerts at the bottom tell you about urgent tasks like rooms needing cleaning or unpaid invoices.' },
    ],
    tips: [
      { ar: 'حدّث الصفحة لرؤية أحدث البيانات بعد كل عملية حجز أو فاتورة.', en: 'Refresh the page to see the latest data after each booking or invoice operation.' },
      { ar: 'اضغط على أي بطاقة مؤشر للانتقال مباشرة إلى تفاصيله.', en: 'Click any KPI card to jump directly to its details.' },
    ],
  },
  {
    id: 'bookings',
    icon: CalendarDays,
    titleAr: 'الحجوزات',
    titleEn: 'Bookings',
    descAr: 'إنشاء وإدارة حجوزات النزلاء — من تسجيل الوصول إلى تسجيل الخروج، مع حساب المبالغ والضرائب تلقائياً.',
    descEn: 'Create and manage guest reservations — from check-in to check-out, with automatic amounts and tax calculation.',
    audience: 'buyer',
    steps: [
      { ar: 'اضغط زر "حجز جديد" في أعلى يمين الصفحة.', en: 'Click the "New Booking" button at the top right of the page.' },
      { ar: 'اختر الوحدة (الغرفة) من القائمة المنسدلة — تظهر فقط الوحدات المتاحة.', en: 'Select the unit (room) from the dropdown — only available units appear.' },
      { ar: 'اختر النزيل من القائمة أو أضف نزيلاً جديداً عبر زر "نزيل جديد".', en: 'Choose the guest from the list or add a new guest via "New Guest" button.' },
      { ar: 'حدد تاريخ تسجيل الوصول وتسجيل الخروج.', en: 'Set the check-in and check-out dates.' },
      { ar: 'اختر نوع الحجز (يومي / شهري) ومصدر الحجز (مباشر / بوكنج / أجودا).', en: 'Choose booking type (daily / monthly) and source (direct / Booking / Agoda).' },
      { ar: 'النظام يحسب تلقائياً عدد الليالي، المبلغ قبل الضريبة، الضريبة، والإجمالي.', en: 'The system automatically calculates nights, pre-tax amount, tax, and total.' },
      { ar: 'أضف ملاحظات إن لزم، ثم اضغط "حفظ الحجز".', en: 'Add notes if needed, then click "Save Booking".' },
      { ar: 'لتأكيد الحجز: اضغط زر "تأكيد" بجانب الحجز قيد المراجعة.', en: 'To confirm: click "Confirm" next to a pending booking.' },
      { ar: 'لإلغاء حجز: افتح الحجز واضغط "إلغاء الحجز" مع ذكر السبب.', en: 'To cancel: open the booking and click "Cancel Booking" with a reason.' },
    ],
    tips: [
      { ar: 'الحجز بحالة "قيد المراجعة" لا يحجز الغرفة فعلياً حتى تؤكده.', en: 'A "Pending" booking does not actually reserve the room until you confirm it.' },
      { ar: 'يمكنك تعديل تواريخ حجز مؤكد، لكن انتبه لتأثير ذلك على المبلغ.', en: 'You can edit confirmed booking dates, but watch the effect on the amount.' },
      { ar: 'استخدم زر "أرشفة" لإخفاء الحجوزات القديمة دون حذفها.', en: 'Use "Archive" to hide old bookings without deleting them.' },
    ],
  },
  {
    id: 'units',
    icon: BedDouble,
    titleAr: 'الوحدات والغرف',
    titleEn: 'Units & Rooms',
    descAr: 'إدارة كل غرفة في فندقك — رقمها، نوعها، سعتها، أسعارها، وحالتها (متاحة، محجوزة، صيانة، تنظيف).',
    descEn: 'Manage every room in your hotel — number, type, capacity, rates, and status (available, reserved, maintenance, cleaning).',
    audience: 'buyer',
    steps: [
      { ar: 'اضغط "إضافة وحدة" لإضافة غرفة جديدة.', en: 'Click "Add Unit" to add a new room.' },
      { ar: 'أدخل رقم الغرفة، اختر النوع (مفردة، مزدوجة، جناح، عائلية، ملكية).', en: 'Enter the room number, choose type (single, double, suite, family, royal).' },
      { ar: 'حدد السعة (عدد الأشخاص) والطابق.', en: 'Set capacity (number of people) and floor.' },
      { ar: 'أدخل السعر اليومي والشهري بالعملة المحلية.', en: 'Enter daily and monthly rates in local currency.' },
      { ar: 'اختر العقار الذي تنتمي إليه الوحدة.', en: 'Select the property the unit belongs to.' },
      { ar: 'اضغط "حفظ" لإضافة الوحدة.', en: 'Click "Save" to add the unit.' },
      { ar: 'لتغيير حالة غرفة: اضغط زر الحالة بجانبها واختر (متاحة / صيانة / تنظيف).', en: 'To change room status: click the status button next to it and choose (available / maintenance / cleaning).' },
    ],
    tips: [
      { ar: 'حالة "صيانة" تمنع الحجز التلقائي للغرفة حتى تعيدها "متاحة".', en: 'The "maintenance" status prevents automatic booking until you set it back to "available".' },
      { ar: 'غيّر الأسعار موسمياً — اضغط "تعديل" على الوحدة وحدّث السعر.', en: 'Update rates seasonally — click "Edit" on the unit and update the price.' },
    ],
  },
  {
    id: 'properties',
    icon: Building2,
    titleAr: 'العقارات',
    titleEn: 'Properties',
    descAr: 'إدارة فنادقك أو منشآتك — اسم كل عقار، عنوانه، هاتفه، وبريده الإلكتروني.',
    descEn: 'Manage your hotels or properties — each property name, address, phone, and email.',
    audience: 'buyer',
    steps: [
      { ar: 'اضغط "إضافة عقار" لإضافة فندق جديد.', en: 'Click "Add Property" to add a new hotel.' },
      { ar: 'أدخل اسم الفندق، العنوان، الهاتف، والبريد الإلكتروني.', en: 'Enter hotel name, address, phone, and email.' },
      { ar: 'اضغط "حفظ". بعد ذلك يمكنك إضافة وحدات (غرف) لهذا العقار من صفحة الوحدات.', en: 'Click "Save". You can then add units (rooms) to this property from the Units page.' },
      { ar: 'لتعديل بيانات عقار: اضغط "تعديل" وحدّث المعلومات.', en: 'To edit property data: click "Edit" and update the information.' },
    ],
    tips: [
      { ar: 'كل عقار مستقل بغرفه وحجوزاته وفواتيره.', en: 'Each property is independent with its rooms, bookings, and invoices.' },
    ],
  },
  {
    id: 'customers',
    icon: Users,
    titleAr: 'النزلاء',
    titleEn: 'Guests',
    descAr: 'ملف شامل لكل نزيل — بياناته الشخصية، رقم هويته، جنسيته، تاريخ حجوزاته، وملاحظات خاصة.',
    descEn: 'A complete profile for every guest — personal data, ID number, nationality, booking history, and special notes.',
    audience: 'buyer',
    steps: [
      { ar: 'اضغط "إضافة نزيل" لإنشاء ملف جديد.', en: 'Click "Add Guest" to create a new profile.' },
      { ar: 'أدخل الاسم، الهاتف، البريد الإلكتروني.', en: 'Enter name, phone, and email.' },
      { ar: 'أدخل رقم الهوية ونوعها وتاريخ انتهائها، والجنسية.', en: 'Enter ID number, type, expiry date, and nationality.' },
      { ar: 'أضف ملاحظات خاصة (مثل تفضيلات الغرفة أو الحساسية الغذائية).', en: 'Add special notes (like room preferences or food allergies).' },
      { ar: 'اضغط "حفظ". يمكنك لاحقاً البحث عن النزيل بالاسم أو الهاتف.', en: 'Click "Save". You can later search for the guest by name or phone.' },
      { ar: 'لإنشاء رابط بوابة للنزيل: اضغط زر "رابط البوابة" — يفتح له صفحة خاصة بحجوزاته.', en: 'To create a portal link for the guest: click "Portal Link" — it opens a private page with their bookings.' },
    ],
    tips: [
      { ar: 'حقل "VIP" يميز النزلاء المهمين لمعاملة خاصة.', en: 'The "VIP" field marks important guests for special treatment.' },
      { ar: 'يحسب النظام تلقائياً عدد إقامات النزيل وإجمالي إنفاقه.', en: 'The system automatically calculates the guest stay count and total spending.' },
    ],
  },
  {
    id: 'invoices',
    icon: FileText,
    titleAr: 'الفواتير',
    titleEn: 'Invoices',
    descAr: 'إصدار فواتير إلكترونية للنزلاء، متوافقة مع متطلبات الزكاة والضريبة، مع تتبع حالة الدفع.',
    descEn: 'Issue electronic invoices to guests, ZATCA-compliant, with payment status tracking.',
    audience: 'buyer',
    steps: [
      { ar: 'اضغط "فاتورة جديدة" لإصدار فاتورة.', en: 'Click "New Invoice" to issue an invoice.' },
      { ar: 'اختر النزيل والحجز المرتبط (إن وجد).', en: 'Select the guest and related booking (if any).' },
      { ar: 'أدخل بنود الفاتورة — كل بند له وصف وكمية وسعر.', en: 'Enter invoice line items — each has description, quantity, and price.' },
      { ar: 'النظام يحسب المجموع قبل الضريبة، الضريبة، والإجمالي تلقائياً.', en: 'The system calculates pre-tax total, tax, and grand total automatically.' },
      { ar: 'حدد تاريخ الإصدار وتاريخ الاستحقاق.', en: 'Set issue date and due date.' },
      { ar: 'اضغط "حفظ وإصدار" لإصدار الفاتورة برقم تسلسلي.', en: 'Click "Save & Issue" to issue the invoice with a serial number.' },
      { ar: 'لتسجيل دفعة: افتح الفاتورة واضغط "تسجيل دفعة" — أدخل المبلغ وطريقة الدفع.', en: 'To record a payment: open the invoice and click "Record Payment" — enter amount and method.' },
      { ar: 'لتصدير الفاتورة PDF: اضغط "تصدير" بجانب الفاتورة.', en: 'To export invoice as PDF: click "Export" next to the invoice.' },
    ],
    tips: [
      { ar: 'حالة الفاتورة تتغير تلقائياً: "غير مدفوعة" → "مدفوعة جزئياً" → "مدفوعة".', en: 'Invoice status changes automatically: "unpaid" → "partially paid" → "paid".' },
      { ar: 'لا يمكن حذف فاتورة بعد إصدارها — فقط إلغاؤها بفاتورة مرتجعة.', en: 'An invoice cannot be deleted after issuing — only cancelled via a credit note.' },
    ],
  },
  {
    id: 'reports',
    icon: BarChart3,
    titleAr: 'التقارير',
    titleEn: 'Reports',
    descAr: 'تقارير تحليلية للإيرادات، المصروفات، الإشغال، والعمولات — قابلة للتصدير.',
    descEn: 'Analytical reports for revenue, expenses, occupancy, and commissions — exportable.',
    audience: 'buyer',
    steps: [
      { ar: 'اختر نوع التقرير من القائمة (إيرادات / مصروفات / إشغال / عمولات).', en: 'Choose report type from the list (revenue / expenses / occupancy / commissions).' },
      { ar: 'حدد الفترة الزمنية — يوم، أسبوع، شهر، سنة، أو مخصص.', en: 'Set the time period — day, week, month, year, or custom.' },
      { ar: 'اضغط "عرض التقرير" لرؤية البيانات والرسوم البيانية.', en: 'Click "Show Report" to view data and charts.' },
      { ar: 'للتصدير: اضغط "تصدير PDF" أو "تصدير Excel" في الأعلى.', en: 'To export: click "Export PDF" or "Export Excel" at the top.' },
    ],
    tips: [
      { ar: 'تقارير الإشغال تساعدك على معرفة المواسم المزدحمة والهادئة.', en: 'Occupancy reports help you identify busy and quiet seasons.' },
      { ar: 'قارن تقارير شهرية لاكتشاف الاتجاهات.', en: 'Compare monthly reports to discover trends.' },
    ],
  },
  {
    id: 'calendar',
    icon: Calendar,
    titleAr: 'التقويم',
    titleEn: 'Calendar',
    descAr: 'عرض بصري لكل الحجوزات على تقويم — يوضح أي غرف محجوزة في أي تواريخ.',
    descEn: 'A visual view of all bookings on a calendar — showing which rooms are booked on which dates.',
    audience: 'buyer',
    steps: [
      { ar: 'افتح صفحة التقويم من القائمة الجانبية.', en: 'Open the Calendar page from the sidebar.' },
      { ar: 'اختر طريقة العرض: يومي، أسبوعي، أو شهري.', en: 'Choose view mode: daily, weekly, or monthly.' },
      { ar: 'كل عمود يمثل غرفة وكل صف يمثل يوماً — الحجوزات تظهر ككتل ملوّنة.', en: 'Each column is a room and each row is a day — bookings appear as colored blocks.' },
      { ar: 'اضغط على أي حجز لفتح تفاصيله وتعديله.', en: 'Click any booking to open its details and edit it.' },
      { ar: 'لإنشاء حجز سريع: اضغط على يوم فارغ واسحب لتحديد المدة.', en: 'To create a quick booking: click an empty day and drag to set the duration.' },
    ],
    tips: [
      { ar: 'التقويم هو أسرع طريقة لرؤية الإشغال الكلي في لمحة.', en: 'The calendar is the fastest way to see total occupancy at a glance.' },
    ],
  },
  {
    id: 'restaurant',
    icon: UtensilsCrossed,
    titleAr: 'المطعم',
    titleEn: 'Restaurant',
    descAr: 'إدارة قائمة الطعام، الطلبات من الغرف أو المطعم، وربط الفاتورة بإقامة النزيل.',
    descEn: 'Manage the menu, room service or restaurant orders, and link the bill to the guest stay.',
    audience: 'buyer',
    steps: [
      { ar: 'لإضافة صنف للقائمة: اضغط "إضافة صنف" وأدخل الاسم، السعر، والتصنيف.', en: 'To add a menu item: click "Add Item" and enter name, price, and category.' },
      { ar: 'لتسجيل طلب: اضغط "طلب جديد".', en: 'To record an order: click "New Order".' },
      { ar: 'اختر النزيل (إن كان طلب غرفة) أو طلب مطعم مباشر.', en: 'Select the guest (if room service) or a direct restaurant order.' },
      { ar: 'أضف الأصناف والكميات — يحسب النظام الإجمالي تلقائياً.', en: 'Add items and quantities — the system calculates the total automatically.' },
      { ar: 'اختر ربط الطلب بحجز النزيل لتضاف الفاتورة لإقامته.', en: 'Choose to link the order to the guest booking to add the bill to their stay.' },
      { ar: 'اضغط "حفظ الطلب".', en: 'Click "Save Order".' },
    ],
    tips: [
      { ar: 'تقارير مبيعات المطعم متاحة من صفحة التقارير.', en: 'Restaurant sales reports are available from the Reports page.' },
    ],
  },
  {
    id: 'gym',
    icon: Dumbbell,
    titleAr: 'النادي الرياضي',
    titleEn: 'Gym',
    descAr: 'إدارة اشتراكات النادي — شهرية أو يومية — وتتبع الأعضاء والمدفوعات.',
    descEn: 'Manage gym memberships — monthly or daily — and track members and payments.',
    audience: 'buyer',
    steps: [
      { ar: 'اضغط "إضافة عضو" لتسجيل عضو جديد.', en: 'Click "Add Member" to register a new member.' },
      { ar: 'أدخل بيانات العضو واختر نوع الاشتراك (شهري / يومي).', en: 'Enter member data and choose subscription type (monthly / daily).' },
      { ar: 'حدد تاريخ البداية — يحسب النظام تاريخ الانتهاء تلقائياً.', en: 'Set the start date — the system calculates the end date automatically.' },
      { ar: 'سجّل الدفعة عند الاشتراك أو التجديد.', en: 'Record the payment at subscription or renewal.' },
      { ar: 'للتجديد: افتح ملف العضو واضغط "تجديد الاشتراك".', en: 'To renew: open the member profile and click "Renew Subscription".' },
    ],
    tips: [
      { ar: 'يصلك تنبيه قبل انتهاء الاشتراك بثلاثة أيام.', en: 'You get an alert three days before subscription expiry.' },
    ],
  },
  {
    id: 'services',
    icon: ConciergeBell,
    titleAr: 'الخدمات',
    titleEn: 'Services',
    descAr: 'إدارة الخدمات الإضافية للنزلاء — غسيل ملابس، نقل، خدمة الكونسيرج، وغيرها.',
    descEn: 'Manage additional guest services — laundry, transport, concierge, and more.',
    audience: 'buyer',
    steps: [
      { ar: 'اضغط "إضافة خدمة" وأدخل الاسم، التصنيف، والسعر.', en: 'Click "Add Service" and enter name, category, and price.' },
      { ar: 'فعّل أو عطّل الخدمة عبر زر التبديل بجانبها.', en: 'Enable or disable the service via the toggle next to it.' },
      { ar: 'لطلب خدمة لنزيل: افتح حجز النزيل واضغط "إضافة خدمة".', en: 'To order a service for a guest: open the guest booking and click "Add Service".' },
    ],
    tips: [
      { ar: 'الخدمات المعطّلة لا تظهر عند إنشاء الطلبات.', en: 'Disabled services do not appear when creating orders.' },
    ],
  },
  {
    id: 'inventory',
    icon: Boxes,
    titleAr: 'المخزون',
    titleEn: 'Inventory',
    descAr: 'تتبع كل صنف في مخزونك — الكمية الحالية، الحد الأدنى، وتنبيهات النفاد.',
    descEn: 'Track every item in your inventory — current quantity, minimum level, and low-stock alerts.',
    audience: 'buyer',
    steps: [
      { ar: 'اضغط "إضافة صنف" وأدخل الاسم، الكمية، والحد الأدنى للتنبيه.', en: 'Click "Add Item" and enter name, quantity, and minimum alert level.' },
      { ar: 'عند استلام بضاعة: اضغط "إضافة وارد" وأدخل الكمية المستلمة.', en: 'When receiving goods: click "Add Inbound" and enter the received quantity.' },
      { ar: 'عند صرف صنف: اضغط "صرف" وأدخل الكمية والسبب.', en: 'When issuing an item: click "Issue" and enter quantity and reason.' },
      { ar: 'الأصناف التي تقترب من الحد الأدنى تظهر بعلامة تحذير صفراء.', en: 'Items nearing the minimum level appear with a yellow warning mark.' },
    ],
    tips: [
      { ar: 'أجرِ جرداً دورياً وقارن الكمية الفعلية بالمسجلة.', en: 'Conduct periodic stock counts and compare actual vs recorded quantity.' },
      { ar: 'سجل حركة المخزون دائماً — لا تستخدم صنفاً دون صرفه.', en: 'Always record inventory movements — never use an item without issuing it.' },
    ],
  },
  {
    id: 'staff',
    icon: UserCog,
    titleAr: 'الموظفون',
    titleEn: 'Staff',
    descAr: 'إدارة موظفي الفندق — أسمائهم، أدوارهم، صلاحياتهم، وحالة عملهم.',
    descEn: 'Manage hotel staff — names, roles, permissions, and employment status.',
    audience: 'buyer',
    steps: [
      { ar: 'اضغط "إضافة موظف" وأدخل الاسم، الدور، والهاتف.', en: 'Click "Add Staff" and enter name, role, and phone.' },
      { ar: 'حدد الصلاحيات: إدارة الحجوزات، الفواتير، المخزون، عرض التقارير.', en: 'Set permissions: manage bookings, invoices, inventory, view reports.' },
      { ar: 'اضغط "حفظ". يمكن للموظف الدخول بنفسه لاحقاً.', en: 'Click "Save". The staff member can log in themselves later.' },
      { ar: 'لتعطيل موظف: غيّر حالته إلى "غير نشط".', en: 'To deactivate staff: change their status to "Inactive".' },
    ],
    tips: [
      { ar: 'أعطِ كل موظف فقط الصلاحيات التي يحتاجها — مبدأ أقل صلاحية.', en: 'Give each staff only the permissions they need — least privilege principle.' },
    ],
  },
  {
    id: 'accounting',
    icon: Network,
    titleAr: 'المحاسبة',
    titleEn: 'Accounting',
    descAr: 'نظام محاسبي كامل — مراكز التكلفة، دليل الحسابات، القيود اليومية، الفترات المالية، والمستندات النقدية.',
    descEn: 'A complete accounting system — cost centers, chart of accounts, journal entries, financial periods, and cash documents.',
    audience: 'buyer',
    steps: [
      { ar: 'أولاً: أنشئ دليل الحسابات من صفحة "دليل الحسابات" — أضف الحسابات الرئيسية والفرعية.', en: 'First: create the chart of accounts from "Chart of Accounts" — add main and sub accounts.' },
      { ar: 'أنشئ مراكز التكلفة من صفحة "مراكز التكلفة" — كل قسم في الفندق مركز تكلفة.', en: 'Create cost centers from "Cost Centers" — each hotel department is a cost center.' },
      { ar: 'حدد الفترات المالية من صفحة "الفترات المالية" — شهرياً أو ربع سنوي.', en: 'Set financial periods from "Financial Periods" — monthly or quarterly.' },
      { ar: 'أدخل الأرصدة الافتتاحية من صفحة "الأرصدة الافتتاحية" عند بدء استخدام النظام.', en: 'Enter opening balances from "Opening Balances" when starting to use the system.' },
      { ar: 'سجّل القيود اليومية من صفحة "القيود اليومية" — مدين ودائن لكل قيد.', en: 'Record journal entries from "Journal Entries" — debit and credit for each entry.' },
      { ar: 'استخدم "قوالب القيود" للقيود المتكررة لتوفير الوقت.', en: 'Use "Entry Templates" for recurring entries to save time.' },
      { ar: 'سجّل المستندات النقدية (سندات قبض وصرف) من صفحة "المستندات النقدية".', en: 'Record cash documents (receipt and payment vouchers) from "Cash Documents".' },
    ],
    tips: [
      { ar: 'كل قيد يجب أن يكون متوازناً — إجمالي المدين يساوي إجمالي الدائن.', en: 'Every entry must be balanced — total debit equals total credit.' },
      { ar: 'لا يمكن تعديل قيد في فترة مالية مغلقة — افتح فترة جديدة أولاً.', en: 'You cannot edit an entry in a closed financial period — open a new one first.' },
      { ar: 'اربط كل قيد بمركز تكلفة لتحليل أداء كل قسم.', en: 'Link each entry to a cost center to analyze each department performance.' },
    ],
  },
  {
    id: 'ai',
    icon: Sparkles,
    titleAr: 'المساعد الذكي',
    titleEn: 'Smart Assistant',
    descAr: 'اسأل بالعربية أو الإنجليزية — صوتاً أو نصاً — عن حالة غرفك، إيراداتك، حجوزاتك، وكل ما يهمك.',
    descEn: 'Ask in Arabic or English — voice or text — about your room status, revenue, bookings, and everything that matters.',
    audience: 'buyer',
    steps: [
      { ar: 'افتح صفحة "المساعد الذكي" من القائمة.', en: 'Open the "Smart Assistant" page from the sidebar.' },
      { ar: 'اكتب سؤالك في الخانة السفلية، أو اضغط أيقونة الميكروفون للتحدث.', en: 'Type your question in the bottom input, or click the mic icon to speak.' },
      { ar: 'مثال: "كم عدد الغرف المتاحة اليوم؟" أو "ما إجمالي إيرادات هذا الشهر؟"', en: 'Example: "How many rooms are available today?" or "What is this month total revenue?"' },
      { ar: 'النظام يجيب فوراً من بياناتك الحقيقية.', en: 'The system answers instantly from your real data.' },
      { ar: 'الرد يُنطق صوتياً تلقائياً — اضغط أيقونة السماعة لإيقاف/تشغيل النطق.', en: 'The reply is spoken aloud automatically — click the speaker icon to toggle voice.' },
    ],
    tips: [
      { ar: 'اطرح أسئلة محددة للحصول على إجابات دقيقة.', en: 'Ask specific questions to get precise answers.' },
      { ar: 'يمكنك طلب تقرير سريع: "اعرض لي حجوزات هذا الأسبوع".', en: 'You can request a quick report: "Show me this week bookings."' },
    ],
  },
  {
    id: 'integrations',
    icon: Plug,
    titleAr: 'التكامل والواجهات',
    titleEn: 'Integrations',
    descAr: 'ربط نظامك مع منصات الحجز، الأنظمة المحاسبية، بوابات الدفع، وأجهزة الفندق.',
    descEn: 'Connect your system with booking platforms, accounting software, payment gateways, and hotel hardware.',
    audience: 'buyer',
    steps: [
      { ar: 'افتح صفحة "التكامل" من القائمة.', en: 'Open the "Integrations" page from the sidebar.' },
      { ar: 'سترى قائمة بالخدمات القابلة للربط (Booking، Agoda، قيود، مدى، إلخ).', en: 'You see a list of connectable services (Booking, Agoda, Qoyod, Mada, etc.).' },
      { ar: 'اضغط "ربط" على الخدمة المطلوبة.', en: 'Click "Connect" on the desired service.' },
      { ar: 'أدخل بيانات الربط (مفتاح API، اسم المستخدم، كلمة المرور) حسب التعليمات.', en: 'Enter connection data (API key, username, password) per instructions.' },
      { ar: 'اضغط "حفظ" — يختبر النظام الاتصال ويؤكد الربط.', en: 'Click "Save" — the system tests the connection and confirms.' },
    ],
    tips: [
      { ar: 'احتفظ بمفاتيح API بأمان ولاشاركها مع غير المخولين.', en: 'Keep API keys secure and do not share them with unauthorized people.' },
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    titleAr: 'التنبيهات',
    titleEn: 'Notifications',
    descAr: 'كل التنبيهات في مكان واحد — حجوزات جديدة، فواتير مستحقة، مخزون منخفض، وتجديدات اشتراك.',
    descEn: 'All alerts in one place — new bookings, due invoices, low stock, and subscription renewals.',
    audience: 'both',
    steps: [
      { ar: 'افتح صفحة "التنبيهات" من القائمة.', en: 'Open the "Notifications" page from the sidebar.' },
      { ar: 'التنبيهات غير المقروءة تظهر بعلامة زرقاء.', en: 'Unread notifications appear with a blue mark.' },
      { ar: 'اضغط على أي تنبيه لعرض تفاصيله والانتقال للصفحة المعنية.', en: 'Click any notification to view details and jump to the relevant page.' },
      { ar: 'اضغط "تعليم كمقروء" لمسح العلامة.', en: 'Click "Mark as Read" to clear the mark.' },
    ],
    tips: [
      { ar: 'راجع التنبيهات يومياً لعدم تفويت مهمة عاجلة.', en: 'Review notifications daily to not miss an urgent task.' },
    ],
  },
  {
    id: 'audit',
    icon: Shield,
    titleAr: 'سجل التدقيق',
    titleEn: 'Audit Log',
    descAr: 'سجل كامل لكل عملية في النظام — من أنشأها، متى، وما الذي تغير. لا يمكن حذفه.',
    descEn: 'A complete log of every system action — who created it, when, and what changed. Cannot be deleted.',
    audience: 'both',
    steps: [
      { ar: 'افتح صفحة "سجل التدقيق" من القائمة.', en: 'Open the "Audit Log" page from the sidebar.' },
      { ar: 'سترى كل العمليات مرتبة زمنياً — الأحدث أولاً.', en: 'You see all actions sorted by time — newest first.' },
      { ar: 'استخدم البحث للبحث عن مستخدم معين أو نوع عملية.', en: 'Use search to find a specific user or action type.' },
      { ar: 'كل صف يعرض: المستخدم، نوع العملية، الجدول المتأثر، والتاريخ.', en: 'Each row shows: user, action type, affected table, and date.' },
    ],
    tips: [
      { ar: 'سجل التدقيق صالح كمستند قانوني أمام الجهات الرسمية.', en: 'The audit log is valid as a legal document before official authorities.' },
      { ar: 'لا يمكن لأحد حذف أو تعديل سجل التدقيق — حتى المدير.', en: 'No one can delete or edit the audit log — not even the admin.' },
    ],
  },
  {
    id: 'data-export',
    icon: Download,
    titleAr: 'تصدير البيانات',
    titleEn: 'Data Export',
    descAr: 'تصدير بياناتك (الحجوزات، الفواتير، النزلاء) بصيغة Excel أو CSV.',
    descEn: 'Export your data (bookings, invoices, guests) as Excel or CSV.',
    audience: 'both',
    steps: [
      { ar: 'افتح صفحة "تصدير البيانات" من القائمة.', en: 'Open the "Data Export" page from the sidebar.' },
      { ar: 'اختر نوع البيانات (حجوزات / فواتير / نزلاء / كل شيء).', en: 'Choose data type (bookings / invoices / guests / everything).' },
      { ar: 'حدد الفترة الزمنية.', en: 'Set the time period.' },
      { ar: 'اختر الصيغة (Excel / CSV).', en: 'Choose format (Excel / CSV).' },
      { ar: 'اضغط "تصدير" — يبدأ تنزيل الملف.', en: 'Click "Export" — the file download begins.' },
    ],
    tips: [
      { ar: 'صدّر نسخة كاملة شهرياً كنسخة احتياطية إضافية.', en: 'Export a full copy monthly as an extra backup.' },
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    titleAr: 'الإعدادات',
    titleEn: 'Settings',
    descAr: 'ضبط بيانات الشركة، الضريبة، العملة، أوقات تسجيل الوصول والخروج، وسياسات الفندق.',
    descEn: 'Configure company data, tax, currency, check-in/out times, and hotel policies.',
    audience: 'both',
    steps: [
      { ar: 'افتح صفحة "الإعدادات" من القائمة.', en: 'Open the "Settings" page from the sidebar.' },
      { ar: 'في قسم "بيانات الشركة": أدخل الاسم القانوني، الرقم التجاري، الرقم الضريبي.', en: 'In "Company Data": enter legal name, commercial registration, tax number.' },
      { ar: 'في قسم "الضريبة": حدد نسبة الضريبة (مثلاً 15% للسعودية).', en: 'In "Tax": set the tax rate (e.g., 15% for Saudi Arabia).' },
      { ar: 'في قسم "العملة": اختر العملة الأساسية.', en: 'In "Currency": choose the base currency.' },
      { ar: 'في قسم "الأوقات": حدد وقت تسجيل الوصول والخروج.', en: 'In "Times": set check-in and check-out times.' },
      { ar: 'في قسم "السياسات": اكتب سياسة الإلغاء وسياسة الحجز.', en: 'In "Policies": write cancellation and booking policies.' },
      { ar: 'اضغط "حفظ الإعدادات" في الأسفل.', en: 'Click "Save Settings" at the bottom.' },
    ],
    tips: [
      { ar: 'بيانات الشركة تظهر تلقائياً على كل فاتورة.', en: 'Company data appears automatically on every invoice.' },
      { ar: 'نسبة الضريبة تطبق على كل فاتورة جديدة.', en: 'The tax rate applies to every new invoice.' },
    ],
  },
  {
    id: 'owner-clients',
    icon: Building2,
    titleAr: 'إدارة المشترين (للمالك)',
    titleEn: 'Client Management (Owner)',
    descAr: 'إدارة مشتري النظام — إنشاء حساباتهم، تتبع اشتراكاتهم، وإصدار روابط بواباتهم.',
    descEn: 'Manage system clients — create their accounts, track subscriptions, and issue portal links.',
    audience: 'owner',
    steps: [
      { ar: 'افتح صفحة "مشتريو النظام" من القائمة.', en: 'Open the "System Clients" page from the sidebar.' },
      { ar: 'اضغط "إضافة مشترٍ" وأدخل اسم المنشأة، البريد، والهاتف.', en: 'Click "Add Client" and enter establishment name, email, and phone.' },
      { ar: 'اختر باقة الاشتراك وحدد تاريخ البداية.', en: 'Choose subscription plan and set start date.' },
      { ar: 'النظام ينشئ رابط بوابة فريد للمشتري — أرسله له للدخول.', en: 'The system creates a unique portal link for the client — send it to them to log in.' },
      { ar: 'لمتابعة حالة المشتري: افتح ملفه لرؤية حالة الاشتراك والمدفوعات.', en: 'To track client status: open their profile to see subscription and payment status.' },
    ],
    tips: [
      { ar: 'رابط البوابة يفتح للمشتري بوابة مستقلة لإدارة فندقه.', en: 'The portal link opens an independent portal for the client to manage their hotel.' },
    ],
  },
];

export default function UserGuide() {
  const { t, lang } = useLanguage();
  const [activeId, setActiveId] = useState(MODULES[0].id);
  const [search, setSearch] = useState('');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filtered = MODULES.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.titleAr.includes(search) ||
      m.titleEn.toLowerCase().includes(q) ||
      m.descAr.includes(search) ||
      m.descEn.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const onScroll = () => {
      for (const m of filtered) {
        const el = sectionRefs.current[m.id];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom > 120) {
            setActiveId(m.id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [filtered]);

  const scrollTo = (id: string) => {
    setActiveId(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ fontFamily: 'Tajawal, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--brand-darkest, #0a0f1c), var(--brand-dark-1, #111827))',
        padding: '40px 28px 32px',
        borderRadius: '0 0 24px 24px',
        marginBottom: 24,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, var(--brand-500, #3b82f6), var(--brand-600, #2563eb))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59,130,246,0.35)',
            }}>
              <BookOpen size={26} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                {t('دليل الاستخدام الكامل', 'Complete User Guide')}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--brand-300, #93c5fd)', margin: '4px 0 0' }}>
                {t('شرح تفصيلي لكل قسم في النظام — خطوة بخطوة', 'Detailed explanation of every system section — step by step')}
              </p>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 480 }}>
            <Search size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [lang === 'ar' ? 'right' : 'left']: 14, color: '#94a3b8' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('ابحث عن قسم...', 'Search a section...')}
              style={{
                width: '100%', padding: '12px 44px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, fontFamily: 'inherit',
                outline: 'none', direction: lang === 'ar' ? 'rtl' : 'ltr',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px 60px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 28, alignItems: 'start' }}>
        {/* Sidebar TOC */}
        <aside style={{ position: 'sticky', top: 20, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }} className="no-print">
          <div style={{
            padding: 16, borderRadius: 16,
            background: '#fff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--brand-page-text)', marginBottom: 12, padding: '0 8px' }}>
              {t('الأقسام', 'Sections')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filtered.map((m) => {
                const Icon = m.icon;
                const active = activeId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => scrollTo(m.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                      border: 'none', cursor: 'pointer', textAlign: lang === 'ar' ? 'right' : 'left',
                      fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: 'inherit',
                      background: active ? 'rgba(var(--brand-rgb),0.1)' : 'transparent',
                      color: active ? 'var(--brand-600)' : 'var(--brand-page-text)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    <span>{t(m.titleAr, m.titleEn)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Content */}
        <div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--brand-page-text)' }}>
              {t('لا توجد نتائج مطابقة', 'No matching results')}
            </div>
          )}
          {filtered.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                ref={(el) => { sectionRefs.current[m.id] = el; }}
                style={{
                  marginBottom: 32, scrollMarginTop: 20,
                  padding: 28, borderRadius: 20,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                }}
              >
                {/* Module header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 13,
                    background: 'rgba(var(--brand-rgb),0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={22} color="var(--brand-500)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', fontWeight: 800, margin: 0, lineHeight: 1.3, color: 'var(--brand-page-text)' }}>
                      {t(m.titleAr, m.titleEn)}
                    </h2>
                    {m.audience !== 'both' && (
                      <span style={{
                        display: 'inline-block', marginTop: 4, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: m.audience === 'owner' ? 'rgba(16,185,129,0.12)' : 'rgba(8,145,178,0.12)',
                        color: m.audience === 'owner' ? '#059669' : '#0891b2',
                      }}>
                        {m.audience === 'owner' ? t('للمالك', 'Owner only') : t('للمشتري', 'Buyer only')}
                      </span>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--brand-page-text)', marginBottom: 24 }}>
                  {t(m.descAr, m.descEn)}
                </p>

                {/* Steps */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <ListOrdered size={18} color="var(--brand-500, #3b82f6)" />
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--brand-page-text)' }}>
                      {t('خطوات الاستخدام', 'How to use')}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {m.steps.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
                          color: '#fff', fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {i + 1}
                        </div>
                        <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--brand-page-text)', paddingTop: 3 }}>
                          {t(s.ar, s.en)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                {m.tips.length > 0 && (
                  <div style={{
                    padding: 16, borderRadius: 12,
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Lightbulb size={18} color="#f59e0b" />
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--brand-page-text)' }}>
                        {t('نصائح', 'Tips')}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {m.tips.map((tip, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <CheckCircle2 size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--brand-page-text)' }}>
                            {t(tip.ar, tip.en)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
