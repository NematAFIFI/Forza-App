import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/i18n';
import {
  Building2, CalendarDays, BarChart3, Receipt, Boxes, ShieldCheck,
  Languages, ArrowLeft, PlayCircle, CheckCircle2, Lock, Server,
  Database, Award, ChevronDown, ChevronUp, Phone, Mail, Globe,
  Video, BookOpen, Users, Settings, ClipboardCheck, Sparkles,
} from 'lucide-react';

type TFunc = (ar: string, en: string) => string;

const FEATURES = [
  {
    icon: CalendarDays,
    titleAr: 'إدارة شاملة للغرف والحجوزات',
    titleEn: 'Complete Rooms & Reservations',
    descAr: 'تحكم كامل بالحجوزات، تسجيل الوصول والمغادرة، حالة الغرف والأسعار الديناميكية من شاشة واحدة.',
    descEn: 'Full control over bookings, check-in/out, room status, and dynamic pricing all from one screen.',
    color: '#10b981',
  },
  {
    icon: BarChart3,
    titleAr: 'محاسبة متكاملة ودقيقة',
    titleEn: 'Integrated & Accurate Accounting',
    descAr: 'دليل حسابات فندقي، مراكز تكلفة، قيود تلقائية، وتقارير لحظية تظهر أرباحك وتكاليفك أولاً بأول.',
    descEn: 'Hotel-specific chart of accounts, cost centers, auto-journals, and real-time reports showing your profits and costs instantly.',
    color: '#10b981',
  },
  {
    icon: Receipt,
    titleAr: 'فواتير إلكترونية متوافقة 100% مع زاتكا',
    titleEn: '100% ZATCA E-Invoicing Compliant',
    descAr: 'إنشاء ختم إلكتروني، ربط فوري، وأرشفة آمنة طبقاً لمتطلبات الهيئة العامة للزكاة والدخل.',
    descEn: 'Secure signing, instant integration, and safe archiving fully aligned with Saudi regulations.',
    color: '#34d399',
  },
  {
    icon: Boxes,
    titleAr: 'مخزون ومشتريات ذكي',
    titleEn: 'Smart Inventory & Purchasing',
    descAr: 'متابعة الصادر والوارد، حدود إعادة الطلب، وتكلفة المبيعات، مع جرد دوري وتنبيهات تلقائية.',
    descEn: 'Track stock levels, reorder points, cost of sales, with automatic alerts and periodic inventory counts.',
    color: '#6ee7b7',
  },
  {
    icon: ShieldCheck,
    titleAr: 'أمان ونسخ احتياطي لا يضاهى',
    titleEn: 'Unmatched Security & Backups',
    descAr: 'بياناتك مشفرة ومخزنة داخل المملكة، نطبق قاعدة 3-2-1، وسجلات لا تقبل التعديل أو الحذف.',
    descEn: 'Your data is encrypted and hosted in Saudi Arabia. We apply the 3-2-1 backup rule with immutable audit logs.',
    color: '#059669',
  },
  {
    icon: Languages,
    titleAr: 'واجهة عربية وإنجليزية كاملة',
    titleEn: 'Full Arabic & English Interface',
    descAr: 'تبديل سلس بين اللغات، وتصميم يتكيف مع الجوال والشاشات المختلفة.',
    descEn: 'Smooth language switching, with a responsive design that works on mobiles and all screens.',
    color: '#a7f3d0',
  },
];

