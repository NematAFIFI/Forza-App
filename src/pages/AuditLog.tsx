import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  Shield, Loader2, AlertCircle, ChevronDown, ChevronRight,
  Filter, Download, Search, Clock, User, Database, FileText,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  user_id: string | null;
  table_name: string;
  record_id: string | null;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_by: string | null;
  changed_at: string;
  user_email?: string | null;
  user_name?: string | null;
}

const TABLE_LABELS: Record<string, { ar: string; en: string }> = {
  journal_entries: { ar: 'القيود المحاسبية', en: 'Journal Entries' },
  journal_lines: { ar: 'تفاصيل القيود', en: 'Journal Lines' },
  bookings: { ar: 'الحجوزات', en: 'Bookings' },
  invoices: { ar: 'الفواتير', en: 'Invoices' },
  payments: { ar: 'المدفوعات', en: 'Payments' },
  chart_accounts: { ar: 'دليل الحسابات', en: 'Chart of Accounts' },
  cost_centers: { ar: 'مراكز التكلفة', en: 'Cost Centers' },
  services: { ar: 'الخدمات', en: 'Services' },
  clients: { ar: 'العملاء', en: 'Clients' },
  properties: { ar: 'العقارات', en: 'Properties' },
  units: { ar: 'الوحدات', en: 'Units' },
  inventory_withdrawals: { ar: 'المخزون', en: 'Inventory' },
  staff_users: { ar: 'المستخدمون', en: 'Staff Users' },
};

const ACTION_META: Record<string, { ar: string; en: string; color: string; bg: string }> = {
  INSERT: { ar: 'إضافة', en: 'Created', color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)' },
  UPDATE: { ar: 'تعديل', en: 'Updated', color: '#f59e0b', bg: '#f59e0b15' },
  DELETE: { ar: 'حذف', en: 'Deleted', color: '#ef4444', bg: '#ef444415' },
};

const PAGE_SIZE = 50;

