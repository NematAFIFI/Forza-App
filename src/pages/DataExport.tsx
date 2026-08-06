import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  Database, Download, Loader2, AlertCircle, CheckCircle2,
  FileText, FileSpreadsheet, FileCode, Shield, Lock, Server,
  CheckSquare, Square, Archive, Info, RefreshCw,
} from 'lucide-react';

interface TableInfo {
  name: string;
  label: { ar: string; en: string };
  category: string;
  count: number | null;
}

const TABLE_CATEGORIES: Record<string, { ar: string; en: string }> = {
  accounting: { ar: 'النظام المحاسبي', en: 'Accounting' },
  operations: { ar: 'العمليات الفندقية', en: 'Hotel Operations' },
  inventory: { ar: 'المخزون والمشتريات', en: 'Inventory & Purchasing' },
  users: { ar: 'المستخدمون والصلاحيات', en: 'Users & Access' },
  system: { ar: 'الإعدادات والنظام', en: 'System & Settings' },
};

const TABLES: Omit<TableInfo, 'count'>[] = [
  { name: 'chart_accounts', label: { ar: 'دليل الحسابات', en: 'Chart of Accounts' }, category: 'accounting' },
  { name: 'cost_centers', label: { ar: 'مراكز التكلفة', en: 'Cost Centers' }, category: 'accounting' },
  { name: 'journal_entries', label: { ar: 'القيود المحاسبية', en: 'Journal Entries' }, category: 'accounting' },
  { name: 'journal_lines', label: { ar: 'تفاصيل القيود', en: 'Journal Lines' }, category: 'accounting' },
  { name: 'journal_templates', label: { ar: 'قوالب القيود', en: 'Journal Templates' }, category: 'accounting' },
  { name: 'journal_template_lines', label: { ar: 'تفاصيل قوالب القيود', en: 'Template Lines' }, category: 'accounting' },
  { name: 'fiscal_periods', label: { ar: 'الفترات المالية', en: 'Fiscal Periods' }, category: 'accounting' },
  { name: 'invoices', label: { ar: 'الفواتير', en: 'Invoices' }, category: 'accounting' },
  { name: 'payments', label: { ar: 'المدفوعات', en: 'Payments' }, category: 'accounting' },
  { name: 'expenses', label: { ar: 'المصروفات', en: 'Expenses' }, category: 'accounting' },
  { name: 'settlements', label: { ar: 'التسويات', en: 'Settlements' }, category: 'accounting' },
  { name: 'bank_accounts', label: { ar: 'الحسابات البنكية', en: 'Bank Accounts' }, category: 'accounting' },
  { name: 'commissions', label: { ar: 'العمولات', en: 'Commissions' }, category: 'accounting' },

  { name: 'bookings', label: { ar: 'الحجوزات', en: 'Bookings' }, category: 'operations' },
  { name: 'room_types', label: { ar: 'أنواع الغرف', en: 'Room Types' }, category: 'operations' },
  { name: 'properties', label: { ar: 'العقارات', en: 'Properties' }, category: 'operations' },
  { name: 'units', label: { ar: 'الوحدات', en: 'Units' }, category: 'operations' },
  { name: 'services', label: { ar: 'الخدمات', en: 'Services' }, category: 'operations' },
  { name: 'service_orders', label: { ar: 'طلبات الخدمات', en: 'Service Orders' }, category: 'operations' },
  { name: 'shifts', label: { ar: 'الورديات', en: 'Shifts' }, category: 'operations' },
  { name: 'stay_history', label: { ar: 'سجل الإقامات', en: 'Stay History' }, category: 'operations' },
  { name: 'customers', label: { ar: 'العملاء', en: 'Customers' }, category: 'operations' },
  { name: 'system_clients', label: { ar: 'عملاء النظام', en: 'System Clients' }, category: 'operations' },

  { name: 'inventory_withdrawals', label: { ar: 'المخزون والصرف', en: 'Inventory' }, category: 'inventory' },

  { name: 'staff_users', label: { ar: 'الموظفون', en: 'Staff Users' }, category: 'users' },
  { name: 'user_sessions', label: { ar: 'جلسات المستخدمين', en: 'User Sessions' }, category: 'users' },
  { name: 'audit_log', label: { ar: 'سجل التدقيق', en: 'Audit Log' }, category: 'users' },

  { name: 'company_settings', label: { ar: 'إعدادات الشركة', en: 'Company Settings' }, category: 'system' },
  { name: 'branches', label: { ar: 'الفروع', en: 'Branches' }, category: 'system' },
];

