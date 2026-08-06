import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  Building2,
  Plus,
  X,
  Pencil,
  Trash2,
  Search,
  Layers,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';

interface CostCenter {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  category: 'profit' | 'service' | 'general';
  parent_id: string | null;
  description: string | null;
  distribution_method: string | null;
  is_active: boolean;
  sort_order: number;
  children?: CostCenter[];
}

const CATEGORY_META: Record<string, { ar: string; en: string; color: string; bg: string }> = {
  profit: { ar: 'مركز ربح', en: 'Profit Center', color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)' },
  service: { ar: 'مركز خدمة', en: 'Service Center', color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)' },
  general: { ar: 'إدارة عامة', en: 'General', color: 'var(--brand-500)', bg: 'rgba(var(--brand-rgb),0.08)' },
};

const emptyForm = {
  code: '',
  name: '',
  name_en: '',
  category: 'profit' as 'profit' | 'service' | 'general',
  parent_id: '' as string,
  description: '',
  distribution_method: '',
  is_active: true,
  sort_order: 0,
};

export default function CostCenters() {
  const { t, lang } = useLanguage();
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CostCenter | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('cost_centers')
      .select('*')
      .order('sort_order', { ascending: true });
    if (err) setError(err.message);
    setCenters((data as CostCenter[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buildTree = (flat: CostCenter[]): CostCenter[] => {
    const map = new Map<string, CostCenter>();
    const roots: CostCenter[] = [];
    flat.forEach((c) => map.set(c.id, { ...c, children: [] }));
    flat.forEach((c) => {
      const node = map.get(c.id)!;
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  const filtered = centers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.name_en || '').toLowerCase().includes(q);
  });

  const tree = buildTree(filtered);
  const flatForSelect = centers;

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

  const openAdd = () => {
    setForm(emptyForm);
    setEditMode(false);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (c: CostCenter) => {
    setForm({
      code: c.code,
      name: c.name,
      name_en: c.name_en || '',
      category: c.category,
      parent_id: c.parent_id || '',
      description: c.description || '',
      distribution_method: c.distribution_method || '',
      is_active: c.is_active,
      sort_order: c.sort_order,
    });
    setEditMode(true);
    setEditingId(c.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setEditMode(false);
    setEditingId(null);
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError(t('الرجاء إدخال الكود والاسم', 'Please enter code and name'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        category: form.category,
        parent_id: form.parent_id || null,
        description: form.description.trim() || null,
        distribution_method: form.distribution_method.trim() || null,
        is_active: form.is_active,
        sort_order: form.sort_order,
      };
      if (editMode && editingId) {
        const { error: err } = await supabase.from('cost_centers').update(payload).eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('cost_centers').insert(payload);
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
      const { error: err } = await supabase.from('cost_centers').delete().eq('id', deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر الحذف', 'Unable to delete'));
    }
  };

  const renderNode = (node: CostCenter, depth: number): React.ReactNode => {
    const meta = CATEGORY_META[node.category] || CATEGORY_META.profit;
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
              <Layers size={14} color="#d1d5db" />
            )}
          </button>
          <div
            style={{
              minWidth: 56,
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
            {node.code}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{node.name}</div>
            {node.name_en && <div style={{ fontSize: 11, color: '#9ca3af' }}>{node.name_en}</div>}
            {node.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{node.description}</div>}
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
          {node.distribution_method && (
            <span style={{ fontSize: 11, color: '#6b7280', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.distribution_method}
            </span>
          )}
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

  const stats = {
    profit: centers.filter((c) => c.category === 'profit').length,
    service: centers.filter((c) => c.category === 'service').length,
    general: centers.filter((c) => c.category === 'general').length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('مراكز التكلفة والأقسام', 'Cost Centers & Departments')}</h1>
          <p className="page-subtitle">
            {t('هيكل مراكز التكلفة الفندقية — مراكز الربح والخدمة والإدارة العامة', 'Hotel cost-center structure — profit, service, and general centers')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {centers.length === 0 && (
            <button className="btn-outline" onClick={seedDefaults} disabled={seeding}>
              {seeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {t('تحميل الهيكل الافتراضي', 'Load Default Template')}
            </button>
          )}
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={18} /> {t('إضافة مركز', 'Add Center')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {(['profit', 'service', 'general'] as const).map((cat) => {
          const meta = CATEGORY_META[cat];
          return (
            <div key={cat} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20} color={meta.color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: meta.color }}>{stats[cat]}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{t(meta.ar, meta.en)}</div>
              </div>
            </div>
          );
        })}
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
            <Building2 size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا توجد مراكز تكلفة بعد', 'No cost centers yet')}</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              {t('ابدأ بتحميل الهيكل الافتراضي أو أضف مركزاً جديداً', 'Start by loading the default template or add a new center')}
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
                {editMode ? t('تعديل مركز التكلفة', 'Edit Cost Center') : t('إضافة مركز تكلفة', 'Add Cost Center')}
              </h2>
              <button className="btn-ghost" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">{t('الكود *', 'Code *')}</label>
                  <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="101" dir="ltr" />
                </div>
                <div>
                  <label className="label">{t('النوع', 'Category')}</label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as 'profit' | 'service' | 'general' })}
                  >
                    <option value="profit">{t('مركز ربح (100)', 'Profit Center (100)')}</option>
                    <option value="service">{t('مركز خدمة (200)', 'Service Center (200)')}</option>
                    <option value="general">{t('إدارة عامة (300)', 'General (300)')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">{t('الاسم *', 'Name *')}</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('اسم المركز', 'Center name')} />
              </div>
              <div>
                <label className="label">{t('الاسم بالإنجليزية', 'English Name')}</label>
                <input className="input" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="English name" dir="ltr" />
              </div>
              <div>
                <label className="label">{t('المركز الأب', 'Parent Center')}</label>
                <select className="input" value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
                  <option value="">{t('— بدون —', '— None —')}</option>
                  {flatForSelect.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('الوصف', 'Description')}</label>
                <textarea
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder={t('وصف موجز للمركز', 'Brief description')}
                />
              </div>
              <div>
                <label className="label">{t('طريقة التوزيع', 'Distribution Method')}</label>
                <input
                  className="input"
                  value={form.distribution_method}
                  onChange={(e) => setForm({ ...form, distribution_method: e.target.value })}
                  placeholder={t('حسب المساحة / الإيرادات / بالتساوي', 'By area / revenue / equally')}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">{t('ترتيب العرض', 'Sort Order')}</label>
                  <input
                    className="input"
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="label">{t('الحالة', 'Status')}</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    />
                    <span style={{ fontSize: 14 }}>{form.is_active ? t('نشط', 'Active') : t('متوقف', 'Inactive')}</span>
                  </label>
                </div>
              </div>
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
                {t('هل أنت متأكد من حذف مركز', 'Are you sure you want to delete')} «{deleteTarget.name}»؟
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
