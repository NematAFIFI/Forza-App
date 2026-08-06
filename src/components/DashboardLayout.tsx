import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { LayoutDashboard, Building2, Users, Settings, LogOut, Menu, X, ShoppingBag, UserPlus, Languages, Bell, Shield, Download, Database, Info, CreditCard, Ticket, Map, HelpCircle, BookOpen, Receipt, FileBarChart } from 'lucide-react';

interface NavSection {
  label: string;
  items: { to: string; label: string; icon: typeof LayoutDashboard }[];
}

const OWNER_SECTIONS = (t: (ar: string, en: string) => string): NavSection[] => [
  {
    label: t('الرئيسية', 'Main'),
    items: [{ to: '/dashboard', label: t('لوحة تحكم المالك', 'Owner Dashboard'), icon: LayoutDashboard }],
  },
  {
    label: t('إدارة العملاء', 'Client Management'),
    items: [
      { to: '/clients', label: t('مشتريو النظام', 'System Clients'), icon: ShoppingBag },
      { to: '/users', label: t('مستخدمو النظام', 'System Users'), icon: UserPlus },
      { to: '/plans', label: t('الباقات والأسعار', 'Plans & Pricing'), icon: CreditCard },
      { to: '/support-tickets', label: t('تذاكر الدعم الفني', 'Support Tickets'), icon: Ticket },
    ],
  },
  {
    label: t('المالية والمحاسبة', 'Finance & Accounting'),
    items: [
      { to: '/account-statement', label: t('كشف حساب', 'Account Statement'), icon: BookOpen },
      { to: '/buyer-billing', label: t('كشف حساب المشتركين', 'Subscriber Billing'), icon: Receipt },
      { to: '/financial-reports', label: t('التقارير المالية', 'Financial Reports'), icon: FileBarChart },
    ],
  },
  {
    label: t('النظام والأمان', 'System & Security'),
    items: [
      { to: '/backups', label: t('النسخ الاحتياطي', 'Backups'), icon: Database },
      { to: '/notifications', label: t('التنبيهات', 'Notifications'), icon: Bell },
      { to: '/audit-log', label: t('سجل التدقيق', 'Audit Log'), icon: Shield },
      { to: '/data-export', label: t('تصدير البيانات', 'Data Export'), icon: Download },
      { to: '/settings', label: t('إعدادات النظام', 'System Settings'), icon: Settings },
      { to: '/about', label: t('عن النظام', 'About System'), icon: Info },
      { to: '/tour', label: t('دليل النظام', 'System Tour'), icon: Map },
      { to: '/guide', label: t('دليل الاستخدام', 'User Guide'), icon: HelpCircle },
    ],
  },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { t, toggle, lang } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async (): Promise<void> => {
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
      if (buyerRecord) {
        if (!buyerRecord.password_set) {
          navigate('/portal/setup');
        } else {
          navigate('/portal/dashboard');
        }
        return;
      }
      if (window.location.pathname.startsWith('/portal/') && !window.location.pathname.includes('/portal/setup')) {
        navigate('/dashboard');
        return;
      }
      setAuthLoading(false);
    };
    void checkAccess();

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
        if (buyerRecord) {
          if (!buyerRecord.password_set) {
            navigate('/portal/setup');
          } else {
            navigate('/portal/dashboard');
          }
          return;
        }
        if (window.location.pathname.startsWith('/portal/') && !window.location.pathname.includes('/portal/setup')) {
          navigate('/dashboard');
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #071a12, #0a2218)', color: '#6ee7b7', fontFamily: 'Tajawal, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #10b981', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#a7f3d0' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f7f4', color: '#0a1f17', fontFamily: 'Tajawal, sans-serif' }}>
      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: 'fixed', top: 16, left: 16, zIndex: 60, background: 'linear-gradient(135deg, #10b981, #047857)', color: '#fff', border: 'none', borderRadius: 12, padding: 10, display: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }} className="mobile-menu-btn no-print">
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(7,26,18,0.65)', backdropFilter: 'blur(6px)', zIndex: 40 }} className="sidebar-overlay no-print" />}

      <aside className={`no-print sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} style={{
        width: 264,
        background: 'linear-gradient(180deg, #071a12 0%, #0a2418 40%, #0d2e1e 100%)',
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
        <div style={{ padding: '28px 20px 24px', borderBottom: '1px solid rgba(16,185,129,0.18)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #10b981, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(16,185,129,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
              <Building2 size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg, #6ee7b7, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: 0.5 }}>{t('رواق', 'Riwaaq')}</div>
              <div style={{ fontSize: 11, color: '#6ee7b7', fontWeight: 600, letterSpacing: 0.5 }}>{t('نظام الإدارة', 'Management System')}</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: '16px 12px' }}>
          {OWNER_SECTIONS(t).map((section) => (
            <div key={section.label} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: '#10b981', textTransform: 'uppercase', letterSpacing: 1.8, padding: '6px 14px 8px', fontWeight: 700, opacity: 0.7 }}>{section.label}</div>
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
                      color: isActive ? '#fff' : '#86efac',
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.55), rgba(5,150,105,0.3))'
                        : 'transparent',
                      borderRight: isActive ? '3px solid #34d399' : '3px solid transparent',
                      marginBottom: 3,
                      boxShadow: isActive ? '0 4px 16px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={19} style={{ color: isActive ? '#fff' : '#6ee7b7', transition: 'color 0.2s' }} />
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
          <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, fontSize: 13, color: '#6ee7b7', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer', width: '100%', transition: 'all 0.2s' }}>
            <Languages size={16} /> {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        <div style={{ padding: 16, borderTop: '1px solid rgba(16,185,129,0.15)', background: 'rgba(7,26,18,0.6)', marginTop: 8 }}>
          <div style={{ fontSize: 12, color: '#6ee7b7', marginBottom: 10, padding: '0 4px', opacity: 0.8 }}>{user?.email || 'مستخدم'}</div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 12, fontSize: 14, color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', width: '100%', transition: 'all 0.2s' }}>
            <LogOut size={18} /> {t('تسجيل الخروج', 'Logout')}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: 28, marginRight: 264, minHeight: '100vh', background: '#f0f7f4', color: '#0a1f17' }} className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
