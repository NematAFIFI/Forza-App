import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  Scale,
  FileBarChart,
  Wallet,
  BookOpen,
  Printer,
  Loader2,
  Search,
  ChevronDown,
  Building2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

type ReportType = 'trial_balance' | 'income_statement' | 'balance_sheet' | 'account_statement';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_name_en: string | null;
  account_type: string;
  category_code: string | null;
}

interface AccountBalance {
  account: Account;
  total_debit: number;
  total_credit: number;
  balance: number;
}

interface AccountMove {
  entry_number: string | null;
  entry_date: string;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
}

interface CompanySettings {
  company_name: string | null;
  legal_name: string | null;
  vat_number: string | null;
}

const fmtMoney = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string, lang: 'ar' | 'en'): string => {
  try {
    return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d;
  }
};

const REPORT_META: Record<ReportType, { ar: string; en: string; icon: typeof Scale; color: string }> = {
  trial_balance: { ar: 'ميزان المراجعة', en: 'Trial Balance', icon: Scale, color: 'var(--brand-500)' },
  income_statement: { ar: 'قائمة الدخل', en: 'Income Statement', icon: FileBarChart, color: '#0ea5e9' },
  balance_sheet: { ar: 'الميزانية العمومية', en: 'Balance Sheet', icon: Wallet, color: '#0891b2' },
  account_statement: { ar: 'كشف حساب', en: 'Account Statement', icon: BookOpen, color: '#f59e0b' },
};

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  asset: { ar: 'أصول', en: 'Assets' },
  liability: { ar: 'خصوم', en: 'Liabilities' },
  equity: { ar: 'حقوق ملكية', en: 'Equity' },
  revenue: { ar: 'إيرادات', en: 'Revenue' },
  direct_cost: { ar: 'تكاليف مباشرة', en: 'Direct Costs' },
  operating_expense: { ar: 'مصروفات تشغيلية', en: 'Operating Expenses' },
  admin_expense: { ar: 'مصروفات إدارية', en: 'Admin Expenses' },
  other: { ar: 'أخرى', en: 'Other' },
};

