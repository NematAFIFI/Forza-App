import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { Link } from 'react-router-dom';
import {
  Building2, Users, Server, ShieldCheck, TrendingUp,
  HardDrive, Activity, AlertCircle, CheckCircle2, Clock,
  CreditCard, Database, Ticket, CalendarClock, Wallet,
  LayoutGrid, X,
} from 'lucide-react';

interface UnitRow { id: string; unit_number: string | null; unit_type: string | null; status: string | null; property_id: string | null; properties: { name: string | null } | null; }
interface BookingRow {
  id: string; check_out: string | null; check_out_time: string | null;
  booking_status: string | null; unit_id: string | null;
  customers: { name: string | null } | null;
  units: { unit_number: string | null; unit_type: string | null; property_id: string | null; properties: { name: string | null } | null } | null;
}
const STATUS_META: Record<string, { label: string; labelEn: string; color: string; bg: string }> = {
  available: { label: 'متاحة', labelEn: 'Available', color: '#10b981', bg: '#ecfdf5' },
  booked: { label: 'محجوزة', labelEn: 'Booked', color: '#f59e0b', bg: '#fffbeb' },
  occupied: { label: 'مشغولة', labelEn: 'Occupied', color: '#ef4444', bg: '#fef2f2' },
  maintenance: { label: 'صيانة', labelEn: 'Maintenance', color: '#6366f1', bg: '#eef2ff' },
  cleaning: { label: 'تنظيف', labelEn: 'Cleaning', color: '#06b6d4', bg: '#ecfeff' },
};

interface Stats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalUsers: number;
  totalBookings: number;
  totalInvoices: number;
  monthlyRevenue: number;
  openTickets: number;
  completedBackups: number;
  lastBackupAt: string | null;
  expiringSubs: number;
  systemHealth: 'healthy' | 'warning' | 'down';
}

