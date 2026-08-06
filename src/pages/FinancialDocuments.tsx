import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  Receipt, Plus, X, Search, Printer, CheckCircle2, AlertCircle,
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Eye, Loader2,
  FileText, Building2,
} from 'lucide-react';

type DocType = 'receipt' | 'payment' | 'transfer';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  iban: string;
}

interface FinancialDoc {
  id: string;
  doc_number: string;
  doc_type: string;
  doc_date: string;
  amount: number;
  payee_name: string | null;
  description: string | null;
  status: string;
  cash_bank_account_id: string | null;
  counterparty_account_id: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  bank_account_id: string | null;
  cost_center_id: string | null;
  journal_entry_id: string | null;
  created_at: string;
}

const fmtMoney = (n: number): string => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d: string, lang: 'ar' | 'en'): string => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
};

const docTypeLabel = (type: string, t: (a: string, e: string) => string): string => {
  const map: Record<string, string> = {
    receipt: t('سند قبض', 'Receipt Voucher'),
    payment: t('سند صرف', 'Payment Voucher'),
    transfer: t('إشعار تحويل', 'Bank Transfer'),
    reverse: t('إشعار عكسي', 'Reverse Notice'),
  };
  return map[type] || type;
};

const docTypeIcon = (type: string) => {
  if (type === 'receipt') return ArrowDownToLine;
  if (type === 'payment') return ArrowUpFromLine;
  if (type === 'transfer') return ArrowLeftRight;
  return FileText;
};

const docTypeColor = (type: string): string => {
  if (type === 'receipt') return 'var(--brand-500)';
  if (type === 'payment') return '#ef4444';
  if (type === 'transfer') return 'var(--brand-500)';
  return '#f59e0b';
};

