import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey" };
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const { email, password, name } = await req.json();
    if (!email || !password || !name) return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data, error } = await adminClient.auth.admin.createUser({ email, password, user_metadata: { name, role: "user" }, email_confirm: true });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: sessionData } = await adminClient.auth.signInWithPassword({ email, password });
    return new Response(JSON.stringify({ user: data.user, session: sessionData?.session || null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch { return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
