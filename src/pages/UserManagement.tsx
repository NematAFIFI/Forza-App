import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  Plus, Trash2, UserCog, X, AlertCircle, Pencil, Shield, Loader2,
  ChevronDown, ChevronRight, Lock, Unlock, Info, Crown,
} from 'lucide-react';

interface FullPermissions {
  can_check_in_out: boolean;
  can_issue_invoice: boolean;
  can_cancel_invoice: boolean;
  can_collect_payment: boolean;
  can_view_guest_ledger: boolean;
  can_manage_waitlist: boolean;
  can_grant_discount: boolean;
  can_transfer_balance: boolean;
  can_close_daily: boolean;
  can_view_occupancy: boolean;
  can_post_journal: boolean;
  can_manage_payables: boolean;
  can_reconcile_bank: boolean;
  can_manage_vat: boolean;
  can_view_financials: boolean;
  can_manage_payroll: boolean;
  can_manage_chart: boolean;
  can_manage_periods: boolean;
  can_approve_financials: boolean;
  can_manage_fixed_assets: boolean;
  can_review_audit_log: boolean;
  can_approve_purchase: boolean;
  can_manage_users: boolean;
  can_manage_settings: boolean;
  discount_limit_pct: number;
}

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  role_level: number | null;
  created_at: string | null;
  status: string | null;
  permissions: FullPermissions;
}

const emptyPerms: FullPermissions = {
  can_check_in_out: false, can_issue_invoice: false, can_cancel_invoice: false,
  can_collect_payment: false, can_view_guest_ledger: false, can_manage_waitlist: false,
  can_grant_discount: false, can_transfer_balance: false, can_close_daily: false,
  can_view_occupancy: false, can_post_journal: false, can_manage_payables: false,
  can_reconcile_bank: false, can_manage_vat: false, can_view_financials: false,
  can_manage_payroll: false, can_manage_chart: false, can_manage_periods: false,
  can_approve_financials: false, can_manage_fixed_assets: false, can_review_audit_log: false,
  can_approve_purchase: false, can_manage_users: false, can_manage_settings: false,
  discount_limit_pct: 0,
};

const ROLE_META: Record<number, { ar: string; en: string; color: string; bg: string; icon: typeof Crown }> = {
  1: { ar: 'موظف الاستقبال', en: 'Reception / Front Desk', color: '#3b82f6', bg: '#3b82f615', icon: UserCog },
  2: { ar: 'مشرف الوردية', en: 'Shift Supervisor', color: '#f59e0b', bg: '#f59e0b15', icon: Shield },
  3: { ar: 'أمين المخزن', en: 'Storekeeper / Purchasing', color: '#10b981', bg: '#10b98115', icon: UserCog },
  4: { ar: 'محاسب', en: 'Accountant', color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)', icon: UserCog },
  5: { ar: 'مدير مالي', en: 'Finance Manager', color: '#8b5cf6', bg: '#8b5cf615', icon: Shield },
  6: { ar: 'مدير عام', en: 'General Manager', color: '#dc2626', bg: '#dc262615', icon: Crown },
};

