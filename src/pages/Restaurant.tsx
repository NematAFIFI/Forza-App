import { useState, useEffect, useMemo } from 'react';
import { supabase, type Service, type ServiceOrder } from '../lib/supabase';
import { Plus, UtensilsCrossed, Search, Trash2, Pencil, X } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

type TFunc = (ar: string, en: string) => string;

interface MenuForm {
  name: string;
  price: string;
  description: string;
  is_active: boolean;
}

const emptyForm: MenuForm = { name: '', price: '', description: '', is_active: true };

const orderStatusBadge = (s: string | null): string => {
  switch (s) {
    case 'pending': return 'badge-gold';
    case 'preparing': return 'badge-blue';
    case 'served': return 'badge-green';
    case 'paid': return 'badge-gray';
    default: return 'badge-gray';
  }
};

const orderStatusLabel = (s: string | null, t: TFunc): string => {
  const map: Record<string, string> = {
    pending: t('قيد الانتظار', 'Pending'),
    preparing: t('قيد التحضير', 'Preparing'),
    served: t('تم التقديم', 'Served'),
    paid: t('مدفوع', 'Paid'),
  };
  return map[s || ''] || s || '';
};

export default function Restaurant() {
  const { t } = useLanguage();
  const [menu, setMenu] = useState<Service[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [orderModal, setOrderModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    const [mRes, oRes] = await Promise.all([
      supabase.from('services').select('*').eq('category', 'restaurant').order('created_at', { ascending: false }),
      supabase.from('service_orders').select('*, service:services(*)').in('service_id', (await supabase.from('services').select('id').eq('category', 'restaurant')).data?.map((s: { id: string }) => s.id) || []).order('created_at', { ascending: false }),
    ]);
    if (mRes.data) setMenu(mRes.data as Service[]);
    if (oRes.data) setOrders(oRes.data as unknown as ServiceOrder[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo((): Service[] => {
    const q = search.trim().toLowerCase();
    if (!q) return menu;
    return menu.filter((m) => (m.name || '').toLowerCase().includes(q));
  }, [menu, search]);

  const save = async (): Promise<void> => {
    setSaving(true);
    const payload = {
      name: form.name || null,
      category: 'restaurant',
      price: Number(form.price) || 0,
      description: form.description || null,
      is_active: form.is_active,
    };
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

  const createOrder = async (): Promise<void> => {
    if (!selectedService) return;
    await supabase.from('service_orders').insert({
      service_id: selectedService.id,
      quantity: 1,
      total_price: selectedService.price || 0,
      status: 'pending',
    });
    setOrderModal(false);
    setSelectedService(null);
    void load();
  };

  const updateOrderStatus = async (id: string, status: string): Promise<void> => {
    await supabase.from('service_orders').update({ status }).eq('id', id);
    void load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('المطعم', 'Restaurant')}</h1>
          <p className="page-subtitle">{t('قائمة الطعام والطلبات', 'Menu and orders')}</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setEditingId(null); setModalOpen(true); }}><Plus size={18} /> {t('صنف جديد', 'New Item')}</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder={t('ابحث في القائمة...', 'Search the menu...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>{t('جارٍ التحميل...', 'Loading...')}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            {filtered.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 48, color: '#6b7280', gridColumn: '1 / -1' }}>
                <UtensilsCrossed size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p>{t('لا توجد أصناف', 'No items')}</p>
              </div>
            ) : filtered.map((m) => (
              <div key={m.id} className="card card-hover" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</div>
                    <div style={{ color: 'var(--brand-500)', fontWeight: 700, fontSize: 18 }}>{m.price ?? 0} {t('ر.س', 'SAR')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" onClick={() => { setForm({ name: m.name || '', price: m.price != null ? String(m.price) : '', description: m.description || '', is_active: m.is_active ?? true }); setEditingId(m.id); setModalOpen(true); }}><Pencil size={14} /></button>
                    <button className="btn-ghost" onClick={() => remove(m.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
                {m.description && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>{m.description}</p>}
                <button className="btn-outline" style={{ width: '100%', fontSize: 13 }} onClick={() => { setSelectedService(m); setOrderModal(true); }}>{t('طلب', 'Order')}</button>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>{t('الطلبات', 'Orders')}</h3>
            {orders.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>{t('لا توجد طلبات', 'No orders')}</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th className="table-th">{t('الصنف', 'Item')}</th>
                      <th className="table-th">{t('الكمية', 'Quantity')}</th>
                      <th className="table-th">{t('الإجمالي', 'Total')}</th>
                      <th className="table-th">{t('الحالة', 'Status')}</th>
                      <th className="table-th">{t('تحديث', 'Update')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="table-row">
                        <td className="table-td">{o.service?.name || '-'}</td>
                        <td className="table-td">{o.quantity ?? 1}</td>
                        <td className="table-td">{o.total_price ?? 0}</td>
                        <td className="table-td"><span className={orderStatusBadge(o.status)}>{orderStatusLabel(o.status, t)}</span></td>
                        <td className="table-td">
                          <select className="input" style={{ padding: '4px 8px', fontSize: 13 }} value={o.status || 'pending'} onChange={(e) => updateOrderStatus(o.id, e.target.value)}>
                            <option value="pending">{t('قيد الانتظار', 'Pending')}</option>
                            <option value="preparing">{t('قيد التحضير', 'Preparing')}</option>
                            <option value="served">{t('تم التقديم', 'Served')}</option>
                            <option value="paid">{t('مدفوع', 'Paid')}</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editingId ? t('تعديل صنف', 'Edit Item') : t('صنف جديد', 'New Item')}</h2>
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

      {orderModal && selectedService && (
        <div className="modal-overlay" onClick={() => setOrderModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('تأكيد الطلب', 'Confirm Order')}</h2>
              <button className="btn-ghost" onClick={() => setOrderModal(false)}><X size={20} /></button>
            </div>
            <p>{t('الصنف', 'Item')}: <strong>{selectedService.name}</strong></p>
            <p>{t('السعر', 'Price')}: <strong>{selectedService.price} {t('ر.س', 'SAR')}</strong></p>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setOrderModal(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={createOrder}>{t('تأكيد الطلب', 'Confirm Order')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
