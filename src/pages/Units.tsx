import { useState, useEffect, useMemo } from 'react';
import { supabase, type Unit, type Booking } from '../lib/supabase';
import { Plus, Search, BedDouble, Pencil, X, Building2, Users, DollarSign, Sparkles, Clock, Calendar, Trash2, ChevronRight, ArrowRight, Archive, ArchiveRestore, LayoutGrid, CalendarClock } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { toggleArchive } from '../lib/archive';

type TFunc = (ar: string, en: string) => string;

const ROOM_TYPES = ['single', 'double', 'suite', 'family', 'royal'] as const;
const UNIT_STATUSES = ['available', 'booked', 'occupied', 'maintenance', 'cleaning'] as const;

const roomTypeLabel = (t: string | null, tf: TFunc): string => {
  const map: Record<string, string> = {
    single: tf('مفردة', 'Single'),
    double: tf('مزدوجة', 'Double'),
    suite: tf('جناح', 'Suite'),
    family: tf('عائلية', 'Family'),
    royal: tf('ملكية', 'Royal'),
  };
  return map[t || ''] || t || '-';
};

const statusLabel = (s: string | null, tf: TFunc): string => {
  const map: Record<string, string> = {
    available: tf('متاحة', 'Available'),
    booked: tf('محجوزة', 'Booked'),
    occupied: tf('مشغولة', 'Occupied'),
    maintenance: tf('صيانة', 'Maintenance'),
    cleaning: tf('تنظيف', 'Cleaning'),
  };
  return map[s || ''] || s || '-';
};

const STATUS_META: Record<string, { color: string; bg: string; badge: string }> = {
  available: { color: 'var(--brand-500)', bg: 'var(--brand-50)', badge: 'badge-green' },
  booked: { color: 'var(--brand-500)', bg: '#eef2ff', badge: 'badge-blue' },
  occupied: { color: 'var(--brand-500)', bg: '#ecfdf5', badge: 'badge-purple' },
  maintenance: { color: '#ef4444', bg: '#fef2f2', badge: 'badge-red' },
  cleaning: { color: '#fbbf24', bg: '#fffbeb', badge: 'badge-gold' },
};

interface UnitForm {
  unit_number: string;
  unit_type: string;
  property_id: string;
  floor: string;
  capacity: string;
  daily_rate: string;
  monthly_rate: string;
  status: string;
  notes: string;
}

const emptyForm: UnitForm = {
  unit_number: '', unit_type: 'single', property_id: '', floor: '', capacity: '', daily_rate: '', monthly_rate: '', status: 'available', notes: '',
};

interface Property { id: string; name: string | null; }

