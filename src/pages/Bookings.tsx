import { useState, useEffect, useMemo } from 'react';
import { supabase, type Booking, type Unit, type Customer } from '../lib/supabase';
import { Plus, Search, CalendarDays, Pencil, X, Ban, Trash2, Building2, BedDouble, ChevronDown, Archive, ArchiveRestore } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

type TFunc = (ar: string, en: string) => string;

type BookingStatus = 'confirmed' | 'pending' | 'checked_in' | 'checked_out' | 'cancelled';
type BookingType = 'direct' | 'advance';

interface BookingForm {
  property_id: string;
  unit_id: string;
  customer_id: string;
  check_in: string;
  check_out: string;
  check_in_time: string;
  check_out_time: string;
  booking_type: BookingType;
  booking_source: string;
  subtotal: string;
  tax_rate: string;
  paid_amount: string;
  notes: string;
}

const emptyForm: BookingForm = {
  property_id: '',
  unit_id: '',
  customer_id: '',
  check_in: '',
  check_out: '',
  check_in_time: '14:00',
  check_out_time: '12:00',
  booking_type: 'direct',
  booking_source: '',
  subtotal: '',
  tax_rate: '15',
  paid_amount: '',
  notes: '',
};

const statusBadge = (status: string | null): string => {
  switch (status) {
    case 'confirmed': return 'badge-green';
    case 'pending': return 'badge-gold';
    case 'checked_in': return 'badge-blue';
    case 'checked_out': return 'badge-gray';
    case 'cancelled': return 'badge-red';
    default: return 'badge-gray';
  }
};

const statusLabel = (status: string | null, t: TFunc): string => {
  const map: Record<string, string> = {
    confirmed: t('مؤكد', 'Confirmed'),
    pending: t('قيد الانتظار', 'Pending'),
    checked_in: t('واصل', 'Checked-in'),
    checked_out: t('غادر', 'Checked-out'),
    cancelled: t('ملغي', 'Cancelled'),
  };
  return map[status || ''] || status || '';
};

const typeBadge = (type: string | null): string => {
  return type === 'advance' ? 'badge-gold' : 'badge-blue';
};

const typeLabel = (type: string | null, t: TFunc): string => {
  return type === 'advance' ? t('حجز مسبق', 'Advance') : t('مباشر', 'Direct');
};