export default function FinancialReports() {
  const { t, lang } = useLanguage();
  const [reportType, setReportType] = useState<ReportType>('trial_balance');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [moves, setMoves] = useState<AccountMove[]>([]);
  const [runningBalance, setRunningBalance] = useState(0);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    const [accRes, coRes] = await Promise.all([
      supabase.from('chart_accounts').select('*').order('account_code', { ascending: true }),
      supabase.from('company_settings').select('company_name, legal_name, vat_number').limit(1).maybeSingle(),
    ]);
    if (accRes.error) setError(accRes.error.message);
    setAccounts((accRes.data as Account[]) || []);
    setCompany((coRes.data as CompanySettings) || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const loadReport = useCallback(async () => {
    setError('');
    if (reportType === 'account_statement') {
      if (!selectedAccountId) {
        setError(t('الرجاء اختيار حساب', 'Please select an account'));
        return;
      }
      setLoading(true);
      let query = supabase
        .from('journal_lines')
        .select(
          'debit, credit, description, journal_entries!inner(entry_number, entry_date, description, status)',
        )
        .eq('account_id', selectedAccountId)
        .eq('journal_entries.status', 'posted')
        .order('journal_entries.entry_date', { ascending: true });

      if (fromDate) query = query.gte('journal_entries.entry_date', fromDate);
      if (toDate) query = query.lte('journal_entries.entry_date', toDate);

      const { data, error: qErr } = await query;
      if (qErr) {
        setError(qErr.message);
        setLoading(false);
        return;
      }
      const rows = (data as any[]) || [];
      const account = accounts.find((a) => a.id === selectedAccountId);
      let bal = 0;
      if (account && (account.account_type === 'asset' || account.account_type === 'direct_cost' || account.account_type === 'operating_expense' || account.account_type === 'admin_expense')) {
        bal = 0;
      }
      const moveList: AccountMove[] = rows.map((r) => {
        const d = Number(r.debit) || 0;
        const c = Number(r.credit) || 0;
        const isDebitNormal = account && ['asset', 'direct_cost', 'operating_expense', 'admin_expense'].includes(account.account_type);
        if (isDebitNormal) {
          bal += d - c;
        } else {
          bal += c - d;
        }
        return {
          entry_number: r.journal_entries?.entry_number || null,
          entry_date: r.journal_entries?.entry_date || '',
          description: r.journal_entries?.description || r.description || null,
          debit: d,
          credit: c,
          balance: bal,
        };
      });
      setMoves(moveList);
      setRunningBalance(bal);
      setLoading(false);
    } else {
      setLoading(true);
      let query = supabase
        .from('journal_lines')
        .select('account_id, debit, credit, journal_entries!inner(status, entry_date)')
        .eq('journal_entries.status', 'posted');

      if (fromDate) query = query.gte('journal_entries.entry_date', fromDate);
      if (toDate) query = query.lte('journal_entries.entry_date', toDate);

      const { data, error: qErr } = await query;
      if (qErr) {
        setError(qErr.message);
        setLoading(false);
        return;
      }
      const rows = (data as any[]) || [];
      const map = new Map<string, { total_debit: number; total_credit: number }>();
      rows.forEach((r) => {
        const aid = r.account_id as string;
        if (!aid) return;
        const cur = map.get(aid) || { total_debit: 0, total_credit: 0 };
        cur.total_debit += Number(r.debit) || 0;
        cur.total_credit += Number(r.credit) || 0;
        map.set(aid, cur);
      });
      const result: AccountBalance[] = accounts
        .map((a) => {
          const v = map.get(a.id) || { total_debit: 0, total_credit: 0 };
          return {
            account: a,
            total_debit: v.total_debit,
            total_credit: v.total_credit,
            balance: v.total_debit - v.total_credit,
          };
        })
        .filter((b) => b.total_debit !== 0 || b.total_credit !== 0);
      setBalances(result);
      setLoading(false);
    }
  }, [reportType, selectedAccountId, fromDate, toDate, accounts, t]);

  useEffect(() => {
    if (accounts.length > 0) {
      void loadReport();
    }
  }, [reportType, fromDate, toDate, selectedAccountId, accounts.length]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.account_code.toLowerCase().includes(q) ||
        a.account_name.toLowerCase().includes(q) ||
        (a.account_name_en || '').toLowerCase().includes(q),
    );
  }, [accounts, accountSearch]);

  const trialBalanceData = useMemo(() => balances, [balances]);
  const totalDebit = useMemo(() => trialBalanceData.reduce((s, b) => s + b.total_debit, 0), [trialBalanceData]);
  const totalCredit = useMemo(() => trialBalanceData.reduce((s, b) => s + b.total_credit, 0), [trialBalanceData]);

  const incomeData = useMemo(() => {
    const revenue = balances.filter((b) => b.account.account_type === 'revenue');
    const directCosts = balances.filter((b) => b.account.account_type === 'direct_cost');
    const operating = balances.filter((b) => b.account.account_type === 'operating_expense');
    const admin = balances.filter((b) => b.account.account_type === 'admin_expense');
    const other = balances.filter((b) => b.account.account_type === 'other');
    const totalRevenue = revenue.reduce((s, b) => s + (b.total_credit - b.total_debit), 0);
    const totalDirectCost = directCosts.reduce((s, b) => s + (b.total_debit - b.total_credit), 0);
    const totalOperating = operating.reduce((s, b) => s + (b.total_debit - b.total_credit), 0);
    const totalAdmin = admin.reduce((s, b) => s + (b.total_debit - b.total_credit), 0);
    const totalOther = other.reduce((s, b) => s + (b.total_debit - b.total_credit), 0);
    const grossProfit = totalRevenue - totalDirectCost;
    const operatingProfit = grossProfit - totalOperating - totalAdmin;
    const netProfit = operatingProfit - totalOther;
    return { revenue, directCosts, operating, admin, other, totalRevenue, totalDirectCost, totalOperating, totalAdmin, totalOther, grossProfit, operatingProfit, netProfit };
  }, [balances]);

  const balanceSheetData = useMemo(() => {
    const assets = balances.filter((b) => b.account.account_type === 'asset');
    const liabilities = balances.filter((b) => b.account.account_type === 'liability');
    const equity = balances.filter((b) => b.account.account_type === 'equity');
    const totalAssets = assets.reduce((s, b) => s + b.balance, 0);
    const totalLiabilities = liabilities.reduce((s, b) => s + (b.balance * -1), 0);
    const totalEquity = equity.reduce((s, b) => s + (b.balance * -1), 0);
    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
  }, [balances]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="printable">
      <div className="card" style={{ marginBottom: 24, overflow: 'hidden', padding: 0 }}>
        <div style={{ height: 6, background: 'linear-gradient(90deg, var(--brand-500), #0ea5e9, #0891b2)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(var(--brand-rgb),0.3)' }}>
              <Building2 size={26} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1a2535' }}>{company?.company_name || t('رواق', 'Riwaaq')}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{company?.legal_name || ''}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {company?.vat_number && t(`الرقم الضريبي: ${company.vat_number}`, `VAT: ${company.vat_number}`)}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--brand-500)' }}>
              {t(REPORT_META[reportType].ar, REPORT_META[reportType].en)}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              {t('تاريخ التقرير', 'Report Date')}: {fmtDate(new Date().toISOString(), lang)}
            </div>
          </div>
        </div>
      </div>

      <div className="page-header no-print">
        <div>
          <h1 className="page-title">{t('التقارير المالية المحاسبية', 'Accounting Financial Reports')}</h1>
          <p className="page-subtitle">
            {t('ميزان المراجعة، قائمة الدخل، الميزانية العمومية، كشف الحساب', 'Trial Balance, Income Statement, Balance Sheet, Account Statement')}
          </p>
        </div>
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer size={18} /> {t('طباعة', 'Print')}
        </button>
      </div>

      <div className="card no-print" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(Object.keys(REPORT_META) as ReportType[]).map((key) => {
            const meta = REPORT_META[key];
            const Icon = meta.icon;
            const active = reportType === key;
            return (
              <button
                key={key}
                onClick={() => setReportType(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `2px solid ${active ? meta.color : '#eef0f3'}`,
                  background: active ? `${meta.color}10` : '#fff',
                  color: active ? meta.color : '#6b7280',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={18} />
                {t(meta.ar, meta.en)}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label className="label" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>{t('من تاريخ', 'From Date')}</label>
            <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} dir="ltr" style={{ minWidth: 150 }} />
          </div>
          <div>
            <label className="label" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>{t('إلى تاريخ', 'To Date')}</label>
            <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} dir="ltr" style={{ minWidth: 150 }} />
          </div>
          {reportType === 'account_statement' && (
            <div style={{ flex: 1, minWidth: 250 }}>
              <label className="label" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>{t('الحساب', 'Account')}</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <select
                  className="input"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  style={{ paddingRight: 34, width: '100%' }}
                >
                  <option value="">{t('— اختر حساباً —', '— Select account —')}</option>
                  {filteredAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_code} — {a.account_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <button className="btn-primary" onClick={loadReport} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {t('عرض التقرير', 'Run Report')}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, padding: 14, borderColor: '#ef4444', background: '#fef2f2' }}>
          <p style={{ color: '#dc2626', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} /> {error}
          </p>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--brand-500)' }} />
          <p style={{ color: '#6b7280' }}>{t('جارٍ تحميل التقرير...', 'Loading report...')}</p>
        </div>
      ) : reportType === 'trial_balance' ? (
        <TrialBalanceReport data={trialBalanceData} totalDebit={totalDebit} totalCredit={totalCredit} t={t} lang={lang} />
      ) : reportType === 'income_statement' ? (
        <IncomeStatementReport data={incomeData} t={t} lang={lang} />
      ) : reportType === 'balance_sheet' ? (
        <BalanceSheetReport data={balanceSheetData} t={t} lang={lang} />
      ) : (
        <AccountStatementReport moves={moves} account={selectedAccount} runningBalance={runningBalance} t={t} lang={lang} />
      )}
    </div>
  );
}

function ReportTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 24, marginBottom: 24 }}>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  );
}

function TrialBalanceReport({
  data,
  totalDebit,
  totalCredit,
  t,
  lang,
}: {
  data: AccountBalance[];
  totalDebit: number;
  totalCredit: number;
  t: (ar: string, en: string) => string;
  lang: 'ar' | 'en';
}) {
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
  return (
    <ReportTable>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: 'rgba(var(--brand-rgb),0.06)' }}>
            <th className="table-th" style={{ textAlign: 'right' }}>{t('رقم الحساب', 'Code')}</th>
            <th className="table-th" style={{ textAlign: 'right' }}>{t('اسم الحساب', 'Account Name')}</th>
            <th className="table-th" style={{ textAlign: 'right' }}>{t('النوع', 'Type')}</th>
            <th className="table-th" style={{ textAlign: 'center' }}>{t('مدين', 'Debit')}</th>
            <th className="table-th" style={{ textAlign: 'center' }}>{t('دائن', 'Credit')}</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                {t('لا توجد بيانات في هذه الفترة', 'No data for this period')}
              </td>
            </tr>
          ) : (
            data.map((b, i) => {
              const tl = TYPE_LABELS[b.account.account_type] || TYPE_LABELS.other;
              return (
                <tr key={i} className="table-row">
                  <td className="table-td" dir="ltr" style={{ fontWeight: 700, color: 'var(--brand-500)' }}>{b.account.account_code}</td>
                  <td className="table-td" style={{ fontWeight: 600 }}>{b.account.account_name}</td>
                  <td className="table-td" style={{ fontSize: 12, color: '#6b7280' }}>{t(tl.ar, tl.en)}</td>
                  <td className="table-td" style={{ textAlign: 'center', fontWeight: 600, color: b.total_debit > 0 ? '#059669' : '#d1d5db' }} dir="ltr">
                    {b.total_debit > 0 ? fmtMoney(b.total_debit) : '—'}
                  </td>
                  <td className="table-td" style={{ textAlign: 'center', fontWeight: 600, color: b.total_credit > 0 ? '#dc2626' : '#d1d5db' }} dir="ltr">
                    {b.total_credit > 0 ? fmtMoney(b.total_credit) : '—'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
            <td style={{ padding: '14px 12px', fontWeight: 800, fontSize: 15 }} colSpan={3}>{t('الإجمالي', 'Total')}</td>
            <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#059669' }} dir="ltr">{fmtMoney(totalDebit)}</td>
            <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#dc2626' }} dir="ltr">{fmtMoney(totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        {balanced ? (
          <span style={{ color: 'var(--brand-500)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={18} /> {t('ميزان متوازن — الأطراف متساوية', 'Balanced — sides are equal')}
          </span>
        ) : (
          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={18} /> {t('الفرق', 'Diff')}: {fmtMoney(Math.abs(totalDebit - totalCredit))}
          </span>
        )}
      </div>
    </ReportTable>
  );
}

function IncomeStatementReport({
  data,
  t,
  lang,
}: {
  data: {
    revenue: AccountBalance[];
    directCosts: AccountBalance[];
    operating: AccountBalance[];
    admin: AccountBalance[];
    other: AccountBalance[];
    totalRevenue: number;
    totalDirectCost: number;
    totalOperating: number;
    totalAdmin: number;
    totalOther: number;
    grossProfit: number;
    operatingProfit: number;
    netProfit: number;
  };
  t: (ar: string, en: string) => string;
  lang: 'ar' | 'en';
}) {
  const Section = ({ title, items, total, isCredit }: { title: string; items: AccountBalance[]; total: number; isCredit: boolean }) => (
    <>
      <tr style={{ background: '#f9fafb' }}>
        <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 14, color: '#374151' }} colSpan={3}>{title}</td>
      </tr>
      {items.map((b, i) => (
        <tr key={i} className="table-row">
          <td className="table-td" dir="ltr" style={{ color: '#6b7280', fontSize: 13 }}>{b.account.account_code}</td>
          <td className="table-td" style={{ fontSize: 13 }}>{b.account.account_name}</td>
          <td className="table-td" style={{ textAlign: 'center', fontWeight: 600, fontSize: 13 }} dir="ltr">
            {fmtMoney(isCredit ? b.total_credit - b.total_debit : b.total_debit - b.total_credit)}
          </td>
        </tr>
      ))}
      <tr style={{ borderTop: '1px solid #e5e7eb' }}>
        <td style={{ padding: '8px 12px' }} colSpan={2}></td>
        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#374151' }} dir="ltr">{fmtMoney(total)}</td>
      </tr>
    </>
  );

  return (
    <ReportTable>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: 'rgba(var(--brand-rgb),0.06)' }}>
            <th className="table-th" style={{ textAlign: 'right', width: 100 }}>{t('الحساب', 'Code')}</th>
            <th className="table-th" style={{ textAlign: 'right' }}>{t('البيان', 'Description')}</th>
            <th className="table-th" style={{ textAlign: 'center', width: 160 }}>{t('القيمة', 'Amount')}</th>
          </tr>
        </thead>
        <tbody>
          <Section title={t('الإيرادات التشغيلية', 'Operating Revenue')} items={data.revenue} total={data.totalRevenue} isCredit />
          <Section title={t('تكلفة الإيرادات المباشرة', 'Direct Costs')} items={data.directCosts} total={data.totalDirectCost} isCredit={false} />
          <tr style={{ borderTop: '2px solid #e5e7eb', background: 'rgba(var(--brand-rgb),0.04)' }}>
            <td style={{ padding: '12px', fontWeight: 800, fontSize: 15 }} colSpan={2}>{t('مجمل الربح', 'Gross Profit')}</td>
            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800, fontSize: 16, color: data.grossProfit >= 0 ? '#059669' : '#dc2626' }} dir="ltr">{fmtMoney(data.grossProfit)}</td>
          </tr>
          <Section title={t('المصروفات التشغيلية', 'Operating Expenses')} items={data.operating} total={data.totalOperating} isCredit={false} />
          <Section title={t('المصروفات الإدارية', 'Admin Expenses')} items={data.admin} total={data.totalAdmin} isCredit={false} />
          <tr style={{ borderTop: '2px solid #e5e7eb', background: 'rgba(var(--brand-rgb),0.04)' }}>
            <td style={{ padding: '12px', fontWeight: 800, fontSize: 15 }} colSpan={2}>{t('الربح التشغيلي', 'Operating Profit')}</td>
            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800, fontSize: 16, color: data.operatingProfit >= 0 ? '#059669' : '#dc2626' }} dir="ltr">{fmtMoney(data.operatingProfit)}</td>
          </tr>
          <Section title={t('مصروفات وخسائر أخرى', 'Other Expenses')} items={data.other} total={data.totalOther} isCredit={false} />
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '3px solid var(--brand-500)', background: 'linear-gradient(135deg, rgba(var(--brand-rgb),0.1), rgba(var(--brand-rgb),0.04))' }}>
            <td style={{ padding: '16px 12px', fontWeight: 900, fontSize: 17 }} colSpan={2}>
              {data.netProfit >= 0 ? t('صافي ربح الفترة', 'Net Profit') : t('صافي خسارة الفترة', 'Net Loss')}
            </td>
            <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 900, fontSize: 18, color: data.netProfit >= 0 ? '#059669' : '#dc2626' }} dir="ltr">
              {fmtMoney(Math.abs(data.netProfit))}
            </td>
          </tr>
        </tfoot>
      </table>
    </ReportTable>
  );
}

