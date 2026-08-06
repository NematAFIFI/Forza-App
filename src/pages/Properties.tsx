import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Building2, Pencil, Trash2, X, Phone, Mail, MapPin, Hotel, Home, BedDouble, DollarSign, TrendingUp, Users, type LucideIcon, ChevronRight, Clock, Calendar, Archive, ArchiveRestore } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { toggleArchive } from '../lib/archive';

type TFunc = (ar: string, en: string) => string;

type PropertyType = 'hotel' | 'serviced_apartments';

interface Property {
  id: string;
  name: string | null;
  property_type: PropertyType | string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  total_units: number | null;
  notes: string | null;
  archived: boolean | null;
  archived_at: string | null;
  created_at: string | null;
}

interface UnitFull {
  id: string;
  unit_number: string | null;
  unit_type: string | null;
  floor: number | null;
  capacity: number | null;
  daily_rate: number | null;
  monthly_rate: number | null;
  status: string | null;
  notes: string | null;
  cleaning_status: string | null;
  property_id: string | null;
}

interface BookingInfo { id: string; total_amount: number | null; unit_id: string; }

interface PropertyForm {
  name: string;
  property_type: PropertyType;
  address: string;
  phone: string;
  email: string;
  total_units: string;
  notes: string;
}

const PROPERTY_TYPES: readonly PropertyType[] = ['hotel', 'serviced_apartments'] as const;

const emptyForm: PropertyForm = {
  name: '', property_type: 'hotel', address: '', phone: '', email: '', total_units: '', notes: '',
};

const propertyTypeLabel = (t: TFunc, v: string | null): string => {
  const map: Record<string, string> = { hotel: t('فندق', 'Hotel'), serviced_apartments: t('شقق مفروشة', 'Serviced Apartments') };
  return map[v || ''] || v || t('غير محدد', 'Unspecified');
};

const propertyTypeBadge = (t: string | null): string => {
  switch (t) {
    case 'hotel': return 'badge-purple';
    case 'serviced_apartments': return 'badge-blue';
    default: return 'badge-gray';
  }
};

const propertyTypeIcon = (t: string | null): JSX.Element => {
  switch (t) {
    case 'hotel': return <Hotel size={18} />;
    case 'serviced_apartments': return <Home size={18} />;
    default: return <Building2 size={18} />;
  }
};

const roomTypeLabel = (t: TFunc, type: string | null): string => {
  const map: Record<string, string> = {
    single: t('مفردة', 'Single'),
    double: t('مزدوجة', 'Double'),
    suite: t('جناح', 'Suite'),
    family: t('عائلية', 'Family'),
    royal: t('ملكية', 'Royal'),
  };
  return map[type || ''] || type || '-';
};

const unitStatusLabel = (t: TFunc, s: string | null): string => {
  const map: Record<string, string> = {
    available: t('متاحة', 'Available'),
    booked: t('محجوزة', 'Booked'),
    occupied: t('مشغولة', 'Occupied'),
    maintenance: t('صيانة', 'Maintenance'),
    cleaning: t('تنظيف', 'Cleaning'),
  };
  return map[s || ''] || s || '-';
};

const UNIT_STATUS_META: Record<string, { color: string; bg: string; badge: string }> = {
  available: { color: 'var(--brand-500)', bg: 'var(--brand-50)', badge: 'badge-green' },
  booked: { color: 'var(--brand-500)', bg: '#eef2ff', badge: 'badge-blue' },
  occupied: { color: 'var(--brand-500)', bg: '#ecfdf5', badge: 'badge-purple' },
  maintenance: { color: '#ef4444', bg: '#fef2f2', badge: 'badge-red' },
  cleaning: { color: '#fbbf24', bg: '#fffbeb', badge: 'badge-gold' },
};

const formatDate = (d: string | null, lang: string): string => {
  if (!d) return '-';
  try {
    const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
    return new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  }
  catch { return d; }
};

