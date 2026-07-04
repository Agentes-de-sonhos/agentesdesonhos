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

export type ToolErrorResponse = { content: { type: "text"; text: string }[]; isError: true };
export function toolError(text: string): ToolErrorResponse {
  return { content: [{ type: "text", text }], isError: true };
}

export class AdminAccessError extends Error {}

/**
 * Ensures the caller is authenticated AND holds the `admin` role in user_roles.
 * Uses the caller's JWT to read their own role (allowed by RLS), then returns
 * a service-role client for the actual admin query.
 */
export async function requireAdmin(
  ctx: ToolContext,
  toolName: string,
  params: unknown,
): Promise<{ userId: string; admin: SupabaseClient }> {
  if (!ctx.isAuthenticated()) throw new AdminAccessError("Não autenticado.");
  const userId = ctx.getUserId();
  if (!userId) throw new AdminAccessError("Sessão inválida.");

  const caller = callerClient(ctx);
  const { data, error } = await caller
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw new AdminAccessError(`Falha ao verificar permissão: ${error.message}`);
  if (!data) throw new AdminAccessError("Acesso negado. Esta ferramenta é restrita a administradores da plataforma.");

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

  return { userId, admin };
}

/** Wraps an admin tool handler with role check + error handling. */
export function withAdmin<TInput, TOutput>(
  toolName: string,
  fn: (input: TInput, ctx: { userId: string; admin: SupabaseClient }, mcpCtx: ToolContext) => Promise<TOutput>,
) {
  return async (input: TInput, mcpCtx: ToolContext): Promise<TOutput | ToolErrorResponse> => {
    try {
      const guard = await requireAdmin(mcpCtx, toolName, input);
      return await fn(input, guard, mcpCtx);
    } catch (e) {
      const msg = e instanceof AdminAccessError ? e.message : e instanceof Error ? e.message : "Erro desconhecido.";
      return toolError(msg);
    }
  };
}

/** Plans considered "premium" (paid) tiers. */
export const PREMIUM_PLANS = ["premium", "profissional", "fundador", "essencial", "cartao_digital"] as const;
export const FREE_PLANS = ["start"] as const;