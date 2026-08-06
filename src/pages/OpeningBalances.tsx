import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  Scale,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  ArrowDownCircle,
  ArrowUpCircle,
  Info,
  RefreshCw,
} from 'lucide-react';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_name_en: string | null;
  account_type: string;
}

interface BalanceRow {
  account_id: string;
  debit: number;
  credit: number;
}

const TYPE_META: Record<string, { ar: string; en: string; color: string; bg: string }> = {
  asset: { ar: 'أصول', en: 'Assets', color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)' },
  liability: { ar: 'خصوم', en: 'Liabilities', color: '#ef4444', bg: '#ef444415' },
  equity: { ar: 'حقوق ملكية', en: 'Equity', color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)' },
};

export default function OpeningBalances() {
  const { t, lang } = useLanguage();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<string, BalanceRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingEntryId, setExistingEntryId] = useState<string | null>(null);

  const balanceAccounts = ['asset', 'liability', 'equity'];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('chart_accounts')
      .select('id, account_code, account_name, account_name_en, account_type')
      .in('account_type', balanceAccounts)
      .order('account_type', { ascending: true })
      .order('account_code', { ascending: true });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const accs = (data as Account[]) || [];
    setAccounts(accs);

    const init: Record<string, BalanceRow> = {};
    accs.forEach((a) => {
      init[a.id] = { account_id: a.id, debit: 0, credit: 0 };
    });
    setBalances(init);

    // Check if an opening balances entry already exists
    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id, total_debit, total_credit, status')
      .eq('reference_type', 'manual')
      .ilike('description', '%أرصدة افتتاحية%')
      .limit(1);
    if (existing && existing.length > 0) {
      setExistingEntryId(existing[0].id);
      // Load existing lines
      const { data: lines } = await supabase
        .from('journal_lines')
        .select('account_id, debit, credit')
        .eq('entry_id', existing[0].id);
      if (lines) {
        lines.forEach((l: any) => {
          if (l.account_id && init[l.account_id]) {
            init[l.account_id] = {
              account_id: l.account_id,
              debit: Number(l.debit) || 0,
              credit: Number(l.credit) || 0,
            };
          }
        });
        setBalances({ ...init });
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalDebit = Object.values(balances).reduce((s, r) => s + (Number(r.debit) || 0), 0);
  const totalCredit = Object.values(balances).reduce((s, r) => s + (Number(r.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;
  const diff = Math.abs(totalDebit - totalCredit);

  const updateBalance = (accountId: string, field: 'debit' | 'credit', value: number) => {
    setBalances((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [field]: value,
        ...(field === 'debit' && value > 0 ? { credit: 0 } : {}),
        ...(field === 'credit' && value > 0 ? { debit: 0 } : {}),
      },
    }));
  };

  const resetAll = () => {
    const reset: Record<string, BalanceRow> = {};
    accounts.forEach((a) => {
      reset[a.id] = { account_id: a.id, debit: 0, credit: 0 };
    });
    setBalances(reset);
    setSuccess('');
    setError('');
  };

  const save = async (postNow: boolean) => {
    setError('');
    const filledRows = Object.values(balances).filter((r) => Number(r.debit) > 0 || Number(r.credit) > 0);
    if (filledRows.length === 0) {
      setError(t('لم يتم إدخال أي أرصدة', 'No balances entered'));
      return;
    }
    if (totalDebit !== totalCredit) {
      setError(t('الأرصدة غير متوازنة — المدين لا يساوي الدائن', 'Balances not balanced — debits do not equal credits'));
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const periodCode = today.slice(0, 7);
      const description = t('أرصدة افتتاحية - أول المدة', 'Opening Balances');

      if (existingEntryId) {
        // Update existing: delete old lines, insert new
        await supabase.from('journal_lines').delete().eq('entry_id', existingEntryId);
        const linePayloads = filledRows.map((r, i) => ({
          entry_id: existingEntryId,
          account_id: r.account_id,
          debit: Number(r.debit) || 0,
          credit: Number(r.credit) || 0,
          line_order: i,
        }));
        const { error: lineErr } = await supabase.from('journal_lines').insert(linePayloads);
        if (lineErr) throw lineErr;

        if (postNow) {
          const { error: postErr } = await supabase.rpc('post_journal_entry', { p_entry_id: existingEntryId });
          if (postErr) throw postErr;
        }
      } else {
        // Create new entry
        const { data: entryData, error: entryErr } = await supabase
          .from('journal_entries')
          .insert({
            entry_date: today,
            period_code: periodCode,
            description,
            reference_type: 'manual',
            status: 'draft',
          })
          .select()
          .single();
        if (entryErr) throw entryErr;

        const linePayloads = filledRows.map((r, i) => ({
          entry_id: entryData.id,
          account_id: r.account_id,
          debit: Number(r.debit) || 0,
          credit: Number(r.credit) || 0,
          line_order: i,
        }));
        const { error: lineErr } = await supabase.from('journal_lines').insert(linePayloads);
        if (lineErr) throw lineErr;

        if (postNow) {
          const { error: postErr } = await supabase.rpc('post_journal_entry', { p_entry_id: entryData.id });
          if (postErr) throw postErr;
        }
        setExistingEntryId(entryData.id);
      }

      setSuccess(postNow ? t('تم ترحيل الأرصدة الافتتاحية بنجاح', 'Opening balances posted successfully') : t('تم حفظ الأرصدة الافتتاحية', 'Opening balances saved'));
      setTimeout(() => setSuccess(''), 4000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('حدث خطأ أثناء الحفظ', 'Error saving'));
    } finally {
      setSaving(false);
    }
  };

  const grouped = accounts.reduce((acc, a) => {
    (acc[a.account_type] = acc[a.account_type] || []).push(a);
    return acc;
  }, {} as Record<string, Account[]>);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('الأرصدة الافتتاحية', 'Opening Balances')}</h1>
          <p className="page-subtitle">
            {t('إدخال أرصدة أول المدة — نقد، بنوك، مخزون، أصول، ديون، حقوق ملكية', 'Enter opening balances — cash, banks, inventory, assets, receivables, equity')}
          </p>
        </div>
        <button className="btn-outline" onClick={resetAll} disabled={loading}>
          <RefreshCw size={16} /> {t('تصفير', 'Reset')}
        </button>
      </div>

      {existingEntryId && (
        <div className="card" style={{ marginBottom: 16, padding: 14, borderColor: 'var(--brand-500)', background: 'rgba(var(--brand-rgb),0.08)' }}>
          <p style={{ color: 'var(--brand-500)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} /> {t('تم العثور على أرصدة افتتاحية محفوظة سابقاً — يمكنك تعديلها أو تحديثها', 'Existing opening balances found — you can edit or update them')}
          </p>
        </div>
      )}

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

      {/* Balance summary */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderRadius: 12,
          background: isBalanced ? 'rgba(var(--brand-rgb),0.06)' : totalDebit > 0 || totalCredit > 0 ? '#ef444410' : '#f9fafb',
          border: `2px solid ${isBalanced ? 'var(--brand-500)' : totalDebit > 0 || totalCredit > 0 ? '#ef4444' : '#e5e7eb'}`,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Scale size={24} color={isBalanced ? 'var(--brand-500)' : '#ef4444'} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: isBalanced ? 'var(--brand-500)' : '#1a2535' }}>
              {isBalanced ? t('الميزانية متوازنة', 'Balance Sheet Balanced') : t('الميزانية غير متوازنة', 'Not Balanced')}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {t('يجب أن يتساوى إجمالي المدين مع إجمالي الدائن', 'Total debits must equal total credits')}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{t('إجمالي المدين', 'Total Debit')}</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--brand-500)' }} dir="ltr">{totalDebit.toLocaleString()}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{t('إجمالي الدائن', 'Total Credit')}</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#ef4444' }} dir="ltr">{totalCredit.toLocaleString()}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{t('الفرق', 'Difference')}</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: diff === 0 ? 'var(--brand-500)' : '#ef4444' }} dir="ltr">{diff.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          {t('جارٍ التحميل...', 'Loading...')}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
          <Scale size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>{t('لا توجد حسابات أصول وخصوم وحقوق ملكية', 'No asset, liability, or equity accounts found')}</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            {t('ابدأ بتحميل دليل الحسابات الافتراضي من صفحة دليل الحسابات', 'Load the default chart of accounts first from the Chart of Accounts page')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {balanceAccounts.map((type) => {
            const accs = grouped[type];
            if (!accs || accs.length === 0) return null;
            const meta = TYPE_META[type];
            const typeDebit = accs.reduce((s, a) => s + (balances[a.id]?.debit || 0), 0);
            const typeCredit = accs.reduce((s, a) => s + (balances[a.id]?.credit || 0), 0);
            return (
              <div key={type} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 24,
                        borderRadius: 4,
                        background: meta.color,
                        display: 'inline-block',
                      }}
                    />
                    {t(meta.ar, meta.en)}
                  </h2>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {t('مدين', 'Debit')}: <span style={{ color: 'var(--brand-500)', fontWeight: 600 }} dir="ltr">{typeDebit.toLocaleString()}</span>
                    {' | '}
                    {t('دائن', 'Credit')}: <span style={{ color: '#ef4444', fontWeight: 600 }} dir="ltr">{typeCredit.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {accs.map((a) => {
                    const row = balances[a.id] || { account_id: a.id, debit: 0, credit: 0 };
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '60px 1fr 120px 120px',
                          gap: 10,
                          alignItems: 'center',
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: '#f9fafb',
                          border: '1px solid #eef0f3',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 12,
                            color: meta.color,
                            background: meta.bg,
                            padding: '4px 8px',
                            borderRadius: 6,
                            textAlign: 'center',
                          }}
                          dir="ltr"
                        >
                          {a.account_code}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{a.account_name}</div>
                          {a.account_name_en && <div style={{ fontSize: 10, color: '#9ca3af' }}>{a.account_name_en}</div>}
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--brand-500)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <ArrowDownCircle size={11} /> {t('مدين', 'Debit')}
                          </div>
                          <input
                            className="input"
                            type="number"
                            value={row.debit || ''}
                            onChange={(e) => updateBalance(a.id, 'debit', Number(e.target.value) || 0)}
                            placeholder="0"
                            style={{ fontSize: 13, padding: '8px 10px', textAlign: 'center' }}
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <ArrowUpCircle size={11} /> {t('دائن', 'Credit')}
                          </div>
                          <input
                            className="input"
                            type="number"
                            value={row.credit || ''}
                            onChange={(e) => updateBalance(a.id, 'credit', Number(e.target.value) || 0)}
                            placeholder="0"
                            style={{ fontSize: 13, padding: '8px 10px', textAlign: 'center' }}
                            dir="ltr"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Action bar */}
          <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', bottom: 0 }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              {isBalanced
                ? t('الميزانية متوازنة وجاهزة للحفظ', 'Balanced and ready to save')
                : t('أكمل إدخال الأرصدة حتى تتوازن الميزانية', 'Enter balances until the sheet balances')}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-outline" onClick={() => save(false)} disabled={saving || !isBalanced}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t('حفظ كمسودة', 'Save Draft')}
              </button>
              <button className="btn-primary" onClick={() => save(true)} disabled={saving || !isBalanced}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {t('حفظ وترحيل', 'Save & Post')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