function BalanceSheetReport({
  data,
  t,
  lang,
}: {
  data: {
    assets: AccountBalance[];
    liabilities: AccountBalance[];
    equity: AccountBalance[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  };
  t: (ar: string, en: string) => string;
  lang: 'ar' | 'en';
}) {
  const balanced = Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01;
  const Side = ({ title, items, total }: { title: string; items: AccountBalance[]; total: number }) => (
    <>
      <tr style={{ background: '#f9fafb' }}>
        <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 14, color: '#374151' }} colSpan={3}>{title}</td>
      </tr>
      {items.map((b, i) => (
        <tr key={i} className="table-row">
          <td className="table-td" dir="ltr" style={{ color: '#6b7280', fontSize: 13 }}>{b.account.account_code}</td>
          <td className="table-td" style={{ fontSize: 13 }}>{b.account.account_name}</td>
          <td className="table-td" style={{ textAlign: 'center', fontWeight: 600, fontSize: 13 }} dir="ltr">{fmtMoney(Math.abs(b.balance))}</td>
        </tr>
      ))}
      <tr style={{ borderTop: '1px solid #e5e7eb' }}>
        <td style={{ padding: '8px 12px' }} colSpan={2}></td>
        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#374151' }} dir="ltr">{fmtMoney(total)}</td>
      </tr>
    </>
  );

  return (
    <ReportTable>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: 'rgba(var(--brand-rgb),0.06)' }}>
            <th className="table-th" style={{ textAlign: 'right', width: 100 }}>{t('الحساب', 'Code')}</th>
            <th className="table-th" style={{ textAlign: 'right' }}>{t('البيان', 'Description')}</th>
            <th className="table-th" style={{ textAlign: 'center', width: 160 }}>{t('القيمة', 'Amount')}</th>
          </tr>
        </thead>
        <tbody>
          <Side title={t('الأصول', 'Assets')} items={data.assets} total={data.totalAssets} />
          <tr style={{ borderTop: '2px solid #e5e7eb', background: 'rgba(var(--brand-rgb),0.04)' }}>
            <td style={{ padding: '12px', fontWeight: 800, fontSize: 15 }} colSpan={2}>{t('إجمالي الأصول', 'Total Assets')}</td>
            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#059669' }} dir="ltr">{fmtMoney(data.totalAssets)}</td>
          </tr>
          <Side title={t('الخصوم', 'Liabilities')} items={data.liabilities} total={data.totalLiabilities} />
          <Side title={t('حقوق الملكية', 'Equity')} items={data.equity} total={data.totalEquity} />
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
            <td style={{ padding: '12px', fontWeight: 800, fontSize: 15 }} colSpan={2}>{t('إجمالي الخصوم وحقوق الملكية', 'Total Liabilities & Equity')}</td>
            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#dc2626' }} dir="ltr">{fmtMoney(data.totalLiabilities + data.totalEquity)}</td>
          </tr>
        </tfoot>
      </table>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        {balanced ? (
          <span style={{ color: 'var(--brand-500)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={18} /> {t('الميزانية متوازنة', 'Balance Sheet is balanced')}
          </span>
        ) : (
          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={18} /> {t('الفرق', 'Diff')}: {fmtMoney(Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)))}
          </span>
        )}
      </div>
    </ReportTable>
  );
}