const VIDEO_SECTIONS = [
  {
    icon: BookOpen,
    titleAr: 'المستوى العام (للمبتدئين)',
    titleEn: 'General Level (Beginners)',
    color: '#10b981',
    videos: [
      { ar: 'مقدمة شاملة: نظرة عامة على واجهة النظام والتنقل بين الأقسام', en: 'Complete Intro: Overview of the system interface and navigation' },
      { ar: 'إدارة الحساب: تغيير كلمة المرور، الإعدادات الشخصية، والملف التعريفي', en: 'Account Management: Change password, personal settings, and profile' },
    ],
  },
  {
    icon: CalendarDays,
    titleAr: 'قسم الاستقبال والحجوزات',
    titleEn: 'Reception & Reservations',
    color: '#3b82f6',
    videos: [
      { ar: 'إنشاء حجز جديد: خطوة بخطوة من البداية حتى التأكيد والعربون', en: 'New Booking: Step-by-step from start to confirmation and deposit' },
      { ar: 'تسجيل الوصول والمغادرة: إجراءات الضيوف، المستندات، وإصدار الفاتورة', en: 'Check-in & Check-out: Guest procedures, documents, and invoice issuance' },
      { ar: 'إدارة الغرف: الحالة، التنظيف، النقل، والحجوزات المؤكدة', en: 'Room Management: Status, cleaning, transfers, and confirmed bookings' },
      { ar: 'التعامل مع الخزينة: قبض، دفع، تقارير الوردية، والإغلاق اليومي', en: 'Treasury: Receipts, payments, shift reports, and daily close' },
    ],
  },
  {
    icon: BarChart3,
    titleAr: 'قسم المحاسبة والتقارير',
    titleEn: 'Accounting & Reports',
    color: '#10b981',
    videos: [
      { ar: 'دليل الحسابات ومراكز التكلفة: الفهم والتصفح', en: 'Chart of Accounts & Cost Centers: Understanding and browsing' },
      { ar: 'القيود اليومية: إدخال، تعديل، واعتماد القيود', en: 'Daily Journals: Entry, editing, and approval' },
      { ar: 'الذمم المدينة والدائنة: متابعة العملاء والموردين والتسويات', en: 'Receivables & Payables: Tracking customers, vendors, and settlements' },
      { ar: 'التقارير المالية: كيفية استخراج قائمة الدخل والميزانية ومؤشرات الفندق', en: 'Financial Reports: Extracting income statement, budget, and hotel KPIs' },
      { ar: 'الضريبة والفواتير الإلكترونية: إعدادها ورفعها لزاتكا', en: 'Tax & E-Invoicing: Setup and submission to ZATCA' },
    ],
  },
  {
    icon: Boxes,
    titleAr: 'قسم المخزون والمشتريات',
    titleEn: 'Inventory & Purchasing',
    color: '#0ea5e9',
    videos: [
      { ar: 'إدارة الأصناف: تعريف المواد والوحدات والحدود', en: 'Item Management: Defining materials, units, and limits' },
      { ar: 'أوامر الشراء والاستلام: دورة العمل الكاملة من الطلب حتى الفاتورة', en: 'Purchase Orders & Receiving: Full cycle from request to invoice' },
      { ar: 'الصرف والجرد: كيفية إخراج المواد للأقسام وتسوية الفروقات', en: 'Issuing & Inventory Count: How to issue materials and reconcile variances' },
    ],
  },
  {
    icon: Users,
    titleAr: 'الإدارة والصلاحيات',
    titleEn: 'Administration & Permissions',
    color: '#dc2626',
    videos: [
      { ar: 'إدارة المستخدمين: إنشاء الحسابات وتوزيع الصلاحيات المتدرجة', en: 'User Management: Creating accounts and assigning tiered permissions' },
      { ar: 'الإعدادات العامة: الفترات المالية، الأسعار، والبيانات الأساسية', en: 'General Settings: Fiscal periods, pricing, and master data' },
      { ar: 'سجل التدقيق والأمان: مراقبة العمليات والحركات السابقة', en: 'Audit Log & Security: Monitoring operations and past activities' },
    ],
  },
];

const COMPLIANCE_BADGES = [
  { labelAr: 'هيئة الزكاة والضريبة والجمارك', labelEn: 'ZATCA', icon: Award },
  { labelAr: 'نظام حماية البيانات', labelEn: 'Data Protection Law', icon: ShieldCheck },
  { labelAr: 'المعايير الدولية للأمن السيبراني', labelEn: 'International Cybersecurity Standards', icon: Lock },
];

