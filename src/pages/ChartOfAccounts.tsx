import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  BookOpen,
  Plus,
  X,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronDown,
  FileText,
  RefreshCw,
} from 'lucide-react';

interface CostCenterLite {
  id: string;
  code: string;
  name: string;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_name_en: string | null;
  account_type: string;
  category_code: string | null;
  parent_id: string | null;
  cost_center_id: string | null;
  is_active: boolean;
  sort_order: number;
  children?: Account[];
}

const TYPE_META: Record<string, { ar: string; en: string; color: string; bg: string }> = {
  asset: { ar: 'أصول', en: 'Assets', color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)' },
  liability: { ar: 'خصوم', en: 'Liabilities', color: '#ef4444', bg: '#ef444415' },
  equity: { ar: 'حقوق ملكية', en: 'Equity', color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)' },
  revenue: { ar: 'إيرادات', en: 'Revenue', color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)' },
  direct_cost: { ar: 'تكاليف مباشرة', en: 'Direct Costs', color: '#f59e0b', bg: '#f59e0b15' },
  operating_expense: { ar: 'مصروفات تشغيلية', en: 'Operating Expenses', color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)' },
  admin_expense: { ar: 'مصروفات إدارية', en: 'Admin Expenses', color: '#8b5cf6', bg: '#8b5cf615' },
  other: { ar: 'أخرى', en: 'Other', color: '#6b7280', bg: '#6b728015' },
};

const emptyForm = {
  account_code: '',
  account_name: '',
  account_name_en: '',
  account_type: 'revenue',
  category_code: '',
  parent_id: '',
  cost_center_id: '',
  is_active: true,
  sort_order: 0,
};

