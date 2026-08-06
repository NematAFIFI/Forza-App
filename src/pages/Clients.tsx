import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  ShoppingBag,
  Search,
  Trash2,
  Plus,
  X,
  Pencil,
  Building2,
  Phone,
  Mail,
  CreditCard,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Check,
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  access_token: string;
  status: string;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
}

interface ClientForm {
  name: string;
  email: string;
  phone: string;
  company_name: string;
  plan_id: string;
  password: string;
}

const emptyForm: ClientForm = {
  name: '',
  email: '',
  phone: '',
  company_name: '',
  plan_id: '',
  password: '',
};

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

interface CreatedCredentials {
  name: string;
  email: string;
  password: string;
  planName: string;
}

export default function Clients() {
  const { t, lang } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
  const [error, setError] = useState<string>('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('system_clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
    }
    setClients((data as Client[]) || []);
    setLoading(false);
  }, []);

  const loadPlans = useCallback(async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('id, name, price_monthly, price_yearly')
      .eq('status', 'active')
      .order('sort_order', { ascending: true });
    setPlans((data as Plan[]) || []);
  }, []);

  useEffect(() => {
    loadClients();
    loadPlans();
  }, [loadClients, loadPlans]);

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setForm({ ...emptyForm, password: generatePassword() });
    setEditMode(false);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company_name: client.company_name || '',
      plan_id: '',
      password: '',
    });
    setEditMode(true);
    setEditingId(client.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setEditMode(false);
    setEditingId(null);
    setShowPassword(false);
  };

  const closeCredentials = () => {
    setCredentials(null);
  };

  const saveClient = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError(t('الرجاء إدخال الاسم والبريد الإلكتروني', 'Please enter name and email'));
      return;
    }
    if (!editMode && form.password.trim().length < 6) {
      setError(t('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'Password must be at least 6 characters'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editMode && editingId) {
        const { error: err } = await supabase
          .from('system_clients')
          .update({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            company_name: form.company_name.trim(),
          })
          .eq('id', editingId);
        if (err) throw err;
        closeModal();
        await loadClients();
      } else {
        // 1. Create the auth user via edge function
        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-buyer-account`;
        const { data: sessionData } = await supabase.auth.getSession();
        const res = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            name: form.name.trim(),
          }),
        });
        const fnResult = await res.json();
        if (!res.ok) {
          throw new Error(fnResult.error || 'Failed to create account');
        }

        // 2. Insert system_clients record
        const token = crypto.randomUUID();
        const { data: clientRow, error: err } = await supabase
          .from('system_clients')
          .insert({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            company_name: form.company_name.trim(),
            access_token: token,
            status: 'active',
            buyer_user_id: fnResult.user_id,
          })
          .select()
          .single();
        if (err) throw err;

        // 3. Create subscription record if a plan was selected
        let planName = '-';
        if (form.plan_id && clientRow) {
          const plan = plans.find((p) => p.id === form.plan_id);
          planName = plan?.name || '-';
          const now = new Date();
          const expires = new Date(now);
          expires.setFullYear(expires.getFullYear() + 1);
          await supabase.from('client_subscriptions').insert({
            client_id: clientRow.id,
            plan_id: form.plan_id,
            status: 'active',
            billing_cycle: 'yearly',
            started_at: now.toISOString(),
            expires_at: expires.toISOString(),
            amount: plan?.price_yearly || 0,
            last_payment_at: now.toISOString(),
          });
        }

        // 4. Show credentials card
        setCredentials({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          planName,
        });
        closeModal();
        await loadClients();
      }
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
      const { error: err } = await supabase.from('system_clients').delete().eq('id', deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null);
      await loadClients();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('تعذر الحذف', 'Unable to delete');
      setError(msg);
    }
  };

  const formatDate = (d: string): string => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('مشتريو النظام', 'System Clients')}</h1>
          <p className="page-subtitle">{t('إدارة عملاء نظام رواق', 'Manage Riwaaq system clients')}</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={18} /> {t('إضافة مشترٍ جديد', 'Add New Client')}</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder={t('ابحث بالاسم أو البريد أو اسم الشركة...', 'Search by name, email, or company name...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, padding: 16, borderColor: '#ef4444', background: '#fef2f2' }}>
          <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <ShoppingBag size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا يوجد مشترين بعد', 'No clients yet')}</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>{t('ابدأ بإضافة أول مشترٍ', 'Start by adding your first client')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-th">{t('المشتري', 'Client')}</th>
                  <th className="table-th">{t('الشركة', 'Company')}</th>
                  <th className="table-th">{t('التواصل', 'Contact')}</th>
                  <th className="table-th">{t('تاريخ الإنشاء', 'Created Date')}</th>
                  <th className="table-th">{t('الحالة', 'Status')}</th>
                  <th className="table-th">{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="table-row">
                    <td className="table-td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(var(--brand-rgb),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Building2 size={18} color="var(--brand-500)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">{c.company_name || '-'}</td>
                    <td className="table-td">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#6b7280' }}>
                        {c.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }} dir="ltr"><Phone size={12} /> {c.phone}</span>}
                        {c.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }} dir="ltr"><Mail size={12} /> {c.email}</span>}
                      </div>
                    </td>
                    <td className="table-td" style={{ color: '#9ca3af', fontSize: 13 }}>{formatDate(c.created_at)}</td>
                    <td className="table-td">
                      {c.status === 'inactive' ? <span className="badge-gray">{t('غير نشط', 'Inactive')}</span> : <span className="badge-green">{t('نشط', 'Active')}</span>}
                    </td>
                    <td className="table-td">
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-ghost" onClick={() => openEdit(c)} title={t('تعديل', 'Edit')} style={{ padding: 6 }}><Pencil size={16} /></button>
                        <button className="btn-ghost" onClick={() => setDeleteTarget(c)} title={t('حذف', 'Delete')} style={{ padding: 6, color: '#ef4444' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editMode ? t('تعديل المشتري', 'Edit Client') : t('إضافة مشترٍ جديد', 'Add New Client')}</h2>
              <button className="btn-ghost" onClick={closeModal}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div><label className="label">{t('الاسم الكامل *', 'Full Name *')}</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('أدخل اسم المشتري', 'Enter client name')} /></div>
              <div><label className="label">{t('البريد الإلكتروني *', 'Email *')}</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="client@example.com" dir="ltr" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">{t('رقم الهاتف', 'Phone Number')}</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05xxxxxxxx" dir="ltr" /></div>
                <div><label className="label">{t('اسم الشركة', 'Company Name')}</label><input className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder={t('اسم الفندق/الشركة', 'Hotel/Company name')} /></div>
              </div>

              {!editMode && (
                <>
                  <div>
                    <label className="label">{t('الباقة المشتراة', 'Subscribed Plan')}</label>
                    <select className="input" value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}>
                      <option value="">{t('— بدون باقة —', '— No plan —')}</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.price_monthly} {t('ر.س/شهري', 'SAR/mo')})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">{t('كلمة المرور الأولية *', 'Initial Password *')}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <KeyRound size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input className="input" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ paddingRight: 40, paddingLeft: 40 }} dir="ltr" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <button type="button" className="btn-ghost" onClick={() => setForm({ ...form, password: generatePassword() })} title={t('توليد كلمة مرور جديدة', 'Generate new password')} style={{ padding: '0 12px' }}>
                        <RefreshCw size={16} />
                      </button>
                    </div>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{t('سيستخدم المشتري هذه كلمة المرور لأول دخول، ويمكنه تغييرها لاحقاً من البوابة', 'The client will use this password for first login and can change it later from the portal')}</p>
                  </div>
                </>
              )}

              {!editMode && (
                <div style={{ padding: 14, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb', fontSize: 13, color: 'var(--brand-500)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Sparkles size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{t('سيتم إنشاء حساب دخول خاص للمشتري تلقائياً عند الحفظ.', 'A private login account will be automatically created for this client upon saving.')}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={closeModal} disabled={saving}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={saveClient} disabled={saving}>{saving ? t('جارٍ الحفظ...', 'Saving...') : editMode ? t('حفظ التعديلات', 'Save Changes') : t('إنشاء المشتري', 'Create Client')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials card after creation */}
      {credentials && (
        <div className="modal-overlay" onClick={closeCredentials}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(var(--brand-rgb),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Check size={28} color="var(--brand-500)" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>{t('تم إنشاء المشتري بنجاح!', 'Client Created Successfully!')}</h2>
              <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>{t('انسخ هذه البيانات وأرسلها للمشتري', 'Copy these credentials and send them to the client')}</p>
            </div>

            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, display: 'grid', gap: 14 }}>
              {/* Client name */}
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>{t('الاسم', 'Name')}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{credentials.name}</div>
              </div>

              {/* Plan */}
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>{t('الباقة', 'Plan')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={14} color="var(--brand-500)" />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{credentials.planName}</span>
                </div>
              </div>

              {/* Email */}
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>{t('اسم المستخدم (البريد)', 'Username (Email)')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ flex: 1, fontSize: 13, background: '#fff', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} dir="ltr">{credentials.email}</code>
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>{t('كلمة المرور', 'Password')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#dc2626', background: '#fff', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} dir="ltr">{credentials.password}</code>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', fontSize: 12, color: '#b45309', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <KeyRound size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{t('يُفضل أن يغيّر المشتري كلمة المرور عند أول دخول للبوابة.', 'The client should change their password upon first login to the portal.')}</span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
              <button className="btn-primary" onClick={closeCredentials}>{t('تم', 'Done')}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center', padding: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ef444415', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={26} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t('تأكيد الحذف', 'Confirm Delete')}</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>{t('هل أنت متأكد من حذف المشتري', 'Are you sure you want to delete client')} «{deleteTarget.name}»؟ {t('لا يمكن التراجع عن هذا الإجراء.', 'This action cannot be undone.')}</p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setDeleteTarget(null)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-danger" onClick={confirmDelete}><Trash2 size={16} /> {t('حذف نهائي', 'Delete Permanently')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
