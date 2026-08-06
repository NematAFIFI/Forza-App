import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { LifeBuoy, Plus, X, Pencil, Trash2, Search, Clock, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';

interface Ticket {
  id: string;
  client_id: string | null;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  system_clients?: { name: string; email: string; company_name: string | null } | null;
}

interface Client {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
}

interface TicketForm {
  client_id: string;
  subject: string;
  description: string;
  priority: string;
  category: string;
  status: string;
  assigned_to: string;
}

const emptyForm: TicketForm = {
  client_id: '',
  subject: '',
  description: '',
  priority: 'medium',
  category: '',
  status: 'open',
  assigned_to: '',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'var(--brand-500)',
  medium: '#f59e0b',
  high: '#f97316',
  urgent: '#ef4444',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#0ea5e9',
  in_progress: '#f59e0b',
  resolved: 'var(--brand-500)',
  closed: '#9ca3af',
};

export default function SupportTickets() {
  const { t, lang } = useLanguage();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TicketForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);
  const [error, setError] = useState('');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('support_tickets')
      .select('*, system_clients(name, email, company_name)')
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
    }
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  }, []);

  const loadClients = useCallback(async () => {
    const { data } = await supabase
      .from('system_clients')
      .select('id, name, email, company_name')
      .order('name', { ascending: true });
    setClients((data as Client[]) || []);
  }, []);

  useEffect(() => {
    loadTickets();
    loadClients();
  }, [loadTickets, loadClients]);

  const filtered = tickets.filter((tk) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || tk.subject?.toLowerCase().includes(q) || tk.system_clients?.name?.toLowerCase().includes(q) || tk.system_clients?.email?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || tk.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openAdd = () => {
    setForm(emptyForm);
    setEditMode(false);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (tk: Ticket) => {
    setForm({
      client_id: tk.client_id || '',
      subject: tk.subject || '',
      description: tk.description || '',
      priority: tk.priority || 'medium',
      category: tk.category || '',
      status: tk.status || 'open',
      assigned_to: tk.assigned_to || '',
    });
    setEditMode(true);
    setEditingId(tk.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setEditMode(false);
    setEditingId(null);
  };

  const saveTicket = async () => {
    if (!form.subject.trim()) {
      setError(t('الرجاء إدخال موضوع التذكرة', 'Please enter ticket subject'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        client_id: form.client_id || null,
        subject: form.subject.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        category: form.category.trim() || null,
        status: form.status,
        assigned_to: form.assigned_to.trim() || null,
        updated_at: new Date().toISOString(),
        resolved_at: form.status === 'resolved' || form.status === 'closed' ? new Date().toISOString() : null,
      };
      if (editMode && editingId) {
        const { error: err } = await supabase.from('support_tickets').update(payload).eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('support_tickets').insert(payload);
        if (err) throw err;
      }
      closeModal();
      await loadTickets();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('حدث خطأ أثناء الحفظ', 'An error occurred while saving');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error: err } = await supabase.from('support_tickets').delete().eq('id', deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null);
      await loadTickets();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('تعذر الحذف', 'Unable to delete');
      setError(msg);
    }
  };

  const formatDate = (d: string): string => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return d;
    }
  };

  const statusLabel = (s: string): string => {
    const map: Record<string, [string, string]> = {
      open: ['مفتوحة', 'Open'],
      in_progress: ['قيد المعالجة', 'In Progress'],
      resolved: ['تم الحل', 'Resolved'],
      closed: ['مغلقة', 'Closed'],
    };
    return map[s] ? map[s][lang === 'ar' ? 0 : 1] : s;
  };

  const priorityLabel = (p: string): string => {
    const map: Record<string, [string, string]> = {
      low: ['منخفضة', 'Low'],
      medium: ['متوسطة', 'Medium'],
      high: ['عالية', 'High'],
      urgent: ['عاجلة', 'Urgent'],
    };
    return map[p] ? map[p][lang === 'ar' ? 0 : 1] : p;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('تذاكر الدعم الفني', 'Support Tickets')}</h1>
          <p className="page-subtitle">{t('متابعة طلبات العملاء والمشاكل التقنية', 'Track client requests and technical issues')}</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={18} /> {t('تذكرة جديدة', 'New Ticket')}</button>
      </div>

      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder={t('ابحث بالموضوع أو العميل...', 'Search by subject or client...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
        </div>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
          <option value="all">{t('كل الحالات', 'All Statuses')}</option>
          <option value="open">{t('مفتوحة', 'Open')}</option>
          <option value="in_progress">{t('قيد المعالجة', 'In Progress')}</option>
          <option value="resolved">{t('تم الحل', 'Resolved')}</option>
          <option value="closed">{t('مغلقة', 'Closed')}</option>
        </select>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, padding: 16, borderColor: '#ef4444', background: '#fef2f2' }}>
          <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <LifeBuoy size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا توجد تذاكر دعم', 'No support tickets')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-th">{t('الموضوع', 'Subject')}</th>
                  <th className="table-th">{t('العميل', 'Client')}</th>
                  <th className="table-th">{t('الأولوية', 'Priority')}</th>
                  <th className="table-th">{t('الحالة', 'Status')}</th>
                  <th className="table-th">{t('المسؤول', 'Assigned')}</th>
                  <th className="table-th">{t('التاريخ', 'Date')}</th>
                  <th className="table-th">{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tk) => (
                  <tr key={tk.id} className="table-row">
                    <td className="table-td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MessageSquare size={16} color="#9ca3af" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{tk.subject}</div>
                          {tk.category && <div style={{ fontSize: 11, color: '#9ca3af' }}>{tk.category}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      {tk.system_clients ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{tk.system_clients.name}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{tk.system_clients.company_name || tk.system_clients.email}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                      )}
                    </td>
                    <td className="table-td">
                      <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_COLORS[tk.priority] || '#6b7280', background: `${PRIORITY_COLORS[tk.priority] || '#6b7280'}15`, padding: '3px 10px', borderRadius: 20 }}>
                        {priorityLabel(tk.priority)}
                      </span>
                    </td>
                    <td className="table-td">
                      <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[tk.status] || '#6b7280', background: `${STATUS_COLORS[tk.status] || '#6b7280'}15`, padding: '3px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {tk.status === 'resolved' || tk.status === 'closed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {statusLabel(tk.status)}
                      </span>
                    </td>
                    <td className="table-td" style={{ fontSize: 13, color: '#6b7280' }}>{tk.assigned_to || '-'}</td>
                    <td className="table-td" style={{ color: '#9ca3af', fontSize: 12 }}>{formatDate(tk.created_at)}</td>
                    <td className="table-td">
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-ghost" onClick={() => openEdit(tk)} title={t('تعديل', 'Edit')} style={{ padding: 6 }}><Pencil size={16} /></button>
                        <button className="btn-ghost" onClick={() => setDeleteTarget(tk)} title={t('حذف', 'Delete')} style={{ padding: 6, color: '#ef4444' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editMode ? t('تعديل التذكرة', 'Edit Ticket') : t('تذكرة دعم جديدة', 'New Support Ticket')}</h2>
              <button className="btn-ghost" onClick={closeModal}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="label">{t('العميل', 'Client')}</label>
                <select className="input" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">{t('— بدون عميل —', '— No client —')}</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                  ))}
                </select>
              </div>
              <div><label className="label">{t('الموضوع *', 'Subject *')}</label><input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t('مثال: مشكلة في تسجيل الدخول', 'e.g. Login issue')} /></div>
              <div><label className="label">{t('الوصف', 'Description')}</label><textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder={t('تفاصيل المشكلة', 'Issue details')} style={{ resize: 'vertical' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">{t('الأولوية', 'Priority')}</label>
                  <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">{t('منخفضة', 'Low')}</option>
                    <option value="medium">{t('متوسطة', 'Medium')}</option>
                    <option value="high">{t('عالية', 'High')}</option>
                    <option value="urgent">{t('عاجلة', 'Urgent')}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('الحالة', 'Status')}</label>
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="open">{t('مفتوحة', 'Open')}</option>
                    <option value="in_progress">{t('قيد المعالجة', 'In Progress')}</option>
                    <option value="resolved">{t('تم الحل', 'Resolved')}</option>
                    <option value="closed">{t('مغلقة', 'Closed')}</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">{t('التصنيف', 'Category')}</label><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder={t('مثال: فني', 'e.g. Technical')} /></div>
                <div><label className="label">{t('المسؤول', 'Assigned To')}</label><input className="input" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder={t('اسم الموظف', 'Staff name')} /></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={closeModal}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={saveTicket} disabled={saving}>{saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{t('تأكيد الحذف', 'Confirm Delete')}</h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>{t('هل أنت متأكد من حذف هذه التذكرة؟', 'Are you sure you want to delete this ticket?')}</p>
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