const PERMISSION_GROUPS: { title: { ar: string; en: string }; keys: { key: keyof FullPermissions; label: { ar: string; en: string } }[] }[] = [
  {
    title: { ar: 'الاستقبال والحجوزات', en: 'Reception & Bookings' },
    keys: [
      { key: 'can_check_in_out', label: { ar: 'تسجيل وصول/مغادرة', en: 'Check-in / Check-out' } },
      { key: 'can_issue_invoice', label: { ar: 'إصدار فواتير', en: 'Issue Invoices' } },
      { key: 'can_cancel_invoice', label: { ar: 'إلغاء/تعديل فاتورة', en: 'Cancel Invoice' } },
      { key: 'can_collect_payment', label: { ar: 'تحصيل مدفوعات', en: 'Collect Payments' } },
      { key: 'can_view_guest_ledger', label: { ar: 'كشف حساب الضيف', en: 'Guest Ledger' } },
      { key: 'can_manage_waitlist', label: { ar: 'قائمة الانتظار', en: 'Manage Waitlist' } },
      { key: 'can_grant_discount', label: { ar: 'منح خصومات', en: 'Grant Discounts' } },
      { key: 'can_transfer_balance', label: { ar: 'تحويل أرصدة', en: 'Transfer Balances' } },
    ],
  },
  {
    title: { ar: 'الإشراف واليومية', en: 'Supervision & Daily Close' },
    keys: [
      { key: 'can_close_daily', label: { ar: 'إغلاق يومي', en: 'Close Daily' } },
      { key: 'can_view_occupancy', label: { ar: 'تقارير الإشغال', en: 'Occupancy Reports' } },
    ],
  },
  {
    title: { ar: 'المحاسبة والمالية', en: 'Accounting & Finance' },
    keys: [
      { key: 'can_post_journal', label: { ar: 'قيود محاسبية', en: 'Post Journal' } },
      { key: 'can_manage_payables', label: { ar: 'الذمم الدائنة', en: 'Manage Payables' } },
      { key: 'can_reconcile_bank', label: { ar: 'تسوية بنكية', en: 'Reconcile Bank' } },
      { key: 'can_manage_vat', label: { ar: 'إدارة الضريبة', en: 'Manage VAT' } },
      { key: 'can_view_financials', label: { ar: 'التقارير المالية', en: 'View Financials' } },
      { key: 'can_manage_payroll', label: { ar: 'الرواتب', en: 'Manage Payroll' } },
      { key: 'can_manage_chart', label: { ar: 'دليل الحسابات', en: 'Manage Chart' } },
      { key: 'can_manage_periods', label: { ar: 'الفترات المالية', en: 'Manage Periods' } },
      { key: 'can_approve_financials', label: { ar: 'اعتماد القوائم', en: 'Approve Financials' } },
      { key: 'can_manage_fixed_assets', label: { ar: 'الأصول الثابتة', en: 'Fixed Assets' } },
    ],
  },
  {
    title: { ar: 'المشتريات والمخزون', en: 'Purchasing & Inventory' },
    keys: [
      { key: 'can_approve_purchase', label: { ar: 'اعتماد شراء', en: 'Approve Purchase' } },
    ],
  },
  {
    title: { ar: 'الإدارة والنظام', en: 'Administration' },
    keys: [
      { key: 'can_review_audit_log', label: { ar: 'سجل التدقيق', en: 'Review Audit Log' } },
      { key: 'can_manage_users', label: { ar: 'إدارة المستخدمين', en: 'Manage Users' } },
      { key: 'can_manage_settings', label: { ar: 'إعدادات النظام', en: 'Manage Settings' } },
    ],
  },
];

