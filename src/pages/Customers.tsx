import { useState, useEffect, useMemo } from 'react';
import { supabase, type Customer, type Booking, type Invoice, type Payment } from '../lib/supabase';
import { Plus, Search, Users, Trash2, Pencil, Receipt, ExternalLink, X, FileText, Crown, CreditCard, Phone, Mail, Calendar, BedDouble, DollarSign, TrendingUp, Clock, AlertCircle, CheckCircle2, Archive, ArchiveRestore, type LucideIcon } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { toggleArchive } from '../lib/archive';

type TFunc = (ar: string, en: string) => string;

interface CustomerForm {
  name: string; phone: string; email: string; id_number: string; id_type: string;
  id_expiry: string; date_of_birth: string; nationality: string; address: string; notes: string; vip_status: boolean;
}

const emptyForm: CustomerForm = {
  name: '', phone: '', email: '', id_number: '', id_type: 'national_id',
  id_expiry: '', date_of_birth: '', nationality: '', address: '', notes: '', vip_status: false,
};

const bookingStatusBadge = (s: string | null): string => {
  switch (s) {
    case 'confirmed': return 'badge-blue';
    case 'active': return 'badge-purple';
    case 'completed': return 'badge-green';
    case 'cancelled': return 'badge-red';
    case 'pending': return 'badge-gold';
    default: return 'badge-gray';
  }
};

const bookingStatusLabel = (s: string | null, t: TFunc): string => {
  const map: Record<string, string> = { confirmed: t('مؤكد', 'Confirmed'), active: t('نشط', 'Active'), completed: t('مكتمل', 'Completed'), cancelled: t('ملغي', 'Cancelled'), pending: t('قيد الانتظار', 'Pending') };
  return map[s || ''] || s || '-';
};

const paymentStatusBadge = (s: string | null): string => {
  switch (s) {
    case 'paid': return 'badge-green';
    case 'partial': return 'badge-gold';
    case 'unpaid': return 'badge-red';
    default: return 'badge-gray';
  }
};

const paymentStatusLabel = (s: string | null, t: TFunc): string => {
  const map: Record<string, string> = { paid: t('مدفوعة', 'Paid'), partial: t('مدفوعة جزئياً', 'Partially Paid'), unpaid: t('غير مدفوعة', 'Unpaid') };
  return map[s || ''] || s || '-';
};

const paymentMethodLabel = (m: string | null, t: TFunc): string => {
  const map: Record<string, string> = { cash: t('نقدي', 'Cash'), card: t('بطاقة', 'Card'), transfer: t('تحويل', 'Transfer'), wallet: t('محفظة', 'Wallet') };
  return map[m || ''] || m || '-';
};

