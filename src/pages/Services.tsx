import { useState, useEffect, useMemo } from 'react';
import { supabase, type Service, type ServiceOrder, type Booking, type Customer } from '../lib/supabase';
import { Plus, Search, Pencil, Trash2, UtensilsCrossed, X, ShoppingCart, Archive, ArchiveRestore } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { toggleArchive } from '../lib/archive';

type TFunc = (ar: string, en: string) => string;

const CATEGORIES = ['restaurant', 'laundry', 'room_service', 'minibar', 'other'] as const;
const ORDER_STATUSES = ['pending', 'preparing', 'served', 'paid'] as const;

const categoryLabel = (c: string, t: TFunc): string => {
  const map: Record<string, string> = {
    restaurant: t('مطعم', 'Restaurant'),
    laundry: t('غسيل', 'Laundry'),
    room_service: t('خدمة غرف', 'Room Service'),
    minibar: t('ميني بار', 'Minibar'),
    other: t('أخرى', 'Other'),
  };
  return map[c] || c;
};

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

interface ServiceForm {
  name: string;
  category: string;
  price: string;
  description: string;
  is_active: boolean;
}

const emptyServiceForm: ServiceForm = { name: '', category: 'restaurant', price: '', description: '', is_active: true };

interface OrderForm {
  service_id: string;
  booking_id: string;
  customer_id: string;
  quantity: string;
  notes: string;
}

const emptyOrderForm: OrderForm = { service_id: '', booking_id: '', customer_id: '', quantity: '1', notes: '' };