type ExportFormat = 'csv' | 'json' | 'sql';

const FORMAT_META: Record<ExportFormat, { ar: string; en: string; icon: typeof FileText; ext: string; mime: string }> = {
  csv: { ar: 'Excel / CSV', en: 'Excel / CSV', icon: FileSpreadsheet, ext: 'csv', mime: 'text/csv;charset=utf-8' },
  json: { ar: 'JSON', en: 'JSON', icon: FileCode, ext: 'json', mime: 'application/json' },
  sql: { ar: 'SQL', en: 'SQL', icon: FileCode, ext: 'sql', mime: 'application/sql' },
};

export default function DataExport() {
  const { t, lang } = useLanguage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCounts = useCallback(async () => {
    setLoadingCounts(true);
    setError('');
    const newCounts: Record<string, number> = {};
    for (const tbl of TABLES) {
      try {
        const { count } = await supabase.from(tbl.name).select('*', { count: 'exact', head: true });
        newCounts[tbl.name] = count ?? 0;
      } catch {
        newCounts[tbl.name] = 0;
      }
    }
    setCounts(newCounts);
    setLoadingCounts(false);
  }, []);

  const toggleTable = (name: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name); else n.add(name);
      return n;
    });
  };

  const toggleCategory = (category: string) => {
    const catTables = TABLES.filter((t) => t.category === category).map((t) => t.name);
    const allSelected = catTables.every((n) => selected.has(n));
    setSelected((prev) => {
      const n = new Set(prev);
      if (allSelected) catTables.forEach((n2) => n.delete(n2));
      else catTables.forEach((n2) => n.add(n2));
      return n;
    });
  };

  const selectAll = () => setSelected(new Set(TABLES.map((t) => t.name)));
  const selectNone = () => setSelected(new Set());

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob(['\ufeff' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toCSV = (rows: any[]): string => {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(','));
    }
    return lines.join('\n');
  };

  const toSQL = (tableName: string, rows: any[]): string => {
    if (rows.length === 0) return `-- ${tableName}: no data\n`;
    const cols = Object.keys(rows[0]);
    const lines = [`-- Table: ${tableName} (${rows.length} rows)`, `-- Exported: ${new Date().toISOString()}`, ''];
    for (const row of rows) {
      const values = cols.map((c) => {
        const v = row[c];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
        if (typeof v === 'number') return String(v);
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      lines.push(`INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${values.join(', ')});`);
    }
    return lines.join('\n');
  };

  const doExport = async () => {
    if (selected.size === 0) {
      setError(t('اختر جدولاً واحداً على الأقل', 'Select at least one table'));
      return;
    }
    setExporting(true);
    setError('');
    setSuccess('');
    const tables = TABLES.filter((t) => selected.has(t.name));
    const stamp = new Date().toISOString().slice(0, 10);

    try {
      if (selected.size === 1) {
        // Single table — download directly
        const tbl = tables[0];
        setProgress(t('جارٍ تصدير', 'Exporting') + ' ' + t(tbl.label.ar, tbl.label.en) + '...');
        const { data, error: err } = await supabase.from(tbl.name).select('*').limit(10000);
        if (err) throw err;
        const rows = data || [];
        let content = '';
        if (format === 'csv') content = toCSV(rows);
        else if (format === 'json') content = JSON.stringify(rows, null, 2);
        else content = toSQL(tbl.name, rows);
        downloadBlob(content, `${tbl.name}-${stamp}.${FORMAT_META[format].ext}`, FORMAT_META[format].mime);
      } else {
        // Multiple tables — combine into one file
        const parts: string[] = [];
        for (let i = 0; i < tables.length; i++) {
          const tbl = tables[i];
          setProgress(`(${i + 1}/${tables.length}) ${t(tbl.label.ar, tbl.label.en)}...`);
          const { data, error: err } = await supabase.from(tbl.name).select('*').limit(10000);
          if (err) {
            parts.push(`-- ERROR exporting ${tbl.name}: ${err.message}\n`);
            continue;
          }
          const rows = data || [];
          if (format === 'csv') {
            parts.push(`=== ${tbl.name} ===\n${toCSV(rows)}`);
          } else if (format === 'json') {
            parts.push(`"${tbl.name}": ${JSON.stringify(rows, null, 2)}`);
          } else {
            parts.push(toSQL(tbl.name, rows));
          }
        }
        const content = format === 'json' ? `{${parts.join(',')}}` : parts.join('\n\n');
        downloadBlob(content, `hotel-backup-${stamp}.${FORMAT_META[format].ext}`, FORMAT_META[format].mime);
      }
      setSuccess(t('تم التصدير بنجاح', 'Export completed successfully'));
      setProgress('');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذر التصدير', 'Export failed'));
      setProgress('');
    } finally {
      setExporting(false);
    }
  };

  const totalRecords = Object.values(counts).reduce((s, c) => s + c, 0);
  const selectedCount = selected.size;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('تصدير البيانات والنسخ الاحتياطي', 'Data Export & Backup')}</h1>
          <p className="page-subtitle">{t('بياناتك ملكك — صدّرها في أي وقت بصيغة مفتوحة', 'Your data is yours — export anytime in open formats')}</p>
        </div>
        <button className="btn-outline" onClick={loadCounts} disabled={loadingCounts}>
          {loadingCounts ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {t('تحديث الأعداد', 'Refresh Counts')}
        </button>
      </div>

      {/* SLA promise banner */}
      <div className="card" style={{ padding: 16, marginBottom: 16, background: 'rgba(var(--brand-rgb),0.03)', borderColor: 'rgba(var(--brand-rgb),0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Shield size={20} color="var(--brand-500)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--brand-500)', marginBottom: 4 }}>
              {t('ضمان ملكية البيانات', 'Data Ownership Guarantee')}
            </p>
            <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
              {t(
                'بياناتك محفوظة مؤمنة، مشفرة، داخل المملكة، لا يمكن تعديلها أو حذفها سرياً، ويمكن استرجاعها أو تصديرها في أي لحظة طوال فترة الاحتفاظ القانونية، حتى لو توقفت الخدمة لأي سبب.',
                'Your data is secure, encrypted, stored within the Kingdom, cannot be secretly modified or deleted, and can be retrieved or exported at any time during the legal retention period — even if the service stops for any reason.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Security info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { icon: Lock, color: 'var(--brand-500)', title: t('التشفير', 'Encryption'), desc: t('TLS أثناء النقل والتخزين', 'TLS in transit & at rest') },
          { icon: Server, color: '#0ea5e9', title: t('التخزين', 'Storage'), desc: t('داخل المملكة العربية السعودية', 'Within Saudi Arabia') },
          { icon: Archive, color: '#f59e0b', title: t('الاحتفاظ', 'Retention'), desc: t('5 سنوات للفواتير (زاتكا)', '5 years for invoices (ZATCA)') },
          { icon: Database, color: 'var(--brand-500)', title: t('النسخ', 'Backup'), desc: t('قاعدة 3-2-1 — 3 نسخ', '3-2-1 rule — 3 copies') },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="card" style={{ padding: 14 }}>
              <Icon size={20} color={item.color} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{item.desc}</div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="card" style={{ padding: 14, marginBottom: 16, borderColor: '#ef4444', background: '#fef2f2' }}>
          <p style={{ color: '#dc2626', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} /> {error}
          </p>
        </div>
      )}
      {success && (
        <div className="card" style={{ padding: 14, marginBottom: 16, borderColor: 'var(--brand-500)', background: 'rgba(var(--brand-rgb),0.06)' }}>
          <p style={{ color: 'var(--brand-500)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} /> {success}
          </p>
        </div>
      )}

      {/* Format selector */}
      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <FileText size={16} color="var(--brand-500)" />
          <span style={{ fontWeight: 600, fontSize: 13 }}>{t('صيغة التصدير', 'Export Format')}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(Object.keys(FORMAT_META) as ExportFormat[]).map((f) => {
            const meta = FORMAT_META[f];
            const Icon = meta.icon;
            const active = format === f;
            return (
              <button
                key={f}
                onClick={() => setFormat(f)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                  borderRadius: 10, border: `2px solid ${active ? 'var(--brand-500)' : '#e5e7eb'}`,
                  background: active ? 'rgba(var(--brand-rgb),0.08)' : '#fff', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={18} color={active ? 'var(--brand-500)' : '#9ca3af'} />
                <span style={{ fontWeight: active ? 700 : 500, fontSize: 13, color: active ? 'var(--brand-500)' : '#6b7280' }}>
                  {t(meta.ar, meta.en)}
                </span>
              </button>
            );
          })}
        </div>
        {format === 'sql' && (
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Info size={12} /> {t('صيغة SQL تُنتج جمل INSERT قابلة للاستيراد في أي قاعدة بيانات', 'SQL format produces INSERT statements importable into any database')}
          </p>
        )}
      </div>

      {/* Table selection */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={16} color="var(--brand-500)" />
            <span style={{ fontWeight: 600, fontSize: 13 }}>{t('اختيار الجداول', 'Select Tables')}</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {selectedCount} / {TABLES.length} {t('محدد', 'selected')}
              {totalRecords > 0 && ` · ${totalRecords.toLocaleString()} ${t('سجل', 'records total')}`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={selectAll} style={{ fontSize: 12, padding: '4px 10px' }}>{t('تحديد الكل', 'Select All')}</button>
            <button className="btn-ghost" onClick={selectNone} style={{ fontSize: 12, padding: '4px 10px' }}>{t('إلغاء التحديد', 'Clear')}</button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {Object.entries(TABLE_CATEGORIES).map(([cat, catLabel]) => {
            const catTables = TABLES.filter((t2) => t2.category === cat);
            const allSelected = catTables.every((t2) => selected.has(t2.name));
            const someSelected = catTables.some((t2) => selected.has(t2.name));
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 6 }}
                >
                  {allSelected ? <CheckSquare size={15} color="var(--brand-500)" /> : <Square size={15} color={someSelected ? 'var(--brand-500)' : '#d1d5db'} />}
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#1a2535' }}>{t(catLabel.ar, catLabel.en)}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>({catTables.length})</span>
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
                  {catTables.map((tbl) => {
                    const isSel = selected.has(tbl.name);
                    const cnt = counts[tbl.name];
                    return (
                      <label
                        key={tbl.name}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                          padding: '8px 10px', borderRadius: 8,
                          background: isSel ? 'rgba(var(--brand-rgb),0.03)' : '#f9fafb',
                          border: `1px solid ${isSel ? 'rgba(var(--brand-rgb),0.19)' : '#eef0f3'}`,
                          transition: 'all 0.15s',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTable(tbl.name)}
                          style={{
                            width: 18, height: 18, borderRadius: 5, border: '1.5px solid',
                            borderColor: isSel ? 'var(--brand-500)' : '#d1d5db', background: isSel ? 'var(--brand-500)' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                          }}
                        >
                          {isSel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{t(tbl.label.ar, tbl.label.en)}</div>
                          <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }} dir="ltr">{tbl.name}</div>
                        </div>
                        {cnt !== undefined && (
                          <span style={{ fontSize: 10, color: '#9ca3af', padding: '2px 6px', background: '#f3f4f6', borderRadius: 10 }}>
                            {cnt.toLocaleString()}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export action bar */}
      <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', bottom: 0 }}>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          {progress || (selectedCount > 0
            ? t('جاهز للتصدير', 'Ready to export')
            : t('اختر جدولاً واحداً على الأقل', 'Select at least one table'))}
        </div>
        <button className="btn-primary" onClick={doExport} disabled={exporting || selectedCount === 0}>
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? t('جارٍ التصدير...', 'Exporting...') : t('تصدير', 'Export')}
        </button>
      </div>
    </div>
  );
}