function AccountStatementReport({
  moves,
  account,
  runningBalance,
  t,
  lang,
}: {
  moves: AccountMove[];
  account: Account | undefined;
  runningBalance: number;
  t: (ar: string, en: string) => string;
  lang: 'ar' | 'en';
}) {
  if (!account) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <BookOpen size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
        <p style={{ color: '#6b7280' }}>{t('الرجاء اختيار حساب لعرض كشف الحساب', 'Please select an account to view its statement')}</p>
      </div>
    );
  }
  const totalDebit = moves.reduce((s, m) => s + m.debit, 0);
  const totalCredit = moves.reduce((s, m) => s + m.credit, 0);
  return (
    <ReportTable>
      <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(var(--brand-rgb),0.04)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 700, color: 'var(--brand-500)', fontSize: 16 }} dir="ltr">{account.account_code}</span>
          <span style={{ fontWeight: 700, fontSize: 16, marginRight: 8 }}>{account.account_name}</span>
        </div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          {t('الرصيد الحالي', 'Current Balance')}: <span style={{ fontWeight: 800, fontSize: 16, color: runningBalance >= 0 ? '#059669' : '#dc2626' }} dir="ltr">{fmtMoney(Math.abs(runningBalance))}</span>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: 'rgba(var(--brand-rgb),0.06)' }}>
            <th className="table-th" style={{ textAlign: 'right' }}>{t('التاريخ', 'Date')}</th>
            <th className="table-th" style={{ textAlign: 'right' }}>{t('رقم القيد', 'Entry #')}</th>
            <th className="table-th" style={{ textAlign: 'right' }}>{t('البيان', 'Description')}</th>
            <th className="table-th" style={{ textAlign: 'center' }}>{t('مدين', 'Debit')}</th>
            <th className="table-th" style={{ textAlign: 'center' }}>{t('دائن', 'Credit')}</th>
            <th className="table-th" style={{ textAlign: 'center' }}>{t('الرصيد', 'Balance')}</th>
          </tr>
        </thead>
        <tbody>
          {moves.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                {t('لا توجد حركات في هذه الفترة', 'No transactions in this period')}
              </td>
            </tr>
          ) : (
            moves.map((m, i) => (
              <tr key={i} className="table-row">
                <td className="table-td" dir="ltr" style={{ fontSize: 13 }}>{fmtDate(m.entry_date, lang)}</td>
                <td className="table-td" dir="ltr" style={{ fontSize: 12, color: '#6b7280' }}>{m.entry_number || `JE-${m.entry_date}`}</td>
                <td className="table-td" style={{ fontSize: 13 }}>{m.description}</td>
                <td className="table-td" style={{ textAlign: 'center', fontWeight: 600, color: m.debit > 0 ? '#059669' : '#d1d5db' }} dir="ltr">{m.debit > 0 ? fmtMoney(m.debit) : '—'}</td>
                <td className="table-td" style={{ textAlign: 'center', fontWeight: 600, color: m.credit > 0 ? '#dc2626' : '#d1d5db' }} dir="ltr">{m.credit > 0 ? fmtMoney(m.credit) : '—'}</td>
                <td className="table-td" style={{ textAlign: 'center', fontWeight: 700 }} dir="ltr">{fmtMoney(Math.abs(m.balance))}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
            <td style={{ padding: '12px', fontWeight: 800, fontSize: 15 }} colSpan={3}>{t('الإجمالي', 'Total')}</td>
            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#059669' }} dir="ltr">{fmtMoney(totalDebit)}</td>
            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#dc2626' }} dir="ltr">{fmtMoney(totalCredit)}</td>
            <td style={{ padding: '12px' }}></td>
          </tr>
        </tfoot>
      </table>
    </ReportTable>
  );
}
