import { defineTool } from "@lovable.dev/mcp-js";
import { withAdmin, toolError } from "./_admin";

// Approximate monthly prices (BRL) per plan, used only for MRR/ticket estimates.
const PLAN_PRICE_BRL: Record<string, number> = {
  essencial: 0,
  profissional: 97,
  premium: 197,
  educa_pass: 47,
  cartao_digital: 29,
  fundador: 47,
  fornecedor_parceiro: 0,
  start: 0,
};

export default defineTool({
  name: "get_subscription_metrics",
  title: "Admin: métricas de assinaturas",
  description: "Retorna totais de assinaturas (ativas/canceladas/vencidas) e MRR/ticket médio estimados. Somente admin.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAdmin("get_subscription_metrics", async (_input, { admin }) => {
    const { data, error } = await admin.from("subscriptions").select("plan, is_active, expires_at");
    if (error) return toolError(error.message);
    const now = Date.now();
    const subs = data ?? [];
    let active = 0, canceled = 0, past_due = 0, mrr = 0, paying = 0;
    for (const s of subs) {
      if (!s.is_active) canceled++;
      else if (s.expires_at && new Date(s.expires_at).getTime() <= now) past_due++;
      else {
        active++;
        const price = PLAN_PRICE_BRL[s.plan as string] ?? 0;
        if (price > 0) { mrr += price; paying++; }
      }
    }
    const metrics = {
      total_subscriptions: subs.length,
      active_subscriptions: active,
      canceled_subscriptions: canceled,
      past_due_subscriptions: past_due,
      trialing_subscriptions: 0,
      monthly_recurring_revenue_brl: mrr,
      average_ticket_brl: paying > 0 ? Math.round((mrr / paying) * 100) / 100 : 0,
      note: "MRR e ticket médio são estimados a partir de uma tabela de preços interna por plano.",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(metrics, null, 2) }],
      structuredContent: metrics,
    };
  }),
});