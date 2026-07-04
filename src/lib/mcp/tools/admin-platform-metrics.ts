import { defineTool } from "@lovable.dev/mcp-js";
import { requireAdmin, PREMIUM_PLANS, FREE_PLANS } from "./_admin";

export default defineTool({
  name: "get_platform_metrics",
  title: "Admin: métricas gerais da plataforma",
  description: "Resumo geral: total de usuários, premium/free/ativos/inativos e status das assinaturas premium. Somente admin.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const guard = await requireAdmin(ctx, "get_platform_metrics", {});
    if (guard.ok !== true) return guard.response;
    const admin = guard.admin;

    const [{ count: total_users }, subsRes, activeRes] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("subscriptions").select("plan, is_active, expires_at"),
      admin.from("user_presence").select("user_id", { count: "exact", head: true }).gte("last_seen_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
    ]);

    if (subsRes.error) return { content: [{ type: "text", text: subsRes.error.message }], isError: true };
    const subs = subsRes.data ?? [];
    const now = Date.now();
    const isPremium = (p: string) => (PREMIUM_PLANS as readonly string[]).includes(p);
    const isFree = (p: string) => (FREE_PLANS as readonly string[]).includes(p);

    const premium_users = subs.filter((s) => isPremium(s.plan)).length;
    const free_users = subs.filter((s) => isFree(s.plan)).length;
    const active_premium_users = subs.filter((s) => isPremium(s.plan) && s.is_active && (!s.expires_at || new Date(s.expires_at).getTime() > now)).length;
    const canceled_premium_users = subs.filter((s) => isPremium(s.plan) && !s.is_active).length;
    const past_due_premium_users = subs.filter((s) => isPremium(s.plan) && s.is_active && s.expires_at && new Date(s.expires_at).getTime() <= now).length;

    const metrics = {
      total_users: total_users ?? 0,
      premium_users,
      free_users,
      trial_users: 0,
      active_users: activeRes.count ?? 0,
      inactive_users: Math.max(0, (total_users ?? 0) - (activeRes.count ?? 0)),
      active_premium_users,
      canceled_premium_users,
      past_due_premium_users,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(metrics, null, 2) }],
      structuredContent: metrics,
    };
  },
});