export default function Units() {
  const { t, lang } = useLanguage();
  const [units, setUnits] = useState<(Unit & { property?: Property | null })[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UnitForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailUnit, setDetailUnit] = useState<(Unit & { property?: Property | null }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<(Unit & { property?: Property | null }) | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [statusOverviewOpen, setStatusOverviewOpen] = useState(false);
  const [departuresOpen, setDeparturesOpen] = useState(false);

  const load = async (): Promise<void> => {
    setLoading(true);
    const [uRes, pRes, bRes] = await Promise.all([
      supabase.from('units').select('*, property:properties(id,name)').order('unit_number', { ascending: true }),
      supabase.from('properties').select('id,name').order('name', { ascending: true }),
      supabase.from('bookings').select('*, unit:units(*), customer:customers(*)').order('created_at', { ascending: false }),
    ]);
    if (uRes.data) setUnits(uRes.data as (Unit & { property?: Property | null })[]);
    if (pRes.data) setProperties(pRes.data as Property[]);
    if (bRes.data) setBookings(bRes.data as unknown as Booking[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const propertyUnits = useMemo((): (Unit & { property?: Property | null })[] => {
    if (!selectedProperty) return [];
    let result = units.filter((u) => (u as Unit & { property_id?: string | null }).property_id === selectedProperty.id);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((u) => (u.unit_number || '').toLowerCase().includes(q) || roomTypeLabel(u.unit_type, t).toLowerCase().includes(q));
    }
    if (statusFilter) {
      result = result.filter((u) => u.status === statusFilter);
    }
    result = result.filter((u) => (u.archived === true) === showArchived);
    return result;
  }, [units, selectedProperty, search, statusFilter, showArchived, t]);

  const openCreate = (): void => {
    setForm({ ...emptyForm, property_id: selectedProperty?.id || '' });
    setEditingId(null);
    setModalOpen(true);
  };
  const openEdit = (u: Unit): void => {
    setForm({
      unit_number: u.unit_number || '', unit_type: u.unit_type || 'single',
      property_id: (u as Unit & { property_id?: string | null }).property_id || '',
      floor: u.floor != null ? String(u.floor) : '', capacity: u.capacity != null ? String(u.capacity) : '',
      daily_rate: u.daily_rate != null ? String(u.daily_rate) : '', monthly_rate: u.monthly_rate != null ? String(u.monthly_rate) : '',
      status: u.status || 'available', notes: u.notes || '',
    });
    setEditingId(u.id);
    setModalOpen(true);
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    const payload = {
      unit_number: form.unit_number || null, unit_type: form.unit_type,
      property_id: form.property_id || null,
      floor: form.floor ? Number(form.floor) : null, capacity: form.capacity ? Number(form.capacity) : null,
      daily_rate: form.daily_rate ? Number(form.daily_rate) : 0, monthly_rate: form.monthly_rate ? Number(form.monthly_rate) : 0,
      status: form.status, notes: form.notes || null,
    };
    if (editingId) {
      await supabase.from('units').update(payload).eq('id', editingId);
    } else {
      await supabase.from('units').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    void load();
  };

  const deleteUnit = async (): Promise<void> => {
    if (!deleteTarget) return;
    const active = activeBooking(deleteTarget.id);
    if (active) {
      setErrorMsg(t('لا يمكن حذف وحدة عليها حجز نشط. ألغِ الحجز أولاً.', 'Cannot delete a unit with an active booking. Cancel the booking first.'));
      setDeleteTarget(null);
      return;
    }
    await supabase.from('units').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    void load();
  };

  const archiveUnit = async (u: Unit): Promise<void> => { await toggleArchive('units', u.id, u.archived === true); void load(); };

  const getUnitBookings = (unitId: string): Booking[] => bookings.filter((b) => b.unit_id === unitId);
  const activeBooking = (unitId: string): Booking | undefined => bookings.find((b) => b.unit_id === unitId && (b.booking_status === 'checked_in' || b.booking_status === 'confirmed'));

  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';

  const departures = useMemo((): { booking: Booking; unit: Unit | null }[] => {
    if (!selectedProperty) return [];
    const propUnits = units.filter((u) => (u as Unit & { property_id?: string | null }).property_id === selectedProperty.id);
    const propUnitIds = new Set(propUnits.map((u) => u.id));
    return bookings
      .filter((b) => b.unit_id && propUnitIds.has(b.unit_id) && (b.booking_status === 'checked_in' || b.booking_status === 'confirmed') && b.check_out)
      .map((b) => ({ booking: b, unit: propUnits.find((u) => u.id === b.unit_id) || null }))
      .sort((a, b) => {
        const aTime = `${a.booking.check_out || ''}T${a.booking.check_out_time || '00:00'}`;
        const bTime = `${b.booking.check_out || ''}T${b.booking.check_out_time || '00:00'}`;
        return aTime.localeCompare(bTime);
      });
  }, [bookings, units, selectedProperty]);

  const formatDeparture = (b: Booking): string => {
    const date = b.check_out || '';
    const time = b.check_out_time || '';
    if (!date) return '-';
    try {
      const dt = new Date(`${date}T${time || '00:00'}`);
      const dateStr = dt.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
      const timeStr = time ? dt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';
      return `${dateStr}${timeStr ? ' — ' + timeStr : ''}`;
    } catch {
      return date + (time ? ' ' + time : '');
    }
  };

  const unitCountForProperty = (propId: string): number => units.filter((u) => (u as Unit & { property_id?: string | null }).property_id === propId).length;

  return (
    <div>
      {!selectedProperty ? (
        <>
          {/* Property List View */}
          <div className="page-header">
            <div>
              <h1 className="page-title">{t('الوحدات', 'Units')}</h1>
              <p className="page-subtitle">{t('اختر عقاراً لعرض وحداته', 'Select a property to view its units')}</p>
            </div>
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>{t('جارٍ التحميل...', 'Loading...')}</div>
          ) : properties.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
              <Building2 size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>{t('لا توجد عقارات. أضف عقاراً أولاً من صفحة العقارات.', 'No properties found. Add a property first from the Properties page.')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {properties.map((p) => {
                const pUnits = units.filter((u) => (u as Unit & { property_id?: string | null }).property_id === p.id);
                const available = pUnits.filter((u) => u.status === 'available').length;
                const occupied = pUnits.filter((u) => u.status === 'occupied' || u.status === 'booked').length;
                const maintenance = pUnits.filter((u) => u.status === 'maintenance').length;
                const cleaning = pUnits.filter((u) => u.status === 'cleaning').length;
                const occRate = pUnits.length > 0 ? Math.round((occupied / pUnits.length) * 100) : 0;
                return (
                  <div
                    key={p.id}
                    className="card card-hover"
                    style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', borderTop: '4px solid var(--brand-500)' }}
                    onClick={() => { setSelectedProperty(p); setSearch(''); setStatusFilter(''); }}
                  >
                    <div style={{ padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building2 size={24} color="var(--brand-500)" />
                          </div>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>{p.name || t('بدون اسم', 'Unnamed')}</div>
                            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{pUnits.length} {t('وحدة', 'units')}</div>
                          </div>
                        </div>
                        <ChevronRight size={20} color="#9ca3af" style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />
                      </div>

                      {/* Status mini-bars */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                        <StatusPip label={t('متاحة', 'Avail')} count={available} color="var(--brand-500)" />
                        <StatusPip label={t('مشغولة', 'Occ')} count={occupied} color="var(--brand-500)" />
                        <StatusPip label={t('صيانة', 'Maint')} count={maintenance} color="#ef4444" />
                        <StatusPip label={t('تنظيف', 'Clean')} count={cleaning} color="#fbbf24" />
                      </div>

                      {/* Occupancy bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                          <span>{t('نسبة الإشغال', 'Occupancy')}</span>
                          <span style={{ fontWeight: 700, color: '#1a2535' }}>{occRate}%</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${occRate}%`, borderRadius: 4, background: 'linear-gradient(90deg, var(--brand-500), var(--brand-500))', transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Units View for Selected Property */}
          <div className="page-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setSelectedProperty(null)}>
                  <ArrowRight size={18} style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />
                </button>
                <h1 className="page-title" style={{ margin: 0 }}>{selectedProperty.name}</h1>
              </div>
              <p className="page-subtitle">{t('وحدات العقار', 'Property Units')} — {unitCountForProperty(selectedProperty.id)} {t('وحدة', 'units')}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-outline" onClick={() => setStatusOverviewOpen(true)} title={t('لوحة حالات الغرف', 'Room Status Board')}><LayoutGrid size={18} /> {t('حالات الغرف', 'Room Status')}</button>
              <button className="btn-outline" onClick={() => setDeparturesOpen(true)} title={t('مواعيد المغادرة', 'Departure Times')}><CalendarClock size={18} /> {t('المغادرات', 'Departures')} {departures.length > 0 && <span style={{ background: 'var(--brand-500)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{departures.length}</span>}</button>
              <button className="btn-outline" onClick={() => setShowArchived((v) => !v)} style={showArchived ? { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' } : undefined}><Archive size={18} /> {showArchived ? t('العودة للنشطة', 'Back to Active') : t('الأرشيف', 'Archive')}</button>
              <button className="btn-primary" onClick={openCreate}><Plus size={18} /> {t('وحدة جديدة', 'New Unit')}</button>
            </div>
          </div>

          {/* Filters */}
          <div className="card" style={{ marginBottom: 16, padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input className="input" placeholder={t('ابحث برقم الوحدة أو النوع...', 'Search by unit number or type...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
            </div>
            <select className="input" style={{ width: 'auto', minWidth: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{t('كل الحالات', 'All Statuses')}</option>
              {UNIT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s, t)}</option>)}
            </select>
          </div>

          {/* Status summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
            {Object.entries(STATUS_META).map(([key, meta]) => {
              const all = units.filter((u) => (u as Unit & { property_id?: string | null }).property_id === selectedProperty.id);
              const count = all.filter((u) => u.status === key).length;
              return (
                <div key={key} style={{ borderRadius: 12, padding: 14, background: meta.bg, border: `1px solid ${meta.color}25` }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: meta.color }}>{count}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{statusLabel(key, t)}</div>
                </div>
              );
            })}
          </div>

          {errorMsg && (
            <div className="card" style={{ marginBottom: 16, padding: 16, borderColor: '#ef4444', background: '#fef2f2' }}>
              <p style={{ color: '#dc2626', fontSize: 14 }}>{errorMsg}</p>
            </div>
          )}

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>{t('جارٍ التحميل...', 'Loading...')}</div>
          ) : propertyUnits.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
              <BedDouble size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>{t('لا توجد وحدات في هذا العقار بعد', 'No units in this property yet')}</p>
              <button className="btn-primary" style={{ marginTop: 16 }} onClick={openCreate}><Plus size={16} /> {t('أضف أول وحدة', 'Add First Unit')}</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {propertyUnits.map((u) => {
                const meta = STATUS_META[u.status || 'available'] || STATUS_META.available;
                const active = activeBooking(u.id);
                return (
                  <div key={u.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden', borderTop: `4px solid ${meta.color}` }} onClick={() => setDetailUnit(u)}>
                    <div style={{ padding: 18, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800 }}>{u.unit_number || '-'}</div>
                          <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{roomTypeLabel(u.unit_type, t)}</div>
                        </div>
                        <span className={meta.badge}>{statusLabel(u.status, t)}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
                          <Building2 size={14} color="#9ca3af" /> {t('طابق', 'Floor')} {u.floor ?? '-'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
                          <Users size={14} color="#9ca3af" /> {u.capacity ?? 1} {t('أشخاص', 'guests')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
                          <DollarSign size={14} color="#9ca3af" /> {Number(u.daily_rate ?? 0).toLocaleString()} / {t('ليلة', 'night')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
                          <Calendar size={14} color="#9ca3af" /> {Number(u.monthly_rate ?? 0).toLocaleString()} / {t('شهر', 'month')}
                        </div>
                      </div>

                      {active && (
                        <div style={{ background: 'rgba(var(--brand-rgb),0.06)', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7e22ce', fontWeight: 600, marginBottom: 4 }}>
                            <Sparkles size={13} /> {t('حجز نشط', 'Active Booking')}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{active.customer?.name || '-'}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{active.check_in} ← {active.check_out}</div>
                        </div>
                      )}

                      {u.cleaning_status && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#fbbf24', marginBottom: 8 }}>
                          <Clock size={12} /> {t('التنظيف', 'Cleaning')}: {u.cleaning_status}
                          {u.last_cleaned_at && <span style={{ color: '#9ca3af' }}>· {new Date(u.last_cleaned_at).toLocaleDateString(locale)}</span>}
                        </div>
                      )}

                      {u.notes && <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10, lineHeight: 1.5 }}>{u.notes}</p>}

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-outline" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); openEdit(u); }}>
                          <Pencil size={15} /> {t('تعديل', 'Edit')}
                        </button>
                        <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); archiveUnit(u); }} title={u.archived ? t('إلغاء الأرشفة', 'Unarchive') : t('أرشفة', 'Archive')} style={{ padding: '8px 12px', color: 'var(--brand-500)', border: '1px solid #fef3c7' }}>
                          {u.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                        </button>
                        <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }} title={t('حذف', 'Delete')} style={{ padding: '8px 12px', color: '#ef4444', border: '1px solid #fee2e2' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Status Overview Modal */}
      {statusOverviewOpen && selectedProperty && (() => {
        const propUnits = units.filter((u) => (u as Unit & { property_id?: string | null }).property_id === selectedProperty.id && (u.archived === true) === showArchived);
        const grouped: Record<string, Unit[]> = { available: [], booked: [], occupied: [], maintenance: [], cleaning: [] };
        for (const u of propUnits) {
          const s = u.status || 'available';
          if (grouped[s]) grouped[s].push(u); else (grouped as Record<string, Unit[]>)[s] = [u];
        }
        const sections = Object.entries(STATUS_META).filter(([key]) => grouped[key] && grouped[key].length > 0);
        return (
          <div className="modal-overlay" onClick={() => setStatusOverviewOpen(false)}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>{t('لوحة حالات الغرف', 'Room Status Board')}</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{selectedProperty.name} — {propUnits.length} {t('وحدة', 'units')}</p>
                </div>
                <button className="btn-ghost" onClick={() => setStatusOverviewOpen(false)}><X size={20} /></button>
              </div>

              {/* Summary counts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 20 }}>
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <div key={key} style={{ borderRadius: 12, padding: 12, background: meta.bg, border: `1px solid ${meta.color}25`, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: meta.color }}>{grouped[key]?.length || 0}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{statusLabel(key, t)}</div>
                  </div>
                ))}
              </div>

              {/* Grouped lists */}
              <div style={{ display: 'grid', gap: 16 }}>
                {sections.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>{t('لا توجد وحدات', 'No units')}</p>
                ) : sections.map(([key, meta]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color }} />
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>{statusLabel(key, t)}</h3>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>({grouped[key].length})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {grouped[key].map((u) => {
                        const active = activeBooking(u.id);
                        return (
                          <div key={u.id} onClick={() => { setDetailUnit(u as Unit & { property?: Property | null }); setStatusOverviewOpen(false); }} style={{ cursor: 'pointer', borderRadius: 10, padding: '10px 14px', background: meta.bg, border: `1px solid ${meta.color}30`, minWidth: 140, transition: 'all 0.2s' }} className="card-hover">
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{u.unit_number || '-'}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{roomTypeLabel(u.unit_type, t)}</div>
                            {active && <div style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>{active.customer?.name || '-'}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Departures Modal */}
      {departuresOpen && selectedProperty && (
        <div className="modal-overlay" onClick={() => setDeparturesOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>{t('مواعيد المغادرة', 'Departure Schedule')}</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{selectedProperty.name} — {departures.length} {t('مغادرة قادمة', 'upcoming departures')}</p>
              </div>
              <button className="btn-ghost" onClick={() => setDeparturesOpen(false)}><X size={20} /></button>
            </div>

            {departures.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                <CalendarClock size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p>{t('لا توجد مغادرات قادمة', 'No upcoming departures')}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {departures.map(({ booking: b, unit }) => {
                  const isToday = b.check_out === new Date().toISOString().slice(0, 10);
                  const isPast = b.check_out && b.check_out < new Date().toISOString().slice(0, 10);
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, background: isToday ? '#fffbeb' : isPast ? '#fef2f2' : '#f9fafb', border: `1px solid ${isToday ? '#fde68a' : isPast ? '#fecaca' : '#e5e7eb'}` }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: isToday ? '#fbbf24' : isPast ? '#ef4444' : 'var(--brand-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Clock size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{b.customer?.name || '-'}</span>
                          {isToday && <span style={{ background: '#fbbf24', color: '#fff', borderRadius: 6, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{t('اليوم', 'Today')}</span>}
                          {isPast && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 6, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{t('متأخر', 'Overdue')}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          {t('وحدة', 'Unit')} {unit?.unit_number || '-'} · {roomTypeLabel(unit?.unit_type || null, t)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: isToday ? '#92400e' : isPast ? '#dc2626' : '#374151' }}>{formatDeparture(b)}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{b.booking_status === 'checked_in' ? t('مقيم', 'Checked in') : t('مؤكد', 'Confirmed')}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailUnit && (
        <div className="modal-overlay" onClick={() => setDetailUnit(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>{t('وحدة', 'Unit')} {detailUnit.unit_number}</h2>
                <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{roomTypeLabel(detailUnit.unit_type, t)}</p>
              </div>
              <button className="btn-ghost" onClick={() => setDetailUnit(null)}><X size={20} /></button>
            </div>

            {(() => {
              const meta = STATUS_META[detailUnit.status || 'available'] || STATUS_META.available;
              const current = activeBooking(detailUnit.id);
              return (
                <div style={{ background: meta.bg, border: `1.5px solid ${meta.color}40`, borderRadius: 14, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: meta.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BedDouble size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{t('الحالة الحالية', 'Current Status')}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: meta.color }}>{statusLabel(detailUnit.status, t)}</div>
                    {current && (
                      <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                        {current.customer?.name || '-'} · {current.check_in} → {current.check_out}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <InfoBox label={t('العقار', 'Property')} value={detailUnit.property?.name || '-'} />
              <InfoBox label={t('الطابق', 'Floor')} value={String(detailUnit.floor ?? '-')} />
              <InfoBox label={t('السعة', 'Capacity')} value={`${detailUnit.capacity ?? 1} ${t('أشخاص', 'guests')}`} />
              <InfoBox label={t('السعر اليومي', 'Daily Rate')} value={`${Number(detailUnit.daily_rate ?? 0).toLocaleString()} ر.س`} />
              <InfoBox label={t('السعر الشهري', 'Monthly Rate')} value={`${Number(detailUnit.monthly_rate ?? 0).toLocaleString()} ر.س`} />
              <InfoBox label={t('حالة التنظيف', 'Cleaning Status')} value={detailUnit.cleaning_status || t('غير محدد', 'Not specified')} />
            </div>

            {detailUnit.notes && (
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{t('ملاحظات', 'Notes')}</div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{detailUnit.notes}</p>
              </div>
            )}

            <div>
              <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 15 }}>{t('حجوزات الوحدة', 'Unit Bookings')}</h3>
              {getUnitBookings(detailUnit.id).length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 14, padding: 12 }}>{t('لا توجد حجوزات', 'No bookings')}</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr><th className="table-th">{t('العميل', 'Guest')}</th><th className="table-th">{t('الوصول', 'Check-in')}</th><th className="table-th">{t('المغادرة', 'Check-out')}</th><th className="table-th">{t('المبلغ', 'Amount')}</th><th className="table-th">{t('الحالة', 'Status')}</th></tr>
                    </thead>
                    <tbody>
                      {getUnitBookings(detailUnit.id).slice(0, 10).map((b) => (
                        <tr key={b.id} className="table-row">
                          <td className="table-td">{b.customer?.name || '-'}</td>
                          <td className="table-td">{b.check_in || '-'}</td>
                          <td className="table-td">{b.check_out || '-'}</td>
                          <td className="table-td">{Number(b.total_amount ?? 0).toLocaleString()}</td>
                          <td className="table-td"><span className="badge-purple">{b.booking_status}</span></td>
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

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ textAlign: 'center', padding: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ef444415', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={26} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t('حذف الوحدة', 'Delete Unit')}</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>{t('هل أنت متأكد من حذف', 'Are you sure you want to delete')} «{deleteTarget.unit_number}»؟</p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setDeleteTarget(null)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-danger" onClick={deleteUnit}><Trash2 size={16} /> {t('حذف', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{editingId ? t('تعديل الوحدة', 'Edit Unit') : t('وحدة جديدة', 'New Unit')}</h2>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">{t('العقار', 'Property')}</label>
                <select className="input" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
                  <option value="">{t('اختر عقار', 'Select property')}</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name || t('بدون اسم', 'Unnamed')}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('رقم الوحدة', 'Unit Number')}</label>
                <input className="input" value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('نوع الوحدة', 'Unit Type')}</label>
                <select className="input" value={form.unit_type} onChange={(e) => setForm({ ...form, unit_type: e.target.value })}>
                  {ROOM_TYPES.map((rt) => <option key={rt} value={rt}>{roomTypeLabel(rt, t)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('الطابق', 'Floor')}</label>
                <input type="number" className="input" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('السعة', 'Capacity')}</label>
                <input type="number" className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('السعر اليومي', 'Daily Rate')}</label>
                <input type="number" className="input" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('السعر الشهري', 'Monthly Rate')}</label>
                <input type="number" className="input" value={form.monthly_rate} onChange={(e) => setForm({ ...form, monthly_rate: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('الحالة', 'Status')}</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {UNIT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s, t)}</option>)}
                </select>
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

function StatusPip({ label, count, color }: { label: string; count: number; color: string }): JSX.Element {
  return (
    <div style={{ flex: 1, background: '#f9fafb', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color }}>{count}</div>
      <div style={{ fontSize: 10, color: '#6b7280' }}>{label}</div>
    </div>
  );
}