export default function Landing() {
  const { t, lang, setLang } = useLanguage();
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleSection = (idx: number) => {
    setExpandedSection(expandedSection === idx ? null : idx);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#071a12', fontFamily: 'Tajawal, sans-serif', color: '#fff', overflowX: 'hidden' }}>
      {/* Nav bar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(7,26,18,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
        transition: 'all 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#6ee7b7' }}>Dola</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Languages size={15} /> {lang === 'ar' ? 'EN' : 'ع'}
          </button>
          <Link to="/login" style={{ padding: '8px 20px', borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #047857)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            {t('تسجيل الدخول', 'Login')}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '100px 20px 60px',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.12, backgroundImage: 'url(https://images.pexels.com/photos/2021728/pexels-photo-2021728.jpeg?auto=compress&cs=tinysrgb&w=1920)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,26,18,0.85) 0%, rgba(10,34,24,0.6) 50%, rgba(7,26,18,0.95) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 820 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: 28 }}>
            <Sparkles size={14} color="#6ee7b7" />
            <span style={{ fontSize: 13, color: '#6ee7b7', fontWeight: 600 }}>
              {t('نظام إدارة فنادق سحابي متكامل', 'Cloud Hotel Management System')}
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, lineHeight: 1.25, marginBottom: 20 }}>
            {t(
              'الحل الشامل الذي يجمع بين التشغيل اليومي والدقة المحاسبية',
              'The all-in-one solution that combines daily operations and accounting precision'
            )}
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 19px)', color: '#9ca3af', marginBottom: 12, lineHeight: 1.6 }}>
            {t(
              'مصمم خصيصاً ليناسب فنادق السعودية والمنطقة.',
              'Designed specifically for hotels in Saudi Arabia and the region.'
            )}
          </p>
          <p style={{ fontSize: 15, color: '#6ee7b7', fontWeight: 600, marginBottom: 36 }}>
            {t('سهل الاستخدام – آمن تماماً – متوافق مع زاتكا والمعايير العالمية', 'Easy to Use – Fully Secure – ZATCA & Globally Compliant')}
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" style={{ background: 'linear-gradient(135deg, #10b981, #047857)', color: '#fff', padding: '15px 36px', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(16,185,129,0.3)', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {t('عرض تجريبي مجاني', 'Free Demo')} <ArrowLeft size={18} style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />
            </Link>
            <Link to="/login" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)', color: '#6ee7b7', padding: '15px 36px', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {t('ابدأ الآن', 'Get Started')}
            </Link>
          </div>

          {/* Trust indicators */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap' }}>
            {[
              { icon: Lock, label: t('تشفير شامل', 'End-to-end encryption') },
              { icon: Server, label: t('تخزين داخل المملكة', 'Hosted in KSA') },
              { icon: Database, label: t('نسخ 3-2-1', '3-2-1 backups') },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontSize: 13 }}>
                  <Icon size={15} color="#10b981" /> {item.label}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, marginBottom: 12 }}>
            {t('لماذا نظامنا هو الخيار الأفضل؟', 'Why Choose Our System?')}
          </h2>
          <div style={{ width: 60, height: 3, background: 'linear-gradient(90deg, #10b981, #6ee7b7)', margin: '0 auto', borderRadius: 2 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 28,
                  border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.25s', position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = `${f.color}40`; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ position: 'absolute', top: -20, [lang === 'ar' ? 'left' : 'right']: -20, width: 80, height: 80, borderRadius: '50%', background: `${f.color}10`, filter: 'blur(20px)' }} />
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, position: 'relative' }}>
                  <Icon size={26} color={f.color} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, lineHeight: 1.4 }}>{t(f.titleAr, f.titleEn)}</h3>
                <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.7 }}>{t(f.descAr, f.descEn)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Video Tutorials */}
      <section id="tutorials" style={{ padding: '80px 20px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: 16 }}>
              <Video size={15} color="#6ee7b7" />
              <span style={{ fontSize: 13, color: '#6ee7b7', fontWeight: 600 }}>{t('مركز المساعدة', 'Help Center')}</span>
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, marginBottom: 12 }}>
              {t('مركز المساعدة والفيديوهات التعليمية', 'Help & Video Tutorial Center')}
            </h2>
            <p style={{ fontSize: 16, color: '#9ca3af', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
              {t(
                'نوفر لك مكتبة فيديوهات شاملة ومحدثة، متاحة بلغتين، لتدريب فريقك ومساعدتك في أي وقت:',
                'We provide a comprehensive library of updated videos, available in both languages, to train your team anytime:'
              )}
            </p>
          </div>

          {/* Video features */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 40, flexWrap: 'wrap' }}>
            {[
              { ar: 'شرح خطوة بخطوة لكل وظيفة', en: 'Step-by-step explanation for every feature' },
              { ar: 'جودة عالية وسرعة تشغيل فائقة', en: 'High quality & fast streaming' },
              { ar: 'مقسمة حسب القسم والصلاحية', en: 'Organized by department & user role' },
            ].map((v, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(40,151,106,0.1)', border: '1px solid rgba(40,151,106,0.2)' }}>
                <CheckCircle2 size={14} color="#10b981" />
                <span style={{ fontSize: 13, color: '#9ca3af' }}>{t(v.ar, v.en)}</span>
              </div>
            ))}
          </div>

          {/* Video sections accordion */}
          <div style={{ display: 'grid', gap: 10 }}>
            {VIDEO_SECTIONS.map((section, sIdx) => {
              const Icon = section.icon;
              const isOpen = expandedSection === sIdx;
              return (
                <div key={sIdx} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <button
                    onClick={() => toggleSection(sIdx)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', textAlign: lang === 'ar' ? 'right' : 'left' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${section.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={section.color} />
                    </div>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>{t(section.titleAr, section.titleEn)}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{section.videos.length} {t('فيديو', 'videos')}</span>
                    {isOpen ? <ChevronUp size={18} color="#9ca3af" /> : <ChevronDown size={18} color="#9ca3af" />}
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 20px 16px' }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {section.videos.map((video, vIdx) => (
                          <div key={vIdx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          >
                            <PlayCircle size={22} color={section.color} style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 14, color: '#d1d5db' }}>{t(video.ar, video.en)}</span>
                            <span style={{ fontSize: 11, color: '#6b7280', padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.05)' }}>3-6 {t('د', 'min')}</span>
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
      </section>

      {/* Compliance */}
      <section style={{ padding: '60px 20px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 28, color: '#6ee7b7' }}>
          {t('متوافق مع', 'Compliant with')}
        </h3>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {COMPLIANCE_BADGES.map((badge, i) => {
            const Icon = badge.icon;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 28px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(16,185,129,0.15)', minWidth: 200 }}>
                <Icon size={28} color="#6ee7b7" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#d1d5db', textAlign: 'center' }}>
                  {t(badge.labelAr, badge.labelEn)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 20px', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(110,231,183,0.05))' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, marginBottom: 16 }}>
            {t('جاهز لإدارة فندقك باحترافية؟', 'Ready to manage your hotel professionally?')}
          </h2>
          <p style={{ fontSize: 16, color: '#9ca3af', marginBottom: 32, lineHeight: 1.6 }}>
            {t(
              'انضم إلى الفنادق التي تثق بنا — ابدأ تجربتك المجانية اليوم دون أي التزام.',
              'Join the hotels that trust us — start your free trial today with no commitment.'
            )}
          </p>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #10b981, #047857)', color: '#fff', padding: '16px 40px', borderRadius: 12, fontSize: 17, fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}>
            {t('ابدأ الآن', 'Get Started')} <ArrowLeft size={18} style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 20px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 32, marginBottom: 32 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} color="#fff" />
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#6ee7b7' }}>Dola</span>
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                {t('نظام إدارة فنادق سحابي متكامل — سهل الاستخدام، آمن تماماً، متوافق مع زاتكا والمعايير العالمية.', 'Cloud Hotel Management System — easy to use, fully secure, ZATCA & globally compliant.')}
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{t('تواصل معنا', 'Contact')}</h4>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9ca3af' }}><Phone size={14} color="#6ee7b7" /> 0539124263</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9ca3af' }}><Mail size={14} color="#6ee7b7" /> info@dola.com</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9ca3af' }}><Globe size={14} color="#6ee7b7" /> www.dola.com</div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{t('الامتثال', 'Compliance')}</h4>
              <div style={{ display: 'grid', gap: 6 }}>
                {COMPLIANCE_BADGES.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9ca3af' }}>
                    <CheckCircle2 size={12} color="#10b981" /> {t(b.labelAr, b.labelEn)}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ fontSize: 12, color: '#6b7280' }}>© 2026 Dola. {t('جميع الحقوق محفوظة.', 'All rights reserved.')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
