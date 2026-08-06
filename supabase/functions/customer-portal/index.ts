import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey" };
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return new Response(JSON.stringify({ error: "Invalid link" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: customer, error: custError } = await client.from("customers").select("id, name, phone, email").eq("access_token", token).maybeSingle();
    if (custError || !customer) return new Response(JSON.stringify({ error: "Invalid or expired link" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: bookings } = await client.from("bookings").select(`id, check_in, check_out, booking_status, total_amount, paid_amount, unit:units(id, unit_number, unit_type, property:properties(id, name))`).eq("customer_id", customer.id).order("created_at", { ascending: false });
    const { data: invoices } = await client.from("invoices").select(`id, invoice_number, issue_date, due_date, subtotal, tax_rate, tax_amount, total, paid_amount, payment_status, notes, booking:bookings(id, unit:units(id, unit_number, property:properties(id, name)))`).eq("customer_id", customer.id).order("created_at", { ascending: false });
    return new Response(JSON.stringify({ customer, bookings: bookings || [], invoices: invoices || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch { return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
