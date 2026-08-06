import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationItem {
  booking_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  unit_number: string;
  check_out: string;
  days_remaining: number;
  nights_stayed: number;
  urgency: "today" | "tomorrow" | "soon";
  receptionist_phone: string;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "متغيرات البيئة غير مهيأة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Extract user from JWT token
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    let userId: string | null = null;

    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData.user?.id ?? null;
    }

    // Check if this user is a buyer (in system_clients with buyer_user_id)
    let isBuyer = false;
    if (userId) {
      const { data: buyerRecord } = await supabase
        .from("system_clients")
        .select("id")
        .eq("buyer_user_id", userId)
        .limit(1)
        .maybeSingle();
      isBuyer = !!buyerRecord;
    }

    const now = new Date();
    const startWindow = new Date(now);
    startWindow.setHours(0, 0, 0, 0);

    // Extend window to 7 days so more notifications show up
    const endWindow = new Date(now);
    endWindow.setDate(endWindow.getDate() + 7);
    endWindow.setHours(23, 59, 59, 999);

    // Fetch receptionist phone from company settings
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("phone")
      .limit(1)
      .single();
    const receptionistPhone = companySettings?.phone ?? "";

    // Build query — filter by user_id if this is a buyer
    let query = supabase
      .from("bookings")
      .select(`
        id,
        check_in,
        check_out,
        num_nights,
        booking_status,
        user_id,
        customer:customers(name, phone, email),
        unit:units(unit_number)
      `)
      .gte("check_out", startWindow.toISOString().split("T")[0])
      .lte("check_out", endWindow.toISOString().split("T")[0])
      .neq("booking_status", "cancelled")
      .order("check_out", { ascending: true });

    if (isBuyer && userId) {
      query = query.eq("user_id", userId);
    }

    const { data: bookings, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    interface BookingJoin {
      id: string;
      check_in: string | null;
      check_out: string | null;
      num_nights: number | null;
      booking_status: string;
      user_id: string | null;
      customer: { name: string | null; phone: string | null; email: string | null } | null;
      unit: { unit_number: string | null } | null;
    }

    const notifications: NotificationItem[] = ((bookings as BookingJoin[]) ?? []).map(
      (b): NotificationItem => {
        const checkOutDate = b.check_out ? new Date(b.check_out) : new Date();
        const daysRemaining = daysBetween(startWindow, checkOutDate);
        let urgency: "today" | "tomorrow" | "soon" = "soon";
        if (daysRemaining <= 0) urgency = "today";
        else if (daysRemaining === 1) urgency = "tomorrow";

        // Calculate nights if not stored
        let nights = b.num_nights ?? 0;
        if (!nights && b.check_in && b.check_out) {
          nights = daysBetween(new Date(b.check_in), new Date(b.check_out));
        }

        return {
          booking_id: b.id,
          guest_name: b.customer?.name ?? "",
          guest_phone: b.customer?.phone ?? "",
          guest_email: b.customer?.email ?? "",
          unit_number: b.unit?.unit_number ?? "",
          check_out: b.check_out ?? "",
          days_remaining: Math.max(daysRemaining, 0),
          nights_stayed: nights,
          urgency,
          receptionist_phone: receptionistPhone,
        };
      }
    );

    return new Response(
      JSON.stringify({
        notifications,
        count: notifications.length,
        generated_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير متوقع";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
