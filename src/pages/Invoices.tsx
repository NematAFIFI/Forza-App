import { useState, useEffect, useMemo } from 'react';
import { supabase, type Invoice, type Customer, type CompanySettings, type Payment } from '../lib/supabase';
import { Plus, Search, FileText, Printer, X, CreditCard, Building2, Crown, CheckCircle2, Clock, AlertCircle, Archive, ArchiveRestore } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { toggleArchive } from '../lib/archive';

type TFunc = (ar: string, en: string) => string;

interface InvoiceForm {
  customer_id: string;
  issue_date: string;
  due_date: string;
  subtotal: string;
  tax_rate: string;
  discount: string;
  payment_status: string;
  payment_method: string;
  notes: string;
}

const emptyForm: InvoiceForm = {
  customer_id: '', issue_date: '', due_date: '', subtotal: '', tax_rate: '15', discount: '',
  payment_status: 'unpaid', payment_method: 'cash', notes: '',
};

const paymentStatusBadge = (s: string | null): string => {
  switch (s) {
    case 'paid': return 'badge-green';
    case 'partial': return 'badge-gold';
    case 'unpaid': return 'badge-red';
    default: return 'badge-gray';
  }
};

const paymentStatusLabel = (s: string | null, t: TFunc): string => {
  const map: Record<string, string> = { paid: t('مدفوعة', 'Paid'), partial: t('مدفوعة جزئياً', 'Partially Paid'), unpaid: t('غير مدفوعة', 'Unpaid') };
  return map[s || ''] || s || '';
};

const paymentMethodLabel = (m: string | null, t: TFunc): string => {
  const map: Record<string, string> = { cash: t('نقدي', 'Cash'), card: t('بطاقة', 'Card'), transfer: t('تحويل', 'Transfer'), wallet: t('محفظة', 'Wallet') };
  return map[m || ''] || m || '';
};

const fmtMoney = (n: number | null | undefined): string => Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d: string | null, lang: 'ar' | 'en'): string => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return d; }
};

// Generate a Code128-style barcode as SVG bars
function BarcodeSVG({ value, height = 60 }: { value: string; height?: number }): JSX.Element {
  // Simple visual barcode: deterministic bars from the string
  const bars: { w: number; black: boolean }[] = [];
  const seed = value.split('').map((c) => c.charCodeAt(0));
  // Start bar
  bars.push({ w: 2, black: true });
  for (let i = 0; i < seed.length; i++) {
    const n = seed[i];
    bars.push({ w: 1 + (n % 3), black: true });
    bars.push({ w: 1 + ((n >> 3) % 3), black: false });
    bars.push({ w: 1 + ((n >> 5) % 2), black: true });
    bars.push({ w: 1, black: false });
  }
  // End bar
  bars.push({ w: 3, black: true });
  let x = 0;
  return (
    <svg width={bars.reduce((s, b) => s + b.w, 0) + 4} height={height} style={{ display: 'block', margin: '0 auto' }}>
      <rect x={0} y={0} width={bars.reduce((s, b) => s + b.w, 0) + 4} height={height} fill="#fff" />
      {bars.map((b, i) => {
        const rect = b.black ? <rect key={i} x={x + 2} y={4} width={b.w} height={height - 8} fill="#000" /> : null;
        x += b.w;
        return rect;
      })}
    </svg>
  );
}

