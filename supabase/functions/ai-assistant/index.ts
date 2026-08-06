import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Intent {
  type: 'room_status' | 'revenue_today' | 'revenue_yesterday' | 'revenue_week' | 'revenue_month'
      | 'occupancy' | 'bookings_today' | 'checkins_today' | 'checkouts_today'
      | 'customer_search' | 'invoice_status' | 'expenses' | 'staff' | 'low_stock'
      | 'help' | 'unknown';
  entity?: string;
}

function parseIntent(text: string): Intent {
  const t = text.toLowerCase().trim();

  if (/(help|مساعدة|ماذا تستطيع|اوامر|الأوامر)/.test(t)) return { type: 'help' };

  if (/(حالة الغرف|الغرف الآن|الغرف المتاحة|available rooms|room status|كم غرفة)/.test(text)) {
    return { type: 'room_status' };
  }
  if (/(إيراد الأمس|ايراد الامس|revenue yesterday|yesterday revenue|إيراد امس)/.test(text)) {
    return { type: 'revenue_yesterday' };
  }
  if (/(إيراد اليوم|ايراد اليوم|revenue today|today revenue|إيراد اليوم)/.test(text)) {
    return { type: 'revenue_today' };
  }
  if (/(إيراد الأسبوع|ايراد الاسبوع|revenue week|week revenue|إيراد هذا الأسبوع)/.test(text)) {
    return { type: 'revenue_week' };
  }
  if (/(إيراد الشهر|ايراد الشهر|revenue month|month revenue|إيراد هذا الشهر)/.test(text)) {
    return { type: 'revenue_month' };
  }
  if (/(الإشغال|الاشغال|occupancy|نسبة الإشغال|نسبة الاشغال)/.test(text)) {
    return { type: 'occupancy' };
  }
  if (/(حجوزات اليوم|bookings today|الحجوزات اليوم|كم حجز)/.test(text)) {
    return { type: 'bookings_today' };
  }
  if (/(وصول|check.?in|checkin|الوصول اليوم)/.test(text)) {
    return { type: 'checkins_today' };
  }
  if (/(مغادرة|check.?out|checkout|المغادرة اليوم)/.test(text)) {
    return { type: 'checkouts_today' };
  }
  if (/(فواتير|invoices|الفواتير|الفاتورة|فاتورة غير مدفوعة|unpaid)/.test(text)) {
    return { type: 'invoice_status' };
  }
  if (/(مصروفات|expenses|المصروفات|مصاريف)/.test(text)) {
    return { type: 'expenses' };
  }
  if (/(موظفين|staff|الموظفون|الموظفين|الموظفون اليوم)/.test(text)) {
    return { type: 'staff' };
  }
  if (/(مخزون|inventory|low stock|ينفد|نقص|المخزون)/.test(text)) {
    return { type: 'low_stock' };
  }

  // customer search: "أين حجز العميل فلان" or "بحث عن عميل فلان"
  const custMatch = text.match(/(?:حجز العميل|بحث عن عميل|عميل|customer|find customer)\s+([\u0600-\u06FF\s]+)/i);
  if (custMatch && custMatch[1]) {
    return { type: 'customer_search', entity: custMatch[1].trim() };
  }

  return { type: 'unknown' };
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query, user_id } = await req.json();
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const intent = parseIntent(query);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let answer = '';
    let data: any = null;

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    switch (intent.type) {
      case 'help': {
        answer = 'يمكنني مساعدتك في:\n• حالة الغرف المتاحة\n• إيراد اليوم أو الأمس أو الأسبوع أو الشهر\n• نسبة الإشغال\n• حجوزات اليوم والوصول والمغادرة\n• الفواتير غير المدفوعة\n• المصروفات\n• الموظفين\n• المخزون المنخفض\n• البحث عن عميل بالاسم\n\nجرّب: "كم إيراد الأمس؟" أو "حالة الغرف الآن"';
        break;
      }

      case 'room_status': {
        const { data: units } = await supabase.from('units').select('id, status');
        const total = units?.length || 0;
        const byStatus: Record<string, number> = {};
        units?.forEach((u: any) => { byStatus[u.status] = (byStatus[u.status] || 0) + 1; });
        data = { total, byStatus };
        answer = `إجمالي الغرف: ${total}\n` +
          `متاحة: ${byStatus['available'] || 0}\n` +
          `محجوزة: ${byStatus['reserved'] || 0}\n` +
          `صيانة: ${byStatus['maintenance'] || 0}\n` +
          `تنظيف: ${byStatus['cleaning'] || 0}`;
        break;
      }

      case 'revenue_today': {
        const { data: inv } = await supabase.from('invoices')
          .select('total').gte('issue_date', today);
        const sum = inv?.reduce((s: number, r: any) => s + Number(r.total || 0), 0) || 0;
        data = { sum, count: inv?.length || 0 };
        answer = `إيراد اليوم: ${fmt(sum)} ريال (${inv?.length || 0} فاتورة)`;
        break;
      }

      case 'revenue_yesterday': {
        const { data: inv } = await supabase.from('invoices')
          .select('total').gte('issue_date', yesterday).lt('issue_date', today);
        const sum = inv?.reduce((s: number, r: any) => s + Number(r.total || 0), 0) || 0;
        data = { sum, count: inv?.length || 0 };
        answer = `إيراد الأمس: ${fmt(sum)} ريال (${inv?.length || 0} فاتورة)`;
        break;
      }

      case 'revenue_week': {
        const { data: inv } = await supabase.from('invoices')
          .select('total').gte('issue_date', weekAgo);
        const sum = inv?.reduce((s: number, r: any) => s + Number(r.total || 0), 0) || 0;
        data = { sum, count: inv?.length || 0 };
        answer = `إيراد آخر 7 أيام: ${fmt(sum)} ريال (${inv?.length || 0} فاتورة)`;
        break;
      }

      case 'revenue_month': {
        const { data: inv } = await supabase.from('invoices')
          .select('total').gte('issue_date', monthAgo);
        const sum = inv?.reduce((s: number, r: any) => s + Number(r.total || 0), 0) || 0;
        data = { sum, count: inv?.length || 0 };
        answer = `إيراد آخر 30 يوم: ${fmt(sum)} ريال (${inv?.length || 0} فاتورة)`;
        break;
      }

      case 'occupancy': {
        const { data: units } = await supabase.from('units').select('id, status');
        const total = units?.length || 0;
        const occupied = units?.filter((u: any) => u.status === 'reserved').length || 0;
        const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
        data = { total, occupied, pct };
        answer = `نسبة الإشغال: ${pct}% (${occupied} من ${total} غرفة)`;
        break;
      }

      case 'bookings_today': {
        const { data: bks } = await supabase.from('bookings')
          .select('id, check_in, check_out, booking_status')
          .gte('created_at', today);
        data = { count: bks?.length || 0, bookings: bks };
        answer = `حجوزات اليوم: ${bks?.length || 0} حجز`;
        break;
      }

      case 'checkins_today': {
        const { data: bks } = await supabase.from('bookings')
          .select('id, customer_id, unit_id, check_in')
          .eq('check_in', today);
        data = { count: bks?.length || 0 };
        answer = `وصول اليوم: ${bks?.length || 0} ضيف`;
        break;
      }

      case 'checkouts_today': {
        const { data: bks } = await supabase.from('bookings')
          .select('id, customer_id, unit_id, check_out')
          .eq('check_out', today);
        data = { count: bks?.length || 0 };
        answer = `مغادرة اليوم: ${bks?.length || 0} ضيف`;
        break;
      }

      case 'invoice_status': {
        const { data: inv } = await supabase.from('invoices')
          .select('id, invoice_number, total, paid_amount, payment_status')
          .neq('payment_status', 'paid');
        const unpaid = inv?.length || 0;
        const totalDue = inv?.reduce((s: number, r: any) => s + Number((r.total || 0) - (r.paid_amount || 0)), 0) || 0;
        data = { unpaid, totalDue };
        answer = `فواتير غير مدفوعة: ${unpaid} فاتورة\nالمبلغ المستحق: ${fmt(totalDue)} ريال`;
        break;
      }

      case 'expenses': {
        const { data: exp } = await supabase.from('expenses')
          .select('amount, category').gte('expense_date', weekAgo);
        const sum = exp?.reduce((s: number, r: any) => s + Number(r.amount || 0), 0) || 0;
        data = { sum, count: exp?.length || 0 };
        answer = `مصروفات آخر 7 أيام: ${fmt(sum)} ريال (${exp?.length || 0} بند)`;
        break;
      }

      case 'staff': {
        const { data: stf } = await supabase.from('staff_users')
          .select('name, role, status').eq('status', 'active');
        data = { count: stf?.length || 0, staff: stf };
        answer = `الموظفون النشطون: ${stf?.length || 0}`;
        break;
      }

      case 'low_stock': {
        const { data: svc } = await supabase.from('services')
          .select('name, stock_quantity, min_stock_level')
          .lt('stock_quantity', 10);
        const low = svc?.filter((s: any) =>
          s.stock_quantity !== null && s.stock_quantity <= (s.min_stock_level || 5)
        ) || [];
        data = { low };
        answer = low.length > 0
          ? `مخزون منخفض (${low.length} عناصر):\n` + low.slice(0, 5).map((s: any) => `• ${s.name}: ${s.stock_quantity}`).join('\n')
          : 'لا يوجد نقص في المخزون حالياً';
        break;
      }

      case 'customer_search': {
        const name = intent.entity || '';
        const { data: cust } = await supabase.from('customers')
          .select('id, name, phone, nationality')
          .ilike('name', `%${name}%`);
        if (cust && cust.length > 0) {
          const ids = cust.map((c: any) => c.id);
          const { data: bks } = await supabase.from('bookings')
            .select('check_in, check_out, booking_status, unit_id')
            .in('customer_id', ids).order('check_in', { ascending: false }).limit(5);
          data = { customers: cust, bookings: bks };
          answer = `وجدت ${cust.length} عميل:\n` +
            cust.slice(0, 3).map((c: any) => `• ${c.name} — ${c.phone || 'لا هاتف'}`).join('\n');
          if (bks && bks.length > 0) {
            answer += `\n\nآخر حجز: ${bks[0].check_in} → ${bks[0].check_out} (${bks[0].booking_status})`;
          }
        } else {
          answer = `لم أجد عميلاً باسم "${name}"`;
        }
        break;
      }

      default:
        answer = 'لم أفهم طلبك. جرّب: "كم إيراد الأمس؟" أو "حالة الغرف الآن" أو اكتب "مساعدة" لرؤية كل الأوامر.';
    }

    return new Response(JSON.stringify({ answer, intent: intent.type, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
