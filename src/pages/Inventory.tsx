import { useState, useEffect, useMemo } from 'react';
import { supabase, type Service, type InventoryWithdrawal } from '../lib/supabase';
import { Plus, Boxes, Search, Trash2, AlertTriangle, X, MinusCircle, History, Printer, Archive, ArchiveRestore } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { toggleArchive } from '../lib/archive';

interface ItemForm {
  name: string;
  price: string;
  stock: string;
  low_stock_threshold: string;
  description: string;
}

interface WithdrawForm {
  quantity: string;
  reason: string;
}

const emptyForm: ItemForm = { name: '', price: '', stock: '', low_stock_threshold: '5', description: '' };
const emptyWithdraw: WithdrawForm = { quantity: '1', reason: '' };

export default function Inventory() {
  const { t } = useLanguage();
  const [items, setItems] = useState<Service[]>([]);
  const [withdrawals, setWithdrawals] = useState<InventoryWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [withdrawItem, setWithdrawItem] = useState<Service | null>(null);
  const [withdrawForm, setWithdrawForm] = useState<WithdrawForm>(emptyWithdraw);
  const [withdrawSaving, setWithdrawSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'error'; msg: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const showToast = (type: 'success' | 'warning' | 'error', msg: string): void => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const load = async (): Promise<void> => {
    setLoading(true);
    const [iRes, wRes] = await Promise.all([
      supabase.from('services').select('*').eq('category', 'inventory').order('created_at', { ascending: false }),
      supabase.from('inventory_withdrawals').select('*, service:services(*)').order('created_at', { ascending: false }).limit(50),
    ]);
    if (iRes.data) setItems(iRes.data as Service[]);
    if (wRes.data) setWithdrawals(wRes.data as InventoryWithdrawal[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo((): Service[] => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if ((i.archived === true) !== showArchived) return false;
      if (!q) return true;
      return (i.name || '').toLowerCase().includes(q);
    });
  }, [items, search, showArchived]);

  const lowStockItems = useMemo((): Service[] => {
    return items.filter((i) => (i.stock ?? 0) <= (i.low_stock_threshold ?? 5));
  }, [items]);

  const save = async (): Promise<void> => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert(t('يجب تسجيل الدخول أولاً', 'Please sign in first'));
      setSaving(false);
      return;
    }
    const { error } = await supabase.from('services').insert({
      name: form.name || null,
      category: 'inventory',
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 5,
      description: form.description || null,
      is_active: true,
      user_id: user.id,
    });
    setSaving(false);
    if (error) {
      alert(t('تعذّر حفظ الصنف', 'Failed to save item') + ': ' + error.message);
      return;
    }
    setModalOpen(false);
    setForm(emptyForm);
    void load();
  };

  const remove = async (id: string): Promise<void> => {
    await supabase.from('services').delete().eq('id', id);
    void load();
  };

  const archiveItem = async (i: Service): Promise<void> => { await toggleArchive('services', i.id, i.archived === true); void load(); };

  const updateStock = async (id: string, stock: number): Promise<void> => {
    await supabase.from('services').update({ stock }).eq('id', id);
    void load();
  };

  const openWithdraw = (item: Service): void => {
    setWithdrawItem(item);
    setWithdrawForm(emptyWithdraw);
  };

  const submitWithdraw = async (): Promise<void> => {
    if (!withdrawItem) return;
    const qty = Number(withdrawForm.quantity) || 0;
    if (qty <= 0) {
      showToast('error', t('الكمية يجب أن تكون أكبر من صفر', 'Quantity must be greater than zero'));
      return;
    }
    const currentStock = withdrawItem.stock ?? 0;
    if (qty > currentStock) {
      showToast('error', t('الكمية المطلوبة أكبر من المتوفر', 'Requested quantity exceeds available stock'));
      return;
    }
    setWithdrawSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('error', t('يجب تسجيل الدخول أولاً', 'Please sign in first'));
      setWithdrawSaving(false);
      return;
    }
    const newStock = currentStock - qty;
    const { error: updErr } = await supabase.from('services').update({ stock: newStock }).eq('id', withdrawItem.id);
    if (updErr) {
      showToast('error', t('تعذّر تحديث الكمية', 'Failed to update stock') + ': ' + updErr.message);
      setWithdrawSaving(false);
      return;
    }
    const { error: wErr } = await supabase.from('inventory_withdrawals').insert({
      service_id: withdrawItem.id,
      quantity: qty,
      reason: withdrawForm.reason || null,
      user_id: user.id,
    });
    setWithdrawSaving(false);
    if (wErr) {
      showToast('warning', t('تم خصم الكمية لكن لم يُسجل طلب السحب', 'Stock deducted but withdrawal record failed') + ': ' + wErr.message);
      void load();
      setWithdrawItem(null);
      return;
    }
    setWithdrawItem(null);
    void load();
    if (newStock <= (withdrawItem.low_stock_threshold ?? 5)) {
      showToast('warning', t('تمت عملية السحب. تنبيه: الكمية المتبقية لـ "' + (withdrawItem.name || '') + '" منخفضة (' + newStock + ')', 'Withdrawal completed. Alert: remaining stock for "' + (withdrawItem.name || '') + '" is low (' + newStock + ')'));
    } else {
      showToast('success', t('تمت عملية السحب بنجاح. المتبقي: ' + newStock, 'Withdrawal completed successfully. Remaining: ' + newStock));
    }
  };

  const printWithdrawal = (data: { item: string; qty: number; reason: string | null; date: string; remaining?: number }): void => {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const isAr = t('ar', 'en') === 'ar';
    const dir = isAr ? 'rtl' : 'ltr';
    const title = isAr ? 'طلب سحب من المخزون' : 'Inventory Withdrawal Request';
    const labels = isAr
      ? { item: 'الصنف', qty: 'الكمية المسحوبة', reason: 'السبب', date: 'التاريخ', remaining: 'المتبقي', footer: 'تم إنشاء هذا الطلب بواسطة نظام رصان لإدارة الفنادق' }
      : { item: 'Item', qty: 'Quantity Withdrawn', reason: 'Reason', date: 'Date', remaining: 'Remaining', footer: 'Generated by Riwaaq Hotel Management System' };
    win.document.write(`<!DOCTYPE html><html dir="${dir}" lang="${isAr ? 'ar' : 'en'}"><head><meta charset="utf-8"><title>${title}</title><style>
      *{font-family:'Segoe UI',Tahoma,Arial,sans-serif;box-sizing:border-box}
      body{margin:0;padding:40px;color:#1f2937}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid var(--brand-500);padding-bottom:20px;margin-bottom:30px}
      .header h1{font-size:24px;margin:0;color:#1f2937}
      .header .meta{text-align:${isAr ? 'left' : 'right'};font-size:13px;color:#6b7280}
      .header .meta .num{font-weight:700;color:var(--brand-500);font-size:15px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px}
      .info-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px}
      .info-box .label{font-size:12px;color:#6b7280;margin-bottom:6px}
      .info-box .value{font-size:16px;font-weight:600;color:#1f2937}
      .reason-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:30px}
      .reason-box .label{font-size:12px;color:#92400e;margin-bottom:6px}
      .reason-box .value{font-size:15px;color:#1f2937}
      .signatures{display:flex;justify-content:space-between;margin-top:60px;gap:40px}
      .sig{text-align:center;flex:1}
      .sig .line{border-top:1px solid #9ca3af;margin-top:50px;padding-top:8px;font-size:13px;color:#6b7280}
      .footer{text-align:center;margin-top:50px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af}
      @media print{body{padding:20px}}
    </style></head><body>
      <div class="header">
        <h1>${title}</h1>
        <div class="meta"><div class="num">#${Date.now().toString().slice(-8)}</div><div>${new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}</div></div>
      </div>
      <div class="info-grid">
        <div class="info-box"><div class="label">${labels.item}</div><div class="value">${data.item}</div></div>
        <div class="info-box"><div class="label">${labels.qty}</div><div class="value">${data.qty}</div></div>
        <div class="info-box"><div class="label">${labels.date}</div><div class="value">${data.date}</div></div>
        ${data.remaining !== undefined ? `<div class="info-box"><div class="label">${labels.remaining}</div><div class="value">${data.remaining}</div></div>` : ''}
      </div>
      <div class="reason-box"><div class="label">${labels.reason}</div><div class="value">${data.reason || '—'}</div></div>
      <div class="signatures">
        <div class="sig"><div class="line">${isAr ? 'مستلم المخزون' : 'Received by'}</div></div>
        <div class="sig"><div class="line">${isAr ? 'مسؤول المخزون' : 'Storekeeper'}</div></div>
        <div class="sig"><div class="line">${isAr ? 'المدير' : 'Manager'}</div></div>
      </div>
      <div class="footer">${labels.footer}</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
    </body></html>`);
    win.document.close();
  };

  const formatDate = (d: string | null): string => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString(t('ar', 'en') === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  const toastColors = {
    success: { bg: 'rgba(var(--brand-rgb),0.08)', border: 'var(--brand-500)', text: 'var(--brand-500)' },
    warning: { bg: '#f59e0b15', border: '#f59e0b', text: '#f59e0b' },
    error: { bg: '#ef444415', border: '#ef4444', text: '#ef4444' },
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('المخزون', 'Inventory')}</h1>
          <p className="page-subtitle">{t('إدارة مواد ومستلزمات الفندق', 'Manage hotel supplies and materials')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => setShowHistory((v) => !v)}><History size={18} /> {t('سجل السحب', 'Withdrawal Log')}</button>
          <button className="btn-outline" onClick={() => setShowArchived((v) => !v)} style={showArchived ? { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' } : undefined}><Archive size={18} /> {showArchived ? t('العودة للنشطة', 'Back to Active') : t('الأرشيف', 'Archive')}</button>
          <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={18} /> {t('صنف جديد', 'New Item')}</button>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, maxWidth: 480, width: '90%' }}>
          <div style={{ background: toastColors[toast.type].bg, border: '1px solid ' + toastColors[toast.type].border, borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            <AlertTriangle size={20} color={toastColors[toast.type].text} />
            <span style={{ fontWeight: 600, color: toastColors[toast.type].text, fontSize: 14 }}>{toast.msg}</span>
            <button onClick={() => setToast(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: toastColors[toast.type].text }}><X size={16} /></button>
          </div>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: '#ef444415', border: '1px solid #ef4444', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={20} color="#ef4444" />
            <span style={{ fontWeight: 700, color: '#ef4444' }}>{t('تنبيه: ' + lowStockItems.length + ' صنف بحاجة لإعادة التخزين', 'Alert: ' + lowStockItems.length + ' items need restocking')}</span>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder={t('ابحث في المخزون...', 'Search inventory...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <Boxes size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا توجد أصناف في المخزون', 'No items in inventory')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-th">{t('الصنف', 'Item')}</th>
                  <th className="table-th">{t('السعر', 'Price')}</th>
                  <th className="table-th">{t('الكمية', 'Quantity')}</th>
                  <th className="table-th">{t('حد التنبيه', 'Alert Threshold')}</th>
                  <th className="table-th">{t('الحالة', 'Status')}</th>
                  <th className="table-th">{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const isLow = (i.stock ?? 0) <= (i.low_stock_threshold ?? 5);
                  return (
                    <tr key={i.id} className="table-row">
                      <td className="table-td">{i.name}</td>
                      <td className="table-td">{i.price ?? 0}</td>
                      <td className="table-td">
                        <input type="number" className="input" style={{ width: 80, padding: '4px 8px' }} value={i.stock ?? 0} onChange={(e) => updateStock(i.id, Number(e.target.value))} />
                      </td>
                      <td className="table-td">{i.low_stock_threshold ?? 5}</td>
                      <td className="table-td">{isLow ? <span className="badge-red"><AlertTriangle size={12} /> {t('منخفض', 'Low')}</span> : <span className="badge-green">{t('متوفر', 'Available')}</span>}</td>
                      <td className="table-td">
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-ghost" title={t('سحب من المخزون', 'Withdraw from stock')} onClick={() => openWithdraw(i)} disabled={(i.stock ?? 0) <= 0}><MinusCircle size={16} color="#f59e0b" /></button>
                          <button className="btn-ghost" onClick={() => archiveItem(i)} title={i.archived ? t('إلغاء الأرشفة', 'Unarchive') : t('أرشفة', 'Archive')} style={{ color: 'var(--brand-500)' }}>{i.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}</button>
                          <button className="btn-ghost" onClick={() => remove(i.id)}><Trash2 size={16} /></button>
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

      {showHistory && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><History size={20} /> {t('سجل عمليات السحب', 'Withdrawal History')}</h2>
            <button className="btn-ghost" onClick={() => setShowHistory(false)}><X size={20} /></button>
          </div>
          {withdrawals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>{t('لا توجد عمليات سحب مسجلة', 'No withdrawals recorded')}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="table-th">{t('الصنف', 'Item')}</th>
                    <th className="table-th">{t('الكمية المسحوبة', 'Qty Withdrawn')}</th>
                    <th className="table-th">{t('السبب', 'Reason')}</th>
                    <th className="table-th">{t('التاريخ', 'Date')}</th>
                    <th className="table-th">{t('طباعة', 'Print')}</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="table-row">
                      <td className="table-td"><strong>{w.service?.name || '-'}</strong></td>
                      <td className="table-td"><span style={{ color: '#f59e0b', fontWeight: 700 }}>-{w.quantity}</span></td>
                      <td className="table-td">{w.reason || '-'}</td>
                      <td className="table-td">{formatDate(w.created_at)}</td>
                      <td className="table-td"><button className="btn-ghost" title={t('طباعة طلب السحب', 'Print withdrawal request')} onClick={() => printWithdrawal({ item: w.service?.name || '', qty: w.quantity, reason: w.reason, date: formatDate(w.created_at) })}><Printer size={16} color="var(--brand-500)" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('صنف جديد', 'New Item')}</h2>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div><label className="label">{t('الاسم', 'Name')}</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label">{t('السعر', 'Price')}</label><input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><label className="label">{t('الكمية', 'Quantity')}</label><input type="number" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              <div><label className="label">{t('حد التنبيه', 'Alert Threshold')}</label><input type="number" className="input" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} /></div>
              <div><label className="label">{t('الوصف', 'Description')}</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setModalOpen(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {withdrawItem && (
        <div className="modal-overlay" onClick={() => setWithdrawItem(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('سحب من المخزون', 'Withdraw from Inventory')}</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{withdrawItem.name} — {t('المتوفر', 'Available')}: {withdrawItem.stock ?? 0}</p>
              </div>
              <button className="btn-ghost" onClick={() => setWithdrawItem(null)}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="label">{t('الكمية المسحوبة', 'Quantity to Withdraw')}</label>
                <input type="number" min={1} max={withdrawItem.stock ?? 0} className="input" value={withdrawForm.quantity} onChange={(e) => setWithdrawForm({ ...withdrawForm, quantity: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('السبب', 'Reason')}</label>
                <textarea className="input" rows={2} placeholder={t('سبب السحب (اختياري)', 'Reason (optional)')} value={withdrawForm.reason} onChange={(e) => setWithdrawForm({ ...withdrawForm, reason: e.target.value })} />
              </div>
              <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b', borderRadius: 8, padding: 12, fontSize: 13, color: '#92400e' }}>
                {t('سيتم خصم الكمية من المخزون فوراً', 'The quantity will be deducted from stock immediately')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setWithdrawItem(null)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-outline" onClick={() => printWithdrawal({ item: withdrawItem.name || '', qty: Number(withdrawForm.quantity) || 0, reason: withdrawForm.reason || null, date: new Date().toLocaleString(t('ar', 'en') === 'ar' ? 'ar-SA' : 'en-US'), remaining: (withdrawItem.stock ?? 0) - (Number(withdrawForm.quantity) || 0) })} title={t('طباعة طلب السحب', 'Print withdrawal request')}><Printer size={18} /> {t('طباعة', 'Print')}</button>
              <button className="btn-primary" onClick={submitWithdraw} disabled={withdrawSaving} style={{ background: '#f59e0b' }}>
                {withdrawSaving ? t('جارٍ المعالجة...', 'Processing...') : t('تأكيد السحب', 'Confirm Withdrawal')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
