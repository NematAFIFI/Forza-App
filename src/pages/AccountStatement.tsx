import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  BookOpen, Search, Printer, Loader2, FileText, ChevronDown, ChevronLeft,
} from 'lucide-react';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface JournalLine {
  id: string;
  entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  line_order: number;
  journal_entries: {
    entry_number: string;
    entry_date: string;
    description: string | null;
    status: string;
  } | null;
}

const TYPE_LABEL: Record<string, { ar: string; en: string; color: string }> = {
  asset: { ar: 'أصول', en: 'Assets', color: 'var(--brand-500)' },
  liability: { ar: 'خصوم', en: 'Liabilities', color: '#ef4444' },
  equity: { ar: 'حقوق ملكية', en: 'Equity', color: 'var(--brand-500)' },
  revenue: { ar: 'إيرادات', en: 'Revenue', color: 'var(--brand-500)' },
  direct_cost: { ar: 'تكاليف مباشرة', en: 'Direct Costs', color: '#f59e0b' },
  operating_expense: { ar: 'مصروفات تشغيلية', en: 'Operating Expenses', color: 'var(--brand-500)' },
  admin_expense: { ar: 'مصروفات إدارية', en: 'Admin Expenses', color: '#8b5cf6' },
  other: { ar: 'أخرى', en: 'Other', color: '#6b7280' },
};

const fmtMoney = (n: number): string => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d: string | null, lang: 'ar' | 'en'): string => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
};

