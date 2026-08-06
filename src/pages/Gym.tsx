import { useState, useEffect, useMemo } from 'react';
import { supabase, type Service } from '../lib/supabase';
import { Plus, Dumbbell, Search, Trash2, Pencil, X } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface PlanForm {
  name: string;
  price: string;
  description: string;
  is_active: boolean;
}

const emptyForm: PlanForm = { name: '', price: '', description: '', is_active: true };

interface Member {
  id: string;
  name: string;
  phone: string;
  plan: string;
  joinDate: string;
}

export default function Gym() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberModal, setMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', plan: '' });

  const load = async (): Promise<void> => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').eq('category', 'gym').order('created_at', { ascending: false });
    if (data) setPlans(data as Service[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo((): Service[] => {
    const q = search.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [plans, search]);

  const save = async (): Promise<void> => {
    setSaving(true);
    const payload = { name: form.name || null, category: 'gym', price: Number(form.price) || 0, description: form.description || null, is_active: form.is_active };
    if (editingId) {
      await supabase.from('services').update(payload).eq('id', editingId);
    } else {
      await supabase.from('services').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    void load();
  };

  const remove = async (id: string): Promise<void> => {
    await supabase.from('services').delete().eq('id', id);
    void load();
  };

  const addMember = (): void => {
    if (!memberForm.name) return;
    setMembers([...members, { id: crypto.randomUUID(), name: memberForm.name, phone: memberForm.phone, plan: memberForm.plan, joinDate: new Date().toISOString().slice(0, 10) }]);
    setMemberForm({ name: '', phone: '', plan: '' });
    setMemberModal(false);
  };

  const removeMember = (id: string): void => {
    setMembers(members.filter((m) => m.id !== id));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('النادي الرياضي', 'Gym')}</h1>
          <p className="page-subtitle">{t('إدارة باقات وأعضاء الجيم', 'Manage gym plans and members')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => setMemberModal(true)}><Plus size={18} /> {t('عضو جديد', 'New Member')}</button>
          <button className="btn-primary" onClick={() => { setForm(emptyForm); setEditingId(null); setModalOpen(true); }}><Plus size={18} /> {t('باقة جديدة', 'New Plan')}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder={t('ابحث في الباقات...', 'Search plans...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>{t('جارٍ التحميل...', 'Loading...')}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>{t('الباقات', 'Plans')}</h3>
            {filtered.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
                <Dumbbell size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p>{t('لا توجد باقات', 'No plans')}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {filtered.map((p) => (
                  <div key={p.id} className="card card-hover" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                        <div style={{ color: 'var(--brand-500)', fontWeight: 700, fontSize: 18 }}>{p.price ?? 0} {t('ر.س', 'SAR')}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-ghost" onClick={() => { setForm({ name: p.name || '', price: p.price != null ? String(p.price) : '', description: p.description || '', is_active: p.is_active ?? true }); setEditingId(p.id); setModalOpen(true); }}><Pencil size={14} /></button>
                        <button className="btn-ghost" onClick={() => remove(p.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {p.description && <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>{p.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>{t('الأعضاء', 'Members')} ({members.length})</h3>
            {members.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
                <p>{t('لا يوجد أعضاء', 'No members')}</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th className="table-th">{t('الاسم', 'Name')}</th><th className="table-th">{t('الهاتف', 'Phone')}</th><th className="table-th">{t('الباقة', 'Plan')}</th><th className="table-th">{t('إجراءات', 'Actions')}</th></tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} className="table-row">
                        <td className="table-td">{m.name}</td>
                        <td className="table-td">{m.phone || '-'}</td>
                        <td className="table-td">{m.plan || '-'}</td>
                        <td className="table-td"><button className="btn-ghost" onClick={() => removeMember(m.id)}><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editingId ? t('تعديل باقة', 'Edit Plan') : t('باقة جديدة', 'New Plan')}</h2>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div><label className="label">{t('الاسم', 'Name')}</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label">{t('السعر', 'Price')}</label><input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><label className="label">{t('الوصف', 'Description')}</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <span className="label" style={{ margin: 0 }}>{t('متاح', 'Available')}</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setModalOpen(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {memberModal && (
        <div className="modal-overlay" onClick={() => setMemberModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('عضو جديد', 'New Member')}</h2>
              <button className="btn-ghost" onClick={() => setMemberModal(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div><label className="label">{t('الاسم', 'Name')}</label><input className="input" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} /></div>
              <div><label className="label">{t('الهاتف', 'Phone')}</label><input className="input" value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} /></div>
              <div><label className="label">{t('الباقة', 'Plan')}</label>
                <select className="input" value={memberForm.plan} onChange={(e) => setMemberForm({ ...memberForm, plan: e.target.value })}>
                  <option value="">{t('اختر باقة', 'Select plan')}</option>
                  {plans.map((p) => <option key={p.id} value={p.name || ''}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setMemberModal(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={addMember}>{t('إضافة', 'Add')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