export default function AdminDashboard() {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [expiringList, setExpiringList] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [statusOverviewOpen, setStatusOverviewOpen] = useState(false);
  const [departuresOpen, setDeparturesOpen] = useState(false);
  const [allUnits, setAllUnits] = useState<UnitRow[]>([]);
  const [activeBookings, setActiveBookings] = useState<BookingRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const [clients, users, bookings, invoices, recent, subs, tickets, backups, unitsRes, activeBk] = await Promise.all([
        supabase.from('system_clients').select('id, status, created_at, name, company_name, email').order('created_at', { ascending: false }),
        supabase.from('staff_users').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('id', { count: 'exact', head: true }),
        supabase.from('system_clients').select('name, company_name, email, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('client_subscriptions').select('id, client_id, status, expires_at, amount, billing_cycle, system_clients(name, company_name)').order('expires_at', { ascending: true }),
        supabase.from('support_tickets').select('id, subject, status, priority, created_at, system_clients(name)').eq('status', 'open').order('created_at', { ascending: false }).limit(5),
        supabase.from('system_backups').select('id, status, created_at').order('created_at', { ascending: false }),
        supabase.from('units').select('id, unit_number, unit_type, status, property_id, properties(name)').order('unit_number', { ascending: true }),
        supabase.from('bookings').select('id, check_out, check_out_time, booking_status, unit_id, customers(name), units(unit_number, unit_type, property_id, properties(name))').in('booking_status', ['checked_in', 'confirmed']).order('check_out', { ascending: true }),
      ]);
      if (unitsRes.data) setAllUnits(unitsRes.data as unknown as UnitRow[]);
      if (activeBk.data) setActiveBookings(activeBk.data as unknown as BookingRow[]);

      const clientList = clients.data || [];
      const active = clientList.filter((c: any) => c.status !== 'inactive').length;
      const inactive = clientList.filter((c: any) => c.status === 'inactive').length;

      // Monthly revenue: sum of active monthly subscriptions + yearly / 12
      const subList = (subs.data as any[]) || [];
      const monthlyRevenue = subList
        .filter((s) => s.status === 'active')
        .reduce((sum, s) => {
          const amt = Number(s.amount) || 0;
          return sum + (s.billing_cycle === 'yearly' ? amt / 12 : amt);
        }, 0);

      // Expiring within 30 days
      const expiring = subList.filter((s) =>
        s.status === 'active' && s.expires_at && new Date(s.expires_at) <= new Date(thirtyDaysLater) && new Date(s.expires_at) >= now
      );
      setExpiringList(expiring);

      // Open tickets
      const openTickets = ((tickets.data as any[]) || []).length;
      setRecentTickets((tickets.data as any[]) || []);

      // Backups
      const backupList = (backups.data as any[]) || [];
      const completedBackups = backupList.filter((b) => b.status === 'completed').length;
      const lastBackup = backupList.find((b) => b.status === 'completed');

      setStats({
        totalClients: clientList.length,
        activeClients: active,
        inactiveClients: inactive,
        totalUsers: users.count || 0,
        totalBookings: bookings.count || 0,
        totalInvoices: invoices.count || 0,
        monthlyRevenue,
        openTickets,
        completedBackups,
        lastBackupAt: lastBackup?.created_at || null,
        expiringSubs: expiring.length,
        systemHealth: 'healthy',
      });
      setRecentClients(recent.data || []);
      setLoading(false);
    };
    void load();
  }, []);

  const formatDate = (d: string): string => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  };

  const formatCurrency = (n: number): string => {
    if (lang === 'ar') return `${n.toLocaleString('ar-SA')} ر.س`;
    return `${n.toLocaleString('en-US')} SAR`;
  };

  if (loading || !stats) {
    return <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>{t('جارٍ التحميل...', 'Loading...')}</div>;
  }

  const statCards = [
    { label: t('إجمالي العملاء', 'Total Clients'), value: stats.totalClients, icon: Building2, color: 'var(--brand-500)', sub: `${stats.activeClients} ${t('نشط', 'active')} · ${stats.inactiveClients} ${t('متوقف', 'inactive')}` },
    { label: t('مستخدمو النظام', 'System Users'), value: stats.totalUsers, icon: Users, color: 'var(--brand-500)', sub: t('إجمالي الحسابات', 'Total accounts') },
    { label: t('الإيرادات الشهرية', 'Monthly Revenue'), value: formatCurrency(stats.monthlyRevenue), icon: Wallet, color: 'var(--brand-500)', sub: t('من الاشتراكات النشطة', 'From active subscriptions') },
    { label: t('تذاكر مفتوحة', 'Open Tickets'), value: stats.openTickets, icon: Ticket, color: '#f59e0b', sub: t('تذاكر دعم فني', 'Support tickets') },
    { label: t('إجمالي الحجوزات', 'Total Bookings'), value: stats.totalBookings, icon: TrendingUp, color: '#0ea5e9', sub: t('عبر كل العملاء', 'Across all clients') },
    { label: t('إجمالي الفواتير', 'Total Invoices'), value: stats.totalInvoices, icon: Activity, color: '#f97316', sub: t('عبر كل العملاء', 'Across all clients') },
  ];

  const systemCards = [
    { label: t('حالة النظام', 'System Health'), value: stats.systemHealth === 'healthy' ? t('سليم', 'Healthy') : t('تحذير', 'Warning'), icon: ShieldCheck, color: 'var(--brand-500)', ok: stats.systemHealth === 'healthy' },
    { label: t('الخوادم', 'Servers'), value: t('تعمل طبيعي', 'Operational'), icon: Server, color: '#0ea5e9', ok: true },
    { label: t('النسخ الاحتياطي', 'Backups'), value: `${stats.completedBackups} ${t('نسخة', 'backups')}`, icon: Database, color: 'var(--brand-500)', ok: stats.completedBackups > 0 },
    { label: t('آخر نسخة احتياطية', 'Last Backup'), value: stats.lastBackupAt ? formatDate(stats.lastBackupAt) : t('لا يوجد', 'None'), icon: Clock, color: stats.lastBackupAt ? 'var(--brand-500)' : '#ef4444', ok: !!stats.lastBackupAt },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('لوحة تحكم المالك', 'Owner Dashboard')}</h1>
          <p className="page-subtitle">{t('نظرة عامة على النظام والعملاء والأداء والإيرادات', 'Overview of system, clients, performance, and revenue')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-outline" onClick={() => setStatusOverviewOpen(true)} title={t('لوحة حالات الغرف', 'Room Status Board')}><LayoutGrid size={18} /> {t('حالات الغرف', 'Room Status')}</button>
          <button className="btn-outline" onClick={() => setDeparturesOpen(true)} title={t('مواعيد المغادرة', 'Departure Times')}><CalendarClock size={18} /> {t('المغادرات', 'Departures')} {activeBookings.filter((b) => b.check_out).length > 0 && <span style={{ background: 'var(--brand-500)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{activeBookings.filter((b) => b.check_out).length}</span>}</button>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={card.color} />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 2 }}>{card.value}</div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{card.label}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* System health */}
      <div className="card" style={{ padding: 18, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Server size={18} color="var(--brand-500)" /> {t('حالة البنية التحتية', 'Infrastructure Status')}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {systemCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} style={{ padding: 14, borderRadius: 10, background: card.ok ? 'rgba(var(--brand-rgb),0.03)' : '#ef444408', border: `1px solid ${card.ok ? 'rgba(var(--brand-rgb),0.19)' : '#ef444430'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Icon size={16} color={card.color} />
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{card.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} color={card.ok ? 'var(--brand-500)' : '#ef4444'} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{card.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expiring subscriptions alert */}
      {stats.expiringSubs > 0 && (
        <div className="card" style={{ padding: 18, marginBottom: 20, borderColor: '#f59e0b', background: '#fffbeb' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: '#b45309' }}>
            <CalendarClock size={18} color="#f59e0b" /> {t('اشتراكات أوشكت على الانتهاء', 'Expiring Subscriptions')}
            <span style={{ fontSize: 12, background: '#f59e0b', color: '#fff', padding: '2px 10px', borderRadius: 20 }}>{stats.expiringSubs}</span>
          </h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {expiringList.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid #fde68a' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f59e0b15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={16} color="#f59e0b" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.system_clients?.name || '-'}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{s.system_clients?.company_name || ''}</div>
                </div>
                <div style={{ fontSize: 12, color: '#b45309', fontWeight: 600 }}>
                  {t('ينتهي في', 'Expires')} {formatDate(s.expires_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        {/* Recent clients */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="var(--brand-500)" /> {t('أحدث العملاء', 'Recent Clients')}
          </h3>
          {recentClients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <p style={{ fontSize: 14 }}>{t('لا يوجد عملاء بعد', 'No clients yet')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {recentClients.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#f9fafb', border: '1px solid #eef0f3' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(var(--brand-rgb),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={16} color="var(--brand-500)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{c.company_name || c.email}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{formatDate(c.created_at)}</div>
                  {c.status === 'inactive'
                    ? <span className="badge-gray">{t('متوقف', 'Inactive')}</span>
                    : <span className="badge-green">{t('نشط', 'Active')}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open support tickets */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ticket size={18} color="#f59e0b" /> {t('تذاكر الدعم المفتوحة', 'Open Support Tickets')}
            </h3>
            <Link to="/support-tickets" style={{ fontSize: 13, color: 'var(--brand-500)', textDecoration: 'none', fontWeight: 600 }}>{t('عرض الكل', 'View All')}</Link>
          </div>
          {recentTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <p style={{ fontSize: 14 }}>{t('لا توجد تذاكر مفتوحة', 'No open tickets')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {recentTickets.map((tk: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#f9fafb', border: '1px solid #eef0f3' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f59e0b15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ticket size={16} color="#f59e0b" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{tk.subject}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{tk.system_clients?.name || '-'}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{formatDate(tk.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Overview Modal */}
      {statusOverviewOpen && (() => {
        const grouped: Record<string, UnitRow[]> = { available: [], booked: [], occupied: [], maintenance: [], cleaning: [] };
        for (const u of allUnits) {
          const s = u.status || 'available';
          if (grouped[s]) grouped[s].push(u); else (grouped as Record<string, UnitRow[]>)[s] = [u];
        }
        const sections = Object.entries(STATUS_META).filter(([key]) => grouped[key] && grouped[key].length > 0);
        return (
          <div className="modal-overlay" onClick={() => setStatusOverviewOpen(false)}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>{t('لوحة حالات الغرف', 'Room Status Board')}</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{allUnits.length} {t('وحدة', 'units')}</p>
                </div>
                <button className="btn-ghost" onClick={() => setStatusOverviewOpen(false)}><X size={20} /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 20 }}>
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <div key={key} style={{ borderRadius: 12, padding: 12, background: meta.bg, border: `1px solid ${meta.color}25`, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: meta.color }}>{grouped[key]?.length || 0}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{t(meta.label, meta.labelEn)}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                {sections.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>{t('لا توجد وحدات', 'No units')}</p>
                ) : sections.map(([key, meta]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color }} />
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>{t(meta.label, meta.labelEn)}</h3>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>({grouped[key].length})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {grouped[key].map((u) => {
                        const propName = u.properties?.name || (u.property_id ? '' : '');
                        const active = activeBookings.find((b) => b.unit_id === u.id);
                        return (
                          <div key={u.id} style={{ borderRadius: 10, padding: '10px 14px', background: meta.bg, border: `1px solid ${meta.color}30`, minWidth: 140 }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{u.unit_number || '-'}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{u.unit_type || '-'}</div>
                            {propName && <div style={{ fontSize: 10, color: 'var(--brand-500)', fontWeight: 700, marginTop: 2 }}>{propName}</div>}
                            {active?.customers?.name && <div style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>{active.customers.name}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Departures Modal */}
      {departuresOpen && (() => {
        const departures = activeBookings
          .filter((b) => b.check_out)
          .sort((a, b) => {
            const aTime = `${a.check_out || ''}T${a.check_out_time || '00:00'}`;
            const bTime = `${b.check_out || ''}T${b.check_out_time || '00:00'}`;
            return aTime.localeCompare(bTime);
          });
        const formatDep = (b: BookingRow): string => {
          const date = b.check_out || '';
          const time = b.check_out_time || '';
          if (!date) return '-';
          try {
            const dt = new Date(`${date}T${time || '00:00'}`);
            const dateStr = dt.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const timeStr = time ? dt.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '';
            return `${dateStr}${timeStr ? ' — ' + timeStr : ''}`;
          } catch {
            return date + (time ? ' ' + time : '');
          }
        };
        return (
          <div className="modal-overlay" onClick={() => setDeparturesOpen(false)}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>{t('مواعيد المغادرة', 'Departure Schedule')}</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{departures.length} {t('مغادرة قادمة', 'upcoming departures')}</p>
                </div>
                <button className="btn-ghost" onClick={() => setDeparturesOpen(false)}><X size={20} /></button>
              </div>

              {departures.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                  <CalendarClock size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <p>{t('لا توجد مغادرات قادمة', 'No upcoming departures')}</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {departures.map((b) => {
                    const isToday = b.check_out === new Date().toISOString().slice(0, 10);
                    const isPast = b.check_out && b.check_out < new Date().toISOString().slice(0, 10);
                    const unit = b.units;
                    const propName = unit?.properties?.name || '';
                    return (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, background: isToday ? '#fffbeb' : isPast ? '#fef2f2' : '#f9fafb', border: `1px solid ${isToday ? '#fde68a' : isPast ? '#fecaca' : '#e5e7eb'}` }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: isToday ? '#fbbf24' : isPast ? '#ef4444' : 'var(--brand-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Clock size={20} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{b.customers?.name || '-'}</span>
                            {isToday && <span style={{ background: '#fbbf24', color: '#fff', borderRadius: 6, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{t('اليوم', 'Today')}</span>}
                            {isPast && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 6, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{t('متأخر', 'Overdue')}</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                            {t('وحدة', 'Unit')} {unit?.unit_number || '-'} · {unit?.unit_type || '-'}{propName ? ` · ${propName}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: isToday ? '#92400e' : isPast ? '#dc2626' : '#374151' }}>{formatDep(b)}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{b.booking_status === 'checked_in' ? t('مقيم', 'Checked in') : t('مؤكد', 'Confirmed')}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
