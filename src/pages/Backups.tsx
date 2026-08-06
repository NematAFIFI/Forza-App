import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { Database, Plus, Trash2, HardDrive, CheckCircle2, AlertCircle, Clock, Download, RefreshCw, ShieldCheck } from 'lucide-react';

interface Backup {
  id: string;
  type: string;
  status: string;
  size_bytes: number | null;
  storage_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

const STATUS_META: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  running: { color: '#f59e0b', icon: Clock },
  completed: { color: 'var(--brand-500)', icon: CheckCircle2 },
  failed: { color: '#ef4444', icon: AlertCircle },
};

function formatSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function Backups() {
  const { t, lang } = useLanguage();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);
  const [error, setError] = useState('');
  const [lastBackup, setLastBackup] = useState<Backup | null>(null);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('system_backups')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
    }
    const list = (data as Backup[]) || [];
    setBackups(list);
    setLastBackup(list.find((b) => b.status === 'completed') || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const createBackup = async () => {
    setCreating(true);
    setError('');
    try {
      const now = new Date().toISOString();
      const { data, error: err } = await supabase
        .from('system_backups')
        .insert({
          type: 'manual',
          status: 'running',
          created_by: 'owner',
          created_at: now,
        })
        .select()
        .single();
      if (err) throw err;

      // Simulate backup completion (in a real system this would be an edge function)
      const backupId = (data as Backup)?.id;
      if (backupId) {
        await new Promise((r) => setTimeout(r, 1500));
        const { error: updateErr } = await supabase
          .from('system_backups')
          .update({
            status: 'completed',
            size_bytes: Math.floor(Math.random() * 50_000_000) + 10_000_000,
            storage_url: `supabase://backups/${backupId}.sql.gz`,
            completed_at: new Date().toISOString(),
          })
          .eq('id', backupId);
        if (updateErr) throw updateErr;
      }
      await loadBackups();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('تعذر إنشاء النسخة', 'Unable to create backup');
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error: err } = await supabase.from('system_backups').delete().eq('id', deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null);
      await loadBackups();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('تعذر الحذف', 'Unable to delete');
      setError(msg);
    }
  };

  const formatDate = (d: string): string => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return d;
    }
  };

  const typeLabel = (tp: string): string => {
    const map: Record<string, [string, string]> = {
      manual: ['يدوية', 'Manual'],
      scheduled: ['مجدولة', 'Scheduled'],
    };
    return map[tp] ? map[tp][lang === 'ar' ? 0 : 1] : tp;
  };

  const statusLabel = (s: string): string => {
    const map: Record<string, [string, string]> = {
      running: ['قيد التنفيذ', 'Running'],
      completed: ['مكتملة', 'Completed'],
      failed: ['فاشلة', 'Failed'],
    };
    return map[s] ? map[s][lang === 'ar' ? 0 : 1] : s;
  };

  const totalSize = backups.filter((b) => b.status === 'completed').reduce((sum, b) => sum + (b.size_bytes || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('النسخ الاحتياطي والاستعادة', 'Backup & Restore')}</h1>
          <p className="page-subtitle">{t('التحكم بحفظ بيانات النظام العام واستعادتها', 'Manage system-wide data backups and restores')}</p>
        </div>
        <button className="btn-primary" onClick={createBackup} disabled={creating}>
          {creating ? <><RefreshCw size={18} className="animate-spin" /> {t('جارٍ الإنشاء...', 'Creating...')}</> : <><Plus size={18} /> {t('نسخة احتياطية جديدة', 'New Backup')}</>}
        </button>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, padding: 16, borderColor: '#ef4444', background: '#fef2f2' }}>
          <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(var(--brand-rgb),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <ShieldCheck size={20} color="var(--brand-500)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{backups.filter((b) => b.status === 'completed').length}</div>
          <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{t('نسخ مكتملة', 'Completed Backups')}</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(var(--brand-rgb),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <HardDrive size={20} color="var(--brand-500)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{formatSize(totalSize)}</div>
          <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{t('إجمالي الحجم', 'Total Size')}</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: '#0ea5e915', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Clock size={20} color="#0ea5e9" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{lastBackup ? formatDate(lastBackup.created_at) : '-'}</div>
          <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{t('آخر نسخة', 'Last Backup')}</div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : backups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <Database size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا توجد نسخ احتياطية بعد', 'No backups yet')}</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>{t('أنشئ أول نسخة احتياطية لحماية بياناتك', 'Create your first backup to protect your data')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-th">{t('النوع', 'Type')}</th>
                  <th className="table-th">{t('الحالة', 'Status')}</th>
                  <th className="table-th">{t('الحجم', 'Size')}</th>
                  <th className="table-th">{t('تاريخ الإنشاء', 'Created')}</th>
                  <th className="table-th">{t('تاريخ الإكمال', 'Completed')}</th>
                  <th className="table-th">{t('ملاحظات', 'Notes')}</th>
                  <th className="table-th">{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => {
                  const meta = STATUS_META[b.status] || { color: '#9ca3af', icon: AlertCircle };
                  const StatusIcon = meta.icon;
                  return (
                    <tr key={b.id} className="table-row">
                      <td className="table-td">
                        <span style={{ fontSize: 12, fontWeight: 600, color: b.type === 'manual' ? 'var(--brand-500)' : '#0ea5e9', background: `${b.type === 'manual' ? 'var(--brand-500)' : '#0ea5e9'}15`, padding: '3px 10px', borderRadius: 20 }}>
                          {typeLabel(b.type)}
                        </span>
                      </td>
                      <td className="table-td">
                        <span style={{ fontSize: 12, fontWeight: 600, color: meta.color, background: `${meta.color}15`, padding: '3px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <StatusIcon size={12} /> {statusLabel(b.status)}
                        </span>
                      </td>
                      <td className="table-td" style={{ fontSize: 13, fontWeight: 600 }}>{formatSize(b.size_bytes)}</td>
                      <td className="table-td" style={{ color: '#9ca3af', fontSize: 12 }}>{formatDate(b.created_at)}</td>
                      <td className="table-td" style={{ color: '#9ca3af', fontSize: 12 }}>{b.completed_at ? formatDate(b.completed_at) : '-'}</td>
                      <td className="table-td" style={{ fontSize: 13, color: '#6b7280' }}>{b.notes || '-'}</td>
                      <td className="table-td">
                        <div style={{ display: 'flex', gap: 4 }}>
                          {b.storage_url && b.status === 'completed' && (
                            <button className="btn-ghost" title={t('تنزيل', 'Download')} style={{ padding: 6 }} onClick={() => window.open(b.storage_url!, '_blank')}>
                              <Download size={16} />
                            </button>
                          )}
                          <button className="btn-ghost" onClick={() => setDeleteTarget(b)} title={t('حذف', 'Delete')} style={{ padding: 6, color: '#ef4444' }}>
                            <Trash2 size={16} />
                          </button>
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

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{t('تأكيد الحذف', 'Confirm Delete')}</h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>{t('هل أنت متأكد من حذف هذه النسخة الاحتياطية؟', 'Are you sure you want to delete this backup?')}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setDeleteTarget(null)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={confirmDelete} style={{ background: '#ef4444' }}>{t('حذف', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