export default function AuditLog() {
  const { t, lang } = useLanguage();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({ table: '', action: '', user: '', date: '' });
  const [userMap, setUserMap] = useState<Record<string, { email: string; name: string }>>({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (resetPage = false) => {
    const p = resetPage ? 0 : page;
    setLoading(true);
    setError('');
    try {
      let q = supabase
        .from('audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1);

      if (filters.table) q = q.eq('table_name', filters.table);
      if (filters.action) q = q.eq('action', filters.action);
      if (filters.user) q = q.eq('changed_by', filters.user);
      if (filters.date) {
        const dayStart = `${filters.date}T00:00:00`;
        const dayEnd = `${filters.date}T23:59:59`;
        q = q.gte('changed_at', dayStart).lte('changed_at', dayEnd);
      }

      const { data, error: err } = await q;
      if (err) throw err;
      const list = (data as AuditEntry[]) || [];
      setHasMore(list.length === PAGE_SIZE);
      setEntries(resetPage ? list : [...entries, ...list]);
      if (resetPage) setPage(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر تحميل السجل', 'Unable to load log'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, entries, t]);

  useEffect(() => { void load(true); /* eslint-disable-next-line */ }, [filters.table, filters.action, filters.user, filters.date]);

  // Load user names
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('staff_users').select('user_id, name, email');
      if (data) {
        const m: Record<string, { email: string; name: string }> = {};
        data.forEach((u: any) => { m[u.user_id] = { email: u.email, name: u.name }; });
        setUserMap(m);
      }
    })();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const exportCSV = () => {
    const rows = entries.map((e) => ({
      [t('الوقت', 'Time')]: new Date(e.changed_at).toLocaleString(),
      [t('المستخدم', 'User')]: userMap[e.changed_by || '']?.name || e.changed_by || '',
      [t('الجدول', 'Table')]: e.table_name,
      [t('الإجراء', 'Action')]: e.action,
      [t('المعرف', 'Record ID')]: e.record_id || '',
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const renderDiff = (oldV: Record<string, any> | null, newV: Record<string, any> | null) => {
    const allKeys = Array.from(new Set([...Object.keys(oldV || {}), ...Object.keys(newV || {})])).filter((k) => k !== 'created_at' && k !== 'updated_at');
    return (
      <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
        {allKeys.map((k) => {
          const oldVal = oldV?.[k];
          const newVal = newV?.[k];
          const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
          return (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 8, padding: '6px 8px', borderRadius: 6, background: changed ? '#f9fafb' : 'transparent', fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: '#6b7280' }}>{k}</div>
              <div style={{ color: '#ef4444', fontFamily: 'monospace', wordBreak: 'break-word' }} dir="ltr">
                {oldVal === null || oldVal === undefined ? '—' : typeof oldVal === 'object' ? JSON.stringify(oldVal).slice(0, 80) : String(oldVal)}
              </div>
              <div style={{ color: 'var(--brand-500)', fontFamily: 'monospace', wordBreak: 'break-word' }} dir="ltr">
                {newVal === null || newVal === undefined ? '—' : typeof newVal === 'object' ? JSON.stringify(newVal).slice(0, 80) : String(newVal)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('سجل التدقيق', 'Audit Log')}</h1>
          <p className="page-subtitle">{t('سجل دائم لكل عملية تعديل أو حذف — لا يمكن مسحه', 'Permanent record of every change — cannot be erased')}</p>
        </div>
        <button className="btn-outline" onClick={exportCSV} disabled={entries.length === 0}>
          <Download size={16} /> {t('تصدير', 'Export')}
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Filter size={16} color="var(--brand-500)" />
          <span style={{ fontWeight: 600, fontSize: 13 }}>{t('تصفية', 'Filters')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          <div>
            <label className="label">{t('الجدول', 'Table')}</label>
            <select className="input" value={filters.table} onChange={(e) => setFilters({ ...filters, table: e.target.value })}>
              <option value="">{t('الكل', 'All')}</option>
              {Object.entries(TABLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{t(v.ar, v.en)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('الإجراء', 'Action')}</label>
            <select className="input" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
              <option value="">{t('الكل', 'All')}</option>
              <option value="INSERT">{t('إضافة', 'Created')}</option>
              <option value="UPDATE">{t('تعديل', 'Updated')}</option>
              <option value="DELETE">{t('حذف', 'Deleted')}</option>
            </select>
          </div>
          <div>
            <label className="label">{t('المستخدم', 'User')}</label>
            <select className="input" value={filters.user} onChange={(e) => setFilters({ ...filters, user: e.target.value })}>
              <option value="">{t('الكل', 'All')}</option>
              {Object.entries(userMap).map(([uid, info]) => (
                <option key={uid} value={uid}>{info.name || info.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('التاريخ', 'Date')}</label>
            <input className="input" type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} dir="ltr" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn-outline" onClick={() => setFilters({ table: '', action: '', user: '', date: '' })} style={{ width: '100%' }}>
              {t('مسح التصفية', 'Clear')}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: 14, marginBottom: 16, borderColor: '#ef4444', background: '#fef2f2' }}>
          <p style={{ color: '#dc2626', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} /> {error}
          </p>
        </div>
      )}

      {/* Entries */}
      <div className="card" style={{ padding: 16 }}>
        {loading && entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            {t('جارٍ التحميل...', 'Loading...')}
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <Shield size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا توجد سجلات', 'No entries found')}</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 6 }}>
              {entries.map((e) => {
                const meta = ACTION_META[e.action] || { ar: e.action, en: e.action, color: '#6b7280', bg: '#f3f4f6' };
                const tableLabel = TABLE_LABELS[e.table_name] || { ar: e.table_name, en: e.table_name };
                const userInfo = userMap[e.changed_by || ''];
                const isExpanded = expanded.has(e.id);
                return (
                  <div key={e.id} style={{ border: '1px solid #eef0f3', borderRadius: 8, overflow: 'hidden' }}>
                    <button
                      onClick={() => toggleExpand(e.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f9fafb', border: 'none', cursor: 'pointer', textAlign: 'right' }}
                    >
                      {isExpanded ? <ChevronDown size={14} color="#6b7280" /> : <ChevronRight size={14} color="#6b7280" style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />}
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, color: meta.color, background: meta.bg, fontWeight: 700, flexShrink: 0 }}>
                        {t(meta.ar, meta.en)}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1a2535' }}>{t(tableLabel.ar, tableLabel.en)}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={11} /> {userInfo?.name || (e.changed_by ? e.changed_by.slice(0, 8) : t('نظام', 'System'))}
                      </span>
                      <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, marginRight: 'auto' }}>
                        <Clock size={11} /> {formatTime(e.changed_at)}
                      </span>
                    </button>
                    {isExpanded && (
                      <div style={{ padding: '12px 16px', borderTop: '1px solid #eef0f3' }}>
                        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Database size={11} /> {t('الجدول', 'Table')}: <code>{e.table_name}</code></span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={11} /> {t('المعرف', 'Record')}: <code dir="ltr">{e.record_id ? e.record_id.slice(0, 8) : '-'}</code></span>
                        </div>
                        {e.action === 'DELETE' ? (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>{t('البيانات المحذوفة', 'Deleted Data')}</div>
                            <pre style={{ fontSize: 11, background: '#fef2f2', padding: 8, borderRadius: 6, overflowX: 'auto', direction: 'ltr' }}>{JSON.stringify(e.old_values, null, 2)}</pre>
                          </div>
                        ) : e.action === 'INSERT' ? (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-500)', marginBottom: 4 }}>{t('البيانات المضافة', 'Created Data')}</div>
                            <pre style={{ fontSize: 11, background: 'rgba(var(--brand-rgb),0.03)', padding: 8, borderRadius: 6, overflowX: 'auto', direction: 'ltr' }}>{JSON.stringify(e.new_values, null, 2)}</pre>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 8, fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>
                              <div>{t('الحقل', 'Field')}</div>
                              <div style={{ color: '#ef4444' }}>{t('قبل', 'Before')}</div>
                              <div style={{ color: 'var(--brand-500)' }}>{t('بعد', 'After')}</div>
                            </div>
                            {renderDiff(e.old_values, e.new_values)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {hasMore && !loading && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button className="btn-outline" onClick={() => { setPage(page + 1); void load(false); }}>
                  {t('تحميل المزيد', 'Load More')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
