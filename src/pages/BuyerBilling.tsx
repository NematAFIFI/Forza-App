import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  Receipt, Search, Plus, X, Loader2, ChevronDown, ChevronLeft,
  TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, Printer,
} from 'lucide-react';

interface Transaction {
  id: string;
  client_id: string;
  type: string;
  category: string;
  description: string | null;
  amount: number;
  reference_number: string | null;
  transaction_date: string;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
}

const CATEGORY_LABEL: Record<string, { ar: string; en: string }> = {
  subscription: { ar: 'اشتراك', en: 'Subscription' },
  add_on: { ar: 'إضافة', en: 'Add-on' },
  tax: { ar: 'ضريبة', en: 'Tax' },
  refund: { ar: 'استرداد', en: 'Refund' },
  adjustment: { ar: 'تسوية', en: 'Adjustment' },
  payment: { ar: 'دفعة', en: 'Payment' },
  other: { ar: 'أخرى', en: 'Other' },
};

const fmtMoney = (n: number): string =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d: string | null, lang: 'ar' | 'en'): string => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return d; }
};

export default function BuyerBilling() {
  const { t, lang } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    type: 'charge',
    category: 'subscription',
    description: '',
    amount: '',
    reference_number: '',
    transaction_date: new Date().toISOString().slice(0, 10),
  });

  const loadClients = useCallback(async () => {
    const { data } = await supabase
      .from('system_clients')
      .select('id, name, company_name, email')
      .order('name', { ascending: true });
    setClients((data as Client[]) || []);
  }, []);

  const loadTransactions = useCallback(async () => {
    if (!selectedClient) { setTransactions([]); setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from('subscription_transactions')
      .select('*')
      .eq('client_id', selectedClient)
      .order('transaction_date', { ascending: true });

    if (fromDate) query = query.gte('transaction_date', fromDate);
    if (toDate) query = query.lte('transaction_date', toDate);

    const { data } = await query;
    setTransactions((data as Transaction[]) || []);
    setLoading(false);
  }, [selectedClient, fromDate, toDate]);

  useEffect(() => { void loadClients(); }, [loadClients]);
  useEffect(() => { void loadTransactions(); }, [loadTransactions]);

  const selectedCl = clients.find((c) => c.id === selectedClient);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx) => {
      const desc = tx.description || '';
      const ref = tx.reference_number || '';
      const cat = CATEGORY_LABEL[tx.category]?.ar || CATEGORY_LABEL[tx.category]?.en || tx.category;
      return desc.toLowerCase().includes(q) || ref.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
    });
  }, [transactions, search]);

  const totals = useMemo(() => {
    let charges = 0, payments = 0;
    for (const tx of filteredTransactions) {
      if (tx.amount > 0) charges += tx.amount;
      else payments += Math.abs(tx.amount);
    }
    return { charges, payments, balance: charges - payments };
  }, [filteredTransactions]);

  const runningBalance = useMemo(() => {
    let bal = 0;
    return filteredTransactions.map((tx) => {
      bal += tx.amount;
      return { ...tx, runningBalance: bal };
    });
  }, [filteredTransactions]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const handlePrint = () => window.print();

  const saveTransaction = async (): Promise<void> => {
    if (!selectedClient) return;
    const amt = Number(form.amount);
    if (!amt || amt <= 0) {
      setError(t('الرجاء إدخال مبلغ صحيح', 'Please enter a valid amount'));
      return;
    }
    setSaving(true);
    setError('');

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    const ownerUid = session.session.user.id;

    const signedAmount = form.type === 'payment' ? -Math.abs(amt) : Math.abs(amt);

    const { error: err } = await supabase.from('subscription_transactions').insert({
      client_id: selectedClient,
      user_id: ownerUid,
      type: form.type,
      category: form.category,
      description: form.description.trim() || null,
      amount: signedAmount,
      reference_number: form.reference_number.trim() || null,
      transaction_date: form.transaction_date,
    });

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setModalOpen(false);
    setForm({
      type: 'charge', category: 'subscription', description: '', amount: '',
      reference_number: '', transaction_date: new Date().toISOString().slice(0, 10),
    });
    void loadTransactions();
  };

  return (
    <div className="printable">
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">{t('كشف حساب المشتركين', 'Subscriber Billing')}</h1>
          <p className="page-subtitle">
            {t('إدارة اشتراكات ومدفوعات مشتركي النظام', 'Manage subscription charges and payments for system clients')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={handlePrint} disabled={!selectedClient || transactions.length === 0}>
            <Printer size={18} /> {t('طباعة', 'Print')}
          </button>
          <button className="btn-primary" onClick={() => setModalOpen(true)} disabled={!selectedClient}>
            <Plus size={18} /> {t('حركة جديدة', 'New Transaction')}
          </button>
        </div>
      </div>

      {/* Client selector + filters */}
      <div className="card no-print" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Client dropdown */}
          <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6, display: 'block' }}>
              {t('اختر المشترك', 'Select Subscriber')}
            </label>
            <button
              onClick={() => setShowClientList(!showClientList)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 14, fontWeight: 600,
              }}
            >
              <span>
                {selectedCl ? (
                  <>
                    <strong>{selectedCl.name}</strong>
                    {selectedCl.company_name && <span style={{ color: '#9ca3af', fontWeight: 400 }}> — {selectedCl.company_name}</span>}
                  </>
                ) : (
                  <span style={{ color: '#9ca3af' }}>{t('اختر مشتركاً...', 'Choose a subscriber...')}</span>
                )}
              </span>
              {showClientList ? <ChevronDown size={18} color="#9ca3af" /> : <ChevronLeft size={18} color="#9ca3af" style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />}
            </button>
            {showClientList && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowClientList(false)} />
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
                  background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  maxHeight: 360, overflowY: 'auto',
                }}>
                  <div style={{ padding: 12, borderBottom: '1px solid #f3f4f6', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      className="input" placeholder={t('ابحث عن مشترك...', 'Search subscriber...')}
                      value={clientSearch} onChange={(e) => setClientSearch(e.target.value)}
                      style={{ paddingRight: 36 }} autoFocus
                    />
                  </div>
                  {filteredClients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClient(c.id); setShowClientList(false); setClientSearch(''); }}
                      style={{
                        width: '100%', padding: '10px 14px', border: 'none',
                        background: selectedClient === c.id ? 'rgba(var(--brand-rgb),0.06)' : '#fff',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        textAlign: lang === 'ar' ? 'right' : 'left', borderBottom: '1px solid #f9fafb',
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                      {c.company_name && <span style={{ fontSize: 12, color: '#9ca3af' }}>{c.company_name}</span>}
                    </button>
                  ))}
                  {filteredClients.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#9ca3af', padding: 24, fontSize: 13 }}>{t('لا يوجد مشتركون', 'No subscribers found')}</p>
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

        {selectedClient && (
          <div style={{ marginTop: 16, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input className="input" placeholder={t('ابحث بالوصف أو المرجع...', 'Search by description or reference...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
          </div>
        )}
      </div>

      {/* Print header */}
      <div style={{ display: 'none' }} className="print-only">
        <h2 style={{ textAlign: 'center', marginBottom: 4 }}>{t('كشف حساب المشترك', 'Subscriber Statement')}</h2>
        {selectedCl && (
          <p style={{ textAlign: 'center', color: '#6b7280' }}>
            {selectedCl.name}
            {selectedCl.company_name && ` — ${selectedCl.company_name}`}
          </p>
        )}
      </div>

      {/* Summary cards */}
      {selectedClient && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{t('إجمالي المدين', 'Total Charges')}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{fmtMoney(totals.charges)}</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(var(--brand-rgb),0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingDown size={20} color="var(--brand-500)" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{t('إجمالي المدفوع', 'Total Paid')}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand-500)' }}>{fmtMoney(totals.payments)}</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: totals.balance > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(var(--brand-rgb),0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={20} color={totals.balance > 0 ? '#ef4444' : 'var(--brand-500)'} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{t('الرصيد المستحق', 'Outstanding Balance')}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: totals.balance > 0 ? '#ef4444' : 'var(--brand-500)' }}>{fmtMoney(totals.balance)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statement */}
      {!selectedClient ? (
        <div className="card" style={{ textAlign: 'center', padding: 64 }}>
          <Receipt size={56} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ color: '#6b7280', fontSize: 15 }}>{t('اختر مشتركاً لعرض كشف الحساب', 'Select a subscriber to view their statement')}</p>
        </div>
      ) : loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#6b7280' }}>{t('جارٍ التحميل...', 'Loading...')}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 16 }}>
          {runningBalance.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
              <Receipt size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>{t('لا توجد حركات في الفترة المحددة', 'No transactions in the selected period')}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(var(--brand-rgb),0.04)' }}>
                    <th className="table-th">{t('التاريخ', 'Date')}</th>
                    <th className="table-th">{t('البيان', 'Description')}</th>
                    <th className="table-th">{t('التصنيف', 'Category')}</th>
                    <th className="table-th" style={{ textAlign: 'center' }}>{t('مدين', 'Charge')}</th>
                    <th className="table-th" style={{ textAlign: 'center' }}>{t('دائن', 'Payment')}</th>
                    <th className="table-th" style={{ textAlign: 'center' }}>{t('الرصيد', 'Balance')}</th>
                    <th className="table-th">{t('المرجع', 'Reference')}</th>
                  </tr>
                </thead>
                <tbody>
                  {runningBalance.map((tx) => {
                    const catMeta = CATEGORY_LABEL[tx.category] || CATEGORY_LABEL.other;
                    const isCharge = tx.amount > 0;
                    return (
                      <tr key={tx.id} className="table-row" style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td className="table-td" style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{formatDate(tx.transaction_date, lang)}</td>
                        <td className="table-td" style={{ fontSize: 13 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isCharge ? <ArrowUpCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} /> : <ArrowDownCircle size={15} color="var(--brand-500)" style={{ flexShrink: 0 }} />}
                            <span>{tx.description || (isCharge ? t('رسوم', 'Charge') : t('دفعة', 'Payment'))}</span>
                          </div>
                        </td>
                        <td className="table-td">
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                            background: isCharge ? 'rgba(239,68,68,0.08)' : 'rgba(var(--brand-rgb),0.08)',
                            color: isCharge ? '#ef4444' : 'var(--brand-500)',
                          }}>{t(catMeta.ar, catMeta.en)}</span>
                        </td>
                        <td className="table-td" style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: '#ef4444' }}>
                          {isCharge ? fmtMoney(tx.amount) : '—'}
                        </td>
                        <td className="table-td" style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-500)' }}>
                          {!isCharge ? fmtMoney(Math.abs(tx.amount)) : '—'}
                        </td>
                        <td className="table-td" style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: tx.runningBalance > 0 ? '#ef4444' : 'var(--brand-500)' }}>
                          {fmtMoney(tx.runningBalance)}
                        </td>
                        <td className="table-td" style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{tx.reference_number || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'rgba(var(--brand-rgb),0.06)', fontWeight: 800 }}>
                    <td className="table-td" colSpan={3} style={{ fontWeight: 800, fontSize: 14 }}>{t('الإجمالي', 'Total')}</td>
                    <td className="table-td" style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#ef4444', fontSize: 14 }}>{fmtMoney(totals.charges)}</td>
                    <td className="table-td" style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: 'var(--brand-500)', fontSize: 14 }}>{fmtMoney(totals.payments)}</td>
                    <td className="table-td" style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: totals.balance > 0 ? '#ef4444' : 'var(--brand-500)' }}>{fmtMoney(totals.balance)}</td>
                    <td className="table-td"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedClient && transactions.length > 0 && (
        <p style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: '#9ca3af' }}>
          {t('عدد الحركات', 'Transaction count')}: {runningBalance.length}
        </p>
      )}

      {/* New transaction modal */}
      {modalOpen && (
        <div className="modal-overlay no-print" onClick={() => setModalOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('حركة جديدة', 'New Transaction')}</h2>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
                <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>
              </div>
            )}

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="label">{t('نوع الحركة', 'Transaction Type')}</label>
                <select className="input" value={form.type} onChange={(e) => {
                  const newType = e.target.value;
                  setForm({ ...form, type: newType, category: newType === 'payment' ? 'payment' : form.category === 'payment' ? 'subscription' : form.category });
                }}>
                  <option value="charge">{t('رسوم', 'Charge')}</option>
                  <option value="payment">{t('دفعة', 'Payment')}</option>
                  <option value="adjustment">{t('تسوية', 'Adjustment')}</option>
                </select>
              </div>

              <div>
                <label className="label">{t('التصنيف', 'Category')}</label>
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {form.type === 'payment' ? (
                    <option value="payment">{t('دفعة', 'Payment')}</option>
                  ) : (
                    <>
                      <option value="subscription">{t('اشتراك', 'Subscription')}</option>
                      <option value="add_on">{t('إضافة', 'Add-on')}</option>
                      <option value="tax">{t('ضريبة', 'Tax')}</option>
                      <option value="adjustment">{t('تسوية', 'Adjustment')}</option>
                      <option value="other">{t('أخرى', 'Other')}</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="label">{t('الوصف', 'Description')}</label>
                <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('وصف مختصر للحركة', 'Brief description')} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">{t('المبلغ (ر.س)', 'Amount (SAR)')}</label>
                  <input className="input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" dir="ltr" />
                </div>
                <div>
                  <label className="label">{t('التاريخ', 'Date')}</label>
                  <input className="input" type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="label">{t('رقم المرجع', 'Reference Number')}</label>
                <input className="input" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} placeholder={t('رقم إيصال أو تحويل', 'Receipt or transfer number')} dir="ltr" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={saveTransaction} disabled={saving}>
                {saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
