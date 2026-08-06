import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  BookOpen,
  Plus,
  X,
  Trash2,
  Search,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
} from 'lucide-react';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

interface CostCenterLite {
  id: string;
  code: string;
  name: string;
}

interface JournalEntry {
  id: string;
  entry_number: string | null;
  entry_date: string;
  period_code: string | null;
  description: string | null;
  reference_type: string;
  status: 'draft' | 'posted';
  total_debit: number;
  total_credit: number;
  created_at: string;
}

interface JournalLine {
  id?: string;
  account_id: string;
  cost_center_id: string;
  debit: number;
  credit: number;
  description: string;
}

const emptyLine: Omit<JournalLine, 'id'> = {
  account_id: '',
  cost_center_id: '',
  debit: 0,
  credit: 0,
  description: '',
};

export default function JournalEntries() {
  const { t, lang } = useLanguage();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [viewLines, setViewLines] = useState<JournalLine[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);

  const [entryForm, setEntryForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    description: '',
    reference_type: 'manual',
  });
  const [lines, setLines] = useState<Omit<JournalLine, 'id'>[]>([
    { ...emptyLine },
    { ...emptyLine },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [eRes, aRes, cRes] = await Promise.all([
      supabase.from('journal_entries').select('*').order('entry_date', { ascending: false }).limit(100),
      supabase.from('chart_accounts').select('id, account_code, account_name').order('account_code', { ascending: true }),
      supabase.from('cost_centers').select('id, code, name').order('code', { ascending: true }),
    ]);
    if (eRes.error) setError(eRes.error.message);
    setEntries((eRes.data as JournalEntry[]) || []);
    setAccounts((aRes.data as Account[]) || []);
    setCostCenters((cRes.data as CostCenterLite[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = entries.filter((e) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || (e.entry_number || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const addLine = () => setLines([...lines, { ...emptyLine }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof Omit<JournalLine, 'id'>, value: string | number) => {
    setLines(lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const openCreate = () => {
    setEntryForm({ entry_date: new Date().toISOString().slice(0, 10), description: '', reference_type: 'manual' });
    setLines([{ ...emptyLine }, { ...emptyLine }]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const saveEntry = async (postNow: boolean) => {
    setError('');
    if (!entryForm.description.trim()) {
      setError(t('الرجاء إدخال البيان', 'Please enter a description'));
      return;
    }
    const validLines = lines.filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) {
      setError(t('القيد يحتاج إلى سطرين على الأقل', 'Entry needs at least 2 lines'));
      return;
    }
    if (totalDebit !== totalCredit) {
      setError(t('القيد غير متوازن', 'Entry is not balanced'));
      return;
    }
    setSaving(true);
    try {
      const periodCode = entryForm.entry_date.slice(0, 7);
      const { data: entryData, error: entryErr } = await supabase
        .from('journal_entries')
        .insert({
          entry_date: entryForm.entry_date,
          period_code: periodCode,
          description: entryForm.description.trim(),
          reference_type: entryForm.reference_type,
          status: 'draft',
        })
        .select()
        .single();
      if (entryErr) throw entryErr;

      const entryId = entryData.id;
      const linePayloads = validLines.map((l, i) => ({
        entry_id: entryId,
        account_id: l.account_id,
        cost_center_id: l.cost_center_id || null,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description || null,
        line_order: i,
      }));
      const { error: lineErr } = await supabase.from('journal_lines').insert(linePayloads);
      if (lineErr) throw lineErr;

      if (postNow) {
        const { error: postErr } = await supabase.rpc('post_journal_entry', { p_entry_id: entryId });
        if (postErr) throw postErr;
      }

      closeModal();
      await load();
      setSuccess(postNow ? t('تم ترحيل القيد بنجاح', 'Entry posted successfully') : t('تم حفظ القيد كمسودة', 'Entry saved as draft'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('حدث خطأ', 'Error occurred'));
    } finally {
      setSaving(false);
    }
  };

  const postDraft = async (id: string) => {
    setPosting(id);
    setError('');
    try {
      const { error: rpcErr } = await supabase.rpc('post_journal_entry', { p_entry_id: id });
      if (rpcErr) throw rpcErr;
      await load();
      setSuccess(t('تم ترحيل القيد', 'Entry posted'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر الترحيل', 'Unable to post'));
    } finally {
      setPosting(null);
    }
  };

  const viewDetails = async (entry: JournalEntry) => {
    setViewEntry(entry);
    const { data } = await supabase
      .from('journal_lines')
      .select('*, chart_accounts(account_code, account_name), cost_centers(code, name)')
      .eq('entry_id', entry.id)
      .order('line_order', { ascending: true });
    setViewLines((data as any) || []);
  };

  const accName = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.account_code} — ${a.account_name}` : '';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('القيود اليومية', 'Journal Entries')}</h1>
          <p className="page-subtitle">
            {t('القيود المحاسبية ثنائية الدخول — مدين ودائن', 'Double-entry journal — debit and credit')}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={18} /> {t('قيد جديد', 'New Entry')}
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

      <div className="card" style={{ marginBottom: 16, padding: 16, display: 'flex', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            className="input"
            placeholder={t('ابحث برقم القيد أو البيان...', 'Search by entry number or description...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingRight: 40 }}
          />
        </div>
        <select className="input" style={{ maxWidth: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
            <BookOpen size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا توجد قيود بعد', 'No journal entries yet')}</p>
          </div>
        ) : (
          <div>
            {filtered.map((e) => (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 12px',
                  borderRadius: 10,
                  marginBottom: 6,
                  background: '#f9fafb',
                  border: '1px solid #eef0f3',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: e.status === 'posted' ? 'rgba(var(--brand-rgb),0.08)' : '#f59e0b15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {e.status === 'posted' ? <CheckCircle2 size={20} color="var(--brand-500)" /> : <BookOpen size={20} color="#f59e0b" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {e.entry_number || `JE-${e.entry_date}`}
                    <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12, marginRight: 8 }} dir="ltr">
                      {e.entry_date}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{e.description}</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 90 }} dir="ltr">
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{t('مدين / دائن', 'Debit / Credit')}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {Number(e.total_debit).toLocaleString()} / {Number(e.total_credit).toLocaleString()}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 20,
                    color: e.status === 'posted' ? 'var(--brand-500)' : '#f59e0b',
                    background: e.status === 'posted' ? 'rgba(var(--brand-rgb),0.08)' : '#f59e0b15',
                    fontWeight: 600,
                  }}
                >
                  {e.status === 'posted' ? t('مرحّل', 'Posted') : t('مسودة', 'Draft')}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-ghost" onClick={() => viewDetails(e)} style={{ padding: 6 }} title={t('عرض', 'View')}>
                    <Eye size={15} />
                  </button>
                  {e.status === 'draft' && (
                    <button
                      className="btn-ghost"
                      onClick={() => postDraft(e.id)}
                      disabled={posting === e.id}
                      style={{ padding: 6, color: 'var(--brand-500)' }}
                      title={t('ترحيل', 'Post')}
                    >
                      {posting === e.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('قيد محاسبي جديد', 'New Journal Entry')}</h2>
              <button className="btn-ghost" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">{t('التاريخ', 'Date')}</label>
                <input
                  className="input"
                  type="date"
                  value={entryForm.entry_date}
                  onChange={(e) => setEntryForm({ ...entryForm, entry_date: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="label">{t('النوع', 'Reference Type')}</label>
                <select
                  className="input"
                  value={entryForm.reference_type}
                  onChange={(e) => setEntryForm({ ...entryForm, reference_type: e.target.value })}
                >
                  <option value="manual">{t('يدوي', 'Manual')}</option>
                  <option value="invoice">{t('فاتورة', 'Invoice')}</option>
                  <option value="payment">{t('قبض', 'Payment')}</option>
                  <option value="inventory">{t('مخزون', 'Inventory')}</option>
                  <option value="payroll">{t('رواتب', 'Payroll')}</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">{t('البيان *', 'Description *')}</label>
              <input
                className="input"
                value={entryForm.description}
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                placeholder={t('وصف العملية', 'Transaction description')}
              />
            </div>

            {/* Lines */}
            <div style={{ marginBottom: 8 }}>
              <label className="label">{t('بنود القيد', 'Entry Lines')}</label>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 90px 90px 32px',
                    gap: 6,
                    marginBottom: 6,
                    alignItems: 'end',
                  }}
                >
                  <div>
                    <select
                      className="input"
                      value={line.account_id}
                      onChange={(e) => updateLine(idx, 'account_id', e.target.value)}
                      style={{ fontSize: 12, padding: '8px' }}
                    >
                      <option value="">{t('الحساب', 'Account')}</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.account_code} — {a.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      className="input"
                      value={line.cost_center_id}
                      onChange={(e) => updateLine(idx, 'cost_center_id', e.target.value)}
                      style={{ fontSize: 12, padding: '8px' }}
                    >
                      <option value="">{t('مركز تكلفة', 'Cost Center')}</option>
                      {costCenters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--brand-500)', marginBottom: 2 }}>
                      <ArrowDownCircle size={12} /> {t('مدين', 'Debit')}
                    </div>
                    <input
                      className="input"
                      type="number"
                      value={line.debit || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        updateLine(idx, 'debit', val);
                        if (val > 0) updateLine(idx, 'credit', 0);
                      }}
                      style={{ fontSize: 12, padding: '8px', textAlign: 'center' }}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#ef4444', marginBottom: 2 }}>
                      <ArrowUpCircle size={12} /> {t('دائن', 'Credit')}
                    </div>
                    <input
                      className="input"
                      type="number"
                      value={line.credit || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        updateLine(idx, 'credit', val);
                        if (val > 0) updateLine(idx, 'debit', 0);
                      }}
                      style={{ fontSize: 12, padding: '8px', textAlign: 'center' }}
                      dir="ltr"
                    />
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length <= 2}
                    style={{ padding: 8, color: '#ef4444' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button className="btn-outline" onClick={addLine} style={{ fontSize: 13, padding: '8px 14px', marginBottom: 12 }}>
              <Plus size={14} /> {t('إضافة سطر', 'Add Line')}
            </button>

            {/* Totals */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 10,
                background: isBalanced ? 'rgba(var(--brand-rgb),0.06)' : totalDebit > 0 || totalCredit > 0 ? '#ef444410' : '#f9fafb',
                border: `1px solid ${isBalanced ? 'rgba(var(--brand-rgb),0.25)' : '#eef0f3'}`,
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{t('إجمالي المدين', 'Total Debit')}: </span>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--brand-500)' }} dir="ltr">{totalDebit.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{t('إجمالي الدائن', 'Total Credit')}: </span>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#ef4444' }} dir="ltr">{totalCredit.toLocaleString()}</span>
              </div>
              <div>
                {isBalanced ? (
                  <span style={{ color: 'var(--brand-500)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={16} /> {t('متوازن', 'Balanced')}
                  </span>
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 13 }}>
                    {t('الفرق', 'Diff')}: <span dir="ltr">{Math.abs(totalDebit - totalCredit).toLocaleString()}</span>
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={closeModal} disabled={saving}>
                {t('إلغاء', 'Cancel')}
              </button>
              <button className="btn-outline" onClick={() => saveEntry(false)} disabled={saving || !isBalanced}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                {t('حفظ كمسودة', 'Save Draft')}
              </button>
              <button className="btn-primary" onClick={() => saveEntry(true)} disabled={saving || !isBalanced}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {t('حفظ وترحيل', 'Save & Post')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewEntry && (
        <div className="modal-overlay" onClick={() => setViewEntry(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('تفاصيل القيد', 'Entry Details')}</h2>
              <button className="btn-ghost" onClick={() => setViewEntry(null)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{t('التاريخ', 'Date')}: <span dir="ltr"> {viewEntry.entry_date}</span></div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{viewEntry.description}</div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', textAlign: 'right' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: '#6b7280' }}>{t('الحساب', 'Account')}</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--brand-500)', textAlign: 'center' }}>{t('مدين', 'Debit')}</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: '#ef4444', textAlign: 'center' }}>{t('دائن', 'Credit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewLines.map((l: any, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #eef0f3' }}>
                      <td style={{ padding: '10px 12px' }}>
                        {l.chart_accounts ? `${l.chart_accounts.account_code} — ${l.chart_accounts.account_name}` : '—'}
                        {l.cost_centers && <span style={{ fontSize: 11, color: 'var(--brand-500)', display: 'block' }}>{l.cost_centers.code} — {l.cost_centers.name}</span>}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--brand-500)' }} dir="ltr">{Number(l.debit).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#ef4444' }} dir="ltr">{Number(l.credit).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb', fontWeight: 700 }}>
                    <td style={{ padding: '10px 12px' }}>{t('الإجمالي', 'Total')}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--brand-500)' }} dir="ltr">{Number(viewEntry.total_debit).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#ef4444' }} dir="ltr">{Number(viewEntry.total_credit).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