export default function ChartOfAccounts() {
  const { t, lang } = useLanguage();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [accRes, ccRes] = await Promise.all([
      supabase.from('chart_accounts').select('*').order('sort_order', { ascending: true }),
      supabase.from('cost_centers').select('id, code, name').order('code', { ascending: true }),
    ]);
    if (accRes.error) setError(accRes.error.message);
    setAccounts((accRes.data as Account[]) || []);
    setCostCenters((ccRes.data as CostCenterLite[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buildTree = (flat: Account[]): Account[] => {
    const map = new Map<string, Account>();
    const roots: Account[] = [];
    flat.forEach((a) => map.set(a.id, { ...a, children: [] }));
    flat.forEach((a) => {
      const node = map.get(a.id)!;
      if (a.parent_id && map.has(a.parent_id)) {
        map.get(a.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  const filtered = accounts.filter((a) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || a.account_code.toLowerCase().includes(q) || a.account_name.toLowerCase().includes(q) || (a.account_name_en || '').toLowerCase().includes(q);
    const matchType = !filterType || a.account_type === filterType;
    return matchSearch && matchType;
  });

  const tree = buildTree(filtered);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seedDefaults = async () => {
    setSeeding(true);
    setError('');
    try {
      const { error: rpcErr } = await supabase.rpc('seed_default_chart_template');
      if (rpcErr) throw rpcErr;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر التحميل', 'Unable to seed'));
    } finally {
      setSeeding(false);
    }
  };

  const replaceDefaults = async () => {
    if (!window.confirm(t('سيتم استبدال جميع الحسابات الحالية بالدليل الكامل. هل أنت متأكد؟', 'This will replace all current accounts with the full chart. Are you sure?'))) return;
    setReplacing(true);
    setError('');
    try {
      const { error: rpcErr } = await supabase.rpc('replace_default_chart_template');
      if (rpcErr) throw rpcErr;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر الاستبدال', 'Unable to replace'));
    } finally {
      setReplacing(false);
    }
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditMode(false);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (a: Account) => {
    setForm({
      account_code: a.account_code,
      account_name: a.account_name,
      account_name_en: a.account_name_en || '',
      account_type: a.account_type,
      category_code: a.category_code || '',
      parent_id: a.parent_id || '',
      cost_center_id: a.cost_center_id || '',
      is_active: a.is_active,
      sort_order: a.sort_order,
    });
    setEditMode(true);
    setEditingId(a.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setEditMode(false);
    setEditingId(null);
  };

  const save = async () => {
    if (!form.account_code.trim() || !form.account_name.trim()) {
      setError(t('الرجاء إدخال الكود والاسم', 'Please enter code and name'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        account_code: form.account_code.trim(),
        account_name: form.account_name.trim(),
        account_name_en: form.account_name_en.trim() || null,
        account_type: form.account_type,
        category_code: form.category_code.trim() || null,
        parent_id: form.parent_id || null,
        cost_center_id: form.cost_center_id || null,
        is_active: form.is_active,
        sort_order: form.sort_order,
      };
      if (editMode && editingId) {
        const { error: err } = await supabase.from('chart_accounts').update(payload).eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('chart_accounts').insert(payload);
        if (err) throw err;
      }
      closeModal();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('حدث خطأ أثناء الحفظ', 'Error saving'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error: err } = await supabase.from('chart_accounts').delete().eq('id', deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر الحذف', 'Unable to delete'));
    }
  };

  const ccName = (id: string | null) => {
    if (!id) return null;
    const cc = costCenters.find((c) => c.id === id);
    return cc ? `${cc.code} — ${cc.name}` : null;
  };

  const renderNode = (node: Account, depth: number): React.ReactNode => {
    const meta = TYPE_META[node.account_type] || TYPE_META.other;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    return (
      <div key={node.id} style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <div
          className="table-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 12px',
            borderRadius: 8,
            marginBottom: 4,
            background: depth === 0 ? '#fff' : '#f9fafb',
            border: '1px solid #eef0f3',
            paddingRight: depth * 24 + 12,
          }}
        >
          <button
            onClick={() => hasChildren && toggleExpand(node.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: hasChildren ? 'pointer' : 'default',
              padding: 4,
              display: 'flex',
              opacity: hasChildren ? 1 : 0.2,
            }}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={16} color="#6b7280" /> : <ChevronLeft size={16} color="#6b7280" style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />
            ) : (
              <FileText size={14} color="#d1d5db" />
            )}
          </button>
          <div
            style={{
              minWidth: 60,
              fontWeight: 700,
              fontSize: 13,
              color: meta.color,
              background: meta.bg,
              padding: '4px 10px',
              borderRadius: 6,
              textAlign: 'center',
            }}
            dir="ltr"
          >
            {node.account_code}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{node.account_name}</div>
            {node.account_name_en && <div style={{ fontSize: 11, color: '#9ca3af' }}>{node.account_name_en}</div>}
            {ccName(node.cost_center_id) && (
              <div style={{ fontSize: 11, color: 'var(--brand-500)', marginTop: 2 }}>
                {t('مركز التكلفة:', 'Cost Center:')} {ccName(node.cost_center_id)}
              </div>
            )}
          </div>
          <span
            style={{
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 20,
              color: meta.color,
              background: meta.bg,
              fontWeight: 600,
            }}
          >
            {t(meta.ar, meta.en)}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '3px 8px',
              borderRadius: 6,
              color: node.is_active ? 'var(--brand-500)' : '#9ca3af',
              background: node.is_active ? 'rgba(var(--brand-rgb),0.08)' : '#f3f4f6',
            }}
          >
            {node.is_active ? t('نشط', 'Active') : t('متوقف', 'Inactive')}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn-ghost" onClick={() => openEdit(node)} title={t('تعديل', 'Edit')} style={{ padding: 6 }}>
              <Pencil size={15} />
            </button>
            <button
              className="btn-ghost"
              onClick={() => setDeleteTarget(node)}
              title={t('حذف', 'Delete')}
              style={{ padding: 6, color: '#ef4444' }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div style={{ marginTop: 2 }}>
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const typeCounts = Object.keys(TYPE_META).reduce((acc, type) => {
    acc[type] = accounts.filter((a) => a.account_type === type).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('دليل الحسابات الفندقي', 'Hotel Chart of Accounts')}</h1>
          <p className="page-subtitle">
            {t('الدليل الموحد للحسابات — متوافق مع USALI و ZATCA', 'Unified chart of accounts — USALI & ZATCA compliant')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {accounts.length === 0 && (
            <button className="btn-outline" onClick={seedDefaults} disabled={seeding}>
              {seeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {t('تحميل الدليل الافتراضي', 'Load Default Template')}
            </button>
          )}
          {accounts.length > 0 && (
            <button className="btn-outline" onClick={replaceDefaults} disabled={replacing} style={{ borderColor: 'var(--brand-400)', color: 'var(--brand-700)' }}>
              {replacing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {t('استبدال بالدليل الكامل', 'Replace with Full Chart')}
            </button>
          )}
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={18} /> {t('إضافة حساب', 'Add Account')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <div
            key={type}
            className="card"
            style={{
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              borderColor: filterType === type ? meta.color : '#eef0f3',
              borderWidth: filterType === type ? 2 : 1,
            }}
            onClick={() => setFilterType(filterType === type ? '' : type)}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={16} color={meta.color} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: meta.color }}>{typeCounts[type] || 0}</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>{t(meta.ar, meta.en)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            className="input"
            placeholder={t('ابحث بالكود أو الاسم...', 'Search by code or name...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingRight: 40 }}
          />
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, padding: 16, borderColor: '#ef4444', background: '#fef2f2' }}>
          <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>
        </div>
      )}

      <div className="card" style={{ padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : tree.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <BookOpen size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا توجد حسابات بعد', 'No accounts yet')}</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              {t('ابدأ بتحميل الدليل الافتراضي أو أضف حساباً جديداً', 'Start by loading the default template or add a new account')}
            </p>
          </div>
        ) : (
          <div>{tree.map((node) => renderNode(node, 0))}</div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                {editMode ? t('تعديل الحساب', 'Edit Account') : t('إضافة حساب', 'Add Account')}
              </h2>
              <button className="btn-ghost" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">{t('كود الحساب *', 'Account Code *')}</label>
                  <input className="input" value={form.account_code} onChange={(e) => setForm({ ...form, account_code: e.target.value })} placeholder="1101" dir="ltr" />
                </div>
                <div>
                  <label className="label">{t('النوع', 'Type')}</label>
                  <select className="input" value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })}>
                    {Object.entries(TYPE_META).map(([type, meta]) => (
                      <option key={type} value={type}>
                        {t(meta.ar, meta.en)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">{t('الاسم *', 'Name *')}</label>
                <input className="input" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder={t('اسم الحساب', 'Account name')} />
              </div>
              <div>
                <label className="label">{t('الاسم بالإنجليزية', 'English Name')}</label>
                <input className="input" value={form.account_name_en} onChange={(e) => setForm({ ...form, account_name_en: e.target.value })} placeholder="English name" dir="ltr" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">{t('كود المجموعة', 'Category Code')}</label>
                  <input className="input" value={form.category_code} onChange={(e) => setForm({ ...form, category_code: e.target.value })} placeholder="11" dir="ltr" />
                </div>
                <div>
                  <label className="label">{t('ترتيب العرض', 'Sort Order')}</label>
                  <input className="input" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} dir="ltr" />
                </div>
              </div>
              <div>
                <label className="label">{t('الحساب الأب', 'Parent Account')}</label>
                <select className="input" value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
                  <option value="">{t('— بدون —', '— None —')}</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_code} — {a.account_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('مركز التكلفة المرتبط', 'Linked Cost Center')}</label>
                <select className="input" value={form.cost_center_id} onChange={(e) => setForm({ ...form, cost_center_id: e.target.value })}>
                  <option value="">{t('— بدون —', '— None —')}</option>
                  {costCenters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <span style={{ fontSize: 14 }}>{form.is_active ? t('نشط', 'Active') : t('متوقف', 'Inactive')}</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={closeModal} disabled={saving}>
                {t('إلغاء', 'Cancel')}
              </button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? t('جارٍ الحفظ...', 'Saving...') : editMode ? t('حفظ التعديلات', 'Save Changes') : t('إنشاء', 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center', padding: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ef444415', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={26} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t('تأكيد الحذف', 'Confirm Delete')}</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                {t('هل أنت متأكد من حذف الحساب', 'Are you sure you want to delete account')} «{deleteTarget.account_name}»؟
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setDeleteTarget(null)}>
                {t('إلغاء', 'Cancel')}
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                <Trash2 size={16} /> {t('حذف نهائي', 'Delete Permanently')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
