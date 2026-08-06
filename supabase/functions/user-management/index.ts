import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PERMISSION_KEYS = [
  "can_check_in_out",
  "can_issue_invoice",
  "can_cancel_invoice",
  "can_collect_payment",
  "can_view_guest_ledger",
  "can_manage_waitlist",
  "can_grant_discount",
  "can_transfer_balance",
  "can_close_daily",
  "can_view_occupancy",
  "can_post_journal",
  "can_manage_payables",
  "can_reconcile_bank",
  "can_manage_vat",
  "can_view_financials",
  "can_manage_payroll",
  "can_manage_chart",
  "can_manage_periods",
  "can_approve_financials",
  "can_manage_fixed_assets",
  "can_review_audit_log",
  "can_approve_purchase",
  "can_manage_users",
  "can_manage_settings",
] as const;

type PermKey = (typeof PERMISSION_KEYS)[number];

interface FullPermissions {
  can_check_in_out: boolean;
  can_issue_invoice: boolean;
  can_cancel_invoice: boolean;
  can_collect_payment: boolean;
  can_view_guest_ledger: boolean;
  can_manage_waitlist: boolean;
  can_grant_discount: boolean;
  can_transfer_balance: boolean;
  can_close_daily: boolean;
  can_view_occupancy: boolean;
  can_post_journal: boolean;
  can_manage_payables: boolean;
  can_reconcile_bank: boolean;
  can_manage_vat: boolean;
  can_view_financials: boolean;
  can_manage_payroll: boolean;
  can_manage_chart: boolean;
  can_manage_periods: boolean;
  can_approve_financials: boolean;
  can_manage_fixed_assets: boolean;
  can_review_audit_log: boolean;
  can_approve_purchase: boolean;
  can_manage_users: boolean;
  can_manage_settings: boolean;
  discount_limit_pct: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  role_level: number | null;
  created_at: string | null;
  status?: string | null;
  permissions: FullPermissions;
}

const ROLE_NAMES: Record<number, { ar: string; en: string }> = {
  1: { ar: "موظف الاستقبال", en: "Reception / Front Desk" },
  2: { ar: "مشرف الوردية", en: "Shift Supervisor" },
  3: { ar: "أمين المخزن", en: "Storekeeper / Purchasing" },
  4: { ar: "محاسب", en: "Accountant" },
  5: { ar: "مدير مالي", en: "Finance Manager" },
  6: { ar: "مدير عام", en: "General Manager" },
};

const ROLE_TEXT: Record<number, string> = {
  1: "receptionist",
  2: "supervisor",
  3: "storekeeper",
  4: "accountant",
  5: "finance",
  6: "admin",
};

const emptyPerms: FullPermissions = {
  can_check_in_out: false, can_issue_invoice: false, can_cancel_invoice: false,
  can_collect_payment: false, can_view_guest_ledger: false, can_manage_waitlist: false,
  can_grant_discount: false, can_transfer_balance: false, can_close_daily: false,
  can_view_occupancy: false, can_post_journal: false, can_manage_payables: false,
  can_reconcile_bank: false, can_manage_vat: false, can_view_financials: false,
  can_manage_payroll: false, can_manage_chart: false, can_manage_periods: false,
  can_approve_financials: false, can_manage_fixed_assets: false, can_review_audit_log: false,
  can_approve_purchase: false, can_manage_users: false, can_manage_settings: false,
  discount_limit_pct: 0,
};

