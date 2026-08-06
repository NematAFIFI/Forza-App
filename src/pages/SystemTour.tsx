import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/i18n';
import {
  Play, Pause, Volume2, VolumeX, Maximize2, ChevronLeft, ChevronRight,
  Calendar, BedDouble, Users, Receipt, BarChart3, UtensilsCrossed, Dumbbell,
  Package, Settings, ShieldCheck, Zap, Globe, Sparkles, Brain, Lock,
  CreditCard, Building2, ClipboardList, Star, ArrowLeft, CheckCircle2,
  LayoutDashboard, Briefcase, Server, Wifi, Clock, TrendingUp, X, AudioLines,
} from 'lucide-react';

type TFunc = (ar: string, en: string) => string;

interface FeatureSection {
  id: string;
  icon: typeof Calendar;
  color: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  image: string;
  points: { ar: string; en: string }[];
  videoLabelAr: string;
  videoLabelEn: string;
}

const SECTIONS: FeatureSection[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    color: '#3b82f6',
    titleAr: 'لوحة التحكم الرئيسية',
    titleEn: 'Main Dashboard',
    descAr: 'نظرة شاملة فورية على كل ما يهمك — الإيرادات، الإشغال، الحجوزات الأخيرة، والتنبيهات في شاشة واحدة أنيقة.',
    descEn: 'A comprehensive instant overview of everything that matters — revenue, occupancy, recent bookings, and alerts in one elegant screen.',
    image: 'https://images.pexels.com/photos/7668074/pexels-photo-7668074.jpeg?auto=compress&cs=tinysrgb&w=1260',
    points: [
      { ar: 'مؤشرات حية للإيرادات ونسبة الإشغال', en: 'Live KPIs for revenue and occupancy' },
      { ar: 'مخطط بياني للحجوزات الشهرية', en: 'Monthly bookings chart' },
      { ar: 'تنبيهات فورية للمهام العاجلة', en: 'Instant alerts for urgent tasks' },
      { ar: 'وصول سريع لكل الأقسام', en: 'Quick access to all sections' },
    ],
    videoLabelAr: 'جولة في لوحة التحكم',
    videoLabelEn: 'Dashboard tour',
  },
  {
    id: 'bookings',
    icon: Calendar,
    color: '#8b5cf6',
    titleAr: 'إدارة الحجوزات',
    titleEn: 'Bookings Management',
    descAr: 'نظام حجوزات قوي يدعم الحجز الفردي والجماعي، مع تقويم بصري تفاعلي يعرض كل الغرف والتواريخ بوضوح.',
    descEn: 'A powerful booking system supporting individual and group reservations, with an interactive visual calendar showing all rooms and dates clearly.',
    image: 'https://images.pexels.com/photos/5439381/pexels-photo-5439381.jpeg?auto=compress&cs=tinysrgb&w=1260',
    points: [
      { ar: 'حجز فوري مع تأكيد أو قيد المراجعة', en: 'Instant booking with confirmation or pending review' },
      { ar: 'تقويم بصري لكل الوحدات', en: 'Visual calendar for all units' },
      { ar: 'تتبع حالة الحجز من البداية للنهاية', en: 'Track booking status from start to finish' },
      { ar: 'حساب العمولات تلقائياً', en: 'Automatic commission calculation' },
    ],
    videoLabelAr: 'شرح نظام الحجوزات',
    videoLabelEn: 'Bookings system walkthrough',
  },
  {
    id: 'units',
    icon: BedDouble,
    color: '#10b981',
    titleAr: 'إدارة الوحدات والغرف',
    titleEn: 'Units & Rooms Management',
    descAr: 'تحكم كامل في كل غرفة — حالتها (متاحة، محجوزة، صيانة، تنظيف)، سعتها، سعرها اليومي والشهري، وملاحظاتها.',
    descEn: 'Full control over every room — its status (available, reserved, maintenance, cleaning), capacity, daily and monthly rate, and notes.',
    image: 'https://images.pexels.com/photos/2029698/pexels-photo-2029698.jpeg?auto=compress&cs=tinysrgb&w=1260',
    points: [
      { ar: 'حالات متعددة: متاحة، محجوزة، صيانة، تنظيف', en: 'Multiple statuses: available, reserved, maintenance, cleaning' },
      { ar: 'أسعار يومية وشهرية لكل وحدة', en: 'Daily and monthly rates per unit' },
      { ar: 'تصنيف حسب النوع: غرفة، جناح، استوديو', en: 'Classification by type: room, suite, studio' },
      { ar: 'ربط مباشر مع الحجوزات', en: 'Direct link with bookings' },
    ],
    videoLabelAr: 'إدارة الغرف والوحدات',
    videoLabelEn: 'Rooms & units management',
  },
  {
    id: 'customers',
    icon: Users,
    color: '#f59e0b',
    titleAr: 'إدارة النزلاء',
    titleEn: 'Guest Management',
    descAr: 'ملف كامل لكل نزيل — بياناته، هويتته، جنسيته، تاريخ حجوزاته، وملاحظات خاصة لتقديم خدمة شخصية مميزة.',
    descEn: 'A complete profile for every guest — their data, ID, nationality, booking history, and special notes for personalized service.',
    image: 'https://images.pexels.com/photos/8090298/pexels-photo-8090298.jpeg?auto=compress&cs=tinysrgb&w=1260',
    points: [
      { ar: 'ملف شامل لكل نزيل مع صورة', en: 'Complete profile for each guest with photo' },
      { ar: 'تاريخ الحجوزات والمدفوعات', en: 'Booking and payment history' },
      { ar: 'تخزين رقم الهوية والجنسية', en: 'Store ID number and nationality' },
      { ar: 'بحث سريع بالاسم أو الهاتف', en: 'Quick search by name or phone' },
    ],
    videoLabelAr: 'إدارة بيانات النزلاء',
    videoLabelEn: 'Guest data management',
  },
  {
    id: 'invoices',
    icon: Receipt,
    color: '#ef4444',
    titleAr: 'الفواتير الإلكترونية',
    titleEn: 'E-Invoices',
    descAr: 'نظام فوترة متكامل متوافق مع متطلبات الزكاة والضريبة، مع توقيع رقمي وأرشفة إلكترونية وتقارير ضريبية جاهزة.',
    descEn: 'An integrated invoicing system compliant with ZATCA requirements, with digital signing, electronic archiving, and ready tax reports.',
    image: 'https://images.pexels.com/photos/669454/pexels-photo-669454.jpeg?auto=compress&cs=tinysrgb&w=1260',
    points: [
      { ar: 'متوافق مع زاتكا (ZATCA)', en: 'ZATCA compliant' },
      { ar: 'توقيع رقمي وأرشفة لمدة 7 سنوات', en: 'Digital signing and 7-year archiving' },
      { ar: 'دعم متعدد العملات واللغات', en: 'Multi-currency and multi-language support' },
      { ar: 'تقارير ضريبية جاهزة للرفع', en: 'Ready tax reports for submission' },
    ],
    videoLabelAr: 'كيف تعمل الفوترة الإلكترونية',
    videoLabelEn: 'How e-invoicing works',
  },
  {
    id: 'reports',
    icon: BarChart3,
    color: '#06b6d4',
    titleAr: 'التقارير والتحليلات',
    titleEn: 'Reports & Analytics',
    descAr: 'تقارير تفصيلية قابلة للتصدير — إيرادات، مصروفات، إشغال، عمولات — مع رسوم بيانية تفاعلية تساعدك على القرار.',
    descEn: 'Detailed exportable reports — revenue, expenses, occupancy, commissions — with interactive charts to help you decide.',
    image: 'https://images.pexels.com/photos/7681091/pexels-photo-7681091.jpeg?auto=compress&cs=tinysrgb&w=1260',
    points: [
      { ar: 'تقارير الإيرادات والمصروفات', en: 'Revenue and expense reports' },
      { ar: 'تحليل نسبة الإشغال شهرياً وسنوياً', en: 'Occupancy analysis monthly and yearly' },
      { ar: 'تصدير PDF و Excel', en: 'Export to PDF and Excel' },
      { ar: 'رسوم بيانية تفاعلية', en: 'Interactive charts' },
    ],
    videoLabelAr: 'استخراج التقارير',
    videoLabelEn: 'Generating reports',
  },
  {
    id: 'restaurant',
    icon: UtensilsCrossed,
    color: '#ec4899',
    titleAr: 'إدارة المطعم',
    titleEn: 'Restaurant Management',
    descAr: 'قائمة طعام رقمية، طلبات من الغرف أو من المطعم مباشرة، وحساب الفاتورة وإضافتها لإقامة النزيل تلقائياً.',
    descEn: 'Digital menu, room service or in-restaurant orders, with bill calculation and automatic addition to guest stay.',
    image: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=1260',
    points: [
      { ar: 'قائمة طعام رقمية كاملة', en: 'Complete digital menu' },
      { ar: 'طلبات الغرف (Room Service)', en: 'Room service orders' },
      { ar: 'ربط الفاتورة بإقامة النزيل', en: 'Link bill to guest stay' },
      { ar: 'تقارير مبيعات المطعم', en: 'Restaurant sales reports' },
    ],
    videoLabelAr: 'إدارة المطعم والطلبات',
    videoLabelEn: 'Restaurant & orders management',
  },
  {
    id: 'gym',
    icon: Dumbbell,
    color: '#84cc16',
    titleAr: 'إدارة النادي الرياضي',
    titleEn: 'Gym Management',
    descAr: 'اشتراكات شهرية أو يومية للنادي، تتبع الأعضاء، ومتابعة المدفوعات والتجديدات في مكان واحد.',
    descEn: 'Monthly or daily gym memberships, member tracking, and payment and renewal management in one place.',
    image: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=1260',
    points: [
      { ar: 'اشتراكات شهرية ويومية', en: 'Monthly and daily subscriptions' },
      { ar: 'تتبع الأعضاء والحضور', en: 'Member and attendance tracking' },
      { ar: 'تنبيهات تجديد الاشتراك', en: 'Subscription renewal alerts' },
      { ar: 'ربط المدفوعات بالنظام المحاسبي', en: 'Link payments to accounting' },
    ],
    videoLabelAr: 'إدارة اشتراكات النادي',
    videoLabelEn: 'Gym subscriptions management',
  },
  {
    id: 'inventory',
    icon: Package,
    color: '#f97316',
    titleAr: 'المخزون والمشتريات',
    titleEn: 'Inventory & Purchases',
    descAr: 'تتبع دقيق لكل صنف — الكمية، الحد الأدنى، التنبيهات عند النفاد، وسجل حركة المخزون الوارد والصادر.',
    descEn: 'Precise tracking of every item — quantity, minimum level, low-stock alerts, and inbound/outbound movement log.',
    image: 'https://images.pexels.com/photos/4391471/pexels-photo-4391471.jpeg?auto=compress&cs=tinysrgb&w=1260',
    points: [
      { ar: 'تنبيهات النقص التلقائية', en: 'Automatic low-stock alerts' },
      { ar: 'سجل حركة كامل (وارد/صادر)', en: 'Full movement log (in/out)' },
      { ar: 'ربط بالخدمات والمطعم', en: 'Linked to services and restaurant' },
      { ar: 'تقارير جرد دورية', en: 'Periodic inventory reports' },
    ],
    videoLabelAr: 'إدارة المخزون والتنبيهات',
    videoLabelEn: 'Inventory & alerts management',
  },
  {
    id: 'ai',
    icon: Brain,
    color: '#8b5cf6',
    titleAr: 'المساعد الذكي',
    titleEn: 'Smart Assistant',
    descAr: 'اسأل بالعربية أو الإنجليزية — صوتاً أو نصاً — عن حالة الغرف، الإيرادات، الحجوزات، وكل ما يهمك. مساعد شخصي سريع.',
    descEn: 'Ask in Arabic or English — voice or text — about room status, revenue, bookings, and everything that matters. A fast personal assistant.',
    image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1260',
    points: [
      { ar: 'إدخال صوتي ونصي بالعربية', en: 'Voice and text input in Arabic' },
      { ar: 'إجابات فورية من بياناتك', en: 'Instant answers from your data' },
      { ar: 'تقارير سريعة بالسؤال', en: 'Quick reports by asking' },
      { ar: 'بحث عن العملاء والحجوزات', en: 'Search customers and bookings' },
    ],
    videoLabelAr: 'المساعد الذكي بالعمل',
    videoLabelEn: 'Smart Assistant in action',
  },
  {
    id: 'integrations',
    icon: Globe,
    color: '#0ea5e9',
    titleAr: 'التكامل والواجهات',
    titleEn: 'Integrations & Interfaces',
    descAr: 'اربط نظامك مع منصات الحجز (Booking، Agoda)، الأنظمة المحاسبية (قيود، سماك)، بوابات الدفع، وأجهزة الفندق — بضغطة زر.',
    descEn: 'Connect your system with booking platforms (Booking, Agoda), accounting software (Qoyod, SMACC), payment gateways, and hotel hardware — in one click.',
    image: 'https://images.pexels.com/photos/7988079/pexels-photo-7988079.jpeg?auto=compress&cs=tinysrgb&w=1260',
    points: [
      { ar: 'منصات الحجز: Booking، Agoda، Expedia', en: 'Booking platforms: Booking, Agoda, Expedia' },
      { ar: 'الأنظمة المحاسبية: قيود، سماك، Oracle', en: 'Accounting: Qoyod, SMACC, Oracle' },
      { ar: 'بوابات الدفع: مدى، Visa، Apple Pay', en: 'Payments: Mada, Visa, Apple Pay' },
      { ar: 'أجهزة: أقفال، طابعات، أجهزة جرد', en: 'Hardware: locks, printers, scanners' },
    ],
    videoLabelAr: 'ربط التكاملات الخارجية',
    videoLabelEn: 'Connecting external integrations',
  },
  {
    id: 'security',
    icon: ShieldCheck,
    color: '#dc2626',
    titleAr: 'الأمان وسجل التدقيق',
    titleEn: 'Security & Audit Log',
    descAr: 'كل حركة تُسجل ببصمة زمنية ومستخدم — تعديل، حذف، خصم — ولا يمكن حذفها. صالح كمستند قانوني أمام الجهات.',
    descEn: 'Every action is logged with a timestamp and user — edit, delete, discount — and cannot be deleted. Valid as a legal document before authorities.',
    image: 'https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=1260',
    points: [
      { ar: 'سجل تدقيق لا يُحذف', en: 'Immutable audit log' },
      { ar: 'بصمة زمنية ومستخدم لكل عملية', en: 'Timestamp and user for every action' },
      { ar: 'صلاحيات متعددة المستويات', en: 'Multi-level permissions' },
      { ar: 'حماية بيانات بمعايير عالمية', en: 'Global-standard data protection' },
    ],
    videoLabelAr: 'نظام الأمان والتدقيق',
    videoLabelEn: 'Security & audit system',
  },
];