export default function FinancialDocuments() {
  const { t, lang } = useLanguage();
  const [docs, setDocs] = useState<FinancialDoc[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<FinancialDoc | null>(null);
  const [viewLines, setViewLines] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    doc_type: 'receipt' as DocType,
    doc_date: new Date().toISOString().slice(0, 10),
    amount: '',
    cash_bank_account_id: '',
    counterparty_account_id: '',
    from_account_id: '',
    to_account_id: '',
    bank_account_id: '',
    payee_name: '',
    description: '',
    reference: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [dRes, aRes, bRes] = await Promise.all([
      supabase.from('financial_documents').select('*').order('doc_date', { ascending: false }).limit(200),
      supabase.from('chart_accounts').select('id, account_code, account_name').eq('is_active', true).order('account_code', { ascending: true }),
      supabase.from('bank_accounts').select('id, bank_name, account_name, iban').eq('status', 'active'),
    ]);
    setDocs((dRes.data as FinancialDoc[]) || []);
    setAccounts((aRes.data as Account[]) || []);
    setBankAccounts((bRes.data as BankAccount[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = docs.filter((d) => {
    const q = search.trim().toLowerCase();
    const matchQ = !q || d.doc_number.toLowerCase().includes(q) || (d.payee_name || '').toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q);
    const matchType = !typeFilter || d.doc_type === typeFilter;
    const matchStatus = !statusFilter || d.status === statusFilter;
    return matchQ && matchType && matchStatus;
  });

  const openCreate = () => {
    setForm({
      doc_type: 'receipt', doc_date: new Date().toISOString().slice(0, 10),
      amount: '', cash_bank_account_id: '', counterparty_account_id: '',
      from_account_id: '', to_account_id: '', bank_account_id: '',
      payee_name: '', description: '', reference: '',
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setError(''); };

  const save = async (postNow: boolean): Promise<void> => {
    setError('');
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setError(t('الرجاء إدخال مبلغ صحيح', 'Please enter a valid amount')); return; }
    if (form.doc_type === 'receipt' || form.doc_type === 'payment') {
      if (!form.cash_bank_account_id) { setError(t('الرجاء اختيار حساب الصندوق/البنك', 'Please select cash/bank account')); return; }
      if (!form.counterparty_account_id) { setError(t('الرجاء اختيار حساب الطرف الآخر', 'Please select counterparty account')); return; }
    } else {
      if (!form.from_account_id || !form.to_account_id) { setError(t('الرجاء اختيار الحسابين', 'Please select both accounts')); return; }
    }

    setSaving(true);
    try {
      const { data: docNum, error: numErr } = await supabase.rpc('next_financial_doc_number', { p_doc_type: form.doc_type });
      if (numErr) throw numErr;
      if (!docNum) throw new Error(t('تعذر توليد رقم المستند', 'Could not generate document number'));

      const payload: Record<string, unknown> = {
        doc_number: docNum,
        doc_type: form.doc_type,
        doc_date: form.doc_date,
        amount: amt,
        payee_name: form.payee_name || null,
        description: form.description || null,
        reference: form.reference || null,
        bank_account_id: form.bank_account_id || null,
        status: 'draft',
      };

      if (form.doc_type === 'receipt' || form.doc_type === 'payment') {
        payload.cash_bank_account_id = form.cash_bank_account_id;
        payload.counterparty_account_id = form.counterparty_account_id;
      } else {
        payload.from_account_id = form.from_account_id;
        payload.to_account_id = form.to_account_id;
      }

      const { data: docData, error: insErr } = await supabase
        .from('financial_documents').insert(payload).select().single();
      if (insErr) throw insErr;

      if (postNow) {
        const { error: postErr } = await supabase.rpc('post_financial_document', { p_doc_id: docData.id });
        if (postErr) throw postErr;
      }

      closeModal();
      await load();
      setSuccess(postNow ? t('تم حفظ وترحيل المستند', 'Document saved and posted') : t('تم حفظ المستند كمسودة', 'Document saved as draft'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('حدث خطأ', 'Error occurred'));
    } finally {
      setSaving(false);
    }
  };

  const postDraft = async (id: string): Promise<void> => {
    setPosting(id);
    setError('');
    try {
      const { error: rpcErr } = await supabase.rpc('post_financial_document', { p_doc_id: id });
      if (rpcErr) throw rpcErr;
      await load();
      setSuccess(t('تم ترحيل المستند', 'Document posted'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر الترحيل', 'Unable to post'));
    } finally {
      setPosting(null);
    }
  };

  const viewDetails = async (doc: FinancialDoc): Promise<void> => {
    setViewDoc(doc);
    if (doc.journal_entry_id) {
      const { data } = await supabase
        .from('journal_lines')
        .select('*, chart_accounts(account_code, account_name)')
        .eq('entry_id', doc.journal_entry_id)
        .order('line_order', { ascending: true });
      setViewLines((data as any[]) || []);
    } else {
      setViewLines([]);
    }
  };

  const accName = (id: string | null): string => {
    if (!id) return '-';
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.account_code} — ${a.account_name}` : '-';
  };

  const isTransfer = form.doc_type === 'transfer';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('المستندات النقدية والبنكية', 'Cash & Bank Documents')}</h1>
          <p className="page-subtitle">{t('سندات القبض والصرف وإشعارات التحويل مع الترحيل المحاسبي التلقائي', 'Receipt vouchers, payment vouchers, and transfer notices with automatic journal posting')}</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={18} /> {t('مستند جديد', 'New Document')}</button>
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

      <div className="card" style={{ marginBottom: 16, padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder={t('ابحث برقم المستند أو الاسم...', 'Search by doc number or name...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
        </div>
        <select className="input" style={{ maxWidth: 160 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">{t('كل الأنواع', 'All Types')}</option>
          <option value="receipt">{t('سند قبض', 'Receipt')}</option>
          <option value="payment">{t('سند صرف', 'Payment')}</option>
          <option value="transfer">{t('تحويل', 'Transfer')}</option>
        </select>
        <select className="input" style={{ maxWidth: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t('كل الحالات', 'All Status')}</option>
          <option value="draft">{t('مسودة', 'Draft')}</option>
          <option value="posted">{t('مرحّل', 'Posted')}</option>
        </select>
      </div>

      <div className="card" style={{ padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <Receipt size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا توجد مستندات بعد', 'No documents yet')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-th">{t('رقم المستند', 'Doc No.')}</th>
                  <th className="table-th">{t('النوع', 'Type')}</th>
                  <th className="table-th">{t('التاريخ', 'Date')}</th>
                  <th className="table-th">{t('المستلم/المدفوع', 'Payee')}</th>
                  <th className="table-th">{t('المبلغ', 'Amount')}</th>
                  <th className="table-th">{t('الحالة', 'Status')}</th>
                  <th className="table-th">{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const Icon = docTypeIcon(d.doc_type);
                  const color = docTypeColor(d.doc_type);
                  return (
                    <tr key={d.id} className="table-row">
                      <td className="table-td"><strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{d.doc_number}</strong></td>
                      <td className="table-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={14} color={color} />
                          </div>
                          <span style={{ fontSize: 13 }}>{docTypeLabel(d.doc_type, t)}</span>
                        </div>
                      </td>
                      <td className="table-td" style={{ fontSize: 13, color: '#6b7280' }}>{formatDate(d.doc_date, lang)}</td>
                      <td className="table-td">{d.payee_name || d.description || '-'}</td>
                      <td className="table-td"><strong style={{ color: color }}>{fmtMoney(d.amount)}</strong></td>
                      <td className="table-td">
                        {d.status === 'posted'
                          ? <span className="badge-green">{t('مرحّل', 'Posted')}</span>
                          : <span className="badge-gold">{t('مسودة', 'Draft')}</span>}
                      </td>
                      <td className="table-td">
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-ghost" onClick={() => viewDetails(d)} title={t('عرض', 'View')} style={{ padding: 6 }}><Eye size={16} /></button>
                          {d.status === 'draft' && (
                            <button className="btn-ghost" onClick={() => postDraft(d.id)} title={t('ترحيل', 'Post')} style={{ padding: 6, color: 'var(--brand-500)' }} disabled={posting === d.id}>
                              {posting === d.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('مستند نقدي/بنكي جديد', 'New Cash/Bank Document')}</h2>
              <button className="btn-ghost" onClick={closeModal}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {/* Doc type selector */}
              <div>
                <label className="label">{t('نوع المستند', 'Document Type')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {(['receipt', 'payment', 'transfer'] as DocType[]).map((dt) => {
                    const Icon = docTypeIcon(dt);
                    const color = docTypeColor(dt);
                    return (
                      <button
                        key={dt}
                        onClick={() => setForm({ ...form, doc_type: dt })}
                        style={{
                          padding: '12px 8px', borderRadius: 10, border: form.doc_type === dt ? `2px solid ${color}` : '2px solid #e5e7eb',
                          background: form.doc_type === dt ? `${color}08` : '#fff', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                        }}
                      >
                        <Icon size={20} color={color} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{docTypeLabel(dt, t)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">{t('التاريخ', 'Date')}</label>
                  <input type="date" className="input" value={form.doc_date} onChange={(e) => setForm({ ...form, doc_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('المبلغ', 'Amount')} *</label>
                  <input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" dir="ltr" />
                </div>
              </div>

              {!isTransfer ? (
                <>
                  <div>
                    <label className="label">{t('حساب الصندوق/البنك', 'Cash/Bank Account')} *</label>
                    <select className="input" value={form.cash_bank_account_id} onChange={(e) => setForm({ ...form, cash_bank_account_id: e.target.value })}>
                      <option value="">{t('اختر...', 'Select...')}</option>
                      {accounts.filter((a) => a.account_code.startsWith('11')).map((a) => (
                        <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('حساب الطرف الآخر', 'Counterparty Account')} *</label>
                    <select className="input" value={form.counterparty_account_id} onChange={(e) => setForm({ ...form, counterparty_account_id: e.target.value })}>
                      <option value="">{t('اختر...', 'Select...')}</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{t('من حساب', 'From Account')} *</label>
                    <select className="input" value={form.from_account_id} onChange={(e) => setForm({ ...form, from_account_id: e.target.value })}>
                      <option value="">{t('اختر...', 'Select...')}</option>
                      {accounts.filter((a) => a.account_code.startsWith('11')).map((a) => (
                        <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('إلى حساب', 'To Account')} *</label>
                    <select className="input" value={form.to_account_id} onChange={(e) => setForm({ ...form, to_account_id: e.target.value })}>
                      <option value="">{t('اختر...', 'Select...')}</option>
                      {accounts.filter((a) => a.account_code.startsWith('11')).map((a) => (
                        <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="label">{t('اسم المستلم/المدفوع له', 'Payee Name')}</label>
                <input className="input" value={form.payee_name} onChange={(e) => setForm({ ...form, payee_name: e.target.value })} placeholder={t('اسم الجهة', 'Party name')} />
              </div>

              <div>
                <label className="label">{t('البيان', 'Description')}</label>
                <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder={t('تفاصيل العملية...', 'Transaction details...')} />
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280' }}>
                {form.doc_type === 'receipt' && t('القيد: مدين - الصندوق/البنك | دائن - حساب الطرف الآخر', 'Entry: Debit - Cash/Bank | Credit - Counterparty')}
                {form.doc_type === 'payment' && t('القيد: مدين - حساب الطرف الآخر | دائن - الصندوق/البنك', 'Entry: Debit - Counterparty | Credit - Cash/Bank')}
                {form.doc_type === 'transfer' && t('القيد: مدين - الحساب المستقبل | دائن - الحسال المصدر', 'Entry: Debit - To Account | Credit - From Account')}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-outline" onClick={() => save(false)} disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : t('حفظ كمسودة', 'Save Draft')}
                </button>
                <button className="btn-primary" onClick={() => save(true)} disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> {t('حفظ وترحيل', 'Save & Post')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewDoc && (
        <div className="modal-overlay" onClick={() => setViewDoc(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>{t('تفاصيل المستند', 'Document Details')}</h2>
              <button className="btn-ghost" onClick={() => setViewDoc(null)}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef0f3' }}>
                <span style={{ color: '#6b7280', fontSize: 13 }}>{t('رقم المستند', 'Doc Number')}</span>
                <strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{viewDoc.doc_number}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef0f3' }}>
                <span style={{ color: '#6b7280', fontSize: 13 }}>{t('النوع', 'Type')}</span>
                <span>{docTypeLabel(viewDoc.doc_type, t)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef0f3' }}>
                <span style={{ color: '#6b7280', fontSize: 13 }}>{t('التاريخ', 'Date')}</span>
                <span>{formatDate(viewDoc.doc_date, lang)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef0f3' }}>
                <span style={{ color: '#6b7280', fontSize: 13 }}>{t('المبلغ', 'Amount')}</span>
                <strong style={{ color: docTypeColor(viewDoc.doc_type) }}>{fmtMoney(viewDoc.amount)}</strong>
              </div>
              {viewDoc.payee_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef0f3' }}>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>{t('الجهة', 'Payee')}</span>
                  <span>{viewDoc.payee_name}</span>
                </div>
              )}
              {viewDoc.description && (
                <div style={{ padding: '8px 0', borderBottom: '1px solid #eef0f3' }}>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>{t('البيان', 'Description')}</span>
                  <p style={{ marginTop: 4, fontSize: 13 }}>{viewDoc.description}</p>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef0f3' }}>
                <span style={{ color: '#6b7280', fontSize: 13 }}>{t('الحالة', 'Status')}</span>
                {viewDoc.status === 'posted'
                  ? <span className="badge-green">{t('مرحّل', 'Posted')}</span>
                  : <span className="badge-gold">{t('مسودة', 'Draft')}</span>}
              </div>

              {viewLines.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} /> {t('القيد المحاسبي', 'Journal Entry')}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'start' }}>{t('الحساب', 'Account')}</th>
                        <th style={{ padding: '6px 8px', textAlign: 'start' }}>{t('مدين', 'Debit')}</th>
                        <th style={{ padding: '6px 8px', textAlign: 'start' }}>{t('دائن', 'Credit')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewLines.map((l, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #eef0f3' }}>
                          <td style={{ padding: '6px 8px' }}>{l.chart_accounts?.account_code} — {l.chart_accounts?.account_name}</td>
                          <td style={{ padding: '6px 8px', color: 'var(--brand-500)' }}>{l.debit > 0 ? fmtMoney(l.debit) : '-'}</td>
                          <td style={{ padding: '6px 8px', color: '#ef4444' }}>{l.credit > 0 ? fmtMoney(l.credit) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button className="btn-outline" onClick={() => window.print()} style={{ marginTop: 8 }}>
                <Printer size={16} /> {t('طباعة', 'Print')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
