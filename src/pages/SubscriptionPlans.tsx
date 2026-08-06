import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { CreditCard, Plus, X, Pencil, Trash2, Check, Users, BedDouble, Sparkles } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_units: number | null;
  max_users: number | null;
  features: string[];
  status: string;
  sort_order: number;
}

interface PlanForm {
  name: string;
  name_en: string;
  description: string;
  price_monthly: string;
  price_yearly: string;
  max_units: string;
  max_users: string;
  features: string;
  status: string;
}

const emptyForm: PlanForm = {
  name: '',
  name_en: '',
  description: '',
  price_monthly: '0',
  price_yearly: '0',
  max_units: '',
  max_users: '',
  features: '',
  status: 'active',
};

export default function SubscriptionPlans() {
  const { t, lang } = useLanguage();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [error, setError] = useState('');

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true });
    if (err) {
      setError(err.message);
    }
    setPlans((data as Plan[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditMode(false);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setForm({
      name: plan.name || '',
      name_en: plan.name_en || '',
      description: plan.description || '',
      price_monthly: String(plan.price_monthly ?? 0),
      price_yearly: String(plan.price_yearly ?? 0),
      max_units: plan.max_units != null ? String(plan.max_units) : '',
      max_users: plan.max_users != null ? String(plan.max_users) : '',
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      status: plan.status || 'active',
    });
    setEditMode(true);
    setEditingId(plan.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setEditMode(false);
    setEditingId(null);
  };

  const savePlan = async () => {
    if (!form.name.trim()) {
      setError(t('الرجاء إدخال اسم الباقة', 'Please enter plan name'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const features = form.features
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);
      const payload = {
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        description: form.description.trim() || null,
        price_monthly: Number(form.price_monthly) || 0,
        price_yearly: Number(form.price_yearly) || 0,
        max_units: form.max_units ? Number(form.max_units) : null,
        max_users: form.max_users ? Number(form.max_users) : null,
        features,
        status: form.status,
      };
      if (editMode && editingId) {
        const { error: err } = await supabase
          .from('subscription_plans')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('subscription_plans').insert(payload);
        if (err) throw err;
      }
      closeModal();
      await loadPlans();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('حدث خطأ أثناء الحفظ', 'An error occurred while saving');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error: err } = await supabase.from('subscription_plans').delete().eq('id', deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null);
      await loadPlans();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('تعذر الحذف', 'Unable to delete');
      setError(msg);
    }
  };

  const formatPrice = (n: number): string => {
    if (lang === 'ar') return `${n.toLocaleString('ar-SA')} ر.س`;
    return `${n.toLocaleString('en-US')} SAR`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('إدارة الباقات والأسعار', 'Subscription Plans')}</h1>
          <p className="page-subtitle">{t('إنشاء وتعديل خطط الاشتراك المتاحة لمشتركي النظام', 'Create and edit subscription plans available to system clients')}</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={18} /> {t('إضافة باقة', 'Add Plan')}</button>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, padding: 16, borderColor: '#ef4444', background: '#fef2f2' }}>
          <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>{t('جارٍ التحميل...', 'Loading...')}</div>
      ) : plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
          <CreditCard size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>{t('لا توجد باقات بعد', 'No plans yet')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {plans.map((plan) => (
            <div key={plan.id} className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {plan.status === 'inactive' && (
                <span style={{ position: 'absolute', top: 14, left: 14, fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '3px 10px', borderRadius: 20 }}>{t('غير مفعّلة', 'Inactive')}</span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg, rgba(var(--brand-rgb),0.13), rgba(var(--brand-rgb-700),0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={20} color="var(--brand-500)" />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{plan.name}</div>
                  {plan.name_en && <div style={{ fontSize: 12, color: '#9ca3af' }}>{plan.name_en}</div>}
                </div>
              </div>

              {plan.description && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>{plan.description}</p>}

              <div style={{ display: 'flex', gap: 16, marginBottom: 14, padding: '12px 0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{t('شهرياً', 'Monthly')}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand-500)' }}>{formatPrice(plan.price_monthly)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{t('سنوياً', 'Yearly')}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand-500)' }}>{formatPrice(plan.price_yearly)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 12 }}>
                {plan.max_units != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280' }}>
                    <BedDouble size={14} /> {plan.max_units} {t('وحدة', 'units')}
                  </div>
                )}
                {plan.max_users != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280' }}>
                    <Users size={14} /> {plan.max_users} {t('مستخدم', 'users')}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, marginBottom: 16 }}>
                {Array.isArray(plan.features) && plan.features.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#4b5563' }}>
                        <Check size={15} color="var(--brand-500)" style={{ marginTop: 2, flexShrink: 0 }} /> {f}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 13, color: '#9ca3af' }}>{t('لا توجد مزايا محددة', 'No features listed')}</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button className="btn-ghost" onClick={() => openEdit(plan)} style={{ flex: 1, justifyContent: 'center' }}><Pencil size={16} /> {t('تعديل', 'Edit')}</button>
                <button className="btn-ghost" onClick={() => setDeleteTarget(plan)} style={{ padding: '8px 12px', color: '#ef4444' }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editMode ? t('تعديل الباقة', 'Edit Plan') : t('إضافة باقة جديدة', 'Add New Plan')}</h2>
              <button className="btn-ghost" onClick={closeModal}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div><label className="label">{t('اسم الباقة *', 'Plan Name *')}</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('مثال: الباقة الاحترافية', 'e.g. Professional')} /></div>
              <div><label className="label">{t('الاسم بالإنجليزية', 'English Name')}</label><input className="input" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="Professional" dir="ltr" /></div>
              <div><label className="label">{t('الوصف', 'Description')}</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('وصف مختصر للباقة', 'Short description')} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">{t('السعر الشهري', 'Monthly Price')}</label><input className="input" type="number" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: e.target.value })} dir="ltr" /></div>
                <div><label className="label">{t('السعر السنوي', 'Yearly Price')}</label><input className="input" type="number" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: e.target.value })} dir="ltr" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">{t('حد الوحدات', 'Max Units')}</label><input className="input" type="number" value={form.max_units} onChange={(e) => setForm({ ...form, max_units: e.target.value })} placeholder={t('غير محدود', 'Unlimited')} dir="ltr" /></div>
                <div><label className="label">{t('حد المستخدمين', 'Max Users')}</label><input className="input" type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: e.target.value })} placeholder={t('غير محدود', 'Unlimited')} dir="ltr" /></div>
              </div>
              <div><label className="label">{t('المزايا (كل ميزة في سطر)', 'Features (one per line)')}</label><textarea className="input" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={4} placeholder={t('إدارة الحجوزات\nإدارة الوحدات\nالفواتير', 'Bookings\nUnits\nInvoices')} style={{ resize: 'vertical' }} /></div>
              <div>
                <label className="label">{t('الحالة', 'Status')}</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">{t('مفعّلة', 'Active')}</option>
                  <option value="inactive">{t('غير مفعّلة', 'Inactive')}</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={closeModal}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={savePlan} disabled={saving}>{saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{t('تأكيد الحذف', 'Confirm Delete')}</h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>{t('هل أنت متأكد من حذف باقة', 'Are you sure you want to delete plan')} <strong>{deleteTarget.name}</strong>؟</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setDeleteTarget(null)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={confirmDelete} style={{ background: '#ef4444' }}>{t('حذف', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
