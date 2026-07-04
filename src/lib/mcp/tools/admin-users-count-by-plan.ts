import { defineTool } from "@lovable.dev/mcp-js";
import { withAdmin, toolError } from "./_admin";

export default defineTool({
  name: "get_users_count_by_plan",
  title: "Admin: usuários por plano",
  description: "Retorna a contagem de usuários agrupados por plano e status (ativo/cancelado/vencido). Somente admin.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAdmin("get_users_count_by_plan", async (_input, { admin }) => {
    const { data, error } = await admin.from("subscriptions").select("plan, is_active, expires_at");
    if (error) return toolError(error.message);
    const now = Date.now();
    const byPlan: Record<string, { active: number; canceled: number; past_due: number; total: number }> = {};
    for (const s of data ?? []) {
      const p = s.plan as string;
      const bucket = byPlan[p] ?? (byPlan[p] = { active: 0, canceled: 0, past_due: 0, total: 0 });
      bucket.total++;
      if (!s.is_active) bucket.canceled++;
      else if (s.expires_at && new Date(s.expires_at).getTime() <= now) bucket.past_due++;
      else bucket.active++;
    }
    return {
      content: [{ type: "text", text: JSON.stringify(byPlan, null, 2) }],
      structuredContent: { by_plan: byPlan },
    };
  }),
});