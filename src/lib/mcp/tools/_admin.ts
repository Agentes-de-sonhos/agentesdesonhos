import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/** Client scoped to the caller's JWT — used only to verify the admin role via RLS. */
function callerClient(ctx: ToolContext): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service-role client — bypasses RLS. Only used AFTER admin verification. */
export function adminClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminGuardResult =
  | { ok: true; userId: string; admin: SupabaseClient }
  | { ok: false; response: { content: { type: "text"; text: string }[]; isError: true } };

function deny(text: string): AdminGuardResult {
  return { ok: false, response: { content: [{ type: "text", text }], isError: true } };
}

/**
 * Ensures the caller is authenticated AND holds the `admin` role in user_roles.
 * Uses the caller's JWT to read their own role (allowed by RLS), then returns
 * a service-role client for the actual admin query.
 */
export async function requireAdmin(ctx: ToolContext, toolName: string, params: unknown): Promise<AdminGuardResult> {
  if (!ctx.isAuthenticated()) return deny("Não autenticado.");
  const userId = ctx.getUserId();
  if (!userId) return deny("Sessão inválida.");

  const caller = callerClient(ctx);
  const { data, error } = await caller
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) return deny(`Falha ao verificar permissão: ${error.message}`);
  if (!data) return deny("Acesso negado. Esta ferramenta é restrita a administradores da plataforma.");

  const admin = adminClient();
  // Fire-and-forget audit log
  try {
    await admin.from("admin_action_logs").insert({
      admin_user_id: userId,
      target_user_id: userId,
      action: `mcp:${toolName}`,
      details: { params: params ?? {}, at: new Date().toISOString() },
    });
  } catch {
    // never block the tool
  }

  return { ok: true, userId, admin };
}

/** Plans considered "premium" (paid) tiers. */
export const PREMIUM_PLANS = ["premium", "profissional", "fundador", "essencial", "cartao_digital"] as const;
export const FREE_PLANS = ["start"] as const;