export default function Customers() {
  const { t, lang } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailData, setDetailData] = useState<{ bookings: Booking[]; invoices: Invoice[]; payments: Payment[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ invoice: Invoice; customer: Customer } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [invoiceModal, setInvoiceModal] = useState<{ customer: Customer; booking?: Booking } | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({ subtotal: '', tax_rate: '15', discount: '', notes: '' });
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = async (): Promise<void> => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('name', { ascending: true });
    if (data) setCustomers(data as Customer[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo((): Customer[] => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if ((c.archived === true) !== showArchived) return false;
      if (!q) return true;
      return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
    });
  }, [customers, search, showArchived]);

  const openCreate = (): void => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };
  const openEdit = (c: Customer): void => {
    setForm({
      name: c.name || '', phone: c.phone || '', email: c.email || '', id_number: c.id_number || '',
      id_type: c.id_type || 'national_id', id_expiry: c.id_expiry || '', date_of_birth: c.date_of_birth || '',
      nationality: c.nationality || '', address: c.address || '', notes: c.notes || '', vip_status: c.vip_status ?? false,
    });
    setEditingId(c.id); setModalOpen(true);
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    const payload = {
      name: form.name || null, phone: form.phone || null, email: form.email || null,
      id_number: form.id_number || null, id_type: form.id_type, id_expiry: form.id_expiry || null,
      date_of_birth: form.date_of_birth || null, nationality: form.nationality || null,
      address: form.address || null, notes: form.notes || null, vip_status: form.vip_status,
    };
    if (editingId) { await supabase.from('customers').update(payload).eq('id', editingId); }
    else { await supabase.from('customers').insert(payload); }
    setSaving(false); setModalOpen(false); void load();
  };

  const remove = async (id: string): Promise<void> => { await supabase.from('customers').delete().eq('id', id); void load(); };

  const archive = async (c: Customer): Promise<void> => { await toggleArchive('customers', c.id, c.archived === true); void load(); };

  const openDetail = async (c: Customer): Promise<void> => {
    setDetailCustomer(c); setDetailLoading(true);
    const [bRes, iRes, pRes] = await Promise.all([
      supabase.from('bookings').select('*, unit:units(*, property:properties(*))').eq('customer_id', c.id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, booking:bookings(*, unit:units(*, property:properties(*)))').eq('customer_id', c.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('customer_id', c.id).order('created_at', { ascending: false }),
    ]);
    setDetailData({
      bookings: (bRes.data || []) as Booking[],
      invoices: (iRes.data || []) as Invoice[],
      payments: (pRes.data || []) as Payment[],
    });
    setDetailLoading(false);
  };

  // Calculate totals from detail data
  const totalDue = useMemo((): number => (detailData?.invoices || []).reduce((s, i) => s + (i.total ?? 0), 0), [detailData]);
  const totalPaid = useMemo((): number => (detailData?.invoices || []).reduce((s, i) => s + (i.paid_amount ?? 0), 0), [detailData]);
  const totalRemaining = useMemo((): number => totalDue - totalPaid, [totalDue, totalPaid]);
  const totalBookingsRevenue = useMemo((): number => (detailData?.bookings || []).reduce((s, b) => s + (b.total_amount ?? 0), 0), [detailData]);
  const totalBookingPaid = useMemo((): number => (detailData?.bookings || []).reduce((s, b) => s + (b.paid_amount ?? 0), 0), [detailData]);
  const totalBookingRemaining = useMemo((): number => totalBookingsRevenue - totalBookingPaid, [totalBookingsRevenue, totalBookingPaid]);

  // Auto-invoice: open invoice modal pre-filled from booking remaining
  const openInvoiceFromBooking = (customer: Customer, booking?: Booking): void => {
    const remaining = booking ? (booking.total_amount ?? 0) - (booking.paid_amount ?? 0) : totalBookingRemaining;
    setInvoiceModal({ customer, booking });
    setInvoiceForm({ subtotal: String(remaining > 0 ? remaining : 0), tax_rate: '15', discount: '', notes: booking ? t(`فاتورة حجز ${booking.unit?.unit_number || ''}`, `Booking invoice ${booking.unit?.unit_number || ''}`) : '' });
  };

  const createInvoice = async (): Promise<void> => {
    if (!invoiceModal) return;
    setCreatingInvoice(true);
    const sub = Number(invoiceForm.subtotal) || 0;
    const rate = Number(invoiceForm.tax_rate) || 0;
    const disc = Number(invoiceForm.discount) || 0;
    const taxAmt = (sub - disc) * (rate / 100);
    const total = (sub - disc) + taxAmt;
    const prefix = 'INV';
    const year = new Date().getFullYear();
    const num = Math.floor(1000 + Math.random() * 9000);
    await supabase.from('invoices').insert({
      customer_id: invoiceModal.customer.id,
      booking_id: invoiceModal.booking?.id || null,
      invoice_number: `${prefix}-${year}-${num}`,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      subtotal: sub, tax_rate: rate, tax_amount: taxAmt, discount: disc, total,
      paid_amount: 0, payment_status: 'unpaid', payment_method: 'cash',
      notes: invoiceForm.notes || null, zatca_status: 'pending',
    });
    setCreatingInvoice(false); setInvoiceModal(null);
    if (detailCustomer) void openDetail(detailCustomer);
  };

  const recordPayment = async (): Promise<void> => {
    if (!paymentModal || !paymentAmount) return;
    const amt = Number(paymentAmount);
    const inv = paymentModal.invoice;
    await supabase.from('payments').insert({
      invoice_id: inv.id, customer_id: paymentModal.customer.id,
      booking_id: (inv as unknown as { booking_id?: string }).booking_id || null,
      amount: amt, payment_method: paymentMethod,
      payment_date: new Date().toISOString().slice(0, 10),
    });
    // Update invoice paid_amount and status
    const newPaid = (inv.paid_amount ?? 0) + amt;
    const newStatus = newPaid >= (inv.total ?? 0) ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    await supabase.from('invoices').update({ paid_amount: newPaid, payment_status: newStatus }).eq('id', inv.id);
    // If booking linked, update booking paid_amount too
    const bookingId = (inv as unknown as { booking_id?: string }).booking_id;
    if (bookingId) {
      const { data: booking } = await supabase.from('bookings').select('paid_amount').eq('id', bookingId).single();
      if (booking) {
        const bPaid = (booking as unknown as { paid_amount: number }).paid_amount + amt;
        await supabase.from('bookings').update({ paid_amount: bPaid }).eq('id', bookingId);
      }
    }
    setPaymentModal(null); setPaymentAmount(''); setPaymentMethod('cash');
    if (detailCustomer) void openDetail(detailCustomer);
  };

  const getInvoicePayments = (invId: string): Payment[] => (detailData?.payments || []).filter((p) => p.invoice_id === invId);
  const getInvoiceRemaining = (inv: Invoice): number => (inv.total ?? 0) - (inv.paid_amount ?? 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('النزلاء', 'Guests')}</h1>
          <p className="page-subtitle">{t(`إدارة بيانات الضيوف — ${customers.length} نزيل`, `Manage guest data — ${customers.length} guests`)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => setShowArchived((v) => !v)} style={showArchived ? { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' } : undefined}><Archive size={18} /> {showArchived ? t('العودة للنشطة', 'Back to Active') : t('الأرشيف', 'Archive')}</button>
          <button className="btn-primary" onClick={openCreate}><Plus size={18} /> {t('عميل جديد', 'New Guest')}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder={t('ابحث بالاسم، الهاتف، أو البريد...', 'Search by name, phone, or email...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <Users size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا يوجد عملاء', 'No guests')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-th">{t('الاسم', 'Name')}</th>
                  <th className="table-th">{t('الهاتف', 'Phone')}</th>
                  <th className="table-th">{t('الهوية', 'ID')}</th>
                  <th className="table-th">{t('الجنسية', 'Nationality')}</th>
                  <th className="table-th">{t('الإقامات', 'Stays')}</th>
                  <th className="table-th">{t('الإنفاق', 'Spending')}</th>
                  <th className="table-th">VIP</th>
                  <th className="table-th">{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="table-row">
                    <td className="table-td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-500), var(--brand-500))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                          {(c.name || '?').charAt(0)}
                        </div>
                        {c.name}
                      </div>
                    </td>
                    <td className="table-td" dir="ltr">{c.phone || '-'}</td>
                    <td className="table-td">{c.id_number || '-'}</td>
                    <td className="table-td">{c.nationality || '-'}</td>
                    <td className="table-td">{c.total_stays ?? 0}</td>
                    <td className="table-td">{Number(c.total_spent ?? 0).toLocaleString()}</td>
                    <td className="table-td">{c.vip_status ? <span className="badge-gold"><Crown size={12} /> VIP</span> : '-'}</td>
                    <td className="table-td">
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-ghost" onClick={() => openDetail(c)} title={t('تفاصيل', 'Details')}><Receipt size={16} /></button>
                        <button className="btn-ghost" onClick={() => openEdit(c)} title={t('تعديل', 'Edit')}><Pencil size={16} /></button>
                        {c.access_token && <button className="btn-ghost" title={t('رابط البورتال', 'Portal Link')} onClick={() => window.open(`/portal/${c.access_token}`, '_blank')}><ExternalLink size={16} /></button>}
                        <button className="btn-ghost" onClick={() => archive(c)} title={c.archived ? t('إلغاء الأرشفة', 'Unarchive') : t('أرشفة', 'Archive')} style={{ color: 'var(--brand-500)' }}>{c.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}</button>
                        <button className="btn-ghost" onClick={() => remove(c.id)} title={t('حذف', 'Delete')}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Customer Detail Modal ─── */}
      {detailCustomer && (
        <div className="modal-overlay" onClick={() => { setDetailCustomer(null); setDetailData(null); }}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, var(--brand-500), var(--brand-500))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, boxShadow: '0 0 20px rgba(var(--brand-rgb),0.3)' }}>
                  {(detailCustomer.name || '?').charAt(0)}
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>{detailCustomer.name}</h2>
                  {detailCustomer.vip_status && <span className="badge-gold" style={{ marginTop: 4 }}><Crown size={12} /> VIP</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={() => openInvoiceFromBooking(detailCustomer)}><FileText size={16} /> {t('فاتورة جديدة', 'New Invoice')}</button>
                <button className="btn-ghost" onClick={() => { setDetailCustomer(null); setDetailData(null); }}><X size={20} /></button>
              </div>
            </div>

            {/* Contact info */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20, padding: 16, background: '#f9fafb', borderRadius: 12 }}>
              {detailCustomer.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }} dir="ltr"><Phone size={14} /> {detailCustomer.phone}</div>}
              {detailCustomer.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }} dir="ltr"><Mail size={14} /> {detailCustomer.email}</div>}
              {detailCustomer.nationality && <div style={{ fontSize: 13, color: '#6b7280' }}>{detailCustomer.nationality}</div>}
              {detailCustomer.id_number && <div style={{ fontSize: 13, color: '#6b7280' }}>{t(`هوية: ${detailCustomer.id_number}`, `ID: ${detailCustomer.id_number}`)}</div>}
            </div>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>{t('جارٍ تحميل التفاصيل...', 'Loading details...')}</div>
            ) : (
              <>
                {/* Financial Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                  <SummaryCard label={t('إجمالي الحجوزات', 'Total Bookings')} value={totalBookingsRevenue.toLocaleString()} icon={Calendar} color="var(--brand-500)" />
                  <SummaryCard label={t('مدفوع الحجوزات', 'Bookings Paid')} value={totalBookingPaid.toLocaleString()} icon={CheckCircle2} color="var(--brand-500)" />
                  <SummaryCard label={t('متبقي الحجوزات', 'Bookings Remaining')} value={totalBookingRemaining.toLocaleString()} icon={AlertCircle} color={totalBookingRemaining > 0 ? '#ef4444' : 'var(--brand-500)'} />
                  <SummaryCard label={t('متبقي الفواتير', 'Invoices Remaining')} value={totalRemaining.toLocaleString()} icon={FileText} color={totalRemaining > 0 ? '#ef4444' : 'var(--brand-500)'} />
                </div>

                {/* Bookings */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BedDouble size={18} color="var(--brand-500)" /> {t(`الحجوزات (${detailData?.bookings.length || 0})`, `Bookings (${detailData?.bookings.length || 0})`)}
                    </h3>
                  </div>
                  <div className="card" style={{ padding: 0 }}>
                    {detailData?.bookings.length === 0 ? (
                      <p style={{ padding: 16, color: '#6b7280', textAlign: 'center' }}>{t('لا توجد حجوزات', 'No bookings')}</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th className="table-th">{t('العقار', 'Property')}</th>
                              <th className="table-th">{t('الوحدة', 'Unit')}</th>
                              <th className="table-th">{t('الوصول', 'Check-in')}</th>
                              <th className="table-th">{t('المغادرة', 'Check-out')}</th>
                              <th className="table-th">{t('الليالي', 'Nights')}</th>
                              <th className="table-th">{t('الإجمالي', 'Total')}</th>
                              <th className="table-th">{t('المدفوع', 'Paid')}</th>
                              <th className="table-th">{t('المتبقي', 'Remaining')}</th>
                              <th className="table-th">{t('الحالة', 'Status')}</th>
                              <th className="table-th">{t('فاتورة', 'Invoice')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailData?.bookings.map((b) => {
                              const remaining = (b.total_amount ?? 0) - (b.paid_amount ?? 0);
                              return (
                                <tr key={b.id} className="table-row">
                                  <td className="table-td">{b.unit?.property?.name || b.property?.name || '-'}</td>
                                  <td className="table-td"><strong>{b.unit?.unit_number || '-'}</strong></td>
                                  <td className="table-td">{b.check_in || '-'}</td>
                                  <td className="table-td">{b.check_out || '-'}</td>
                                  <td className="table-td">{b.num_nights ?? '-'}</td>
                                  <td className="table-td">{Number(b.total_amount ?? 0).toLocaleString()}</td>
                                  <td className="table-td" style={{ color: 'var(--brand-500)' }}>{Number(b.paid_amount ?? 0).toLocaleString()}</td>
                                  <td className="table-td" style={{ color: remaining > 0 ? '#ef4444' : 'var(--brand-500)', fontWeight: 700 }}>{remaining.toLocaleString()}</td>
                                  <td className="table-td"><span className={bookingStatusBadge(b.booking_status)}>{bookingStatusLabel(b.booking_status, t)}</span></td>
                                  <td className="table-td">
                                    {remaining > 0 && (
                                      <button className="btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openInvoiceFromBooking(detailCustomer, b)}>
                                        <FileText size={13} /> {t('فاتورة', 'Invoice')}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoices */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={18} color="var(--brand-500)" /> {t(`الفواتير (${detailData?.invoices.length || 0})`, `Invoices (${detailData?.invoices.length || 0})`)}
                  </h3>
                  <div className="card" style={{ padding: 0 }}>
                    {detailData?.invoices.length === 0 ? (
                      <p style={{ padding: 16, color: '#6b7280', textAlign: 'center' }}>{t('لا توجد فواتير', 'No invoices')}</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th className="table-th">{t('رقم الفاتورة', 'Invoice No.')}</th>
                              <th className="table-th">{t('العقار', 'Property')}</th>
                              <th className="table-th">{t('التاريخ', 'Date')}</th>
                              <th className="table-th">{t('الإجمالي', 'Total')}</th>
                              <th className="table-th">{t('المدفوع', 'Paid')}</th>
                              <th className="table-th">{t('المتبقي', 'Remaining')}</th>
                              <th className="table-th">{t('الحالة', 'Status')}</th>
                              <th className="table-th">{t('دفعة', 'Payment')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailData?.invoices.map((inv) => {
                              const remaining = getInvoiceRemaining(inv);
                              return (
                                <tr key={inv.id} className="table-row">
                                  <td className="table-td"><strong>{inv.invoice_number}</strong></td>
                                  <td className="table-td">{(inv as unknown as { booking?: { unit?: { property?: { name?: string } } } }).booking?.unit?.property?.name || '-'}</td>
                                  <td className="table-td">{inv.issue_date || '-'}</td>
                                  <td className="table-td">{Number(inv.total ?? 0).toLocaleString()}</td>
                                  <td className="table-td" style={{ color: 'var(--brand-500)' }}>{Number(inv.paid_amount ?? 0).toLocaleString()}</td>
                                  <td className="table-td" style={{ color: remaining > 0 ? '#ef4444' : 'var(--brand-500)', fontWeight: 700 }}>{remaining.toLocaleString()}</td>
                                  <td className="table-td"><span className={paymentStatusBadge(inv.payment_status)}>{paymentStatusLabel(inv.payment_status, t)}</span></td>
                                  <td className="table-td">
                                    {remaining > 0 && (
                                      <button className="btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setPaymentModal({ invoice: inv, customer: detailCustomer })}>
                                        <CreditCard size={13} /> {t('دفعة', 'Payment')}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payments history */}
                {detailData && detailData.payments.length > 0 && (
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CreditCard size={18} color="var(--brand-500)" /> {t(`سجل المدفوعات (${detailData.payments.length})`, `Payment History (${detailData.payments.length})`)}
                    </h3>
                    <div className="card" style={{ padding: 0 }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr><th className="table-th">{t('التاريخ', 'Date')}</th><th className="table-th">{t('المبلغ', 'Amount')}</th><th className="table-th">{t('طريقة الدفع', 'Payment Method')}</th><th className="table-th">{t('مرجع', 'Reference')}</th><th className="table-th">{t('ملاحظات', 'Notes')}</th></tr>
                          </thead>
                          <tbody>
                            {detailData.payments.map((p) => (
                              <tr key={p.id} className="table-row">
                                <td className="table-td">{p.payment_date || '-'}</td>
                                <td className="table-td" style={{ fontWeight: 700, color: 'var(--brand-500)' }}>{Number(p.amount ?? 0).toLocaleString()}</td>
                                <td className="table-td">{paymentMethodLabel(p.payment_method, t)}</td>
                                <td className="table-td">{p.reference_number || '-'}</td>
                                <td className="table-td">{p.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Add/Edit Modal ─── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{editingId ? t('تعديل العميل', 'Edit Guest') : t('عميل جديد', 'New Guest')}</h2>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><label className="label">{t('الاسم', 'Name')}</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label">{t('الهاتف', 'Phone')}</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" /></div>
              <div><label className="label">{t('البريد الإلكتروني', 'Email')}</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" /></div>
              <div><label className="label">{t('رقم الهوية', 'ID Number')}</label><input className="input" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></div>
              <div><label className="label">{t('نوع الهوية', 'ID Type')}</label><select className="input" value={form.id_type} onChange={(e) => setForm({ ...form, id_type: e.target.value })}><option value="national_id">{t('هوية وطنية', 'National ID')}</option><option value="passport">{t('جواز سفر', 'Passport')}</option></select></div>
              <div><label className="label">{t('انتهاء الهوية', 'ID Expiry')}</label><input type="date" className="input" value={form.id_expiry} onChange={(e) => setForm({ ...form, id_expiry: e.target.value })} /></div>
              <div><label className="label">{t('تاريخ الميلاد', 'Date of Birth')}</label><input type="date" className="input" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
              <div><label className="label">{t('الجنسية', 'Nationality')}</label><input className="input" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label className="label">{t('العنوان', 'Address')}</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label className="label">{t('ملاحظات', 'Notes')}</label><textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><input type="checkbox" checked={form.vip_status} onChange={(e) => setForm({ ...form, vip_status: e.target.checked })} /><span className="label" style={{ margin: 0 }}>{t('عميل VIP', 'VIP Guest')}</span></label></div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setModalOpen(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Payment Modal ─── */}
      {paymentModal && (
        <div className="modal-overlay" onClick={() => setPaymentModal(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('تسجيل دفعة', 'Record Payment')}</h2>
              <button className="btn-ghost" onClick={() => setPaymentModal(null)}><X size={20} /></button>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{t('الفاتورة', 'Invoice')}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{paymentModal.invoice.invoice_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{t('الإجمالي', 'Total')}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{Number(paymentModal.invoice.total ?? 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{t('المتبقي', 'Remaining')}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{getInvoiceRemaining(paymentModal.invoice).toLocaleString()}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div><label className="label">{t('المبلغ', 'Amount')}</label><input type="number" className="input" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0" /></div>
              <div><label className="label">{t('طريقة الدفع', 'Payment Method')}</label><select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="cash">{t('نقدي', 'Cash')}</option><option value="card">{t('بطاقة', 'Card')}</option><option value="transfer">{t('تحويل', 'Transfer')}</option><option value="wallet">{t('محفظة', 'Wallet')}</option></select></div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setPaymentModal(null)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={recordPayment} disabled={!paymentAmount}><CreditCard size={16} /> {t('تسجيل', 'Record')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Invoice Creation Modal ─── */}
      {invoiceModal && (
        <div className="modal-overlay" onClick={() => setInvoiceModal(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t('إنشاء فاتورة', 'Create Invoice')}</h2>
              <button className="btn-ghost" onClick={() => setInvoiceModal(null)}><X size={20} /></button>
            </div>
            <div style={{ background: 'rgba(var(--brand-rgb),0.06)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: '#7e22ce' }}>
              {t('العميل', 'Customer')}: <strong>{invoiceModal.customer.name}</strong>
              {invoiceModal.booking && <span> · {t(`حجز وحدة ${invoiceModal.booking.unit?.unit_number || ''}`, `Booking unit ${invoiceModal.booking.unit?.unit_number || ''}`)}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><label className="label">{t('المجموع الفرعي (المتبقي)', 'Subtotal (Remaining)')}</label><input type="number" className="input" value={invoiceForm.subtotal} onChange={(e) => setInvoiceForm({ ...invoiceForm, subtotal: e.target.value })} /></div>
              <div><label className="label">{t('نسبة الضريبة %', 'Tax Rate %')}</label><input type="number" className="input" value={invoiceForm.tax_rate} onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_rate: e.target.value })} /></div>
              <div><label className="label">{t('الخصم', 'Discount')}</label><input type="number" className="input" value={invoiceForm.discount} onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label className="label">{t('ملاحظات', 'Notes')}</label><input className="input" value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></div>
            </div>
            {(() => {
              const sub = Number(invoiceForm.subtotal) || 0;
              const disc = Number(invoiceForm.discount) || 0;
              const rate = Number(invoiceForm.tax_rate) || 0;
              const tax = (sub - disc) * (rate / 100);
              const total = (sub - disc) + tax;
              return (
                <div style={{ display: 'flex', gap: 16, background: '#f3f4f6', padding: 12, borderRadius: 10, marginTop: 16, fontSize: 14 }}>
                  <span>{t('الضريبة', 'Tax')}: <strong>{tax.toFixed(2)}</strong></span>
                  <span>{t('الإجمالي', 'Total')}: <strong style={{ color: 'var(--brand-500)' }}>{total.toFixed(2)}</strong></span>
                </div>
              );
            })()}
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setInvoiceModal(null)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={createInvoice} disabled={creatingInvoice}>{creatingInvoice ? t('جارٍ الإنشاء...', 'Creating...') : t('إنشاء الفاتورة', 'Create Invoice')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: LucideIcon; color: string }): JSX.Element {
  return (
    <div style={{ borderRadius: 12, padding: 14, background: `${color}08`, border: `1px solid ${color}20` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={15} color={color} />
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