const STAFF_COLUMNS = [
  "user_id", "name", "role", "role_level", "status", "email",
  ...PERMISSION_KEYS, "discount_limit_pct",
] as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: callerData } = await callerClient.auth.getUser();
  const callerId = callerData?.user?.id ?? null;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "";

    // ─── LIST ───
    if (action === "list" || req.method === "GET") {
      const { data: authData, error } = await adminClient.auth.admin.listUsers();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userIds = authData.users.map((u) => u.id);
      const { data: staffRows } = await adminClient
        .from("staff_users")
        .select(STAFF_COLUMNS.join(","))
        .in("user_id", userIds);

      const staffMap = new Map<string, any>();
      for (const s of staffRows ?? []) staffMap.set(s.user_id, s);

      const users: UserRow[] = authData.users.map((u) => {
        const s = staffMap.get(u.id);
        const perms: FullPermissions = { ...emptyPerms };
        for (const k of PERMISSION_KEYS) {
          (perms as any)[k] = s?.[k] ?? false;
        }
        perms.discount_limit_pct = Number(s?.discount_limit_pct) || 0;
        return {
          id: u.id,
          email: u.email ?? "",
          name: s?.name ?? u.user_metadata?.name ?? "",
          role: s?.role ?? u.user_metadata?.role ?? "receptionist",
          role_level: s?.role_level ?? 1,
          created_at: u.created_at,
          status: s?.status ?? "active",
          permissions: perms,
        };
      });

      return new Response(JSON.stringify({ users, roleNames: ROLE_NAMES }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ROLE DEFAULTS ───
    if (action === "role_defaults") {
      const level = Number(body.level);
      const { data } = await adminClient.rpc("get_role_defaults", { p_level: level });
      return new Response(JSON.stringify({ defaults: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE ───
    if (action === "create") {
      const { email, password, name, role_level } = body as {
        email: string; password?: string; name: string; role_level?: number;
      };
      if (!email || !name) {
        return new Response(JSON.stringify({ error: "البريد والاسم مطلوبان" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!callerId) {
        return new Response(JSON.stringify({ error: "غير مصرح" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const level = role_level ?? 1;
      const roleText = ROLE_TEXT[level] ?? "receptionist";
      const { data: defaults } = await adminClient.rpc("get_role_defaults", { p_level: level });
      const perms = (body.permissions as Partial<FullPermissions>) ?? (defaults as FullPermissions) ?? emptyPerms;

      const finalPassword = password || crypto.randomUUID().slice(0, 16);
      const { data: authData, error } = await adminClient.auth.admin.createUser({
        email, password: finalPassword, user_metadata: { name, role: roleText }, email_confirm: true,
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const insertRow: Record<string, unknown> = {
        user_id: authData.user.id, name, email, role: roleText, role_level: level, status: "active",
      };
      for (const k of PERMISSION_KEYS) {
        insertRow[k] = (perms as any)[k] ?? false;
      }
      insertRow.discount_limit_pct = perms.discount_limit_pct ?? 0;

      await adminClient.from("staff_users").insert(insertRow);

      return new Response(JSON.stringify({ user: authData.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── UPDATE ───
    if (action === "update") {
      const { userId, name, role_level, status, permissions } = body as {
        userId: string; name?: string; role_level?: number; status?: string;
        permissions?: Partial<FullPermissions>;
      };
      if (!userId) {
        return new Response(JSON.stringify({ error: "معرف المستخدم مطلوب" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const update: Record<string, unknown> = {};
      if (name !== undefined) update.name = name;
      if (status !== undefined) update.status = status;
      if (role_level !== undefined) {
        update.role_level = role_level;
        update.role = ROLE_TEXT[role_level] ?? "receptionist";
      }
      if (permissions) {
        for (const k of PERMISSION_KEYS) {
          if ((permissions as any)[k] !== undefined) update[k] = (permissions as any)[k];
        }
        if (permissions.discount_limit_pct !== undefined) {
          update.discount_limit_pct = permissions.discount_limit_pct;
        }
      }

      if (Object.keys(update).length > 0) {
        await adminClient.from("staff_users").update(update).eq("user_id", userId);
      }

      const userMeta: Record<string, string> = {};
      if (name) userMeta.name = name;
      if (role_level !== undefined) userMeta.role = ROLE_TEXT[role_level] ?? "receptionist";
      if (Object.keys(userMeta).length > 0) {
        await adminClient.auth.admin.updateUserById(userId, { user_metadata: userMeta });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DELETE ───
    if (action === "delete") {
      const { userId } = body;
      if (!userId) {
        return new Response(JSON.stringify({ error: "معرف المستخدم مطلوب" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await adminClient.from("staff_users").delete().eq("user_id", userId);
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "إجراء غير مدعوم" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير متوقع";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
