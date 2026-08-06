import { Link } from 'react-router-dom';
import {
  Building2,
  Phone,
  Mail,
  Globe,
  Info,
  Star,
  ShieldCheck,
  Zap,
  Heart,
  ArrowLeft,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';

type TFunc = (ar: string, en: string) => string;

const HERO_BG =
  'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=1920';

const VALUES_DATA = [
  { icon: ShieldCheck, titleAr: 'الأمان والموثوقية', titleEn: 'Security & Reliability', descAr: 'حماية كاملة لبياناتك مع نظام صلاحيات متقدم', descEn: 'Complete protection for your data with an advanced permissions system', color: 'var(--brand-500)' },
  { icon: Zap, titleAr: 'سرعة وكفاءة', titleEn: 'Speed & Efficiency', descAr: 'أداء فائق وإدارة لحظية لكل عملياتك الفندقية', descEn: 'Superior performance and real-time management of all your hotel operations', color: 'var(--brand-500)' },
  { icon: Heart, titleAr: 'تجربة استثنائية', titleEn: 'Exceptional Experience', descAr: 'واجهة أنيقة وسهلة الاستخدام تليق بمستوى ٧ نجوم', descEn: 'An elegant and easy-to-use interface worthy of a seven-star level', color: '#ec4899' },
  { icon: TrendingUp, titleAr: 'نمو مستمر', titleEn: 'Continuous Growth', descAr: 'تقارير وتحليلات تساعدك على اتخاذ قرارات أفضل', descEn: 'Reports and analytics that help you make better decisions', color: 'var(--brand-500)' },
];

const STATS_DATA = [
  { value: '+500', labelAr: 'فندق يثق بنا', labelEn: 'Hotels trust us' },
  { value: '+50K', labelAr: 'حجز شهرياً', labelEn: 'Monthly bookings' },
  { value: '99.9%', labelAr: 'وقت تشغيل مضمون', labelEn: 'Guaranteed uptime' },
  { value: '24/7', labelAr: 'دعم فني متواصل', labelEn: '24/7 technical support' },
];

export default function AboutRiwaaq() {
  const { t } = useLanguage();

  const VALUES = VALUES_DATA.map((v) => ({
    icon: v.icon,
    title: t(v.titleAr, v.titleEn),
    desc: t(v.descAr, v.descEn),
    color: v.color,
  }));

  const STATS = STATS_DATA.map((s) => ({
    value: s.value,
    label: t(s.labelAr, s.labelEn),
  }));

  return (
    <div
      className="min-h-screen text-white"
      dir="rtl"
      style={{ fontFamily: 'Tajawal, sans-serif', background: 'var(--brand-darkest)' }}
    >
      {/* ─── Hero ─── */}
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(var(--brand-rgb-dark),0.78)' }} />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(var(--brand-rgb),0.18) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(to top, var(--brand-darkest), transparent)' }}
        />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm"
            style={{
              background: 'rgba(var(--brand-rgb),0.15)',
              border: '1px solid rgba(var(--brand-rgb),0.4)',
              color: '#a7f3d0',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Info size={14} />
            <span>{t('من نحن', 'About Us')}</span>
          </div>

          <h1
            className="mb-4 font-bold leading-tight"
            style={{
              fontSize: 'clamp(2.5rem,6vw,4rem)',
              background: 'linear-gradient(135deg,var(--brand-100) 0%,var(--brand-500) 50%,#ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t('عن رواق', 'About Riwaaq')}
          </h1>

          <p
            className="mx-auto max-w-2xl text-base leading-8 md:text-lg"
            style={{ color: '#94a3b8' }}
          >
            {t(
              'نظام إدارة فندقية فاخر صُمم خصيصاً للمنشآت السياحية في المملكة العربية السعودية — يجمع بين الأناقة والاحترافية مع دعم كامل لمتطلبات الفوترة الإلكترونية ZATCA.',
              'A luxury hotel management system designed specifically for tourism establishments in the Kingdom of Saudi Arabia — combining elegance and professionalism with full support for ZATCA e-invoicing requirements.'
            )}
          </p>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section
        className="relative py-14"
        style={{ background: 'linear-gradient(135deg,rgba(var(--brand-rgb),0.08),rgba(var(--brand-rgb),0.08))' }}
      >
        <div
          className="absolute inset-0"
          style={{ borderTop: '1px solid rgba(var(--brand-rgb),0.15)', borderBottom: '1px solid rgba(var(--brand-rgb),0.15)' }}
        />
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <span
                  className="text-3xl font-black md:text-4xl"
                  style={{
                    background: 'linear-gradient(135deg,var(--brand-500),#ec4899)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {s.value}
                </span>
                <span className="mt-2 text-sm" style={{ color: '#94a3b8' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Description ─── */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
              style={{ background: 'rgba(var(--brand-rgb),0.12)', border: '1px solid rgba(var(--brand-rgb),0.3)', color: '#a5b4fc' }}
            >
              <Sparkles size={14} />
              <span>{t('رسالتنا', 'Our Mission')}</span>
            </div>
            <h2
              className="text-3xl font-bold md:text-4xl"
              style={{ color: 'var(--brand-100)' }}
            >
              {t('نظام متكامل يليق بمستوى سبع نجوم', 'An integrated system worthy of a seven-star level')}
            </h2>
          </div>

          <div
            className="rounded-3xl p-10"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(var(--brand-rgb),0.15)',
            }}
          >
            <p className="text-base leading-9" style={{ color: '#cbd5e1' }}>
              {t(
                'رواق هو نظام إدارة فندقية شامل يوفر حلولاً متكاملة لإدارة الحجوزات والوحدات والنزلاء والفواتير والخدمات. صُمم النظام ليلبي احتياجات الفنادق والمنشآت السياحية في المملكة العربية السعودية مع دعم كامل للغة العربية ومتطلبات الفوترة الإلكترونية ZATCA.',
                'Riwaaq is a comprehensive hotel management system that provides integrated solutions for managing bookings, units, guests, invoices, and services. The system is designed to meet the needs of hotels and tourism establishments in the Kingdom of Saudi Arabia with full Arabic language support and ZATCA e-invoicing requirements.'
              )}
            </p>
            <p className="mt-6 text-base leading-9" style={{ color: '#94a3b8' }}>
              {t(
                'نؤمن بأن إدارة فندق فاخر تبدأ بأدوات إدارة راقية — لذلك صممنا رواق ليكون شريكك في تقديم تجربة نزلاء لا تُنسى، من لحظة الحجز وحتى المغادرة.',
                'We believe that managing a luxury hotel starts with refined management tools — that is why we designed Riwaaq to be your partner in delivering an unforgettable guest experience, from the moment of booking until departure.'
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Values ─── */}
      <section className="py-20" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
              style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.3)', color: '#f9a8d4' }}
            >
              <Star size={14} fill="#f9a8d4" />
              <span>{t('قيمنا', 'Our Values')}</span>
            </div>
            <h2 className="text-3xl font-bold md:text-4xl" style={{ color: 'var(--brand-100)' }}>
              {t('ما يميزنا', 'What Sets Us Apart')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              return (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-500 hover:-translate-y-1"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: `radial-gradient(circle at 30% 30%, ${v.color}12, transparent 65%)` }}
                  />
                  <div
                    className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: `${v.color}18`, color: v.color }}
                  >
                    <Icon size={26} />
                  </div>
                  <h3 className="mb-2 text-lg font-bold" style={{ color: '#e2e8f0' }}>{v.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{v.desc}</p>
                  <div
                    className="absolute bottom-0 right-0 h-0.5 w-0 rounded-b-2xl transition-all duration-500 group-hover:w-full"
                    style={{ background: `linear-gradient(to left, ${v.color}, transparent)` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Contact ─── */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold md:text-4xl" style={{ color: 'var(--brand-100)' }}>
              {t('تواصل معنا', 'Contact Us')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl" style={{ color: '#64748b' }}>
              {t('نحن هنا للإجابة على استفساراتك في أي وقت', 'We are here to answer your inquiries at any time')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div
              className="flex flex-col items-center gap-3 rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'rgba(var(--brand-rgb),0.07)', border: '1px solid rgba(var(--brand-rgb),0.15)' }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(var(--brand-rgb),0.18)', color: '#34d399' }}>
                <Phone size={22} />
              </div>
              <span className="text-sm" style={{ color: '#94a3b8' }}>{t('الهاتف', 'Phone')}</span>
              <a href="tel:0539124263" className="font-semibold hover:text-emerald-400 transition-colors" dir="ltr">0539124263</a>
            </div>

            <div
              className="flex flex-col items-center gap-3 rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'rgba(var(--brand-rgb),0.07)', border: '1px solid rgba(var(--brand-rgb),0.15)' }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(var(--brand-rgb),0.18)', color: '#a5b4fc' }}>
                <Mail size={22} />
              </div>
              <span className="text-sm" style={{ color: '#94a3b8' }}>{t('البريد', 'Email')}</span>
              <a href="mailto:info@riwaaq.com" className="font-semibold hover:text-indigo-400 transition-colors" dir="ltr">info@riwaaq.com</a>
            </div>

            <div
              className="flex flex-col items-center gap-3 rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'rgba(236,72,153,0.07)', border: '1px solid rgba(236,72,153,0.15)' }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(236,72,153,0.18)', color: '#f9a8d4' }}>
                <Globe size={22} />
              </div>
              <span className="text-sm" style={{ color: '#94a3b8' }}>{t('الموقع', 'Website')}</span>
              <a href="https://www.riwaaq.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-pink-400 transition-colors" dir="ltr">www.riwaaq.com</a>
            </div>

            <div
              className="flex flex-col items-center gap-3 rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'rgba(var(--brand-rgb),0.07)', border: '1px solid rgba(var(--brand-rgb),0.15)' }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(var(--brand-rgb),0.18)', color: '#34d399' }}>
                <Building2 size={22} />
              </div>
              <span className="text-sm" style={{ color: '#94a3b8' }}>{t('الشركة', 'Company')}</span>
              <span className="font-semibold">{t('رواق للضيافة', 'Riwaaq Hospitality')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div
            className="relative overflow-hidden rounded-3xl p-12 text-center"
            style={{
              background: 'linear-gradient(135deg,rgba(var(--brand-rgb),0.2),rgba(var(--brand-rgb),0.2),rgba(236,72,153,0.12))',
              border: '1px solid rgba(var(--brand-rgb),0.3)',
            }}
          >
            <div
              className="absolute inset-0 rounded-3xl"
              style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%,rgba(var(--brand-rgb),0.15),transparent)' }}
            />
            <div className="relative z-10">
              <div className="mb-4 flex justify-center">
                {[...Array(7)].map((_, i) => (
                  <Star key={i} size={18} fill="var(--brand-500)" color="var(--brand-500)" style={{ margin: '0 2px' }} />
                ))}
              </div>
              <h2 className="mb-4 text-3xl font-black md:text-4xl" style={{ color: 'var(--brand-100)' }}>
                {t('جاهز لرفع مستوى إدارتك الفندقية؟', 'Ready to elevate your hotel management?')}
              </h2>
              <p className="mb-8 text-base" style={{ color: '#94a3b8' }}>
                {t(
                  'انضم إلى مئات الفنادق التي تثق برواق لإدارة عملياتها اليومية',
                  'Join hundreds of hotels that trust Riwaaq to manage their daily operations'
                )}
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-3 rounded-2xl px-10 py-4 text-lg font-bold transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg,var(--brand-500),var(--brand-500))',
                  color: '#fff',
                  boxShadow: '0 0 50px rgba(var(--brand-rgb),0.45)',
                }}
              >
                {t('العودة للوحة التحكم', 'Back to Dashboard')}
                <ArrowLeft size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer
        className="border-t py-10"
        style={{ borderColor: 'rgba(var(--brand-rgb),0.15)', background: 'rgba(var(--brand-rgb),0.04)' }}
      >
        <div className="text-center text-xs" style={{ color: '#334155' }}>
          © {new Date().getFullYear()} {t('رواق — جميع الحقوق محفوظة', 'Riwaaq — All rights reserved')}
        </div>
      </footer>
    </div>
  );
}
