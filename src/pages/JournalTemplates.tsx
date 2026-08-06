import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  Zap,
  Plus,
  X,
  Pencil,
  Trash2,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
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

interface Template {
  id: string;
  template_code: string;
  template_name: string;
  trigger_event: string;
  description: string | null;
  is_active: boolean;
  lines?: TemplateLine[];
}

interface TemplateLine {
  id?: string;
  account_id: string;
  cost_center_id: string;
  side: 'debit' | 'credit';
  amount_source: string;
  fixed_amount: number;
  description: string;
}

const EVENT_META: Record<string, { ar: string; en: string }> = {
  invoice_issue: { ar: 'إصدار فاتورة', en: 'Invoice Issue' },
  payment_receive: { ar: 'قبض دفعة', en: 'Payment Receive' },
  inventory_withdraw: { ar: 'صرف مخزون', en: 'Inventory Withdraw' },
  payroll_post: { ar: 'ترحيل رواتب', en: 'Payroll Post' },
};

const AMOUNT_SOURCE_META: Record<string, { ar: string; en: string }> = {
  fixed: { ar: 'مبلغ ثابت', en: 'Fixed Amount' },
  invoice_total: { ar: 'إجمالي الفاتورة', en: 'Invoice Total' },
  invoice_subtotal: { ar: 'صافي الفاتورة', en: 'Invoice Subtotal' },
  invoice_tax: { ar: 'ضريبة الفاتورة', en: 'Invoice Tax' },
  payment_amount: { ar: 'مبلغ القبض', en: 'Payment Amount' },
  withdrawal_value: { ar: 'قيمة الصرف', en: 'Withdrawal Value' },
};

const emptyLine: Omit<TemplateLine, 'id'> = {
  account_id: '',
  cost_center_id: '',
  side: 'debit',
  amount_source: 'fixed',
  fixed_amount: 0,
  description: '',
};