export default function Services() {
  const { t } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'services' | 'orders'>('services');
  const [serviceModal, setServiceModal] = useState(false);
  const [orderModal, setOrderModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm);
  const [orderForm, setOrderForm] = useState<OrderForm>(emptyOrderForm);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = async (): Promise<void> => {
    setLoading(true);
    const [sRes, oRes, bRes, cRes] = await Promise.all([
      supabase.from('services').select('*').order('created_at', { ascending: false }),
      supabase.from('service_orders').select('*, service:services(*), customer:customers(*), booking:bookings(*)').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*'),
      supabase.from('customers').select('*').order('name', { ascending: true }),
    ]);
    if (sRes.data) setServices(sRes.data as Service[]);
    if (oRes.data) setOrders(oRes.data as unknown as ServiceOrder[]);
    if (bRes.data) setBookings(bRes.data as Booking[]);
    if (cRes.data) setCustomers(cRes.data as Customer[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filteredServices = useMemo((): Service[] => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if ((s.archived === true) !== showArchived) return false;
      if (!q) return true;
      return (s.name || '').toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q);
    });
  }, [services, search, showArchived]);

  const filteredOrders = useMemo((): ServiceOrder[] => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => (o.service?.name || '').toLowerCase().includes(q) || (o.customer?.name || '').toLowerCase().includes(q));
  }, [orders, search]);

  const saveService = async (): Promise<void> => {
    setSaving(true);
    const payload = {
      name: serviceForm.name || null,
      category: serviceForm.category,
      price: Number(serviceForm.price) || 0,
      description: serviceForm.description || null,
      is_active: serviceForm.is_active,
    };
    if (editingId) {
      await supabase.from('services').update(payload).eq('id', editingId);
    } else {
      await supabase.from('services').insert(payload);
    }
    setSaving(false);
    setServiceModal(false);
    void load();
  };

  const saveOrder = async (): Promise<void> => {
    setSaving(true);
    const svc = services.find((s) => s.id === orderForm.service_id);
    const qty = Number(orderForm.quantity) || 1;
    const total = (svc?.price || 0) * qty;
    await supabase.from('service_orders').insert({
      service_id: orderForm.service_id || null,
      booking_id: orderForm.booking_id || null,
      customer_id: orderForm.customer_id || null,
      quantity: qty,
      total_price: total,
      status: 'pending',
      notes: orderForm.notes || null,
    });
    setSaving(false);
    setOrderModal(false);
    setOrderForm(emptyOrderForm);
    void load();
  };

  const updateOrderStatus = async (id: string, status: string): Promise<void> => {
    await supabase.from('service_orders').update({ status }).eq('id', id);
    void load();
  };

  const deleteService = async (id: string): Promise<void> => {
    await supabase.from('services').delete().eq('id', id);
    void load();
  };

  const archiveService = async (s: Service): Promise<void> => { await toggleArchive('services', s.id, s.archived === true); void load(); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('الخدمات', 'Services')}</h1>
          <p className="page-subtitle">{t('إدارة خدمات الفندق والطلبات', 'Manage hotel services and orders')}</p>
        </div>
        {tab === 'services' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-outline" onClick={() => setShowArchived((v) => !v)} style={showArchived ? { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' } : undefined}><Archive size={18} /> {showArchived ? t('العودة للنشطة', 'Back to Active') : t('الأرشيف', 'Archive')}</button>
            <button className="btn-primary" onClick={() => { setServiceForm(emptyServiceForm); setEditingId(null); setServiceModal(true); }}><Plus size={18} /> {t('خدمة جديدة', 'New Service')}</button>
          </div>
        ) : (
          <button className="btn-primary" onClick={() => setOrderModal(true)}><ShoppingCart size={18} /> {t('طلب جديد', 'New Order')}</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={tab === 'services' ? 'btn-primary' : 'btn-outline'} onClick={() => setTab('services')}>{t('الخدمات', 'Services')}</button>
        <button className={tab === 'orders' ? 'btn-primary' : 'btn-outline'} onClick={() => setTab('orders')}>{t('الطلبات', 'Orders')}</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder={t('ابحث...', 'Search...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>{t('جارٍ التحميل...', 'Loading...')}</div>
      ) : tab === 'services' ? (
        <div className="card">
          {filteredServices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
              <UtensilsCrossed size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>{t('لا توجد خدمات', 'No services')}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="table-th">{t('الاسم', 'Name')}</th>
                    <th className="table-th">{t('الفئة', 'Category')}</th>
                    <th className="table-th">{t('السعر', 'Price')}</th>
                    <th className="table-th">{t('الوصف', 'Description')}</th>
                    <th className="table-th">{t('الحالة', 'Status')}</th>
                    <th className="table-th">{t('إجراءات', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((s) => (
                    <tr key={s.id} className="table-row">
                      <td className="table-td">{s.name}</td>
                      <td className="table-td">{categoryLabel(s.category || '', t)}</td>
                      <td className="table-td">{s.price ?? 0}</td>
                      <td className="table-td">{s.description || '-'}</td>
                      <td className="table-td">{s.is_active ? <span className="badge-green">{t('نشط', 'Active')}</span> : <span className="badge-gray">{t('غير نشط', 'Inactive')}</span>}</td>
                      <td className="table-td">
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-ghost" onClick={() => { setServiceForm({ name: s.name || '', category: s.category || 'restaurant', price: s.price != null ? String(s.price) : '', description: s.description || '', is_active: s.is_active ?? true }); setEditingId(s.id); setServiceModal(true); }}><Pencil size={16} /></button>
                          <button className="btn-ghost" onClick={() => archiveService(s)} title={s.archived ? t('إلغاء الأرشفة', 'Unarchive') : t('أرشفة', 'Archive')} style={{ color: 'var(--brand-500)' }}>{s.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}</button>
                          <button className="btn-ghost" onClick={() => deleteService(s.id)}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          {filteredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
              <ShoppingCart size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>{t('لا توجد طلبات', 'No orders')}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="table-th">{t('الخدمة', 'Service')}</th>
                    <th className="table-th">{t('العميل', 'Customer')}</th>
                    <th className="table-th">{t('الكمية', 'Quantity')}</th>
                    <th className="table-th">{t('الإجمالي', 'Total')}</th>
                    <th className="table-th">{t('الحالة', 'Status')}</th>
                    <th className="table-th">{t('إجراءات', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="table-row">
                      <td className="table-td">{o.service?.name || '-'}</td>
                      <td className="table-td">{o.customer?.name || '-'}</td>
                      <td className="table-td">{o.quantity ?? 1}</td>
                      <td className="table-td">{o.total_price ?? 0}</td>
                      <td className="table-td"><span className={orderStatusBadge(o.status)}>{orderStatusLabel(o.status, t)}</span></td>
                      <td className="table-td">
                        <select className="input" style={{ padding: '4px 8px', fontSize: 13 }} value={o.status || 'pending'} onChange={(e) => updateOrderStatus(o.id, e.target.value)}>
                          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{orderStatusLabel(s, t)}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {serviceModal && (
        <div className="modal-overlay" onClick={() => setServiceModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{editingId ? t('تعديل خدمة', 'Edit Service') : t('خدمة جديدة', 'New Service')}</h2>
              <button className="btn-ghost" onClick={() => setServiceModal(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="label">{t('الاسم', 'Name')}</label>
                <input className="input" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('الفئة', 'Category')}</label>
                <select className="input" value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c, t)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('السعر', 'Price')}</label>
                <input type="number" className="input" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('الوصف', 'Description')}</label>
                <textarea className="input" rows={2} value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={serviceForm.is_active} onChange={(e) => setServiceForm({ ...serviceForm, is_active: e.target.checked })} />
                <span className="label" style={{ margin: 0 }}>{t('نشط', 'Active')}</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setServiceModal(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={saveService} disabled={saving}>{saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {orderModal && (
        <div className="modal-overlay" onClick={() => setOrderModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t('طلب جديد', 'New Order')}</h2>
              <button className="btn-ghost" onClick={() => setOrderModal(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="label">{t('الخدمة', 'Service')}</label>
                <select className="input" value={orderForm.service_id} onChange={(e) => setOrderForm({ ...orderForm, service_id: e.target.value })}>
                  <option value="">{t('اختر خدمة', 'Select service')}</option>
                  {services.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name} - {s.price}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('العميل', 'Customer')}</label>
                <select className="input" value={orderForm.customer_id} onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value })}>
                  <option value="">{t('اختر عميل', 'Select customer')}</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('الحجز', 'Booking')}</label>
                <select className="input" value={orderForm.booking_id} onChange={(e) => setOrderForm({ ...orderForm, booking_id: e.target.value })}>
                  <option value="">{t('اختر حجز (اختياري)', 'Select booking (optional)')}</option>
                  {bookings.map((b) => <option key={b.id} value={b.id}>{b.id.slice(0, 8)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('الكمية', 'Quantity')}</label>
                <input type="number" className="input" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('ملاحظات', 'Notes')}</label>
                <textarea className="input" rows={2} value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setOrderModal(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={saveOrder} disabled={saving}>{saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
