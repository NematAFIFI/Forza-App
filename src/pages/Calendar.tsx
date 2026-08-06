import { useState, useEffect, useMemo } from 'react';
import { supabase, type Booking, type Unit } from '../lib/supabase';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

type TFunc = (ar: string, en: string) => string;

const getMonthNames = (t: TFunc): string[] => [
  t('يناير', 'January'), t('فبراير', 'February'), t('مارس', 'March'),
  t('أبريل', 'April'), t('مايو', 'May'), t('يونيو', 'June'),
  t('يوليو', 'July'), t('أغسطس', 'August'), t('سبتمبر', 'September'),
  t('أكتوبر', 'October'), t('نوفمبر', 'November'), t('ديسمبر', 'December'),
];

const getDayNames = (t: TFunc): string[] => [
  t('الأحد', 'Sunday'), t('الاثنين', 'Monday'), t('الثلاثاء', 'Tuesday'),
  t('الأربعاء', 'Wednesday'), t('الخميس', 'Thursday'), t('الجمعة', 'Friday'),
  t('السبت', 'Saturday'),
];

const statusColor = (s: string | null): string => {
  switch (s) {
    case 'confirmed': return 'var(--brand-500)';
    case 'checked_in': return '#3b82f6';
    case 'pending': return 'var(--brand-500)';
    case 'checked_out': return '#9ca3af';
    case 'cancelled': return '#ef4444';
    default: return '#9ca3af';
  }
};

export default function CalendarView() {
  const { t, lang } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState<{ unitId: string; date: string } | null>(null);
  const [cellBookings, setCellBookings] = useState<Booking[]>([]);

  const monthNames = useMemo(() => getMonthNames(t), [t]);
  const dayNames = useMemo(() => getDayNames(t), [t]);

  const load = async (): Promise<void> => {
    setLoading(true);
    const [bRes, uRes] = await Promise.all([
      supabase.from('bookings').select('*, unit:units(*)'),
      supabase.from('units').select('*').order('unit_number', { ascending: true }),
    ]);
    if (bRes.data) setBookings(bRes.data as unknown as Booking[]);
    if (uRes.data) setUnits(uRes.data as Unit[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const dateStr = (day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getBookingForCell = (unitId: string, day: number): Booking | undefined => {
    const ds = dateStr(day);
    return bookings.find((b) => b.unit_id === unitId && b.check_in && b.check_out && ds >= b.check_in && ds < b.check_out && b.booking_status !== 'cancelled');
  };

  const prevMonth = (): void => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = (): void => setCurrentDate(new Date(year, month + 1, 1));

  const openCell = async (unitId: string, day: number): Promise<void> => {
    const ds = dateStr(day);
    const cellBs = bookings.filter((b) => b.unit_id === unitId && b.check_in && b.check_out && ds >= b.check_in && ds < b.check_out);
    setSelectedCell({ unitId, date: ds });
    setCellBookings(cellBs);
  };

  if (loading) {
    return <div className="card" style={{ textAlign: 'center', padding: 48 }}>{t('جارٍ التحميل...', 'Loading...')}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('التقويم', 'Calendar')}</h1>
          <p className="page-subtitle">{t('عرض حجوزات الوحدات شهرياً', 'View unit bookings monthly')}</p>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Calendar size={24} color="var(--brand-500)" />
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{monthNames[month]} {year}</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-outline" onClick={prevMonth}><ChevronRight size={18} /></button>
            <button className="btn-outline" onClick={nextMonth}><ChevronLeft size={18} /></button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                <th className="table-th" style={{ position: 'sticky', right: 0, background: '#fff', zIndex: 1, minWidth: 100 }}>{t('الوحدة', 'Unit')}</th>
                {days.map((d) => {
                  const dayName = dayNames[new Date(year, month, d).getDay()];
                  return <th key={d} className="table-th" style={{ minWidth: 40, fontSize: 11, textAlign: 'center' }}>{d}<br /><span style={{ fontSize: 9, color: '#9ca3af' }}>{dayName.slice(0, 3)}</span></th>;
                })}
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="table-row">
                  <td className="table-td" style={{ position: 'sticky', right: 0, background: '#fff', zIndex: 1, fontWeight: 600 }}>{u.unit_number}</td>
                  {days.map((d) => {
                    const b = getBookingForCell(u.id, d);
                    return (
                      <td key={d} className="table-td" style={{ textAlign: 'center', padding: 4, cursor: 'pointer', minWidth: 40 }} onClick={() => openCell(u.id, d)}>
                        {b && <div style={{ width: 24, height: 24, borderRadius: 4, background: statusColor(b.booking_status), margin: '0 auto' }} title={b.customer?.name || ''} />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--brand-500)' }} /> {t('مؤكد', 'Confirmed')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: '#3b82f6' }} /> {t('نشط', 'Active')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--brand-500)' }} /> {t('قيد الانتظار', 'Pending')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: '#9ca3af' }} /> {t('مكتمل', 'Completed')}</span>
        </div>
      </div>

      {selectedCell && (
        <div className="modal-overlay" onClick={() => setSelectedCell(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('تفاصيل الحجز', 'Booking Details')} — {selectedCell.date}</h2>
              <button className="btn-ghost" onClick={() => setSelectedCell(null)}>✕</button>
            </div>
            {cellBookings.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>{t('لا توجد حجوزات في هذا اليوم', 'No bookings on this day')}</p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {cellBookings.map((b) => (
                  <div key={b.id} className="card" style={{ padding: 16, borderRight: `4px solid ${statusColor(b.booking_status)}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>{b.customer?.name || t('عميل', 'Customer')}</span>
                      <span className="badge-gray">{b.booking_status}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{t('الوصول', 'Check-in')}: {b.check_in} | {t('المغادرة', 'Check-out')}: {b.check_out}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{t('الليالي', 'Nights')}: {b.num_nights} | {t('المبلغ', 'Amount')}: {b.total_amount}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