export default function Properties() {
  const { t, lang } = useLanguage();
  const [properties, setProperties] = useState<Property[]>([]);
  const [allUnits, setAllUnits] = useState<UnitFull[]>([]);
  const [bookings, setBookings] = useState<BookingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [detailProperty, setDetailProperty] = useState<Property | null>(null);
  const [detailUnits, setDetailUnits] = useState<UnitFull[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailUnit, setDetailUnit] = useState<UnitFull | null>(null);
  const [unitBookings, setUnitBookings] = useState<{ id: string; customer_name: string | null; check_in: string | null; check_out: string | null; total_amount: number | null; booking_status: string | null }[]>([]);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [unitEditMode, setUnitEditMode] = useState(false);
  const [unitEditingId, setUnitEditingId] = useState<string | null>(null);
  const [unitSaving, setUnitSaving] = useState(false);
  const [unitDeleteTarget, setUnitDeleteTarget] = useState<UnitFull | null>(null);
  const [unitForm, setUnitForm] = useState({
    unit_number: '', unit_type: 'single', floor: '', capacity: '1',
    daily_rate: '', monthly_rate: '', status: 'available', notes: '', cleaning_status: '',
  });
  const UNIT_TYPES = ['single', 'double', 'suite', 'family', 'royal'] as const;
  const UNIT_STATUSES_LIST = ['available', 'booked', 'occupied', 'maintenance', 'cleaning'] as const;

  const loadProperties = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    const [pRes, uRes, bRes] = await Promise.all([
      supabase.from('properties').select('*').order('created_at', { ascending: false }),
      supabase.from('units').select('id,unit_number,unit_type,floor,capacity,daily_rate,monthly_rate,status,notes,cleaning_status,property_id'),
      supabase.from('bookings').select('id,total_amount,unit_id'),
    ]);
    if (pRes.data) setProperties(pRes.data as Property[]);
    if (uRes.data) setAllUnits(uRes.data as UnitFull[]);
    if (bRes.data) setBookings(bRes.data as BookingInfo[]);
    if (pRes.error) setError(pRes.error.message);
    setLoading(false);
  }, []);

  useEffect(() => { void loadProperties(); }, [loadProperties]);

  const filtered = useMemo((): Property[] => {
    const q = search.trim().toLowerCase();
    return properties.filter((p) => {
      if ((p.archived === true) !== showArchived) return false;
      if (!q) return true;
      return (p.name || '').toLowerCase().includes(q) || (p.address || '').toLowerCase().includes(q);
    });
  }, [properties, search, showArchived]);

  const getPropertyStats = (propId: string) => {
    const propUnits = allUnits.filter((u) => u.property_id === propId);
    const available = propUnits.filter((u) => u.status === 'available').length;
    const occupied = propUnits.filter((u) => u.status === 'occupied' || u.status === 'booked').length;
    const maintenance = propUnits.filter((u) => u.status === 'maintenance').length;
    const propBookings = bookings.filter((b) => propUnits.some((u) => u.id === b.unit_id));
    const revenue = propBookings.reduce((s, b) => s + (b.total_amount ?? 0), 0);
    const occupancy = propUnits.length > 0 ? Math.round((occupied / propUnits.length) * 100) : 0;
    return { total: propUnits.length, available, occupied, maintenance, revenue, occupancy };
  };

  const openDetail = async (p: Property): Promise<void> => {
    setDetailProperty(p);
    setDetailLoading(true);
    setDetailUnit(null);
    const propUnits = allUnits.filter((u) => u.property_id === p.id);
    setDetailUnits(propUnits);
    setDetailLoading(false);
  };

  const openUnitDetail = async (unit: UnitFull): Promise<void> => {
    setDetailUnit(unit);
    const { data } = await supabase
      .from('bookings')
      .select('id, customer:customers(name), check_in, check_out, total_amount, booking_status')
      .eq('unit_id', unit.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) {
      setUnitBookings(data.map((b: unknown) => {
        const row = b as { id: string; customer: { name: string | null } | null; check_in: string | null; check_out: string | null; total_amount: number | null; booking_status: string | null };
        return { id: row.id, customer_name: row.customer?.name ?? null, check_in: row.check_in, check_out: row.check_out, total_amount: row.total_amount, booking_status: row.booking_status };
      }));
    }
  };

  const openAddUnit = (): void => {
    setUnitForm({ unit_number: '', unit_type: 'single', floor: '', capacity: '1', daily_rate: '', monthly_rate: '', status: 'available', notes: '', cleaning_status: '' });
    setUnitEditMode(false); setUnitEditingId(null); setUnitModalOpen(true);
  };
  const openEditUnit = (u: UnitFull): void => {
    setUnitForm({
      unit_number: u.unit_number || '', unit_type: u.unit_type || 'single',
      floor: u.floor != null ? String(u.floor) : '', capacity: u.capacity != null ? String(u.capacity) : '1',
      daily_rate: u.daily_rate != null ? String(u.daily_rate) : '', monthly_rate: u.monthly_rate != null ? String(u.monthly_rate) : '',
      status: u.status || 'available', notes: u.notes || '', cleaning_status: u.cleaning_status || '',
    });
    setUnitEditMode(true); setUnitEditingId(u.id); setUnitModalOpen(true);
  };
  const closeUnitModal = (): void => { setUnitModalOpen(false); setUnitEditMode(false); setUnitEditingId(null); };

  const saveUnit = async (): Promise<void> => {
    if (!detailProperty) return;
    if (!unitForm.unit_number.trim()) { setError(t('الرجاء إدخال رقم الوحدة', 'Please enter a unit number')); return; }
    setUnitSaving(true); setError('');
    try {
      const payload = {
        unit_number: unitForm.unit_number.trim(), unit_type: unitForm.unit_type,
        property_id: detailProperty.id,
        floor: unitForm.floor ? Number(unitForm.floor) : null,
        capacity: unitForm.capacity ? Number(unitForm.capacity) : null,
        daily_rate: unitForm.daily_rate ? Number(unitForm.daily_rate) : 0,
        monthly_rate: unitForm.monthly_rate ? Number(unitForm.monthly_rate) : 0,
        status: unitForm.status, notes: unitForm.notes || null,
        cleaning_status: unitForm.cleaning_status || null,
      };
      if (unitEditMode && unitEditingId) {
        const { error: err } = await supabase.from('units').update(payload).eq('id', unitEditingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('units').insert(payload);
        if (err) throw err;
      }
      closeUnitModal(); await loadProperties();
      const { data: freshUnits } = await supabase.from('units').select('*');
      const propUnits = (freshUnits || []).filter((u: UnitFull) => u.property_id === detailProperty.id);
      setDetailUnits(propUnits);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('حدث خطأ أثناء الحفظ', 'An error occurred while saving'));
    } finally { setUnitSaving(false); }
  };

  const deleteUnit = async (): Promise<void> => {
    if (!unitDeleteTarget) return;
    try {
      const { error: err } = await supabase.from('units').delete().eq('id', unitDeleteTarget.id);
      if (err) throw err;
      setUnitDeleteTarget(null); await loadProperties();
      if (detailProperty) {
        const { data: freshUnits } = await supabase.from('units').select('*');
        const propUnits = (freshUnits || []).filter((u: UnitFull) => u.property_id === detailProperty.id);
        setDetailUnits(propUnits);
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t('تعذر الحذف', 'Unable to delete')); }
  };

  const openAdd = (): void => { setForm(emptyForm); setEditMode(false); setEditingId(null); setModalOpen(true); };
  const openEdit = (p: Property): void => {
    setForm({
      name: p.name || '', property_type: (p.property_type as PropertyType) || 'hotel',
      address: p.address || '', phone: p.phone || '', email: p.email || '',
      total_units: p.total_units != null ? String(p.total_units) : '', notes: p.notes || '',
    });
    setEditMode(true); setEditingId(p.id); setModalOpen(true);
  };
  const closeModal = (): void => { setModalOpen(false); setForm(emptyForm); setEditMode(false); setEditingId(null); };

  const saveProperty = async (): Promise<void> => {
    if (!form.name.trim()) { setError(t('الرجاء إدخال اسم العقار', 'Please enter a property name')); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name.trim(), property_type: form.property_type,
        address: form.address.trim() || null, phone: form.phone.trim() || null,
        email: form.email.trim() || null, total_units: form.total_units ? Number(form.total_units) : 0,
        notes: form.notes.trim() || null,
      };
      if (editMode && editingId) {
        const { error: err } = await supabase.from('properties').update(payload).eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('properties').insert(payload);
        if (err) throw err;
      }
      closeModal(); await loadProperties();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('حدث خطأ أثناء الحفظ', 'An error occurred while saving'));
    } finally { setSaving(false); }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      const { error: err } = await supabase.from('properties').delete().eq('id', deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null); await loadProperties();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t('تعذر الحذف', 'Unable to delete')); }
  };

  const archiveProperty = async (p: Property): Promise<void> => { await toggleArchive('properties', p.id, p.archived === true); await loadProperties(); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('إدارة العقارات', 'Property Management')}</h1>
          <p className="page-subtitle">{t('إدارة الفنادق والشقق المفروشة', 'Manage hotels and serviced apartments')} — {properties.length} {t('عقار', 'properties')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => setShowArchived((v) => !v)} style={showArchived ? { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' } : undefined}><Archive size={18} /> {showArchived ? t('العودة للنشطة', 'Back to Active') : t('الأرشيف', 'Archive')}</button>
          <button className="btn-primary" onClick={openAdd}><Plus size={18} /> {t('إضافة عقار', 'Add Property')}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder={t('ابحث بالاسم أو العنوان...', 'Search by name or address...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, padding: 16, borderColor: '#ef4444', background: '#fef2f2' }}>
          <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>{t('جارٍ التحميل...', 'Loading...')}</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
          <Building2 size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>{t('لا توجد عقارات بعد', 'No properties yet')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filtered.map((p) => {
            const stats = getPropertyStats(p.id);
            return (
              <div key={p.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden', borderTop: '4px solid var(--brand-500)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => openDetail(p)}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(var(--brand-rgb),0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-500)' }}>
                      {propertyTypeIcon(p.property_type)}
                    </div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{p.name || t('بدون اسم', 'Unnamed')}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{formatDate(p.created_at, lang)}</div>
                    </div>
                  </div>
                  <span className={propertyTypeBadge(p.property_type)}>{propertyTypeLabel(t, p.property_type)}</span>
                </div>

                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  <StatMini icon={BedDouble} label={t('وحدات', 'Units')} value={stats.total} color="var(--brand-500)" />
                  <StatMini icon={TrendingUp} label={t('إشغال', 'Occupancy')} value={`${stats.occupancy}%`} color="var(--brand-500)" />
                  <StatMini icon={DollarSign} label={t('إيراد', 'Revenue')} value={stats.revenue.toLocaleString()} color="var(--brand-500)" />
                  <StatMini icon={Users} label={t('شاغرة', 'Vacant')} value={stats.available} color="#fbbf24" />
                </div>

                <div style={{ padding: '0 20px 16px' }}>
                  {p.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151', marginBottom: 10 }}>
                      <MapPin size={15} style={{ marginTop: 2, color: '#9ca3af', flexShrink: 0 }} />
                      <span style={{ lineHeight: 1.5 }}>{p.address}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                    {p.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }} dir="ltr">
                        <Phone size={14} /> <span>{p.phone}</span>
                      </div>
                    )}
                    {p.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }} dir="ltr">
                        <Mail size={14} /> <span>{p.email}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <StatusPill label={t('متاح', 'Available')} count={stats.available} color="var(--brand-500)" />
                    <StatusPill label={t('مشغول', 'Occupied')} count={stats.occupied} color="var(--brand-500)" />
                    <StatusPill label={t('صيانة', 'Maintenance')} count={stats.maintenance} color="#ef4444" />
                  </div>
                  {p.notes && <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>{p.notes}</p>}
                </div>

                <div style={{ display: 'flex', gap: 8, padding: '12px 20px 20px' }}>
                  <button className="btn-outline" style={{ flex: 1 }} onClick={() => openDetail(p)}>
                    {t('عرض الوحدات', 'View Units')} <ChevronRight size={15} />
                  </button>
                  <button className="btn-ghost" onClick={() => openEdit(p)} title={t('تعديل', 'Edit')} style={{ padding: '8px 12px' }}>
                    <Pencil size={16} />
                  </button>
                  <button className="btn-ghost" onClick={() => archiveProperty(p)} title={p.archived ? t('إلغاء الأرشفة', 'Unarchive') : t('أرشفة', 'Archive')} style={{ padding: '8px 12px', color: 'var(--brand-500)', border: '1px solid #fef3c7' }}>
                    {p.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                  </button>
                  <button className="btn-ghost" onClick={() => setDeleteTarget(p)} title={t('حذف', 'Delete')} style={{ padding: '8px 12px', color: '#ef4444', border: '1px solid #fee2e2' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Property Detail Modal with Full Unit List */}
      {detailProperty && (
        <div className="modal-overlay" onClick={() => { setDetailProperty(null); setDetailUnit(null); }}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, position: 'sticky', top: 0, background: '#fff', zIndex: 10, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(var(--brand-rgb),0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-500)' }}>
                  {propertyTypeIcon(detailProperty.property_type)}
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>{detailProperty.name}</h2>
                  <span className={propertyTypeBadge(detailProperty.property_type)}>{propertyTypeLabel(t, detailProperty.property_type)}</span>
                </div>
              </div>
              <button className="btn-ghost" onClick={() => { setDetailProperty(null); setDetailUnit(null); }}><X size={20} /></button>
            </div>

            {/* Property Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <DetailBox label={t('إجمالي الوحدات', 'Total Units')} value={String(detailUnits.length)} />
              <DetailBox label={t('تاريخ الإنشاء', 'Created Date')} value={formatDate(detailProperty.created_at, lang)} />
              <DetailBox label={t('الهاتف', 'Phone')} value={detailProperty.phone || '-'} />
              <DetailBox label={t('البريد', 'Email')} value={detailProperty.email || '-'} />
              <div style={{ gridColumn: '1 / -1' }}>
                <DetailBox label={t('العنوان', 'Address')} value={detailProperty.address || '-'} />
              </div>
            </div>

            {/* Unit Status Summary */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {Object.entries(UNIT_STATUS_META).map(([key, meta]) => {
                const count = detailUnits.filter((u) => u.status === key).length;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 14px', borderRadius: 20, background: meta.bg, color: meta.color, fontWeight: 600 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                    {unitStatusLabel(t, key)}: {count}
                  </div>
                );
              })}
            </div>

            {/* Full Unit List */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>{t('قائمة الوحدات', 'Unit List')}</h3>
              <button className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={openAddUnit}>
                <Plus size={15} /> {t('إضافة وحدة', 'Add Unit')}
              </button>
            </div>
            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>{t('جارٍ التحميل...', 'Loading...')}</div>
            ) : detailUnits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>
                <BedDouble size={40} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p>{t('لا توجد وحدات في هذا العقار', 'No units in this property')}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {detailUnits.map((u) => {
                  const meta = UNIT_STATUS_META[u.status || 'available'] || UNIT_STATUS_META.available;
                  return (
                    <div
                      key={u.id}
                      className="card card-hover"
                      style={{ padding: 16, borderRadius: 12, border: `1.5px solid ${meta.color}30`, background: meta.bg, cursor: 'pointer' }}
                      onClick={() => openUnitDetail(u)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#1a2535' }}>{u.unit_number || '-'}</div>
                        <span className={meta.badge} style={{ fontSize: 11 }}>{unitStatusLabel(t, u.status)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{roomTypeLabel(t, u.unit_type)}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: '#374151' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building2 size={12} color="#9ca3af" /> {t('طابق', 'Floor')} {u.floor ?? '-'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={12} color="#9ca3af" /> {u.capacity ?? 1} {t('أشخاص', 'guests')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <DollarSign size={12} color="#9ca3af" /> {Number(u.daily_rate ?? 0).toLocaleString()} / {t('ليلة', 'night')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} color="#9ca3af" /> {Number(u.monthly_rate ?? 0).toLocaleString()} / {t('شهر', 'month')}
                        </div>
                      </div>
                      {u.cleaning_status && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#fbbf24', marginTop: 6 }}>
                          <Clock size={11} /> {t('التنظيف', 'Cleaning')}: {u.cleaning_status}
                        </div>
                      )}
                      {u.notes && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, lineHeight: 1.4 }}>{u.notes}</p>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn-outline" style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} onClick={() => openEditUnit(u)}>
                          <Pencil size={13} /> {t('تعديل', 'Edit')}
                        </button>
                        <button className="btn-ghost" style={{ padding: '6px 10px', color: '#ef4444', border: '1px solid #fee2e2' }} onClick={() => setUnitDeleteTarget(u)} title={t('حذف', 'Delete')}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {detailProperty.notes && (
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{t('ملاحظات', 'Notes')}</div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{detailProperty.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unit Detail Modal (from within property detail) */}
      {detailUnit && (
        <div className="modal-overlay" onClick={() => setDetailUnit(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>{t('وحدة', 'Unit')} {detailUnit.unit_number}</h2>
                <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{roomTypeLabel(t, detailUnit.unit_type)} · {unitStatusLabel(t, detailUnit.status)}</p>
              </div>
              <button className="btn-ghost" onClick={() => setDetailUnit(null)}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <InfoBox label={t('الطابق', 'Floor')} value={String(detailUnit.floor ?? '-')} />
              <InfoBox label={t('السعة', 'Capacity')} value={`${detailUnit.capacity ?? 1} ${t('أشخاص', 'guests')}`} />
              <InfoBox label={t('السعر اليومي', 'Daily Rate')} value={`${Number(detailUnit.daily_rate ?? 0).toLocaleString()} ${t('ر.س', 'SAR')}`} />
              <InfoBox label={t('السعر الشهري', 'Monthly Rate')} value={`${Number(detailUnit.monthly_rate ?? 0).toLocaleString()} ${t('ر.س', 'SAR')}`} />
              <InfoBox label={t('حالة التنظيف', 'Cleaning Status')} value={detailUnit.cleaning_status || t('غير محدد', 'Not specified')} />
              <InfoBox label={t('الحالة', 'Status')} value={unitStatusLabel(t, detailUnit.status)} />
            </div>

            {detailUnit.notes && (
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{t('ملاحظات', 'Notes')}</div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{detailUnit.notes}</p>
              </div>
            )}

            <div>
              <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 15 }}>{t('حجوزات الوحدة', 'Unit Bookings')}</h3>
              {unitBookings.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 14, padding: 12 }}>{t('لا توجد حجوزات', 'No bookings')}</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="table-th">{t('العميل', 'Guest')}</th>
                        <th className="table-th">{t('الوصول', 'Check-in')}</th>
                        <th className="table-th">{t('المغادرة', 'Check-out')}</th>
                        <th className="table-th">{t('المبلغ', 'Amount')}</th>
                        <th className="table-th">{t('الحالة', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unitBookings.map((b) => (
                        <tr key={b.id} className="table-row">
                          <td className="table-td">{b.customer_name || '-'}</td>
                          <td className="table-td">{b.check_in || '-'}</td>
                          <td className="table-td">{b.check_out || '-'}</td>
                          <td className="table-td">{Number(b.total_amount ?? 0).toLocaleString()}</td>
                          <td className="table-td"><span className="badge-purple">{b.booking_status || '-'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Unit Modal (within property detail) */}
      {unitModalOpen && detailProperty && (
        <div className="modal-overlay" onClick={closeUnitModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>{unitEditMode ? t('تعديل الوحدة', 'Edit Unit') : t('إضافة وحدة', 'Add Unit')}</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{detailProperty.name}</p>
              </div>
              <button className="btn-ghost" onClick={closeUnitModal}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">{t('رقم الوحدة *', 'Unit Number *')}</label>
                <input className="input" value={unitForm.unit_number} onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })} placeholder={t('مثال: 101', 'e.g. 101')} />
              </div>
              <div>
                <label className="label">{t('نوع الوحدة', 'Unit Type')}</label>
                <select className="input" value={unitForm.unit_type} onChange={(e) => setUnitForm({ ...unitForm, unit_type: e.target.value })}>
                  {UNIT_TYPES.map((ut) => <option key={ut} value={ut}>{roomTypeLabel(t, ut)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('الطابق', 'Floor')}</label>
                <input type="number" className="input" value={unitForm.floor} onChange={(e) => setUnitForm({ ...unitForm, floor: e.target.value })} min={0} />
              </div>
              <div>
                <label className="label">{t('السعة', 'Capacity')}</label>
                <input type="number" className="input" value={unitForm.capacity} onChange={(e) => setUnitForm({ ...unitForm, capacity: e.target.value })} min={1} />
              </div>
              <div>
                <label className="label">{t('السعر اليومي', 'Daily Rate')}</label>
                <input type="number" className="input" value={unitForm.daily_rate} onChange={(e) => setUnitForm({ ...unitForm, daily_rate: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="label">{t('السعر الشهري', 'Monthly Rate')}</label>
                <input type="number" className="input" value={unitForm.monthly_rate} onChange={(e) => setUnitForm({ ...unitForm, monthly_rate: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="label">{t('الحالة', 'Status')}</label>
                <select className="input" value={unitForm.status} onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })}>
                  {UNIT_STATUSES_LIST.map((s) => <option key={s} value={s}>{unitStatusLabel(t, s)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('حالة التنظيف', 'Cleaning Status')}</label>
                <input className="input" value={unitForm.cleaning_status} onChange={(e) => setUnitForm({ ...unitForm, cleaning_status: e.target.value })} placeholder={t('مثال: نظيف', 'e.g. clean')} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">{t('ملاحظات', 'Notes')}</label>
                <textarea className="input" rows={2} value={unitForm.notes} onChange={(e) => setUnitForm({ ...unitForm, notes: e.target.value })} />
              </div>
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={closeUnitModal} disabled={unitSaving}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={saveUnit} disabled={unitSaving}>{unitSaving ? t('جارٍ الحفظ...', 'Saving...') : unitEditMode ? t('حفظ', 'Save') : t('إضافة', 'Add')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Delete Modal */}
      {unitDeleteTarget && (
        <div className="modal-overlay" onClick={() => setUnitDeleteTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center', padding: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ef444415', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={26} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t('حذف الوحدة', 'Delete Unit')}</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>{t('هل أنت متأكد من حذف', 'Are you sure you want to delete')} «{unitDeleteTarget.unit_number}»؟</p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setUnitDeleteTarget(null)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-danger" onClick={deleteUnit}><Trash2 size={16} /> {t('حذف', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{editMode ? t('تعديل العقار', 'Edit Property') : t('إضافة عقار', 'Add Property')}</h2>
              <button className="btn-ghost" onClick={closeModal}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">{t('اسم العقار *', 'Property Name *')}</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('أدخل اسم العقار', 'Enter property name')} />
              </div>
              <div>
                <label className="label">{t('نوع العقار', 'Property Type')}</label>
                <select className="input" value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value as PropertyType })}>
                  {PROPERTY_TYPES.map((pt) => <option key={pt} value={pt}>{propertyTypeLabel(t, pt)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('إجمالي الوحدات', 'Total Units')}</label>
                <input type="number" className="input" value={form.total_units} onChange={(e) => setForm({ ...form, total_units: e.target.value })} min={0} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">{t('العنوان', 'Address')}</label>
                <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('المدينة، الحي، الشارع', 'City, District, Street')} />
              </div>
              <div>
                <label className="label">{t('الهاتف', 'Phone')}</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
              </div>
              <div>
                <label className="label">{t('البريد', 'Email')}</label>
                <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">{t('ملاحظات', 'Notes')}</label>
                <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={closeModal} disabled={saving}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={saveProperty} disabled={saving}>{saving ? t('جارٍ الحفظ...', 'Saving...') : editMode ? t('حفظ', 'Save') : t('إنشاء', 'Create')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center', padding: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ef444415', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={26} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t('تأكيد الحذف', 'Confirm Delete')}</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>{t('هل أنت متأكد من حذف', 'Are you sure you want to delete')} «{deleteTarget.name}»؟</p>
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

function StatMini({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string | number; color: string }): JSX.Element {
  return (
    <div style={{ textAlign: 'center' }}>
      <Icon size={16} color={color} />
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2535', marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#9ca3af' }}>{label}</div>
    </div>
  );
}

function StatusPill({ label, count, color }: { label: string; count: number; color: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 10px', borderRadius: 20, background: `${color}15`, color }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}: {count}
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2535' }}>{value}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2535' }}>{value}</div>
    </div>
  );
}