// QR code placeholder — visual QR-like pattern
function QRPattern({ value, size = 80 }: { value: string; size?: number }): JSX.Element {
  const cells = 21; // 21x21 grid like QR
  const seed = value.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const grid: boolean[] = [];
  for (let i = 0; i < cells * cells; i++) {
    grid.push(((seed * (i + 7) + i * 13) % 3) === 0);
  }
  const cellSize = size / cells;
  // Position squares (corners)
  const isCorner = (r: number, c: number): boolean => {
    const inSquare = (sr: number, sc: number) => r >= sr && r < sr + 7 && c >= sc && c < sc + 7;
    return inSquare(0, 0) || inSquare(0, cells - 7) || inSquare(cells - 7, 0);
  };
  const isCornerBorder = (r: number, c: number): boolean => {
    const inBorder = (sr: number, sc: number) =>
      (r === sr || r === sr + 6 || c === sc || c === sc + 6) && r >= sr && r <= sr + 6 && c >= sc && c <= sc + 6;
    return inBorder(0, 0) || inBorder(0, cells - 7) || inBorder(cells - 7, 0);
  };
  const isCornerInner = (r: number, c: number): boolean => {
    const inInner = (sr: number, sc: number) =>
      r >= sr + 2 && r <= sr + 4 && c >= sc + 2 && c <= sc + 4;
    return inInner(0, 0) || inInner(0, cells - 7) || inInner(cells - 7, 0);
  };
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <rect x={0} y={0} width={size} height={size} fill="#fff" />
      {Array.from({ length: cells * cells }).map((_, i) => {
        const r = Math.floor(i / cells);
        const c = i % cells;
        let black = false;
        if (isCorner(r, c)) {
          black = isCornerBorder(r, c) || isCornerInner(r, c);
        } else {
          black = grid[i];
        }
        return black ? <rect key={i} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#000" /> : null;
      })}
    </svg>
  );
}

