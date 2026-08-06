import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  Building2,
  Users,
  FileText,
  BarChart3,
  UtensilsCrossed,
  Dumbbell,
  Boxes,
  Info,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Calendar,
  ConciergeBell,
  Languages,
  Bell,
  Network,
  BookOpen,
  CalendarClock,
  Zap,
  Scale,
  Shield,
  Download,
  Receipt,
  Plug,
  Sparkles,
  Map,
  HelpCircle,
} from 'lucide-react';

interface NavSection {
  label: string;
  items: { to: string; label: string; icon: typeof LayoutDashboard }[];
}

const BUYER_SECTIONS = (t: (ar: string, en: string) => string): NavSection[] => [
  {
    label: t('الرئيسية', 'Main'),
    items: [{ to: '/portal/dashboard', label: t('لوحة التحكم', 'Dashboard'), icon: LayoutDashboard }],
  },
  {
    label: t('إدارة الفندق', 'Hotel Management'),
    items: [
      { to: '/portal/bookings', label: t('الحجوزات', 'Bookings'), icon: CalendarDays },
      { to: '/portal/units', label: t('الوحدات', 'Units'), icon: BedDouble },
      { to: '/portal/properties', label: t('العقارات', 'Properties'), icon: Building2 },
      { to: '/portal/customers', label: t('النزلاء', 'Guests'), icon: Users },
      { to: '/portal/invoices', label: t('الفواتير', 'Invoices'), icon: FileText },
      { to: '/portal/reports', label: t('التقارير', 'Reports'), icon: BarChart3 },
      { to: '/portal/calendar', label: t('التقويم', 'Calendar'), icon: Calendar },
    ],
  },
  {
    label: t('خدمات الفندق', 'Hotel Services'),
    items: [
      { to: '/portal/restaurant', label: t('المطعم', 'Restaurant'), icon: UtensilsCrossed },
      { to: '/portal/gym', label: t('النادي الرياضي', 'Gym'), icon: Dumbbell },
      { to: '/portal/services', label: t('الخدمات', 'Services'), icon: ConciergeBell },
      { to: '/portal/inventory', label: t('المخزون', 'Inventory'), icon: Boxes },
    ],
  },
  {
    label: t('الإدارة', 'Administration'),
    items: [
      { to: '/portal/notifications', label: t('التنبيهات', 'Notifications'), icon: Bell },
      { to: '/portal/cost-centers', label: t('مراكز التكلفة', 'Cost Centers'), icon: Network },
      { to: '/portal/chart-of-accounts', label: t('دليل الحسابات', 'Chart of Accounts'), icon: BookOpen },
      { to: '/portal/financial-periods', label: t('الفترات المالية', 'Financial Periods'), icon: CalendarClock },
      { to: '/portal/journal-entries', label: t('القيود اليومية', 'Journal Entries'), icon: BookOpen },
      { to: '/portal/financial-reports', label: t('التقارير المالية', 'Financial Reports'), icon: Scale },
      { to: '/portal/financial-documents', label: t('المستندات النقدية', 'Cash Documents'), icon: Receipt },
      { to: '/portal/account-statement', label: t('كشف حساب المشترك', 'Subscriber Statement'), icon: Receipt },
      { to: '/portal/journal-templates', label: t('قوالب القيود', 'Entry Templates'), icon: Zap },
      { to: '/portal/opening-balances', label: t('الأرصدة الافتتاحية', 'Opening Balances'), icon: Scale },
      { to: '/portal/audit-log', label: t('سجل التدقيق', 'Audit Log'), icon: Shield },
      { to: '/portal/data-export', label: t('تصدير البيانات', 'Data Export'), icon: Download },
      { to: '/portal/integrations', label: t('التكامل والواجهات', 'Integrations'), icon: Plug },
      { to: '/portal/assistant', label: t('المساعد الذكي', 'Smart Assistant'), icon: Sparkles },
      { to: '/portal/tour', label: t('دليل النظام', 'System Tour'), icon: Map },
      { to: '/portal/guide', label: t('دليل الاستخدام', 'User Guide'), icon: HelpCircle },
      { to: '/portal/staff', label: t('الموظفون', 'Staff'), icon: UserCog },
      { to: '/portal/settings', label: t('الإعدادات', 'Settings'), icon: Settings },
      { to: '/portal/about', label: t('عن رواق', 'About Riwaaq'), icon: Info },
    ],
  },
];