const HERO_BG = 'https://images.pexels.com/photos/3295544/pexels-photo-3295544.jpeg?auto=compress&cs=tinysrgb&w=1920';

const NARRATION_TEXT: Record<string, string> = {
  dashboard: 'أهلاً بكم في لوحة التحكم الرئيسية لنظام رواق. من هنا تحصلون على نظرة شاملة وفورية لكل ما يهمكم. مؤشرات حية للإيرادات ونسبة الإشغال، مخططات بيانية للحجوزات الشهرية، تنبيهات فورية للمهام العاجلة، ووصول سريع لكل الأقسام في شاشة واحدة أنيقة. كل ما تحتاجونه لاتخاذ القرار في مكان واحد.',
  bookings: 'نظام الحجوزات في رواق قوي ومرن. يدعم الحجز الفردي والجماعي، مع تقويم بصري تفاعلي يعرض كل الغرف والتواريخ بوضوح. يمكنكم تتبع حالة الحجز من البداية للنهاية، والحجز فوري مع تأكيد أو قيد المراجعة، كما يحسب العمولات تلقائياً. كل شيء منظم وسهل الوصول.',
  units: 'إدارة الوحدات والغرف في رواق تمنحكم تحكماً كاملاً في كل غرفة. حالتها سواء كانت متاحة أو محجوزة أو في الصيانة أو التنظيف، سعتها، سعرها اليومي والشهري، وملاحظاتها. التصنيف حسب النوع سواء غرفة أو جناح أو استوديو، مع ربط مباشر مع الحجوزات. تحكم دقيق في كل تفاصيل منشأتكم.',
  customers: 'ملف كامل لكل نزيل في نظام رواق. بياناته، هويتته، جنسيته، تاريخ حجوزاته، وملاحظات خاصة لتقديم خدمة شخصية مميزة. يمكنكم البحث السريع بالاسم أو الهاتف، وتتبع تاريخ الحجوزات والمدفوعات لكل نزيل. كل ما يلزم لتقديم تجربة ضيافة لا تُنسى.',
  invoices: 'نظام الفوترة الإلكترونية في رواق متكامل ومتوافق تماماً مع متطلبات الزكاة والضريبة. يُصدر التوقيع الرقمي ويخزنه داخلياً، مع أرشفة إلكترونية لمدة سبع سنوات غير قابلة للتعديل. يدعم متعدد العملات واللغات، ويوفر تقارير ضريبية جاهزة للرفع مباشرة لهيئة الزكاة بنقرة زر.',
  reports: 'تقارير رواق تفصيلية وقابلة للتصدير. إيرادات، مصروفات، إشغال، وعمولات، كلها معروضة برسوم بيانية تفاعلية تساعدكم على القرار. يمكنكم تحليل نسبة الإشغال شهرياً وسنوياً، وتصدير التقارير بصيغة بي دي إف أو إكسيل. كل الأرقام التي تحتاجونها بين أيديكم.',
  restaurant: 'إدارة المطعم في رواق متكاملة بالكامل. قائمة طعام رقمية كاملة، طلبات من الغرف أو من المطعم مباشرة، وحساب الفاتورة وإضافتها لإقامة النزيل تلقائياً. تقارير مبيعات المطعم متاحة دائماً، مع ربط مباشر بالنظام المحاسبي. كل ما يلزم لتشغيل مطعمكم باحترافية.',
  gym: 'إدارة النادي الرياضي في رواق توفر اشتراكات شهرية أو يومية للأعضاء. تتبع الأعضاء والحضور، ومتابعة المدفوعات والتجديدات في مكان واحد. تنبيهات تلقائية لتجديد الاشتراك، مع ربط المدفوعات بالنظام المحاسبي. إدارة كاملة لمنشأتكم الرياضية.',
  inventory: 'المخزون والمشتريات في رواق يوفر تتبعاً دقيقاً لكل صنف. الكمية، الحد الأدنى، التنبيهات التلقائية عند النفاد، وسجل حركة كامل للوارد والصادر. مرتبط بالخدمات والمطعم، مع تقارير جرد دورية. لن ينفد منكم مخزون بعد اليوم.',
  ai: 'المساعد الذكي في رواق هو شريككم في القرار. اسألوه بالعربية أو الإنجليزية، صوتاً أو نصاً، عن حالة الغرف، الإيرادات، الحجوزات، وكل ما يهمكم. إجابات فورية من بياناتكم الحقيقية، تقارير سريعة بالسؤال، وبحث عن العملاء والحجوزات. مساعد شخصي سريع يوفر وقتكم وجهدم.',
  integrations: 'مركز التكامل في رواق يربط نظامكم مع العالم الخارجي. منصات الحجز مثل بوكنج وأجودا وإكسبيديا، الأنظمة المحاسبية مثل قيود وسماك وأوراكل، بوابات الدفع مثل مدى وفيزا وأبل باي، وأجهزة الفندق من أقفال وطابعات وأجهزة جرد. كل ذلك بضغطة زر دون تعقيد برمجي.',
  security: 'الأمان وسجل التدقيق في رواق يضمن لكم حماية قانونية كاملة. كل حركة تُسجل ببصمة زمنية ومستخدم، سواء تعديل أو حذف أو خصم، ولا يمكن لأحد حتى المطور حذفها. صلاحيات متعددة المستويات، وحماية بيانات بمعايير عالمية. صالح كمستند قانوني أمام الجهات.',
};

function pickArabicMaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const arabicVoices = voices.filter((v) => v.lang.startsWith('ar'));
  if (arabicVoices.length === 0) return null;
  const maleHints = ['male', 'Maged', 'Naayf', 'Tarik', 'Amir', 'Hamed'];
  for (const hint of maleHints) {
    const v = arabicVoices.find((av) => av.name.toLowerCase().includes(hint.toLowerCase()));
    if (v) return v;
  }
  return arabicVoices[0];
}

function VideoPlayer({ section, t }: { section: FeatureSection; t: TFunc }) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [narrating, setNarrating] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const check = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) setVoicesReady(true);
    };
    check();
    window.speechSynthesis.addEventListener('voiceschanged', check);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check);
  }, []);

  const stopNarration = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setNarrating(false);
  }, []);

  const startNarration = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const text = NARRATION_TEXT[section.id];
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ar-SA';
    utter.rate = 0.92;
    utter.pitch = 0.82;
    utter.volume = 1;
    const voice = pickArabicMaleVoice();
    if (voice) utter.voice = voice;
    utter.onend = () => setNarrating(false);
    utter.onerror = () => setNarrating(false);
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setNarrating(true);
  }, [section.id]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      stopNarration();
    } else {
      void videoRef.current.play();
      startNarration();
    }
    setPlaying(!playing);
  };

  const toggleNarration = () => {
    if (narrating) {
      stopNarration();
    } else {
      startNarration();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  };

  const fullscreen = () => {
    if (videoRef.current) void videoRef.current.requestFullscreen();
  };

  useEffect(() => {
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, []);

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#0f172a', aspectRatio: '16/9' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        poster={section.image}
        muted={muted}
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => { setPlaying(false); }}
        onEnded={() => { setPlaying(false); stopNarration(); }}
      >
        <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
      </video>

      {!playing && (
        <div
          onClick={togglePlay}
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(0,0,0,0.55), rgba(0,0,0,0.3))', cursor: 'pointer',
          }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)', transition: 'transform 0.2s',
          }}>
            <Play size={30} fill={section.color} color={section.color} style={{ marginLeft: 4 }} />
          </div>
          <div style={{
            position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', color: '#fff',
            fontSize: 14, fontWeight: 600, textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            {t(section.videoLabelAr, section.videoLabelEn)}
          </div>
          {narrating && (
            <div style={{
              position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 20, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11,
            }}>
              <AudioLines size={14} className="animate-pulse" color="#60a5fa" />
              {t('التعليق الصوتي يعمل', 'Narrating')}
            </div>
          )}
        </div>
      )}

      {/* Controls bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
        opacity: playing ? 1 : 0, transition: 'opacity 0.2s',
      }}>
        <button onClick={togglePlay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button onClick={toggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button
          onClick={toggleNarration}
          title={t('التعليق الصوتي العربي', 'Arabic voice narration')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: narrating ? '#60a5fa' : '#fff',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <AudioLines size={20} className={narrating ? 'animate-pulse' : ''} />
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={fullscreen} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
          <Maximize2 size={18} />
        </button>
      </div>
    </div>
  );
}

export default function SystemTour() {
  const { t, lang } = useLanguage();
  const [activeSection, setActiveSection] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (id: string, index: number) => {
    setActiveSection(index);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const next = () => {
    if (activeSection < SECTIONS.length - 1) {
      const s = SECTIONS[activeSection + 1];
      scrollToSection(s.id, activeSection + 1);
    }
  };
  const prev = () => {
    if (activeSection > 0) {
      const s = SECTIONS[activeSection - 1];
      scrollToSection(s.id, activeSection - 1);
    }
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ fontFamily: 'Tajawal, sans-serif', background: '#0a0f1c', color: '#fff', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{ position: 'relative', minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,28,0.82)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to top, #0a0f1c, transparent)' }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 800, padding: '0 24px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 20,
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)',
            color: '#93c5fd', fontSize: 13, marginBottom: 20,
          }}>
            <Sparkles size={14} />
            <span>{t('دليل النظام الكامل', 'Complete System Guide')}</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(2.2rem,5vw,3.5rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: 16,
            background: 'linear-gradient(135deg, #fff 0%, #93c5fd 50%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {t('تعرف على نظام رواق بالتفصيل', 'Explore Riwaaq System in Detail')}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#94a3b8', maxWidth: 600, margin: '0 auto 28px' }}>
            {t(
              'جولة شاملة بكل ميزة — صور وفيديوهات توضح كيف يعمل النظام خطوة بخطوة. مصمم للمالك والمشتري على حد سواء.',
              'A comprehensive tour of every feature — images and videos showing how the system works step by step. Designed for owners and buyers alike.'
            )}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => scrollToSection(SECTIONS[0].id, 0)}
              style={{
                padding: '14px 32px', borderRadius: 14, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff',
                boxShadow: '0 8px 32px rgba(59,130,246,0.4)', transition: 'transform 0.2s',
              }}
            >
              {t('ابدأ الجولة', 'Start Tour')}
            </button>
            <Link
              to="/portal/dashboard"
              style={{
                padding: '14px 32px', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              {t('الذهاب للوحة التحكم', 'Go to Dashboard')}
              <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section style={{ padding: '40px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
          {[
            { icon: Briefcase, value: '12+', label: t('وحدة رئيسية', 'Core modules') },
            { icon: Globe, value: '14+', label: t('تكامل خارجي', 'External integrations') },
            { icon: ShieldCheck, value: 'ZATCA', label: t('متوافق قانونياً', 'Legally compliant') },
            { icon: Clock, value: '24/7', label: t('دعم متواصل', 'Continuous support') },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={22} color="#60a5fa" />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Side nav (sticky) */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,15,28,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 24px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'thin' }}>
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            const active = activeSection === i;
            return (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id, i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', border: 'none',
                  background: active ? `${s.color}25` : 'transparent',
                  color: active ? s.color : '#94a3b8',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={14} />
                {t(s.titleAr, s.titleEn)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feature sections */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        {SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          const reverse = idx % 2 === 1;
          return (
            <div
              key={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el; }}
              style={{
                marginBottom: 80, scrollMarginTop: 70,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center',
                direction: lang === 'ar' ? 'rtl' : 'ltr',
              }}
            >
              {/* Text side */}
              <div style={{ order: reverse ? 2 : 1 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 12,
                  background: `${section.color}15`, marginBottom: 16,
                }}>
                  <Icon size={20} color={section.color} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: section.color, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {String(idx + 1).padStart(2, '0')} / {String(SECTIONS.length).padStart(2, '0')}
                  </span>
                </div>
                <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 800, marginBottom: 12, color: '#fff', lineHeight: 1.3 }}>
                  {t(section.titleAr, section.titleEn)}
                </h2>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: '#94a3b8', marginBottom: 20 }}>
                  {t(section.descAr, section.descEn)}
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                  {section.points.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle2 size={18} color={section.color} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: '#cbd5e1' }}>{t(p.ar, p.en)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Media side */}
              <div style={{ order: reverse ? 1 : 2 }}>
                {/* Image with click-to-zoom */}
                <div
                  onClick={() => setLightbox(section.image)}
                  style={{
                    position: 'relative', borderRadius: 16, overflow: 'hidden', cursor: 'zoom-in',
                    marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <img
                    src={section.image}
                    alt={t(section.titleAr, section.titleEn)}
                    style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block', transition: 'transform 0.4s' }}
                    loading="lazy"
                  />
                  <div style={{
                    position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent 40%)',
                    opacity: 0, transition: 'opacity 0.2s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 12, right: 12, padding: '6px 12px', borderRadius: 8,
                    background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Maximize2 size={12} /> {t('تكبير', 'Zoom')}
                  </div>
                </div>

                {/* Video */}
                <VideoPlayer section={section} t={t} />
              </div>
            </div>
          );
        })}

        {/* Nav arrows */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button
            onClick={prev}
            disabled={activeSection === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
              color: activeSection === 0 ? '#475569' : '#fff', cursor: activeSection === 0 ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >
            <ChevronRight size={18} style={{ transform: lang === 'ar' ? 'none' : 'scaleX(-1)' }} />
            {t('السابق', 'Previous')}
          </button>
          <button
            onClick={next}
            disabled={activeSection === SECTIONS.length - 1}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
              color: activeSection === SECTIONS.length - 1 ? '#475569' : '#fff',
              cursor: activeSection === SECTIONS.length - 1 ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >
            {t('التالي', 'Next')}
            <ChevronLeft size={18} style={{ transform: lang === 'ar' ? 'none' : 'scaleX(-1)' }} />
          </button>
        </div>
      </div>

      {/* Owner vs Buyer comparison */}
      <section style={{ padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 800, textAlign: 'center', marginBottom: 12, color: '#fff' }}>
            {t('لمن هذا النظام؟', 'Who Is This System For?')}
          </h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 15, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
            {t('رواق يخدم المالك والمشتري بفاعلية متساوية', 'Riwaaq serves owners and buyers with equal effectiveness')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Owner card */}
            <div style={{ padding: 28, borderRadius: 20, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={24} color="#60a5fa" />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{t('للمالك', 'For Owners')}</h3>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { ar: 'إدارة كل الفنادق من لوحة واحدة', en: 'Manage all hotels from one dashboard' },
                  { ar: 'متابعة الإيرادات والمصروفات لحظياً', en: 'Track revenue and expenses in real time' },
                  { ar: 'تقارير مالية شاملة قابلة للتصدير', en: 'Comprehensive exportable financial reports' },
                  { ar: 'إدارة المشترين والاشتراكات', en: 'Manage buyers and subscriptions' },
                  { ar: 'سجل تدقيق قانوني كامل', en: 'Full legal audit log' },
                  { ar: 'نسخ احتياطي واستعادة ذاتية', en: 'Self backup and restore' },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={16} color="#60a5fa" />
                    <span style={{ fontSize: 14, color: '#cbd5e1' }}>{t(p.ar, p.en)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Buyer card */}
            <div style={{ padding: 28, borderRadius: 20, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={24} color="#a78bfa" />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{t('للمشتري', 'For Buyers')}</h3>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { ar: 'إدارة فندقك اليومية بالكامل', en: 'Full daily hotel management' },
                  { ar: 'حجوزات وغرف ونزلاء وفواتير', en: 'Bookings, rooms, guests, invoices' },
                  { ar: 'مساعد ذكي بالعربية', en: 'Arabic smart assistant' },
                  { ar: 'تكامل مع منصات الحجز والدفع', en: 'Integrate booking & payment platforms' },
                  { ar: 'بوابة ضيف ذاتية', en: 'Self-service guest portal' },
                  { ar: 'مطعم ونادٍ رياضي ومخزون', en: 'Restaurant, gym, and inventory' },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={16} color="#a78bfa" />
                    <span style={{ fontSize: 14, color: '#cbd5e1' }}>{t(p.ar, p.en)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 24px 80px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: 48, borderRadius: 24, background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))', border: '1px solid rgba(59,130,246,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16 }}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={20} fill="#fbbf24" color="#fbbf24" />
            ))}
          </div>
          <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 800, marginBottom: 12, color: '#fff' }}>
            {t('جاهز لتجربة النظام؟', 'Ready to Experience the System?')}
          </h2>
          <p style={{ fontSize: 15, color: '#94a3b8', marginBottom: 28 }}>
            {t('ادخل لوحة التحكم الآن واستكشف كل الميزات بنفسك', 'Enter the dashboard now and explore all features yourself')}
          </p>
          <Link
            to="/portal/dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', borderRadius: 14,
              fontSize: 16, fontWeight: 700, textDecoration: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff',
              boxShadow: '0 8px 32px rgba(59,130,246,0.4)',
            }}
          >
            {t('ابدأ الآن', 'Get Started')}
            <ArrowLeft size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#475569' }}>
          © {new Date().getFullYear()} {t('رواق — نظام إدارة فندقية متكامل', 'Riwaaq — Integrated Hotel Management System')}
        </p>
      </footer>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={24} />
          </button>
          <img src={lightbox} alt="" style={{ maxWidth: '90%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}