export default function Invoices() {
  const { t, lang } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<InvoiceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [printCustomer, setPrintCustomer] = useState<Customer | null>(null);
  const [printPayments, setPrintPayments] = useState<Payment[]>([]);
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showArchived, setShowArchived] = useState(false);

  const load = async (): Promise<void> => {
    setLoading(true);
    const [iRes, cRes, sRes] = await Promise.all([
      supabase.from('invoices').select('*, customer:customers(*), booking:bookings(*, unit:units(*, property:properties(*)))').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('name', { ascending: true }),
      supabase.from('company_settings').select('*').limit(1).maybeSingle(),
    ]);
    if (iRes.data) setInvoices(iRes.data as unknown as Invoice[]);
    if (cRes.data) setCustomers(cRes.data as Customer[]);
    if (sRes.data) setCompany(sRes.data as CompanySettings);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const taxAmount = useMemo((): number => {
    const sub = Number(form.subtotal) || 0;
    const rate = Number(form.tax_rate) || 0;
    const disc = Number(form.discount) || 0;
    return (sub - disc) * (rate / 100);
  }, [form.subtotal, form.tax_rate, form.discount]);

  const total = useMemo((): number => {
    const sub = Number(form.subtotal) || 0;
    const disc = Number(form.discount) || 0;
    return (sub - disc) + taxAmount;
  }, [form.subtotal, form.discount, taxAmount]);

  const filtered = useMemo((): Invoice[] => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      if ((i.archived === true) !== showArchived) return false;
      if (!q) return true;
      return (i.invoice_number || '').toLowerCase().includes(q) || (i.customer?.name || '').toLowerCase().includes(q);
    });
  }, [invoices, search, showArchived]);

  const generateInvoiceNumber = (): string => {
    const prefix = company?.invoice_prefix || 'INV';
    const year = new Date().getFullYear();
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${year}-${num}`;
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    const payload = {
      customer_id: form.customer_id || null,
      invoice_number: generateInvoiceNumber(),
      issue_date: form.issue_date || null,
      due_date: form.due_date || null,
      subtotal: Number(form.subtotal) || 0,
      tax_rate: Number(form.tax_rate) || 0,
      tax_amount: taxAmount,
      discount: Number(form.discount) || 0,
      total: total,
      paid_amount: 0,
      payment_status: form.payment_status,
      payment_method: form.payment_method,
      notes: form.notes || null,
      zatca_status: 'pending',
    };
    await supabase.from('invoices').insert(payload);
    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    void load();
  };

  const openPrint = async (inv: Invoice): Promise<void> => {
    setPrintInvoice(inv);
    setPrintCustomer((inv as unknown as { customer?: Customer }).customer || null);
    const { data } = await supabase.from('payments').select('*').eq('invoice_id', inv.id);
    setPrintPayments((data || []) as Payment[]);
  };

  const recordPayment = async (): Promise<void> => {
    if (!paymentModal || !paymentAmount) return;
    const amt = Number(paymentAmount);
    await supabase.from('payments').insert({
      invoice_id: paymentModal.id,
      amount: amt,
      payment_method: paymentMethod,
      payment_date: new Date().toISOString().slice(0, 10),
    });
    // Update invoice
    const newPaid = (paymentModal.paid_amount ?? 0) + amt;
    const newStatus = newPaid >= (paymentModal.total ?? 0) ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    await supabase.from('invoices').update({ paid_amount: newPaid, payment_status: newStatus }).eq('id', paymentModal.id);
    setPaymentModal(null);
    setPaymentAmount('');
    setPaymentMethod('cash');
    void load();
  };

  const getRemaining = (inv: Invoice): number => (inv.total ?? 0) - (inv.paid_amount ?? 0);

  const archive = async (inv: Invoice): Promise<void> => { await toggleArchive('invoices', inv.id, inv.archived === true); void load(); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('الفواتير', 'Invoices')}</h1>
          <p className="page-subtitle">{t('إدارة الفواتير والمدفوعات', 'Manage invoices and payments')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => setShowArchived((v) => !v)} style={showArchived ? { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' } : undefined}><Archive size={18} /> {showArchived ? t('العودة للنشطة', 'Back to Active') : t('الأرشيف', 'Archive')}</button>
          <button className="btn-primary" onClick={() => { setForm(emptyForm); setModalOpen(true); }}><Plus size={18} /> {t('فاتورة جديدة', 'New Invoice')}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder={t('ابحث برقم الفاتورة أو اسم العميل...', 'Search by invoice number or customer name...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>{t('لا توجد فواتير', 'No invoices')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-th">{t('رقم الفاتورة', 'Invoice No.')}</th>
                  <th className="table-th">{t('العقار', 'Property')}</th>
                  <th className="table-th">{t('العميل', 'Customer')}</th>
                  <th className="table-th">{t('التاريخ', 'Date')}</th>
                  <th className="table-th">{t('الإجمالي', 'Total')}</th>
                  <th className="table-th">{t('المدفوع', 'Paid')}</th>
                  <th className="table-th">{t('المتبقي', 'Remaining')}</th>
                  <th className="table-th">{t('الحالة', 'Status')}</th>
                  <th className="table-th">{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const remaining = getRemaining(i);
                  return (
                    <tr key={i.id} className="table-row">
                      <td className="table-td"><strong>{i.invoice_number}</strong></td>
                      <td className="table-td">{(i as unknown as { booking?: { unit?: { property?: { name?: string } } } }).booking?.unit?.property?.name || '-'}</td>
                      <td className="table-td">{i.customer?.name || '-'}</td>
                      <td className="table-td">{i.issue_date || '-'}</td>
                      <td className="table-td">{fmtMoney(i.total)}</td>
                      <td className="table-td" style={{ color: 'var(--brand-500)' }}>{fmtMoney(i.paid_amount)}</td>
                      <td className="table-td" style={{ color: remaining > 0 ? '#ef4444' : 'var(--brand-500)', fontWeight: 700 }}>{fmtMoney(remaining)}</td>
                      <td className="table-td"><span className={paymentStatusBadge(i.payment_status)}>{paymentStatusLabel(i.payment_status, t)}</span></td>
                      <td className="table-td">
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-ghost" onClick={() => openPrint(i)} title={t('معاينة وطباعة', 'Preview & Print')}><Printer size={16} /></button>
                          {remaining > 0 && <button className="btn-ghost" onClick={() => setPaymentModal(i)} title={t('تسجيل دفعة', 'Record Payment')}><CreditCard size={16} /></button>}
                          <button className="btn-ghost" onClick={() => archive(i)} title={i.archived ? t('إلغاء الأرشفة', 'Unarchive') : t('أرشفة', 'Archive')} style={{ color: 'var(--brand-500)' }}>{i.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}</button>
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

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t('فاتورة جديدة', 'New Invoice')}</h2>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">{t('العميل', 'Customer')}</label>
                <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                  <option value="">{t('اختر عميل', 'Select customer')}</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="label">{t('تاريخ الإصدار', 'Issue Date')}</label><input type="date" className="input" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
              <div><label className="label">{t('تاريخ الاستحقاق', 'Due Date')}</label><input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <div><label className="label">{t('المجموع الفرعي', 'Subtotal')}</label><input type="number" className="input" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} /></div>
              <div><label className="label">{t('نسبة الضريبة (%)', 'Tax Rate (%)')}</label><input type="number" className="input" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></div>
              <div><label className="label">{t('الخصم', 'Discount')}</label><input type="number" className="input" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
              <div><label className="label">{t('حالة الدفع', 'Payment Status')}</label><select className="input" value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}><option value="unpaid">{t('غير مدفوعة', 'Unpaid')}</option><option value="partial">{t('مدفوعة جزئياً', 'Partially Paid')}</option><option value="paid">{t('مدفوعة', 'Paid')}</option></select></div>
              <div><label className="label">{t('طريقة الدفع', 'Payment Method')}</label><select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}><option value="cash">{t('نقدي', 'Cash')}</option><option value="card">{t('بطاقة', 'Card')}</option><option value="transfer">{t('تحويل', 'Transfer')}</option><option value="wallet">{t('محفظة', 'Wallet')}</option></select></div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16, background: '#f3f4f6', padding: 12, borderRadius: 8 }}>
                <div>{t('الضريبة', 'Tax')}: <strong>{taxAmount.toFixed(2)}</strong></div>
                <div>{t('الإجمالي', 'Total')}: <strong>{total.toFixed(2)}</strong></div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}><label className="label">{t('ملاحظات', 'Notes')}</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setModalOpen(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {paymentModal && (
        <div className="modal-overlay" onClick={() => setPaymentModal(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('تسجيل دفعة', 'Record Payment')}</h2>
              <button className="btn-ghost" onClick={() => setPaymentModal(null)}><X size={20} /></button>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{t('الفاتورة', 'Invoice')}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{paymentModal.invoice_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{t('الإجمالي', 'Total')}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtMoney(paymentModal.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{t('المتبقي', 'Remaining')}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{fmtMoney(getRemaining(paymentModal))}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div><label className="label">{t('المبلغ', 'Amount')}</label><input type="number" className="input" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0" /></div>
              <div><label className="label">{t('طريقة الدفع', 'Payment Method')}</label><select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="cash">{t('نقدي', 'Cash')}</option><option value="card">{t('بطاقة', 'Card')}</option><option value="transfer">{t('تحويل', 'Transfer')}</option><option value="wallet">{t('محفظة', 'Wallet')}</option></select></div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setPaymentModal(null)}>{t('إلغاء', 'Cancel')}</button>
              <button className="btn-primary" onClick={recordPayment} disabled={!paymentAmount}><CreditCard size={16} /> {t('تسجيل', 'Record')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ LUXURY INVOICE PREVIEW ═══════════════ */}
      {printInvoice && (
        <div className="modal-overlay" onClick={() => setPrintInvoice(null)} style={{ alignItems: 'flex-start', overflowY: 'auto', padding: '40px 16px' }}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="invoice-print printable"
            style={{
              maxWidth: 800, width: '100%', background: '#fff', borderRadius: 20, overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(var(--brand-rgb-dark),0.4)', fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {/* ─── Top accent bar ─── */}
            <div style={{ height: 8, background: 'linear-gradient(90deg, var(--brand-500), var(--brand-500), #ec4899)' }} />

            {/* ─── Header: Owner/Seller info + QR ─── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '32px 40px 24px', borderBottom: '3px solid #f3f4f6' }}>
              {/* Right: Company info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, var(--brand-500), var(--brand-500))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(var(--brand-rgb),0.3)' }}>
                    <Building2 size={28} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#1a2535' }}>{company?.company_name || t('رواق', 'Riwaaq')}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{company?.legal_name || ''}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
                  {company?.address && <div>{company.address}</div>}
                  <div dir="ltr" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {company?.phone && <span>{t('هاتف', 'Phone')}: {company.phone}</span>}
                    {company?.email && <span>{t('بريد', 'Email')}: {company.email}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                    {company?.vat_number && <span>{t('الرقم الضريبي', 'VAT Number')}: {company.vat_number}</span>}
                    {company?.cr_number && <span>{t('سجل تجاري', 'CR Number')}: {company.cr_number}</span>}
                  </div>
                </div>
              </div>
              {/* Left: QR + Invoice label */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <QRPattern value={printInvoice.invoice_number || 'INV'} size={80} />
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>ZATCA QR</div>
              </div>
            </div>

            {/* ─── Invoice title + meta ─── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 40px', background: 'linear-gradient(135deg, rgba(var(--brand-rgb),0.04), rgba(var(--brand-rgb-300),0.04))' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--brand-500)', marginBottom: 4 }}>{t('فاتورة ضريبية', 'Tax Invoice')}</div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Tax Invoice</div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2535', marginBottom: 6 }}>{t('رقم الفاتورة', 'Invoice No.')}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand-500)', marginBottom: 8 }}>{printInvoice.invoice_number}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{t('تاريخ الإصدار', 'Issue Date')}: {formatDate(printInvoice.issue_date, lang)}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{t('تاريخ الاستحقاق', 'Due Date')}: {formatDate(printInvoice.due_date, lang)}</div>
              </div>
            </div>

            {/* ─── Bill To ─── */}
            <div style={{ display: 'flex', gap: 24, padding: '24px 40px', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>{t('فاتورة إلى — Bill To', 'Bill To')}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2535', marginBottom: 4 }}>{printCustomer?.name || '-'}</div>
                {(printInvoice as unknown as { booking?: { unit?: { property?: { name?: string } } } }).booking?.unit?.property?.name && (
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{t('العقار', 'Property')}: {(printInvoice as unknown as { booking?: { unit?: { property?: { name?: string } } } }).booking?.unit?.property?.name}</div>
                )}
                {printCustomer?.phone && <div style={{ fontSize: 13, color: '#6b7280' }} dir="ltr">{printCustomer.phone}</div>}
                {printCustomer?.email && <div style={{ fontSize: 13, color: '#6b7280' }} dir="ltr">{printCustomer.email}</div>}
                {printCustomer?.address && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{printCustomer.address}</div>}
                {printCustomer?.id_number && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{t('رقم الهوية', 'ID Number')}: {printCustomer.id_number}</div>}
              </div>
              {/* Status badge */}
              <div style={{ flexShrink: 0 }}>
                {(() => {
                  const status = printInvoice.payment_status;
                  const meta = status === 'paid'
                    ? { icon: CheckCircle2, label: t('مدفوعة', 'Paid'), color: 'var(--brand-500)', bg: 'var(--brand-50)' }
                    : status === 'partial'
                    ? { icon: Clock, label: t('مدفوعة جزئياً', 'Partially Paid'), color: '#fbbf24', bg: '#fffbeb' }
                    : { icon: AlertCircle, label: t('غير مدفوعة', 'Unpaid'), color: '#ef4444', bg: '#fef2f2' };
                  const Icon = meta.icon;
                  return (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: meta.bg, border: `1px solid ${meta.color}30` }}>
                      <Icon size={18} color={meta.color} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ─── Items / Amounts table ─── */}
            <div style={{ padding: '24px 40px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, var(--brand-500), var(--brand-500))' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'right', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: '12px 0 0 12px' }}>{t('البيان', 'Description')}</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>{t('التفاصيل', 'Details')}</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: '0 12px 12px 0' }}>{t('المبلغ (ر.س)', 'Amount (SAR)')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600 }}>{t('المجموع الفرعي', 'Subtotal')}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Subtotal</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, textAlign: 'left', fontWeight: 600 }}>{fmtMoney(printInvoice.subtotal)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600 }}>{t('الخصم', 'Discount')}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Discount</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, textAlign: 'left', color: '#ef4444' }}>- {fmtMoney(printInvoice.discount)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600 }}>{t('ضريبة القيمة المضافة', 'Value Added Tax (VAT)')}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>VAT ({printInvoice.tax_rate ?? 0}%)</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, textAlign: 'left' }}>{fmtMoney(printInvoice.tax_amount)}</td>
                  </tr>
                  {/* Total row */}
                  <tr>
                    <td colSpan={2} style={{ padding: '16px', fontSize: 16, fontWeight: 800, textAlign: 'right', background: 'rgba(var(--brand-rgb),0.06)', borderRadius: '0 0 12px 12px' }}>{t('الإجمالي المستحق', 'Total Due')}</td>
                    <td style={{ padding: '16px', fontSize: 22, fontWeight: 900, textAlign: 'left', color: 'var(--brand-500)', background: 'rgba(var(--brand-rgb),0.06)', borderRadius: '0 0 12px 12px' }}>{fmtMoney(printInvoice.total)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Payment summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ background: 'var(--brand-50)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{t('المدفوع', 'Paid')}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand-500)' }}>{fmtMoney(printInvoice.paid_amount)}</div>
                </div>
                <div style={{ background: '#fef2f2', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{t('المتبقي', 'Remaining')}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>{fmtMoney(getRemaining(printInvoice))}</div>
                </div>
                <div style={{ background: '#eef2ff', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{t('طريقة الدفع', 'Payment Method')}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#4338ca' }}>{paymentMethodLabel(printInvoice.payment_method, t)}</div>
                </div>
              </div>

              {/* Payments history */}
              {printPayments.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{t('سجل المدفوعات', 'Payment History')}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{t('التاريخ', 'Date')}</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{t('المبلغ', 'Amount')}</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{t('الطريقة', 'Method')}</th>
                    </tr></thead>
                    <tbody>
                      {printPayments.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '8px 12px', fontSize: 13 }}>{p.payment_date || '-'}</td>
                          <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, color: 'var(--brand-500)' }}>{fmtMoney(p.amount)}</td>
                          <td style={{ padding: '8px 12px', fontSize: 13 }}>{paymentMethodLabel(p.payment_method, t)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Notes */}
              {printInvoice.notes && (
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{t('ملاحظات', 'Notes')}</div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{printInvoice.notes}</p>
                </div>
              )}
            </div>

            {/* ─── Barcode + Footer ─── */}
            <div style={{ borderTop: '3px solid #f3f4f6', padding: '24px 40px 32px', textAlign: 'center' }}>
              <BarcodeSVG value={printInvoice.invoice_number || 'INV'} height={50} />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, letterSpacing: 2, fontFamily: 'monospace' }}>{printInvoice.invoice_number}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
                {t('حالة ZATCA', 'ZATCA Status')}: {printInvoice.zatca_status || 'pending'} · UUID: {(printInvoice as unknown as { zatca_uuid?: string }).zatca_uuid || '—'}
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: '#6b7280' }}>
                {company?.footer_note || t('شكراً لتعاملكم معنا — نتطلع لخدمتكم مجدداً', 'Thank you for your business')}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: '#c8d0dc' }}>
                {t('هذه الفاتورة صادرة إلكترونياً من نظام رواق — بدون توقيع يدوي', 'This invoice is issued electronically')}
              </div>
            </div>

            {/* Bottom accent bar */}
            <div style={{ height: 6, background: 'linear-gradient(90deg, #ec4899, var(--brand-500), var(--brand-500))' }} />
          </div>

          {/* Action buttons (not printed) */}
          <div className="no-print" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12, zIndex: 100 }}>
            <button className="btn-primary" onClick={() => window.print()}><Printer size={18} /> {t('طباعة الفاتورة', 'Print Invoice')}</button>
            <button className="btn-outline" onClick={() => setPrintInvoice(null)}><X size={18} /> {t('إغلاق', 'Close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