export default function BuyerLayout() {
  const navigate = useNavigate();
  const { t, toggle, lang } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/login');
        return;
      }
      setUser(data.session.user);
      const uid = data.session.user.id;
      await supabase.rpc('ensure_buyer_linked');
      const { data: buyerRecord } = await supabase
        .from('system_clients')
        .select('id, password_set')
        .eq('buyer_user_id', uid)
        .maybeSingle();
      if (!buyerRecord) {
        navigate('/dashboard');
        return;
      }
      if (!buyerRecord.password_set) {
        navigate('/portal/setup');
        return;
      }
      if (!window.location.pathname.startsWith('/portal/')) {
        navigate('/portal/dashboard');
        return;
      }
      setAuthLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);
      const uid = session.user.id;
      void (async () => {
        await supabase.rpc('ensure_buyer_linked');
        const { data: buyerRecord } = await supabase
          .from('system_clients')
          .select('id, password_set')
          .eq('buyer_user_id', uid)
          .maybeSingle();
        if (!buyerRecord) {
          navigate('/dashboard');
          return;
        }
        if (!buyerRecord.password_set) {
          navigate('/portal/setup');
          setAuthLoading(false);
          return;
        }
        if (!window.location.pathname.startsWith('/portal/')) {
          navigate('/portal/dashboard');
          setAuthLoading(false);
          return;
        }
        setAuthLoading(false);
      })();
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (authLoading) {
    return (
      <div className="buyer-theme" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--brand-darkest), var(--brand-dark-1))', color: 'var(--brand-300)', fontFamily: 'Tajawal, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--brand-500)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--brand-200)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-theme" style={{ display: 'flex', minHeight: '100vh', background: 'var(--brand-page-bg)', color: 'var(--brand-page-text)', fontFamily: 'Tajawal, sans-serif' }}>
      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: 'fixed', top: 16, left: 16, zIndex: 60, background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))', color: '#fff', border: 'none', borderRadius: 12, padding: 10, display: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(var(--brand-rgb),0.4)' }} className="mobile-menu-btn no-print">
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(var(--brand-rgb-dark),0.65)', backdropFilter: 'blur(6px)', zIndex: 40 }} className="sidebar-overlay no-print" />}

      <aside className={`no-print sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} style={{
        width: 268,
        background: 'linear-gradient(180deg, var(--brand-darkest) 0%, var(--brand-dark-1) 40%, var(--brand-dark-2) 100%)',
        color: '#fff',
        padding: 0,
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        overflowY: 'auto',
        zIndex: 50,
        transition: 'transform 0.3s',
        boxShadow: '-4px 0 40px rgba(0,0,0,0.3)',
      }}>
        <div style={{ padding: '28px 20px 24px', borderBottom: '1px solid rgba(var(--brand-rgb),0.18)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--brand-500), transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(var(--brand-rgb),0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
              <BedDouble size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg, var(--brand-300), var(--brand-500))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: 0.5 }}>{t('رواق', 'Riwaaq')}</div>
              <div style={{ fontSize: 11, color: 'var(--brand-300)', fontWeight: 600, letterSpacing: 0.5 }}>{t('بوابة المشتري', 'Buyer Portal')}</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: '16px 12px' }}>
          {BUYER_SECTIONS(t).map((section) => (
            <div key={section.label} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: 'var(--brand-500)', textTransform: 'uppercase', letterSpacing: 1.8, padding: '6px 14px 8px', fontWeight: 700, opacity: 0.7 }}>{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 14px',
                      borderRadius: 12,
                      fontSize: 14,
                      textDecoration: 'none',
                      transition: 'all 0.25s',
                      color: isActive ? '#fff' : 'var(--brand-200)',
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(var(--brand-rgb),0.55), rgba(var(--brand-rgb-700),0.3))'
                        : 'transparent',
                      borderRight: isActive ? '3px solid var(--brand-400)' : '3px solid transparent',
                      marginBottom: 3,
                      boxShadow: isActive ? '0 4px 16px rgba(var(--brand-rgb),0.25), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={19} style={{ color: isActive ? '#fff' : 'var(--brand-300)', transition: 'color 0.2s' }} />
                        <span style={{ fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '4px 12px' }}>
          <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, fontSize: 13, color: 'var(--brand-300)', background: 'rgba(var(--brand-rgb),0.08)', border: '1px solid rgba(var(--brand-rgb),0.2)', cursor: 'pointer', width: '100%', transition: 'all 0.2s' }}>
            <Languages size={16} /> {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        <div style={{ padding: 16, borderTop: '1px solid rgba(var(--brand-rgb),0.15)', background: 'rgba(var(--brand-rgb-dark),0.6)', marginTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--brand-300)', marginBottom: 10, padding: '0 4px', opacity: 0.8 }}>{user?.email || 'مستخدم'}</div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 12, fontSize: 14, color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', width: '100%', transition: 'all 0.2s' }}>
            <LogOut size={18} /> {t('تسجيل الخروج', 'Logout')}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: 28, marginRight: 268, minHeight: '100vh', background: 'var(--brand-page-bg)', color: 'var(--brand-page-text)' }} className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
