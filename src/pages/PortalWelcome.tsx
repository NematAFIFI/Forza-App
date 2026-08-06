import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabasePublic } from '../lib/supabasePublic';
import { useLanguage } from '../lib/i18n';
import {
  Building2,
  ArrowLeft,
  Star,
  Phone,
  Mail,
  Sparkles,
  LogIn,
  Check,
  BedDouble,
  CalendarDays,
  Users,
  FileText,
  BarChart3,
  UtensilsCrossed,
  Shield,
} from 'lucide-react';

const HERO_IMG =
  'https://images.pexels.com/photos/5952400/pexels-photo-5952400.jpeg?auto=compress&cs=tinysrgb&w=1600';
const LOBBY_IMG =
  'https://images.pexels.com/photos/5398108/pexels-photo-5398108.jpeg?auto=compress&cs=tinysrgb&w=1600';

interface BuyerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name?: string;
}

const PREVIEW_FEATURES = [
  { ar: 'إدارة الحجوزات والمواعيد', en: 'Booking & Schedule Management', icon: CalendarDays },
  { ar: 'تنظيم الغرف والوحدات', en: 'Room & Unit Organization', icon: BedDouble },
  { ar: 'ملفات النزلاء الكاملة', en: 'Complete Guest Profiles', icon: Users },
  { ar: 'الفوترة والمدفوعات', en: 'Invoicing & Payments', icon: FileText },
  { ar: 'التقارير والإحصاءات', en: 'Reports & Statistics', icon: BarChart3 },
  { ar: 'الخدمات الإضافية', en: 'Additional Services', icon: UtensilsCrossed },
];