export default function Bookings() {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [properties, setProperties] = useState<{ id: string; name: string | null }[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async (): Promise<void> => {
    setLoading(true);
    const [bRes, uRes, pRes, cRes] = await Promise.all([
      supabase.from('bookings').select('*, unit:units(*), customer:customers(*)').order('created_at', { ascending: false }),
      supabase.from('units').select('*').order('unit_number', { ascending: true }),
      supabase.from('properties').select('id,name').order('name', { ascending: true }),
      supabase.from('customers').select('*').order('name', { ascending: true }),
    ]);
    if (bRes.data) setBookings(bRes.data as unknown as Booking[]);
    if (uRes.data) setUnits(uRes.data as Unit[]);
    if (pRes.data) setProperties(pRes.data as { id: string; name: string | null }[]);
    if (cRes.data) setCustomers(cRes.data as Customer[]);
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const nights = useMemo((): number => {
    if (!form.check_in || !form.check_out) return 0;
    const diff = new Date(form.check_out).getTime() - new Date(form.check_in).getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [form.check_in, form.check_out]);

  const filteredUnits = useMemo((): Unit[] => {
    if (!form.property_id) return [];
    return units.filter((u) => u.property_id === form.property_id);
  }, [units, form.property_id]);

  const selectedUnit = useMemo((): Unit | null => {
    return units.find((u) => u.id === form.unit_id) || null;
  }, [units, form.unit_id]);

  const autoSubtotal = useMemo((): number => {
    if (!selectedUnit || nights <= 0) return 0;
    return Math.round((Number(selectedUnit.daily_rate ?? 0) * nights) * 100) / 100;
  }, [selectedUnit, nights]);

  const subtotal = useMemo((): number => {
    return Number(form.subtotal) || autoSubtotal;
  }, [form.subtotal, autoSubtotal]);

  const taxAmount = useMemo((): number => {
    const rate = Number(form.tax_rate) || 0;
    return Math.round(subtotal * (rate / 100) * 100) / 100;
  }, [subtotal, form.tax_rate]);

  const totalAmount = useMemo((): number => {
    return Math.round((subtotal + taxAmount) * 100) / 100;
  }, [subtotal, taxAmount]);

  const filtered = useMemo((): Booking[] => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      const isArchived = b.archived === true;
      if (isArchived !== showArchived) return false;
      if (!q) return true;
      const unit = b.unit?.unit_number || '';
      const cust = b.customer?.name || '';
      return unit.toLowerCase().includes(q) || cust.toLowerCase().includes(q) || (b.booking_status || '').toLowerCase().includes(q);
    });
  }, [bookings, search, showArchived]);

  const openCreate = (): void => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (b: Booking): void => {
    setForm({
      property_id: (b.unit as Unit & { property_id?: string | null } | null)?.property_id || '',
      unit_id: b.unit_id || '',
      customer_id: b.customer_id || '',
      check_in: b.check_in || '',
      check_out: b.check_out || '',
      check_in_time: b.check_in_time || '14:00',
      check_out_time: b.check_out_time || '12:00',
      booking_type: (b.booking_type as BookingType) || 'direct',
      booking_source: b.booking_source || '',
      subtotal: b.subtotal != null ? String(b.subtotal) : (b.total_amount != null ? String(b.total_amount) : ''),
      tax_rate: b.tax_rate != null ? String(b.tax_rate) : '15',
      paid_amount: b.paid_amount != null ? String(b.paid_amount) : '',
      notes: b.notes || '',
    });
    setEditingId(b.id);
    setModalOpen(true);
  };

  const hasOverlap = (a: { check_in: string | null; check_out: string | null }, b: { check_in: string | null; check_out: string | null }): boolean => {
    if (!a.check_in || !a.check_out || !b.check_in || !b.check_out) return false;
    return new Date(a.check_in) < new Date(b.check_out) && new Date(a.check_out) > new Date(b.check_in);
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    setErrorMsg('');

    if (!form.unit_id) {
      setErrorMsg(t('الرجاء اختيار وحدة', 'Please select a unit'));
      setSaving(false);
      return;
    }
    if (!form.customer_id) {
      setErrorMsg(t('الرجاء اختيار عميل', 'Please select a guest'));
      setSaving(false);
      return;
    }
    if (!form.check_in || !form.check_out) {
      setErrorMsg(t('الرجاء إدخال تاريخ الوصول والمغادرة', 'Please enter check-in and check-out dates'));
      setSaving(false);
      return;
    }
    if (new Date(form.check_out) <= new Date(form.check_in)) {
      setErrorMsg(t('تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول', 'Check-out date must be after check-in date'));
      setSaving(false);
      return;
    }

    if (form.unit_id && form.check_in && form.check_out) {
      const conflict = bookings.find((b) =>
        b.id !== editingId &&
        b.unit_id === form.unit_id &&
        b.booking_status !== 'cancelled' &&
        b.booking_status !== 'checked_out' &&
        hasOverlap({ check_in: form.check_in, check_out: form.check_out }, { check_in: b.check_in, check_out: b.check_out })
      );
      if (conflict) {
        setErrorMsg(t('الوحدة محجوزة بالفعل في هذه الفترة. اختر تواريخ أخرى أو وحدة أخرى.', 'This unit is already booked for these dates. Choose different dates or another unit.'));
        setSaving(false);
        return;
      }
    }
    const payload = {
      unit_id: form.unit_id,
      customer_id: form.customer_id,
      check_in: form.check_in,
      check_out: form.check_out,
      check_in_time: form.check_in_time || null,
      check_out_time: form.check_out_time || null,
      booking_type: form.booking_type,
      booking_source: form.booking_source || null,
      subtotal: subtotal,
      tax_rate: Number(form.tax_rate) || 0,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      paid_amount: form.paid_amount ? Number(form.paid_amount) : 0,
      num_nights: nights,
      notes: form.notes || null,
    };
    try {
      if (editingId) {
        const { error: updErr } = await supabase.from('bookings').update(payload).eq('id', editingId);
        if (updErr) throw updErr;
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const isActive = form.check_in && form.check_in <= today && form.check_out && form.check_out >= today;
        const newStatus = isActive ? 'checked_in' : 'confirmed';
        const unitStatus = isActive ? 'occupied' : 'booked';
        const { data: newBooking, error: insErr } = await supabase.from('bookings').insert({ ...payload, booking_status: newStatus }).select('id').single();
        if (insErr || !newBooking) throw insErr || new Error(t('فشل إنشاء الحجز', 'Failed to create booking'));
        if (form.unit_id) {
          const { error: uErr } = await supabase.from('units').update({ status: unitStatus }).eq('id', form.unit_id);
          if (uErr) throw uErr;
        }
        const { data: settings } = await supabase.from('company_settings').select('invoice_prefix').limit(1).maybeSingle();
        const prefix = settings?.invoice_prefix || 'INV';
        const year = new Date().getFullYear();
        const num = Math.floor(1000 + Math.random() * 9000);
        const paid = form.paid_amount ? Number(form.paid_amount) : 0;
        const status = paid >= totalAmount ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
        const { error: invErr } = await supabase.from('invoices').insert({
          booking_id: newBooking.id,
          customer_id: form.customer_id,
          invoice_number: `${prefix}-${year}-${num}`,
          issue_date: form.check_in,
          due_date: form.check_out,
          subtotal: subtotal,
          tax_rate: Number(form.tax_rate) || 0,
          tax_amount: taxAmount,
          discount: 0,
          total: totalAmount,
          paid_amount: paid,
          payment_status: status,
          notes: form.notes || null,
          zatca_status: 'pending',
        });
        if (invErr) throw invErr;
      }
      setModalOpen(false);
      await loadData();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : t('حدث خطأ أثناء الحفظ', 'An error occurred while saving'));
    } finally {
      setSaving(false);
    }
  };

  const cancelBooking = async (): Promise<void> => {
    if (!cancelTarget) return;
    await supabase.from('bookings').update({
      booking_status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancelReason || null,
    }).eq('id', cancelTarget.id);
    if (cancelTarget.unit_id) {
      await supabase.from('units').update({ status: 'available' }).eq('id', cancelTarget.unit_id);
    }
    setCancelTarget(null);
    setCancelReason('');
    void loadData();
  };

  const deleteBooking = async (): Promise<void> => {
    if (!deleteTarget) return;
    await supabase.from('invoices').delete().eq('booking_id', deleteTarget.id);
    await supabase.from('payments').delete().eq('booking_id', deleteTarget.id);
    await supabase.from('bookings').delete().eq('id', deleteTarget.id);
    if (deleteTarget.unit_id) {
      await supabase.from('units').update({ status: 'available' }).eq('id', deleteTarget.unit_id);
    }
    setDeleteTarget(null);
    void loadData();
  };

  const toggleArchive = async (b: Booking): Promise<void> => {
    const newArchived = !b.archived;
    await supabase.from('bookings').update({
      archived: newArchived,
      archived_at: newArchived ? new Date().toISOString() : null,
    }).eq('id', b.id);
    void loadData();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('الحجوزات', 'Bookings')}</h1>
          <p className="page-subtitle">{t('إدارة حجوزات الوحدات والعملاء', 'Manage unit and guest bookings')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => setShowArchived((v) => !v)} style={showArchived ? { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' } : undefined}>
            <Archive size={18} /> {showArchived ? t('العودة للنشطة', 'Back to Active') : t('الأرشيف', 'Archive')}
          </button>
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={18} /> {t('حجز جديد', 'New Booking')}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="card" style={{ marginBottom: 16, padding: 16, borderColor: '#ef4444', background: '#fef2f2' }}>
          <p style={{ color: '#dc2626', fontSize: 14 }}>{errorMsg}</p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            className="input"
            placeholder={t('ابحث برقم الوحدة، اسم العميل، أو الحالة...', 'Search by unit number, guest name, or status...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingRight: 40 }}
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <CalendarDays size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{showArchived ? t('لا توجد حجوزات في الأرشيف', 'No archived bookings') : t('لا توجد حجوزات', 'No bookings')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-th">{t('الوحدة', 'Unit')}</th>
                  <th className="table-th">{t('العميل', 'Guest')}</th>
                  <th className="table-th">{t('الوصول', 'Check-in')}</th>
                  <th className="table-th">{t('المغادرة', 'Check-out')}</th>
                  <th className="table-th">{t('الليالي', 'Nights')}</th>
                  <th className="table-th">{t('النوع', 'Type')}</th>
                  <th className="table-th">{t('شامل الضريبة', 'Tax-Inclusive')}</th>
                  <th className="table-th">{t('المدفوع', 'Paid')}</th>
                  <th className="table-th">{t('الحالة', 'Status')}</th>
                  <th className="table-th">{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="table-row">
                    <td className="table-td">{b.unit?.unit_number || '-'}</td>
                    <td className="table-td">{b.customer?.name || '-'}</td>
                    <td className="table-td">
                      {b.check_in || '-'}
                      {b.check_in_time && <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>{b.check_in_time}</span>}
                    </td>
                    <td className="table-td">
                      {b.check_out || '-'}
                      {b.check_out_time && <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>{b.check_out_time}</span>}
                    </td>
                    <td className="table-td">{b.num_nights ?? nights}</td>
                    <td className="table-td"><span className={typeBadge(b.booking_type)}>{typeLabel(b.booking_type, t)}</span></td>
                    <td className="table-td">
                      <div style={{ fontWeight: 700 }}>{Number(b.total_amount ?? 0).toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {t('قبل الضريبة', 'Pre-tax')}: {Number(b.subtotal ?? 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {t('الضريبة', 'Tax')} ({b.tax_rate ?? 0}%): {Number(b.tax_amount ?? 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="table-td">{Number(b.paid_amount ?? 0).toLocaleString()}</td>
                    <td className="table-td"><span className={statusBadge(b.booking_status)}>{statusLabel(b.booking_status, t)}</span>{b.archived && <span className="badge-gold" style={{ marginInlineStart: 4 }}><Archive size={10} /> {t('مؤرشف', 'Archived')}</span>}</td>
                    <td className="table-td">
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" onClick={() => openEdit(b)} title={t('تعديل', 'Edit')}><Pencil size={16} /></button>
                        <button className="btn-ghost" onClick={() => setCancelTarget(b)} title={t('إلغاء', 'Cancel')}><Ban size={16} /></button>
                        <button className="btn-ghost" onClick={() => toggleArchive(b)} title={b.archived ? t('إلغاء الأرشفة', 'Unarchive') : t('أرشفة', 'Archive')} style={{ color: 'var(--brand-500)' }}>{b.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}</button>
                        <button className="btn-ghost" onClick={() => setDeleteTarget(b)} title={t('حذف نهائي', 'Delete Forever')} style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
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
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{editingId ? t('تعديل الحجز', 'Edit Booking') : t('حجز جديد', 'New Booking')}</h2>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">{t('العقار', 'Property')}</label>
                <select className="input" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value, unit_id: '', subtotal: '' })}>
                  <option value="">{t('اختر عقار', 'Select property')}</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name || t('بدون اسم', 'Unnamed')}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('الوحدة', 'Unit')}</label>
                <select className="input" value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value, subtotal: '' })} disabled={!form.property_id}>
                  <option value="">{form.property_id ? t('اختر وحدة', 'Select unit') : t('اختر عقاراً أولاً', 'Select a property first')}</option>
                  {filteredUnits.map((u) => {
                    const available = u.status === 'available';
                    return (
                      <option key={u.id} value={u.id}>
                        {u.unit_number} - {u.unit_type} ({Number(u.daily_rate ?? 0).toLocaleString()}/{t('ليلة', 'night')}){!available ? ` · ${t('مشغولة', 'occupied')}` : ''}
                      </option>
                    );
                  })}
                </select>
                {form.property_id && filteredUnits.length === 0 && (
                  <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{t('لا توجد وحدات في هذا العقار', 'No units in this property')}</p>
                )}
              </div>
              <div>
                <label className="label">{t('العميل', 'Guest')}</label>
                <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                  <option value="">{t('اختر عميل', 'Select guest')}</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('تاريخ الوصول', 'Check-in Date')}</label>
                <input type="date" className="input" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value, subtotal: '' })} />
              </div>
              <div>
                <label className="label">{t('وقت الوصول', 'Check-in Time')}</label>
                <input type="time" className="input" value={form.check_in_time} onChange={(e) => setForm({ ...form, check_in_time: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('تاريخ المغادرة', 'Check-out Date')}</label>
                <input type="date" className="input" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value, subtotal: '' })} />
              </div>
              <div>
                <label className="label">{t('وقت المغادرة', 'Check-out Time')}</label>
                <input type="time" className="input" value={form.check_out_time} onChange={(e) => setForm({ ...form, check_out_time: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('عدد الليالي', 'Number of Nights')}</label>
                <input className="input" value={nights} readOnly style={{ background: '#f3f4f6' }} />
              </div>
              <div>
                <label className="label">{t('سعر الليلة', 'Nightly Rate')}</label>
                <input className="input" value={selectedUnit ? Number(selectedUnit.daily_rate ?? 0).toLocaleString() : '-'} readOnly style={{ background: '#f3f4f6' }} />
              </div>
              <div>
                <label className="label">{t('نوع الحجز', 'Booking Type')}</label>
                <select className="input" value={form.booking_type} onChange={(e) => setForm({ ...form, booking_type: e.target.value as BookingType })}>
                  <option value="direct">{t('مباشر', 'Direct')}</option>
                  <option value="advance">{t('حجز مسبق', 'Advance')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('مصدر الحجز', 'Booking Source')}</label>
                <input className="input" value={form.booking_source} onChange={(e) => setForm({ ...form, booking_source: e.target.value })} placeholder={t('مثال: استقبال، أونلاين، وكيل', 'e.g. Reception, Online, Agent')} />
              </div>
              <div>
                <label className="label">{t('المجموع قبل الضريبة', 'Subtotal (Pre-tax)')}</label>
                <input type="number" className="input" value={subtotal || ''} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} placeholder={autoSubtotal ? t('تلقائي', 'Auto') + ': ' + autoSubtotal.toLocaleString() : ''} />
              </div>
              <div>
                <label className="label">{t('نسبة الضريبة %', 'Tax Rate %')}</label>
                <input type="number" className="input" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('مبلغ الضريبة', 'Tax Amount')}</label>
                <input className="input" value={taxAmount.toLocaleString()} readOnly style={{ background: '#f3f4f6' }} />
              </div>
              <div>
                <label className="label">{t('الإجمالي شامل الضريبة', 'Total (Tax-Inclusive)')}</label>
                <input className="input" value={totalAmount.toLocaleString()} readOnly style={{ background: '#f3f4f6', fontWeight: 700 }} />
              </div>
              <div>
                <label className="label">{t('المبلغ المدفوع', 'Amount Paid')}</label>
                <input type="number" className="input" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">{t('ملاحظات', 'Notes')}</label>
                <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setModalOpen(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ textAlign: 'center', padding: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ef444415', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={26} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t('حذف نهائي', 'Delete Forever')}</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>{t('سيتم حذف الحجز وفاتورته ومدفوعاته نهائياً. لا يمكن التراجع.', 'The booking, its invoice, and payments will be permanently deleted. This cannot be undone.')}</p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setDeleteTarget(null)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-danger" onClick={deleteBooking}><Trash2 size={16} /> {t('حذف', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t('إلغاء الحجز', 'Cancel Booking')}</h2>
              <button className="btn-ghost" onClick={() => setCancelTarget(null)}><X size={20} /></button>
            </div>
            <p style={{ color: '#6b7280', marginBottom: 12 }}>{t('هل أنت متأكد من إلغاء حجز', 'Are you sure you want to cancel the booking for')} {cancelTarget.customer?.name || ''}؟</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
              {t('سيتم تحويل حالة الوحدة إلى متاحة بعد الإلغاء.', 'The unit status will be set back to available after cancellation.')}
            </p>
            <label className="label">{t('سبب الإلغاء', 'Cancellation Reason')}</label>
            <textarea className="input" rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder={t('اكتب سبب الإلغاء...', 'Write cancellation reason...')} />
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setCancelTarget(null)}>{t('تراجع', 'Cancel')}</button>
              <button className="btn-danger" onClick={cancelBooking}>{t('تأكيد الإلغاء', 'Confirm Cancellation')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
