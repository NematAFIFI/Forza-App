import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  Bell,
  Clock,
  MessageCircle,
  Mail,
  Phone,
  AlertTriangle,
  CalendarClock,
  Send,
} from 'lucide-react';

interface NotificationItem {
  booking_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  unit_number: string;
  check_out: string;
  days_remaining: number;
  nights_stayed: number;
  urgency: 'today' | 'tomorrow' | 'soon';
  receptionist_phone: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  count: number;
  generated_at: string;
  error?: string;
}

type TFunc = (ar: string, en: string) => string;

const buildMessage = (n: NotificationItem, t: TFunc, lang: 'ar' | 'en'): string => {
  const dateStr = n.check_out
    ? new Date(n.check_out).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';
  return lang === 'ar'
    ? `عزيزي ${n.guest_name}، تنتهي إقامتك في ${n.unit_number} بتاريخ ${dateStr}. نتمنى لك رحلة سعيدة!`
    : `Dear ${n.guest_name}, your stay in ${n.unit_number} ends on ${dateStr}. We wish you a safe journey!`;
};

const buildSubject = (t: TFunc): string => t('تذكير بموعد مغادرة منشأتنا', 'Reminder: Departure from our property');

const buildUrgencyConfig = (t: TFunc) => ({
  today: {
    label: t('تنتهي اليوم', 'Ends Today'),
    badge: 'badge-red',
    border: 'border-red-500/40',
    bg: 'bg-red-500/5',
    text: 'text-red-300',
    icon: AlertTriangle,
  },
  tomorrow: {
    label: t('تنتهي غداً', 'Ends Tomorrow'),
    badge: 'badge-gold',
    border: 'border-[var(--brand-500)]/40',
    bg: 'bg-[var(--brand-500)]/5',
    text: 'text-[var(--brand-500)]',
    icon: Clock,
  },
  soon: {
    label: t('قريباً', 'Soon'),
    badge: 'badge-blue',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/5',
    text: 'text-blue-300',
    icon: CalendarClock,
  },
} as const);