export default function JournalTemplates() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  const [form, setForm] = useState({
    template_code: '',
    template_name: '',
    trigger_event: 'invoice_issue',
    description: '',
    is_active: true,
  });
  const [lines, setLines] = useState<Omit<TemplateLine, 'id'>[]>([{ ...emptyLine }, { ...emptyLine }]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [tRes, aRes, cRes] = await Promise.all([
      supabase.from('journal_templates').select('*').order('template_code', { ascending: true }),
      supabase.from('chart_accounts').select('id, account_code, account_name').order('account_code', { ascending: true }),
      supabase.from('cost_centers').select('id, code, name').order('code', { ascending: true }),
    ]);
    if (tRes.error) setError(tRes.error.message);
    setTemplates((tRes.data as Template[]) || []);
    setAccounts((aRes.data as Account[]) || []);
    setCostCenters((cRes.data as CostCenterLite[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setForm({ template_code: '', template_name: '', trigger_event: 'invoice_issue', description: '', is_active: true });
    setLines([{ ...emptyLine }, { ...emptyLine }]);
    setEditMode(false);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = async (tpl: Template) => {
    setForm({
      template_code: tpl.template_code,
      template_name: tpl.template_name,
      trigger_event: tpl.trigger_event,
      description: tpl.description || '',
      is_active: tpl.is_active,
    });
    const { data } = await supabase
      .from('journal_template_lines')
      .select('*')
      .eq('template_id', tpl.id)
      .order('line_order', { ascending: true });
    const tplLines = ((data as TemplateLine[]) || []).map((l) => ({
      account_id: l.account_id || '',
      cost_center_id: l.cost_center_id || '',
      side: l.side,
      amount_source: l.amount_source,
      fixed_amount: Number(l.fixed_amount) || 0,
      description: l.description || '',
    }));
    setLines(tplLines.length >= 2 ? tplLines : [...tplLines, { ...emptyLine }, ...tplLines]);
    setEditMode(true);
    setEditingId(tpl.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditMode(false);
    setEditingId(null);
  };

  const addLine = () => setLines([...lines, { ...emptyLine }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof Omit<TemplateLine, 'id'>, value: string | number) => {
    setLines(lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const save = async () => {
    if (!form.template_code.trim() || !form.template_name.trim()) {
      setError(t('الرجاء إدخال الكود والاسم', 'Please enter code and name'));
      return;
    }
    const validLines = lines.filter((l) => l.account_id);
    if (validLines.length < 2) {
      setError(t('القالب يحتاج إلى سطرين على الأقل', 'Template needs at least 2 lines'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        template_code: form.template_code.trim(),
        template_name: form.template_name.trim(),
        trigger_event: form.trigger_event,
        description: form.description.trim() || null,
        is_active: form.is_active,
      };
      let templateId = editingId;
      if (editMode && editingId) {
        const { error: err } = await supabase.from('journal_templates').update(payload).eq('id', editingId);
        if (err) throw err;
        await supabase.from('journal_template_lines').delete().eq('template_id', editingId);
      } else {
        const { data, error: err } = await supabase.from('journal_templates').insert(payload).select().single();
        if (err) throw err;
        templateId = data.id;
      }
      const linePayloads = validLines.map((l, i) => ({
        template_id: templateId,
        line_order: i,
        account_id: l.account_id,
        cost_center_id: l.cost_center_id || null,
        side: l.side,
        amount_source: l.amount_source,
        fixed_amount: Number(l.fixed_amount) || 0,
        description: l.description || null,
      }));
      const { error: lineErr } = await supabase.from('journal_template_lines').insert(linePayloads);
      if (lineErr) throw lineErr;
      closeModal();
      await load();
      setSuccess(editMode ? t('تم تحديث القالب', 'Template updated') : t('تم إنشاء القالب', 'Template created'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('حدث خطأ', 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error: err } = await supabase.from('journal_templates').delete().eq('id', deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر الحذف', 'Unable to delete'));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('قوالب القيود التلقائية', 'Auto-Entry Templates')}</h1>
          <p className="page-subtitle">
            {t('قوالب جاهزة لإنشاء القيود تلقائياً عند كل عملية', 'Templates for automatic journal entries on each transaction')}
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={18} /> {t('قالب جديد', 'New Template')}
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

      <div className="card" style={{ padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <Zap size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا توجد قوالب بعد', 'No templates yet')}</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              {t('أنشئ قوالب لإنشاء القيود تلقائياً عند إصدار الفاتورة، القبض، صرف المخزون، وغيرها', 'Create templates to auto-generate entries on invoice, payment, inventory, etc.')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {templates.map((tpl) => {
              const evMeta = EVENT_META[tpl.trigger_event] || EVENT_META.invoice_issue;
              return (
                <div
                  key={tpl.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: '#f9fafb',
                    border: '1px solid #eef0f3',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'rgba(var(--brand-rgb),0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Zap size={20} color="var(--brand-500)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {tpl.template_name}
                      <span style={{ fontSize: 11, color: '#9ca3af', marginRight: 8, fontFamily: 'monospace' }} dir="ltr">
                        ({tpl.template_code})
                      </span>
                    </div>
                    {tpl.description && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{tpl.description}</div>}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      borderRadius: 20,
                      color: 'var(--brand-500)',
                      background: 'rgba(var(--brand-rgb),0.08)',
                      fontWeight: 600,
                    }}
                  >
                    {t(evMeta.ar, evMeta.en)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 6,
                      color: tpl.is_active ? 'var(--brand-500)' : '#9ca3af',
                      background: tpl.is_active ? 'rgba(var(--brand-rgb),0.08)' : '#f3f4f6',
                    }}
                  >
                    {tpl.is_active ? t('نشط', 'Active') : t('متوقف', 'Inactive')}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" onClick={() => openEdit(tpl)} style={{ padding: 6 }} title={t('تعديل', 'Edit')}>
                      <Pencil size={15} />
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => setDeleteTarget(tpl)}
                      style={{ padding: 6, color: '#ef4444' }}
                      title={t('حذف', 'Delete')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                {editMode ? t('تعديل القالب', 'Edit Template') : t('قالب قيد تلقائي', 'New Auto-Entry Template')}
              </h2>
              <button className="btn-ghost" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">{t('كود القالب *', 'Template Code *')}</label>
                <input
                  className="input"
                  value={form.template_code}
                  onChange={(e) => setForm({ ...form, template_code: e.target.value })}
                  placeholder="INVOICE_ISSUE"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="label">{t('الحدث المُحفّز', 'Trigger Event')}</label>
                <select
                  className="input"
                  value={form.trigger_event}
                  onChange={(e) => setForm({ ...form, trigger_event: e.target.value })}
                >
                  {Object.entries(EVENT_META).map(([val, meta]) => (
                    <option key={val} value={val}>
                      {t(meta.ar, meta.en)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">{t('اسم القالب *', 'Template Name *')}</label>
              <input
                className="input"
                value={form.template_name}
                onChange={(e) => setForm({ ...form, template_name: e.target.value })}
                placeholder={t('إصدار فاتورة للنزيل', 'Invoice issue to guest')}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">{t('الوصف', 'Description')}</label>
              <input
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label className="label">{t('بنود القالب', 'Template Lines')}</label>
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 12 }}>
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 80px 1fr 32px',
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
                      <option value="">{t('مركز', 'Center')}</option>
                      {costCenters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      className="input"
                      value={line.side}
                      onChange={(e) => updateLine(idx, 'side', e.target.value)}
                      style={{ fontSize: 12, padding: '8px' }}
                    >
                      <option value="debit">{t('مدين', 'Debit')}</option>
                      <option value="credit">{t('دائن', 'Credit')}</option>
                    </select>
                  </div>
                  <div>
                    <select
                      className="input"
                      value={line.amount_source}
                      onChange={(e) => updateLine(idx, 'amount_source', e.target.value)}
                      style={{ fontSize: 12, padding: '8px' }}
                    >
                      {Object.entries(AMOUNT_SOURCE_META).map(([val, meta]) => (
                        <option key={val} value={val}>
                          {t(meta.ar, meta.en)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length <= 2}
                    style={{ padding: 8, color: '#ef4444' }}
                  >
                    <Trash2 size={14} />
                  </button>
                  {line.amount_source === 'fixed' && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <input
                        className="input"
                        type="number"
                        value={line.fixed_amount || ''}
                        onChange={(e) => updateLine(idx, 'fixed_amount', Number(e.target.value) || 0)}
                        placeholder={t('المبلغ الثابت', 'Fixed amount')}
                        style={{ fontSize: 12, padding: '8px' }}
                        dir="ltr"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button className="btn-outline" onClick={addLine} style={{ fontSize: 13, padding: '8px 14px', marginBottom: 16 }}>
              <Plus size={14} /> {t('إضافة سطر', 'Add Line')}
            </button>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span style={{ fontSize: 14 }}>{form.is_active ? t('القالب نشط', 'Template active') : t('القالب متوقف', 'Template inactive')}</span>
            </label>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={closeModal} disabled={saving}>
                {t('إلغاء', 'Cancel')}
              </button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {editMode ? t('حفظ التعديلات', 'Save Changes') : t('إنشاء', 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center', padding: 8 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#ef444415',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Trash2 size={26} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t('تأكيد الحذف', 'Confirm Delete')}</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                {t('هل أنت متأكد من حذف القالب', 'Delete template')} «{deleteTarget.template_name}»؟
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setDeleteTarget(null)}>
                {t('إلغاء', 'Cancel')}
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                <Trash2 size={16} /> {t('حذف', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
