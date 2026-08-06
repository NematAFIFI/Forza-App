import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey" };
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ valid: false }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData.user) return new Response(JSON.stringify({ valid: false }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userData.user.id;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { error: upsertError } = await adminClient.from("user_sessions").upsert({ user_id: userId, session_token: token.substring(0, 100), device_info: body.deviceInfo || "unknown", created_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (upsertError) return new Response(JSON.stringify({ error: upsertError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true, valid: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: session } = await adminClient.from("user_sessions").select("session_token").eq("user_id", userId).maybeSingle();
    if (!session) return new Response(JSON.stringify({ valid: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ valid: session.session_token === token.substring(0, 100) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch { return new Response(JSON.stringify({ valid: false }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