export default function UserManagement() {
  const { t, lang } = useLanguage();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', name: '', role_level: 1, password: '', status: 'active' });
  const [perms, setPerms] = useState<FullPermissions>(emptyPerms);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0]));
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('user-management', { body: { action: 'list' } });
      if (fnError) throw fnError;
      const list: UserItem[] = (data?.users ?? []).map((u: UserItem) => ({ ...u, permissions: u.permissions ?? emptyPerms }));
      setUsers(list);
    } catch {
      setError(t('تعذر تحميل المستخدمين', 'Unable to load users'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const applyRoleDefaults = async (level: number) => {
    setForm((f) => ({ ...f, role_level: level }));
    try {
      const { data } = await supabase.functions.invoke('user-management', { body: { action: 'role_defaults', level } });
      if (data?.defaults) {
        const d = data.defaults;
        const newPerms: FullPermissions = { ...emptyPerms };
        (Object.keys(emptyPerms) as (keyof FullPermissions)[]).forEach((k) => {
          if (k in d) (newPerms as any)[k] = d[k];
        });
        setPerms(newPerms);
      }
    } catch { /* keep current */ }
  };

  const openCreate = () => {
    setForm({ email: '', name: '', role_level: 1, password: '', status: 'active' });
    setPerms(emptyPerms);
    setEditingId(null);
    setModalOpen(true);
    void applyRoleDefaults(1);
  };

  const openEdit = (u: UserItem) => {
    setForm({ email: u.email, name: u.name || '', role_level: u.role_level || 1, password: '', status: u.status || 'active' });
    setPerms(u.permissions ?? emptyPerms);
    setEditingId(u.id);
    setModalOpen(true);
  };

  const toggleGroup = (idx: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const togglePerm = (key: keyof FullPermissions) => {
    setPerms((p) => ({ ...p, [key]: !p[key] }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const { error: fnError } = await supabase.functions.invoke('user-management', {
          body: { action: 'update', userId: editingId, name: form.name, role_level: form.role_level, status: form.status, permissions: perms },
        });
        if (fnError) throw fnError;
      } else {
        const { error: fnError } = await supabase.functions.invoke('user-management', {
          body: { action: 'create', email: form.email, name: form.name, role_level: form.role_level, password: form.password || undefined, permissions: perms },
        });
        if (fnError) throw fnError;
      }
      setModalOpen(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر حفظ المستخدم', 'Unable to save user'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error: fnError } = await supabase.functions.invoke('user-management', { body: { action: 'delete', userId: deleteTarget.id } });
      if (fnError) throw fnError;
      setDeleteTarget(null);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر حذف المستخدم', 'Unable to delete user'));
    }
  };

  const statusBadge = (s: string | null) => {
    switch (s) {
      case 'active': return { color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)', label: t('نشط', 'Active') };
      case 'inactive': return { color: '#6b7280', bg: '#f3f4f6', label: t('غير نشط', 'Inactive') };
      case 'suspended': return { color: '#ef4444', bg: '#ef444415', label: t('موقوف', 'Suspended') };
      default: return { color: '#6b7280', bg: '#f3f4f6', label: s || t('نشط', 'Active') };
    }
  };

  const countEnabledPerms = (p: FullPermissions) => {
    return (Object.keys(emptyPerms) as (keyof FullPermissions)[]).filter((k) => k !== 'discount_limit_pct' && p[k]).length;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('إدارة المستخدمين والصلاحيات', 'Users & Permissions')}</h1>
          <p className="page-subtitle">{t('6 مستويات صلاحيات — من الاستقبال إلى المدير العام', '6 role levels — from Front Desk to General Manager')}</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={18} /> {t('مستخدم جديد', 'New User')}</button>
      </div>

      {/* Role legend */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Shield size={18} color="var(--brand-500)" />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{t('مستويات الصلاحيات', 'Role Levels')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {Object.entries(ROLE_META).map(([lvl, meta]) => {
            const Icon = meta.icon;
            return (
              <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: meta.bg, border: `1px solid ${meta.color}30` }}>
                <Icon size={16} color={meta.color} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{t(`المستوى ${lvl}`, `Level ${lvl}`)}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{t(meta.ar, meta.en)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: 14, marginBottom: 16, borderColor: '#ef4444', background: '#fef2f2' }}>
          <p style={{ color: '#dc2626', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} /> {error}
          </p>
        </div>
      )}

      <div className="card" style={{ padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            {t('جارٍ التحميل...', 'Loading...')}
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <UserCog size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا يوجد مستخدمون', 'No users')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {users.map((u) => {
              const meta = ROLE_META[u.role_level || 1] || ROLE_META[1];
              const Icon = meta.icon;
              const sb = statusBadge(u.status);
              const enabledCount = countEnabledPerms(u.permissions);
              return (
                <div
                  key={u.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 10,
                    background: '#f9fafb', border: '1px solid #eef0f3',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={meta.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {u.name || '-'}
                      <span style={{ fontSize: 12, color: '#9ca3af', marginRight: 8 }} dir="ltr">{u.email}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, color: meta.color, background: meta.bg, fontWeight: 600 }}>
                        {t(`المستوى ${u.role_level || 1}`, `Level ${u.role_level || 1}`)} — {t(meta.ar, meta.en)}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, color: sb.color, background: sb.bg, fontWeight: 600 }}>
                        {sb.label}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, color: '#6b7280', background: '#f3f4f6' }}>
                        {enabledCount} {t('صلاحية', 'permissions')}
                      </span>
                      {u.permissions.discount_limit_pct > 0 && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, color: '#f59e0b', background: '#f59e0b15', fontWeight: 600 }}>
                          {t('حد الخصم', 'Discount Limit')}: {u.permissions.discount_limit_pct}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" onClick={() => openEdit(u)} style={{ padding: 6 }} title={t('تعديل', 'Edit')}><Pencil size={15} /></button>
                    <button className="btn-ghost" onClick={() => setDeleteTarget(u)} style={{ padding: 6, color: '#ef4444' }} title={t('حذف', 'Delete')}><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editingId ? t('تعديل مستخدم', 'Edit User') : t('مستخدم جديد', 'New User')}</h2>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">{t('الاسم', 'Name')}</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('البريد الإلكتروني', 'Email')}</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editingId} dir="ltr" />
              </div>
              {!editingId && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">{t('كلمة المرور', 'Password')}</label>
                  <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t('اتركها فارغة لتوليد تلقائي', 'Leave empty to auto-generate')} dir="ltr" />
                </div>
              )}
              <div>
                <label className="label">{t('المستوى', 'Role Level')}</label>
                <select className="input" value={form.role_level} onChange={(e) => applyRoleDefaults(Number(e.target.value))}>
                  {Object.entries(ROLE_META).map(([lvl, meta]) => (
                    <option key={lvl} value={lvl}>
                      {t(`المستوى ${lvl}`, `Level ${lvl}`)} — {t(meta.ar, meta.en)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('الحالة', 'Status')}</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">{t('نشط', 'Active')}</option>
                  <option value="inactive">{t('غير نشط', 'Inactive')}</option>
                  <option value="suspended">{t('موقوف', 'Suspended')}</option>
                </select>
              </div>
            </div>

            {/* Discount limit */}
            <div style={{ marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #eef0f3' }}>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={14} color="#f59e0b" />
                {t('حد الخصم المصرح به (%)', 'Authorized Discount Limit (%)')}
              </label>
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                value={perms.discount_limit_pct}
                onChange={(e) => setPerms({ ...perms, discount_limit_pct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                style={{ maxWidth: 120 }}
                dir="ltr"
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                {t('أي خصم يتجاوز هذه النسبة يتطلب موافقة مستوى أعلى', 'Any discount exceeding this requires higher-level approval')}
              </p>
            </div>

            {/* Permission matrix */}
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={16} color="var(--brand-500)" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>{t('مصفوفة الصلاحيات', 'Permission Matrix')}</span>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
              {PERMISSION_GROUPS.map((group, gIdx) => {
                const expanded = expandedGroups.has(gIdx);
                return (
                  <div key={gIdx} style={{ marginBottom: 6, border: '1px solid #eef0f3', borderRadius: 8, overflow: 'hidden' }}>
                    <button
                      onClick={() => toggleGroup(gIdx)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f9fafb', border: 'none', cursor: 'pointer', textAlign: 'right' }}
                    >
                      {expanded ? <ChevronDown size={14} color="#6b7280" /> : <ChevronRight size={14} color="#6b7280" style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />}
                      <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{t(group.title.ar, group.title.en)}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        {group.keys.filter((k) => perms[k.key]).length}/{group.keys.length}
                      </span>
                    </button>
                    {expanded && (
                      <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {group.keys.map((k) => {
                          const enabled = perms[k.key] as boolean;
                          return (
                            <label
                              key={k.key}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                                padding: '6px 8px', borderRadius: 6,
                                background: enabled ? 'rgba(var(--brand-rgb),0.06)' : 'transparent',
                                transition: 'background 0.15s',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => togglePerm(k.key)}
                                style={{
                                  width: 18, height: 18, borderRadius: 5, border: '1.5px solid',
                                  borderColor: enabled ? 'var(--brand-500)' : '#d1d5db', background: enabled ? 'var(--brand-500)' : '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                                }}
                              >
                                {enabled && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                              </button>
                              <span style={{ fontSize: 12, fontWeight: enabled ? 600 : 400, color: enabled ? 'var(--brand-500)' : '#6b7280' }}>
                                {t(k.label.ar, k.label.en)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setModalOpen(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={save} disabled={saving || !form.email || !form.name}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
                {t('حفظ', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center', padding: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ef444415', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={26} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t('تأكيد الحذف', 'Confirm Delete')}</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                {t('سيتم حذف المستخدم', 'Delete user')} «{deleteTarget.name || deleteTarget.email}» {t('نهائياً', 'permanently')}.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setDeleteTarget(null)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-danger" onClick={confirmDelete}><Trash2 size={16} /> {t('حذف', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