export default function Notifications() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const urgencyConfig = buildUrgencyConfig(t);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Get the current user's session token for user-specific filtering
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stay-notifications`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        throw new Error(`${t('فشل الطلب', 'Request failed')} (${response.status})`);
      }
      const json: NotificationsResponse = await response.json();
      if (json.error) {
        throw new Error(json.error);
      }
      setItems(json.notifications || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('تعذر تحميل التنبيهات', 'Unable to load notifications');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const sendWhatsApp = (n: NotificationItem) => {
    const guestPhone = n.guest_phone?.replace(/[^0-9]/g, '');
    const receptionPhone = n.receptionist_phone?.replace(/[^0-9]/g, '');
    const guestMsg = encodeURIComponent(buildMessage(n, t, lang));
    const receptionMsg = encodeURIComponent(
      lang === 'ar'
        ? `تنبيه مغادرة — ${n.guest_name || 'نزيل'}\n` +
          `الوحدة: ${n.unit_number || '—'}\n` +
          `تاريخ المغادرة: ${n.check_out}\n` +
          `الليالي: ${n.nights_stayed}\n` +
          `هاتف النزيل: ${n.guest_phone || '—'}\n\n` +
          `يرجى التواصل مع النزيل وتنسيق إجراءات المغادرة.`
        : `Departure alert — ${n.guest_name || 'Guest'}\n` +
          `Unit: ${n.unit_number || '—'}\n` +
          `Check-out date: ${n.check_out}\n` +
          `Nights: ${n.nights_stayed}\n` +
          `Guest phone: ${n.guest_phone || '—'}\n\n` +
          `Please contact the guest and coordinate departure procedures.`
    );

    // Open WhatsApp for the guest first
    if (guestPhone) {
      window.open(`https://wa.me/${guestPhone}?text=${guestMsg}`, '_blank', 'noopener,noreferrer');
    }
    // Then open WhatsApp for the receptionist after a short delay
    if (receptionPhone) {
      setTimeout(() => {
        window.open(`https://wa.me/${receptionPhone}?text=${receptionMsg}`, '_blank', 'noopener,noreferrer');
      }, 800);
    }
  };

  const sendSMS = (n: NotificationItem) => {
    const phone = n.guest_phone;
    const body = encodeURIComponent(buildMessage(n, t, lang));
    window.location.href = `sms:${phone}?body=${body}`;
  };

  const sendEmail = (n: NotificationItem) => {
    const subject = encodeURIComponent(buildSubject(t));
    const body = encodeURIComponent(buildMessage(n, t, lang));
    window.location.href = `mailto:${n.guest_email}?subject=${subject}&body=${body}`;
  };

  const formatDate = (d: string): string => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const todayCount = items.filter((i) => i.urgency === 'today').length;
  const tomorrowCount = items.filter((i) => i.urgency === 'tomorrow').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Bell size={28} className="text-[var(--brand-500)]" />
            <span>{t('تنبيهات الإقامة', 'Stay Alerts')}</span>
          </h1>
          <p className="page-subtitle">
            {t('حجوزات تنتهي قريباً — تابع وأرسل تذكيرات للنزلاء', 'Bookings ending soon — track and send reminders to guests')}
          </p>
        </div>
        <button className="btn-outline inline-flex items-center gap-2" onClick={loadNotifications}>
          <Send size={18} />
          <span>{t('تحديث', 'Refresh')}</span>
        </button>
      </div>

      {/* Summary stats */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                <AlertTriangle size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-zinc-100">{todayCount}</div>
                <div className="text-xs text-zinc-500">{t('تنتهي اليوم', 'Ends Today')}</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-500)]/15 text-[var(--brand-500)]">
                <Clock size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-zinc-100">{tomorrowCount}</div>
                <div className="text-xs text-zinc-500">{t('تنتهي غداً', 'Ends Tomorrow')}</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-500)]/15 text-[var(--brand-500)]">
                <Bell size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-zinc-100">{items.length}</div>
                <div className="text-xs text-zinc-500">{t('إجمالي التنبيهات', 'Total Alerts')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receptionist notice */}
      {!loading && !error && items.length > 0 && (
        <div className="card flex items-start gap-3 border-r-4 border-r-[var(--brand-500)] p-4">
          <Bell size={20} className="mt-0.5 flex-shrink-0 text-[var(--brand-500)]" />
          <div className="text-sm text-zinc-300">
            <span className="font-semibold text-[var(--brand-500)]">{t('تنبيه للاستقبال: ', 'Reception notice: ')}</span>
            {t(
              `يوجد ${items.length} حجز ينتهي قريباً. يرجى التواصل مع النزلاء وتذكيرهم بموعد المغادرة وتنسيق إجراءات الخروج.`,
              `There are ${items.length} bookings ending soon. Please contact the guests and remind them of the departure date and coordinate check-out procedures.`
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="card p-12 text-center text-zinc-400">{t('جارٍ تحميل التنبيهات...', 'Loading notifications...')}</div>
      ) : !error && items.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell size={48} className="mx-auto mb-4 text-zinc-500" />
          <p className="text-lg text-zinc-300">{t('لا توجد تنبيهات حالياً', 'No alerts at this time')}</p>
          <p className="mt-2 text-sm text-zinc-500">
            {t('لا توجد حجوزات تنتهي اليوم أو غداً', 'No bookings ending today or tomorrow')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((n) => {
            const cfg = urgencyConfig[n.urgency];
            const Icon = cfg.icon;
            return (
              <div
                key={n.booking_id}
                className={`card overflow-hidden border-r-4 ${cfg.border} ${cfg.bg}`}
              >
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  {/* Left: guest info */}
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cfg.bg} ${cfg.text}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-zinc-100">
                          {n.guest_name || t('نزيل', 'Guest')}
                        </h3>
                        <span className={cfg.badge}>{cfg.label}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock size={14} />
                          {t('الوحدة', 'Unit')}: <span className="text-zinc-200">{n.unit_number || '—'}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} />
                          {t('المغادرة', 'Check-out')}: <span className="text-zinc-200">{formatDate(n.check_out)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Bell size={14} />
                          {t('الليالي', 'Nights')}: <span className="text-zinc-200">{n.nights_stayed}</span>
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                        {n.guest_phone && (
                          <span className="inline-flex items-center gap-1" dir="ltr">
                            <Phone size={12} /> {n.guest_phone}
                          </span>
                        )}
                        {n.guest_email && (
                          <span className="inline-flex items-center gap-1" dir="ltr">
                            <Mail size={12} /> {n.guest_email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {n.guest_phone && (
                      <>
                        <button
                          className="btn-outline inline-flex items-center gap-1.5 text-sm"
                          onClick={() => sendWhatsApp(n)}
                          title={t('إرسال عبر واتساب', 'Send via WhatsApp')}
                        >
                          <MessageCircle size={16} className="text-[var(--brand-500)]" />
                          <span>{t('واتساب', 'WhatsApp')}</span>
                        </button>
                        <button
                          className="btn-outline inline-flex items-center gap-1.5 text-sm"
                          onClick={() => sendSMS(n)}
                          title={t('إرسال رسالة SMS', 'Send SMS')}
                        >
                          <Phone size={16} />
                          <span>SMS</span>
                        </button>
                      </>
                    )}
                    {n.guest_email && (
                      <button
                        className="btn-outline inline-flex items-center gap-1.5 text-sm"
                        onClick={() => sendEmail(n)}
                        title={t('إرسال بريد إلكتروني', 'Send email')}
                      >
                        <Mail size={16} />
                        <span>{t('بريد', 'Email')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Message preview */}
                <div className="border-t border-white/5 bg-zinc-900/40 px-5 py-3">
                  <div className="mb-1 text-xs text-zinc-500">{t('نص الرسالة:', 'Message text:')}</div>
                  <p className="text-sm leading-relaxed text-zinc-300" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    {buildMessage(n, t, lang)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
