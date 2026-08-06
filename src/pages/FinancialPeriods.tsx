import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  CalendarClock,
  Lock,
  Unlock,
  Plus,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface FiscalPeriod {
  id: string;
  period_code: string;
  period_name: string | null;
  fiscal_year: number;
  period_number: number;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed_daily' | 'closed_monthly' | 'locked';
  lock_date: string | null;
  closed_by: string | null;
  closed_at: string | null;
}

const STATUS_META: Record<string, { ar: string; en: string; color: string; bg: string; icon: typeof Lock }> = {
  open: { ar: 'مفتوحة', en: 'Open', color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)', icon: Unlock },
  closed_daily: { ar: 'إغلاق يومي', en: 'Daily Closed', color: '#f59e0b', bg: '#f59e0b15', icon: CalendarClock },
  closed_monthly: { ar: 'إغلاق شهري', en: 'Monthly Closed', color: '#ef4444', bg: '#ef444415', icon: Lock },
  locked: { ar: 'مقفلة نهائياً', en: 'Locked', color: '#991b1b', bg: '#991b1b15', icon: Lock },
};

export default function FinancialPeriods() {
  const { t, lang } = useLanguage();
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [yearInput, setYearInput] = useState(new Date().getFullYear());
  const [showYearModal, setShowYearModal] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ period: FiscalPeriod; type: string } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('fiscal_periods')
      .select('*')
      .order('period_code', { ascending: true });
    if (err) setError(err.message);
    setPeriods((data as FiscalPeriod[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generateYear = async () => {
    setGenerating(true);
    setError('');
    try {
      const { error: rpcErr } = await supabase.rpc('generate_fiscal_year', { p_year: yearInput });
      if (rpcErr) throw rpcErr;
      setShowYearModal(false);
      await load();
      setSuccess(t('تم إنشاء فترات السنة المالية', 'Fiscal year periods generated'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر الإنشاء', 'Unable to generate'));
    } finally {
      setGenerating(false);
    }
  };

  const doAction = async () => {
    if (!actionTarget) return;
    setError('');
    try {
      const { error: rpcErr } = await supabase.rpc('close_fiscal_period', {
        p_period_id: actionTarget.period.id,
        p_close_type: actionTarget.type,
      });
      if (rpcErr) throw rpcErr;
      setActionTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر التنفيذ', 'Action failed'));
    }
  };

  const grouped = periods.reduce((acc, p) => {
    (acc[p.fiscal_year] = acc[p.fiscal_year] || []).push(p);
    return acc;
  }, {} as Record<number, FiscalPeriod[]>);

  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('الفترات المالية والإغلاق', 'Financial Periods & Closing')}</h1>
          <p className="page-subtitle">
            {t('إدارة السنة المالية والإغلاق اليومي والشهري وحماية البيانات', 'Manage fiscal year, daily/monthly closing, and data protection')}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowYearModal(true)}>
          <Plus size={18} /> {t('إنشاء سنة مالية', 'Generate Fiscal Year')}
        </button>
      </div>

      {success && (
        <div className="card" style={{ marginBottom: 16, padding: 14, borderColor: 'var(--brand-500)', background: 'rgba(var(--brand-rgb),0.06)' }}>
          <p style={{ color: 'var(--brand-500)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} /> {success}
          </p>
        </div>
      )}
      {error && (
        <div className="card" style={{ marginBottom: 16, padding: 14, borderColor: '#ef4444', background: '#fef2f2' }}>
          <p style={{ color: '#dc2626', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} /> {error}
          </p>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
          {t('جارٍ التحميل...', 'Loading...')}
        </div>
      ) : periods.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
          <CalendarClock size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>{t('لا توجد فترات مالية بعد', 'No fiscal periods yet')}</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            {t('أنشئ سنة مالية جديدة لبدء التتبع المحاسبي', 'Generate a fiscal year to start accounting')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {years.map((year) => (
            <div key={year}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#1a2535' }}>
                {t('السنة المالية', 'Fiscal Year')} {year}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {grouped[year].map((p) => {
                  const meta = STATUS_META[p.status];
                  const StatusIcon = meta.icon;
                  return (
                    <div key={p.id} className="card" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{p.period_name || p.period_code}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, direction: 'ltr' }}>
                            {p.start_date} → {p.end_date}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            borderRadius: 20,
                            color: meta.color,
                            background: meta.bg,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <StatusIcon size={12} /> {t(meta.ar, meta.en)}
                        </span>
                      </div>

                      {p.lock_date && (
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
                          {t('مقفلة حتى', 'Locked until')}: <span dir="ltr">{p.lock_date}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {p.status === 'open' && (
                          <>
                            <button
                              className="btn-outline"
                              style={{ fontSize: 12, padding: '6px 12px' }}
                              onClick={() => setActionTarget({ period: p, type: 'daily' })}
                            >
                              <CalendarClock size={14} /> {t('إغلاق يومي', 'Daily Close')}
                            </button>
                            <button
                              className="btn-outline"
                              style={{ fontSize: 12, padding: '6px 12px', borderColor: '#ef4444', color: '#ef4444' }}
                              onClick={() => setActionTarget({ period: p, type: 'monthly' })}
                            >
                              <Lock size={14} /> {t('إغلاق شهري', 'Monthly Close')}
                            </button>
                          </>
                        )}
                        {p.status === 'closed_daily' && (
                          <>
                            <button
                              className="btn-outline"
                              style={{ fontSize: 12, padding: '6px 12px', borderColor: '#ef4444', color: '#ef4444' }}
                              onClick={() => setActionTarget({ period: p, type: 'monthly' })}
                            >
                              <Lock size={14} /> {t('إغلاق شهري', 'Monthly Close')}
                            </button>
                            <button
                              className="btn-outline"
                              style={{ fontSize: 12, padding: '6px 12px' }}
                              onClick={() => setActionTarget({ period: p, type: 'reopen' })}
                            >
                              <Unlock size={14} /> {t('إعادة فتح', 'Reopen')}
                            </button>
                          </>
                        )}
                        {(p.status === 'closed_monthly' || p.status === 'locked') && (
                          <button
                            className="btn-outline"
                            style={{ fontSize: 12, padding: '6px 12px', color: 'var(--brand-500)', borderColor: 'var(--brand-500)' }}
                            onClick={() => setActionTarget({ period: p, type: 'reopen' })}
                          >
                            <Unlock size={14} /> {t('إعادة فتح (مدير مالي)', 'Reopen (Finance Mgr)')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate year modal */}
      {showYearModal && (
        <div className="modal-overlay" onClick={() => setShowYearModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('إنشاء سنة مالية', 'Generate Fiscal Year')}</h2>
              <button className="btn-ghost" onClick={() => setShowYearModal(false)}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
              {t('سيتم إنشاء 12 فترة شهرية تلقائياً للسنة المحددة', 'This will create 12 monthly periods for the selected year')}
            </p>
            <div>
              <label className="label">{t('السنة المالية', 'Fiscal Year')}</label>
              <input
                className="input"
                type="number"
                value={yearInput}
                onChange={(e) => setYearInput(parseInt(e.target.value) || new Date().getFullYear())}
                dir="ltr"
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setShowYearModal(false)}>
                {t('إلغاء', 'Cancel')}
              </button>
              <button className="btn-primary" onClick={generateYear} disabled={generating}>
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {t('إنشاء', 'Generate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm action modal */}
      {actionTarget && (
        <div className="modal-overlay" onClick={() => setActionTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center', padding: 8 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: actionTarget.type === 'reopen' ? 'rgba(var(--brand-rgb),0.08)' : '#ef444415',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                {actionTarget.type === 'reopen' ? <Unlock size={26} color="var(--brand-500)" /> : <Lock size={26} color="#ef4444" />}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                {actionTarget.type === 'reopen'
                  ? t('إعادة فتح الفترة', 'Reopen Period')
                  : t('تأكيد الإغلاق', 'Confirm Closing')}
              </h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                {actionTarget.type === 'reopen'
                  ? t('سيتم إعادة فتح الفترة للتعديل. هذه عملية حساسة.', 'This period will be reopened for editing. This is a sensitive action.')
                  : t('سيتم قفل الفترة', 'This period will be locked')} «{actionTarget.period.period_name || actionTarget.period.period_code}».
                {actionTarget.type !== 'daily' && actionTarget.type !== 'reopen' && t(' لن يمكن التعديل بعد الإغلاق.', ' No edits will be allowed after closing.')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setActionTarget(null)}>
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                className={actionTarget.type === 'reopen' ? 'btn-primary' : 'btn-danger'}
                onClick={doAction}
              >
                {actionTarget.type === 'reopen' ? <Unlock size={16} /> : <Lock size={16} />}
                {t('تأكيد', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