export default function PortalWelcome() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [buyer, setBuyer] = useState<BuyerInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadBuyer = async () => {
      if (!token) {
        setError(t('رابط البوابة غير صالح', 'Invalid portal link'));
        setLoading(false);
        return;
      }
      try {
        const { data, error: err } = await supabasePublic
          .from('system_clients')
          .select('id, name, email, phone, company_name')
          .eq('access_token', token)
          .maybeSingle();
        if (err) throw err;
        if (!data) {
          setError(t('لم يتم العثور على هذا الرابط. تأكد من صحة الرابط المرسل إليك.', 'This link was not found. Please make sure the link sent to you is correct.'));
          setLoading(false);
          return;
        }
        setBuyer(data as BuyerInfo);
      } catch (e) {
        const msg = e instanceof Error ? e.message : t('حدث خطأ أثناء التحميل', 'An error occurred while loading');
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    loadBuyer();
  }, [token]);

  const startSetup = (): void => {
    navigate(`/login?token=${token}`);
  };

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-zinc-400"
        dir="rtl"
        style={{ background: 'linear-gradient(135deg, #071a12, #0a2218)' }}
      >
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent mx-auto" />
          <p style={{ color: '#6ee7b7' }}>{t('جارٍ التحميل...', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-6 text-center"
        dir="rtl"
        style={{ background: 'linear-gradient(135deg, #071a12, #0a2218)' }}
      >
        <div className="max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <Building2 size={30} />
          </div>
          <h1 className="mb-3 text-2xl font-bold text-zinc-100">{t('رابط غير صالح', 'Invalid Link')}</h1>
          <p className="mb-8 text-zinc-400">{error}</p>
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white" style={{ background: 'linear-gradient(135deg, #10b981, #047857)', boxShadow: '0 8px 30px rgba(16,185,129,0.4)' }}>
            <ArrowLeft size={18} />
            <span>{t('العودة للرئيسية', 'Back to Home')}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-zinc-100" dir="rtl" style={{ background: 'linear-gradient(180deg, #071a12 0%, #0a2218 100%)' }}>
      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071a12]/88 via-[#0a2218]/78 to-[#071a12]" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at top, rgba(16,185,129,0.25), transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(110deg, rgba(16,185,129,0.18) 0%, transparent 45%, rgba(52,211,153,0.12) 100%)' }} />

        <div
          className={`relative z-10 mx-auto max-w-3xl px-6 text-center transition-all duration-1000 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Brand badge */}
          <div className="mb-8 flex items-center justify-center gap-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, #10b981, #047857)', boxShadow: '0 0 30px rgba(16,185,129,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
              <BedDouble size={24} color="#fff" />
            </div>
            <div className="text-right">
              <div className="text-xl font-extrabold" style={{ background: 'linear-gradient(135deg, #6ee7b7, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('رواق', 'Riwaaq')}</div>
              <div className="text-[10px] tracking-[0.25em] text-emerald-400/70">{t('بوابة المشتري', 'BUYER PORTAL')}</div>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-center gap-2 text-emerald-300">
            <Star size={18} fill="currentColor" />
            <span className="text-xs tracking-[0.3em] uppercase">{t('مرحباً بك', 'Welcome')}</span>
            <Star size={18} fill="currentColor" />
          </div>

          <h1 className="mb-5 text-5xl font-extrabold md:text-6xl" style={{ fontFamily: 'Tajawal, sans-serif', background: 'linear-gradient(135deg, #ecfdf5, #a7f3d0 40%, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textShadow: '0 0 60px rgba(16,185,129,0.3)' }}>
            {t('مرحباً بك في رواق', 'Welcome to Riwaaq')}
          </h1>

          {buyer && (
            <p className="mb-6 text-2xl text-zinc-200">
              {t('أهلاً ' + buyer.name + (buyer.company_name ? ` — ${buyer.company_name}` : ''), 'Hello ' + buyer.name + (buyer.company_name ? ` — ${buyer.company_name}` : ''))}
            </p>
          )}

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-300">
            {t(
              'هذه نسختك الجديدة من نظام رواق — ابدأ بإدخال بياناتك لتطلق منشأتك نحو تجربة إدارية استثنائية تليق بمستوى خمس نجوم.',
              'This is your new copy of the Riwaaq system — start by entering your data to launch your establishment toward an exceptional management experience worthy of a five-star level.'
            )}
          </p>

          <button
            onClick={startSetup}
            className="inline-flex items-center gap-2.5 px-10 py-4 text-lg font-bold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #10b981, #047857)', borderRadius: 14, boxShadow: '0 10px 40px rgba(16,185,129,0.5), inset 0 1px 0 rgba(255,255,255,0.25)' }}
          >
            <LogIn size={20} />
            <span>{t('تسجيل الدخول إلى نظامك', 'Log in to your system')}</span>
          </button>

          <p className="mt-6 text-sm text-emerald-400/60">{t('استخدم البريد وكلمة المرور التي استلمتها', 'Use the email and password you received')}</p>
        </div>
      </section>

      {/* Features Preview */}
      <section className="relative py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center">
            <div className="mb-3 inline-flex items-center gap-2 text-emerald-400">
              <Sparkles size={18} />
              <span className="text-xs tracking-[0.25em] uppercase">{t('ماذا ستحصل عليه', 'What You\'ll Get')}</span>
            </div>
            <h2 className="text-4xl font-bold text-zinc-100 md:text-5xl">
              {t('نظام متكامل بين يديك', 'An Integrated System at Your Fingertips')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
              {t('كل الأدوات التي تحتاجها لإدارة منشأتك الفاخرة بكفاءة واحترافية', 'All the tools you need to manage your luxury establishment efficiently and professionally')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PREVIEW_FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-4 rounded-2xl border p-6 transition-all duration-500 ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{
                    transitionDelay: `${i * 80}ms`,
                    background: 'rgba(16,185,129,0.04)',
                    borderColor: 'rgba(16,185,129,0.15)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(4,120,87,0.15))' }}>
                    <Icon size={22} className="text-emerald-400" />
                  </div>
                  <span className="text-zinc-200 font-medium">{t(feat.ar, feat.en)}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-14 text-center">
            <button
              onClick={startSetup}
              className="inline-flex items-center gap-2.5 px-10 py-4 text-lg font-bold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #10b981, #047857)', borderRadius: 14, boxShadow: '0 10px 40px rgba(16,185,129,0.5), inset 0 1px 0 rgba(255,255,255,0.25)' }}
            >
              <LogIn size={20} />
              <span>{t('تسجيل الدخول إلى نظامك', 'Log in to your system')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="relative border-t border-emerald-500/10 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { icon: Shield, ar: 'حماية كاملة للبيانات', en: 'Full Data Security' },
              { icon: BarChart3, ar: 'تقارير لحظية', en: 'Real-time Reports' },
              { icon: Users, ar: 'دعم مخصص', en: 'Dedicated Support' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <Icon size={22} className="text-emerald-400" />
                  </div>
                  <p className="text-zinc-300 font-semibold">{t(item.ar, item.en)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="relative overflow-hidden border-t border-emerald-500/10 py-20">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${LOBBY_IMG})` }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #071a12 0%, rgba(7,26,18,0.85) 100%)' }} />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-zinc-100">{t('هل تحتاج مساعدة؟', 'Need Help?')}</h2>
          <p className="mb-10 text-zinc-400">
            {t('فريق الدعم لدينا جاهز لمساعدتك في كل خطوة', 'Our support team is ready to help you every step of the way')}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="tel:0539124263"
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 font-semibold text-emerald-300 transition-all hover:bg-emerald-500/10"
              style={{ borderColor: 'rgba(16,185,129,0.3)' }}
              dir="ltr"
            >
              <Phone size={18} />
              <span>0539124263</span>
            </a>
            <a
              href="mailto:info@riwaaq.com"
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 font-semibold text-emerald-300 transition-all hover:bg-emerald-500/10"
              style={{ borderColor: 'rgba(16,185,129,0.3)' }}
              dir="ltr"
            >
              <Mail size={18} />
              <span>info@riwaaq.com</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-500/10 py-8" style={{ background: '#071a12' }}>
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Building2 size={20} className="text-emerald-400" />
            <span className="text-xl font-bold text-emerald-400">{t('رواق', 'Riwaaq')}</span>
          </div>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} {t('رواق — جميع الحقوق محفوظة', 'Riwaaq — All rights reserved')}
          </p>
        </div>
      </footer>
    </div>
  );
}
