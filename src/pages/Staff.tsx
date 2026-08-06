import { useState, useEffect, useMemo } from 'react';
import { supabase, type StaffUser } from '../lib/supabase';
import { Plus, Search, Pencil, Trash2, UserCog, X, Shield, Archive, ArchiveRestore } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { toggleArchive } from '../lib/archive';

type TFunc = (ar: string, en: string) => string;

const ROLES = ['manager', 'receptionist', 'accountant', 'supervisor'] as const;

const roleLabel = (t: TFunc, r: string | null): string => {
  const map: Record<string, string> = {
    manager: t('مدير', 'Manager'),
    receptionist: t('موظف استقبال', 'Receptionist'),
    accountant: t('محاسب', 'Accountant'),
    supervisor: t('مشرف', 'Supervisor'),
  };
  return map[r || ''] || r || '';
};

const roleBadge = (r: string | null): string => {
  switch (r) {
    case 'manager': return 'badge-gold';
    case 'receptionist': return 'badge-blue';
    case 'accountant': return 'badge-green';
    case 'supervisor': return 'badge-gray';
    default: return 'badge-gray';
  }
};

const statusBadge = (s: string | null): string => {
  switch (s) {
    case 'active': return 'badge-green';
    case 'inactive': return 'badge-gray';
    case 'suspended': return 'badge-red';
    default: return 'badge-gray';
  }
};

const statusLabel = (t: TFunc, s: string | null): string => {
  const map: Record<string, string> = {
    active: t('نشط', 'Active'),
    inactive: t('غير نشط', 'Inactive'),
    suspended: t('موقوف', 'Suspended'),
  };
  return map[s || ''] || s || '';
};

interface StaffForm {
  name: string;
  role: string;
  phone: string;
  email: string;
  status: string;
  hire_date: string;
  can_manage_bookings: boolean;
  can_manage_invoices: boolean;
  can_manage_inventory: boolean;
  can_view_reports: boolean;
}

const emptyForm: StaffForm = {
  name: '', role: 'receptionist', phone: '', email: '', status: 'active', hire_date: '',
  can_manage_bookings: false, can_manage_invoices: false, can_manage_inventory: false, can_view_reports: false,
};