export default function AccountStatement() {
  const { t, lang } = useLanguage();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [lines, setLines] = useState<JournalLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [showAccountList, setShowAccountList] = useState(false);

  const loadAccounts = useCallback(async () => {
    const { data } = await supabase
      .from('chart_accounts')
      .select('id, account_code, account_name, account_type, is_active')
      .eq('is_active', true)
      .order('account_code', { ascending: true });
    setAccounts((data as Account[]) || []);
  }, []);

  const loadLines = useCallback(async () => {
    if (!selectedAccount) { setLines([]); setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from('journal_lines')
      .select(`
        id, entry_id, account_id, debit, credit, description, line_order,
        journal_entries(entry_number, entry_date, description, status)
      `)
      .eq('account_id', selectedAccount)
      .order('created_at', { ascending: true });

    if (fromDate) query = query.gte('journal_entries.entry_date', fromDate);
    if (toDate) query = query.lte('journal_entries.entry_date', toDate);

    const { data } = await query;
    setLines((data as unknown as JournalLine[]) || []);
    setLoading(false);
  }, [selectedAccount, fromDate, toDate]);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);
  useEffect(() => { void loadLines(); }, [loadLines]);

  const selectedAcc = accounts.find((a) => a.id === selectedAccount);
  const typeMeta = selectedAcc ? (TYPE_LABEL[selectedAcc.account_type] || TYPE_LABEL.other) : null;

  const filteredLines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter((l) => {
      const entryDesc = l.journal_entries?.description || '';
      const lineDesc = l.description || '';
      const entryNum = l.journal_entries?.entry_number || '';
      return entryDesc.toLowerCase().includes(q) || lineDesc.toLowerCase().includes(q) || entryNum.toLowerCase().includes(q);
    });
  }, [lines, search]);

  const totals = useMemo(() => {
    let debit = 0, credit = 0;
    for (const l of filteredLines) { debit += l.debit || 0; credit += l.credit || 0; }
    return { debit, credit, balance: debit - credit };
  }, [filteredLines]);

  const runningBalance = useMemo(() => {
    let bal = 0;
    return filteredLines.map((l) => {
      bal += (l.debit || 0) - (l.credit || 0);
      return { ...l, runningBalance: bal };
    });
  }, [filteredLines]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => a.account_code.toLowerCase().includes(q) || a.account_name.toLowerCase().includes(q));
  }, [accounts, accountSearch]);

  const handlePrint = () => window.print();

  return (
    <div className="printable">
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">{t('كشف حساب', 'Account Statement')}</h1>
          <p className="page-subtitle">{t('كشف حركة جميع الحسابات مع الأرصدة الجارية', 'Ledger statement for all accounts with running balances')}</p>
        </div>
        <button className="btn-primary" onClick={handlePrint} disabled={!selectedAccount}>
          <Printer size={18} /> {t('طباعة', 'Print')}
        </button>
      </div>

      {/* Account selector + filters */}
      <div className="card no-print" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Account dropdown */}
          <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6, display: 'block' }}>
              {t('اختر الحساب', 'Select Account')}
            </label>
            <button
              onClick={() => setShowAccountList(!showAccountList)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 14, fontWeight: 600,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedAcc ? (
                  <>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: typeMeta?.color }}>{selectedAcc.account_code}</span>
                    <span>{selectedAcc.account_name}</span>
                  </>
                ) : (
                  <span style={{ color: '#9ca3af' }}>{t('اختر حساباً...', 'Choose an account...')}</span>
                )}
              </span>
              {showAccountList ? <ChevronDown size={18} color="#9ca3af" /> : <ChevronLeft size={18} color="#9ca3af" style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />}
            </button>
            {showAccountList && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowAccountList(false)} />
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
                  background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  maxHeight: 360, overflowY: 'auto',
                }}>
                  <div style={{ padding: 12, borderBottom: '1px solid #f3f4f6', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      className="input" placeholder={t('ابحث عن حساب...', 'Search account...')}
                      value={accountSearch} onChange={(e) => setAccountSearch(e.target.value)}
                      style={{ paddingRight: 36 }}
                      autoFocus
                    />
                  </div>
                  {filteredAccounts.map((a) => {
                    const meta = TYPE_LABEL[a.account_type] || TYPE_LABEL.other;
                    return (
                      <button
                        key={a.id}
                        onClick={() => { setSelectedAccount(a.id); setShowAccountList(false); setAccountSearch(''); }}
                        style={{
                          width: '100%', padding: '10px 14px', border: 'none', background: selectedAccount === a.id ? 'rgba(var(--brand-rgb),0.06)' : '#fff',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: lang === 'ar' ? 'right' : 'left',
                          borderBottom: '1px solid #f9fafb',
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: meta.color, minWidth: 50 }}>{a.account_code}</span>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{a.account_name}</span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: meta.color + '15', color: meta.color, fontWeight: 600 }}>
                          {t(meta.ar, meta.en)}
                        </span>
                      </button>
                    );
                  })}
                  {filteredAccounts.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#9ca3af', padding: 24, fontSize: 13 }}>{t('لا توجد حسابات', 'No accounts found')}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* From date */}
          <div style={{ minWidth: 150 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6, display: 'block' }}>{t('من تاريخ', 'From Date')}</label>
            <input type="date" className="input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          {/* To date */}
          <div style={{ minWidth: 150 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6, display: 'block' }}>{t('إلى تاريخ', 'To Date')}</label>
            <input type="date" className="input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        {/* Search within results */}
        {selectedAccount && (
          <div style={{ marginTop: 16, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input className="input" placeholder={t('ابحث برقم القيد أو الوصف...', 'Search by entry number or description...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
          </div>
        )}
      </div>

      {/* Print header (only visible when printing) */}
      <div style={{ display: 'none' }} className="print-only">
        <h2 style={{ textAlign: 'center', marginBottom: 4 }}>{t('كشف حساب', 'Account Statement')}</h2>
        {selectedAcc && (
          <p style={{ textAlign: 'center', color: '#6b7280' }}>
            {selectedAcc.account_code} — {selectedAcc.account_name}
          </p>
        )}
      </div>

      {/* Statement */}
      {!selectedAccount ? (
        <div className="card" style={{ textAlign: 'center', padding: 64 }}>
          <BookOpen size={56} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ color: '#6b7280', fontSize: 15 }}>{t('اختر حساباً لعرض كشف الحركة', 'Select an account to view its statement')}</p>
        </div>
      ) : loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#6b7280' }}>{t('جارٍ التحميل...', 'Loading...')}</p>
        </div>
      ) : (
        <>
          {/* Account info card */}
          <div className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: (typeMeta?.color || 'var(--brand-500)') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={22} color={typeMeta?.color || 'var(--brand-500)'} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  <span style={{ fontFamily: 'monospace', color: typeMeta?.color }}>{selectedAcc?.account_code}</span>
                  {' — '}
                  {selectedAcc?.account_name}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  {t(typeMeta?.ar || 'أخرى', typeMeta?.en || 'Other')}
                  {fromDate && ` · ${t('من', 'From')} ${formatDate(fromDate, lang)}`}
                  {toDate && ` · ${t('إلى', 'To')} ${formatDate(toDate, lang)}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{t('إجمالي المدين', 'Total Debit')}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand-500)' }}>{fmtMoney(totals.debit)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{t('إجمالي الدائن', 'Total Credit')}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>{fmtMoney(totals.credit)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{t('الرصيد', 'Balance')}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: totals.balance >= 0 ? 'var(--brand-500)' : '#ef4444' }}>{fmtMoney(totals.balance)}</div>
              </div>
            </div>
          </div>

          {/* Ledger table */}
          <div className="card" style={{ padding: 16 }}>
            {runningBalance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
                <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>{t('لا توجد حركات لهذا الحساب في الفترة المحددة', 'No transactions for this account in the selected period')}</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(var(--brand-rgb),0.04)' }}>
                      <th className="table-th">{t('التاريخ', 'Date')}</th>
                      <th className="table-th">{t('رقم القيد', 'Entry No.')}</th>
                      <th className="table-th">{t('البيان', 'Description')}</th>
                      <th className="table-th" style={{ textAlign: 'center' }}>{t('مدين', 'Debit')}</th>
                      <th className="table-th" style={{ textAlign: 'center' }}>{t('دائن', 'Credit')}</th>
                      <th className="table-th" style={{ textAlign: 'center' }}>{t('الرصيد', 'Balance')}</th>
                      <th className="table-th" style={{ textAlign: 'center' }}>{t('الحالة', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runningBalance.map((l, idx) => {
                      const entry = l.journal_entries;
                      const desc = l.description || entry?.description || '-';
                      return (
                        <tr key={l.id} className="table-row" style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td className="table-td" style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{formatDate(entry?.entry_date || null, lang)}</td>
                          <td className="table-td" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--brand-500)' }}>{entry?.entry_number || '-'}</td>
                          <td className="table-td" style={{ fontSize: 13 }}>
                            {desc}
                            {idx === 0 && <span style={{ fontSize: 10, color: '#9ca3af', marginRight: 6 }}> · {t('افتتاحي', 'Opening')}</span>}
                          </td>
                          <td className="table-td" style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-500)' }}>
                            {l.debit ? fmtMoney(l.debit) : '—'}
                          </td>
                          <td className="table-td" style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: '#ef4444' }}>
                            {l.credit ? fmtMoney(l.credit) : '—'}
                          </td>
                          <td className="table-td" style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: l.runningBalance >= 0 ? 'var(--brand-500)' : '#ef4444' }}>
                            {fmtMoney(l.runningBalance)}
                          </td>
                          <td className="table-td" style={{ textAlign: 'center' }}>
                            <span style={{
                              fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                              background: entry?.status === 'posted' ? 'rgba(var(--brand-rgb),0.1)' : '#f3f4f6',
                              color: entry?.status === 'posted' ? 'var(--brand-500)' : '#9ca3af',
                            }}>
                              {entry?.status === 'posted' ? t('مرحّل', 'Posted') : t('مسودة', 'Draft')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'rgba(var(--brand-rgb),0.06)', fontWeight: 800 }}>
                      <td className="table-td" colSpan={3} style={{ textAlign: lang === 'ar' ? 'left' : 'right', fontWeight: 800, fontSize: 14 }}>
                        {t('الإجمالي', 'Total')}
                      </td>
                      <td className="table-td" style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: 'var(--brand-500)', fontSize: 14 }}>{fmtMoney(totals.debit)}</td>
                      <td className="table-td" style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#ef4444', fontSize: 14 }}>{fmtMoney(totals.credit)}</td>
                      <td className="table-td" style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, fontSize: 14 }}>{fmtMoney(totals.balance)}</td>
                      <td className="table-td"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <p style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: '#9ca3af' }}>
            {t('عدد الحركات', 'Transaction count')}: {runningBalance.length}
          </p>
        </>
      )}
    </div>
  );
}