export default function Staff() {
  const { t } = useLanguage();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = async (): Promise<void> => {
    setLoading(true);
    const { data } = await supabase.from('staff_users').select('*').order('name', { ascending: true });
    if (data) setStaff(data as StaffUser[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo((): StaffUser[] => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if ((s.archived === true) !== showArchived) return false;
      if (!q) return true;
      return (s.name || '').toLowerCase().includes(q) || (s.role || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
    });
  }, [staff, search, showArchived]);

  const openCreate = (): void => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };
  const openEdit = (s: StaffUser): void => {
    setForm({
      name: s.name || '', role: s.role || 'receptionist', phone: s.phone || '', email: s.email || '',
      status: s.status || 'active', hire_date: s.hire_date || '',
      can_manage_bookings: s.can_manage_bookings ?? false, can_manage_invoices: s.can_manage_invoices ?? false,
      can_manage_inventory: s.can_manage_inventory ?? false, can_view_reports: s.can_view_reports ?? false,
    });
    setEditingId(s.id);
    setModalOpen(true);
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    const payload = {
      name: form.name || null, role: form.role, phone: form.phone || null, email: form.email || null,
      status: form.status, hire_date: form.hire_date || null,
      can_manage_bookings: form.can_manage_bookings, can_manage_invoices: form.can_manage_invoices,
      can_manage_inventory: form.can_manage_inventory, can_view_reports: form.can_view_reports,
    };
    if (editingId) {
      await supabase.from('staff_users').update(payload).eq('id', editingId);
    } else {
      await supabase.from('staff_users').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    void load();
  };

  const remove = async (id: string): Promise<void> => {
    await supabase.from('staff_users').delete().eq('id', id);
    void load();
  };

  const archive = async (s: StaffUser): Promise<void> => { await toggleArchive('staff_users', s.id, s.archived === true); void load(); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('الموظفون', 'Staff')}</h1>
          <p className="page-subtitle">{t('إدارة طاقم الفندق والصلاحيات', 'Manage hotel staff and permissions')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => setShowArchived((v) => !v)} style={showArchived ? { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' } : undefined}><Archive size={18} /> {showArchived ? t('العودة للنشطة', 'Back to Active') : t('الأرشيف', 'Archive')}</button>
          <button className="btn-primary" onClick={openCreate}><Plus size={18} /> {t('موظف جديد', 'New Staff')}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder={t('ابحث بالاسم، الدور، أو البريد...', 'Search by name, role, or email...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <UserCog size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا يوجد موظفون', 'No staff members')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-th">{t('الاسم', 'Name')}</th>
                  <th className="table-th">{t('الدور', 'Role')}</th>
                  <th className="table-th">{t('الهاتف', 'Phone')}</th>
                  <th className="table-th">{t('البريد', 'Email')}</th>
                  <th className="table-th">{t('تاريخ التعيين', 'Hire Date')}</th>
                  <th className="table-th">{t('الحالة', 'Status')}</th>
                  <th className="table-th">{t('الصلاحيات', 'Permissions')}</th>
                  <th className="table-th">{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="table-row">
                    <td className="table-td">{s.name}</td>
                    <td className="table-td"><span className={roleBadge(s.role)}>{roleLabel(t, s.role)}</span></td>
                    <td className="table-td">{s.phone || '-'}</td>
                    <td className="table-td">{s.email || '-'}</td>
                    <td className="table-td">{s.hire_date || '-'}</td>
                    <td className="table-td"><span className={statusBadge(s.status)}>{statusLabel(t, s.status)}</span></td>
                    <td className="table-td">
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {s.can_manage_bookings && <span className="badge-gray" style={{ fontSize: 11 }}>{t('حجوزات', 'Bookings')}</span>}
                        {s.can_manage_invoices && <span className="badge-gray" style={{ fontSize: 11 }}>{t('فواتير', 'Invoices')}</span>}
                        {s.can_manage_inventory && <span className="badge-gray" style={{ fontSize: 11 }}>{t('مخزون', 'Inventory')}</span>}
                        {s.can_view_reports && <span className="badge-gray" style={{ fontSize: 11 }}>{t('تقارير', 'Reports')}</span>}
                      </div>
                    </td>
                    <td className="table-td">
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-ghost" onClick={() => openEdit(s)}><Pencil size={16} /></button>
                        <button className="btn-ghost" onClick={() => archive(s)} title={s.archived ? t('إلغاء الأرشفة', 'Unarchive') : t('أرشفة', 'Archive')} style={{ color: 'var(--brand-500)' }}>{s.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}</button>
                        <button className="btn-ghost" onClick={() => remove(s.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{editingId ? t('تعديل موظف', 'Edit Staff') : t('موظف جديد', 'New Staff')}</h2>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">{t('الاسم', 'Name')}</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('الدور', 'Role')}</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{roleLabel(t, r)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('الهاتف', 'Phone')}</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('البريد', 'Email')}</label>
                <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('الحالة', 'Status')}</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">{t('نشط', 'Active')}</option>
                  <option value="inactive">{t('غير نشط', 'Inactive')}</option>
                  <option value="suspended">{t('موقوف', 'Suspended')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('تاريخ التعيين', 'Hire Date')}</label>
                <input type="date" className="input" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Shield size={18} color="var(--brand-500)" />
                <span style={{ fontWeight: 700 }}>{t('الصلاحيات', 'Permissions')}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.can_manage_bookings} onChange={(e) => setForm({ ...form, can_manage_bookings: e.target.checked })} />
                  <span>{t('إدارة الحجوزات', 'Manage Bookings')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.can_manage_invoices} onChange={(e) => setForm({ ...form, can_manage_invoices: e.target.checked })} />
                  <span>{t('إدارة الفواتير', 'Manage Invoices')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.can_manage_inventory} onChange={(e) => setForm({ ...form, can_manage_inventory: e.target.checked })} />
                  <span>{t('إدارة المخزون', 'Manage Inventory')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.can_view_reports} onChange={(e) => setForm({ ...form, can_view_reports: e.target.checked })} />
                  <span>{t('عرض التقارير', 'View Reports')}</span>
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setModalOpen(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
