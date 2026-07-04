import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withAdmin, toolError } from "./_admin";

function bucketKey(d: Date, group: "day" | "week" | "month"): string {
  if (group === "day") return d.toISOString().slice(0, 10);
  if (group === "month") return d.toISOString().slice(0, 7);
  // ISO week: Monday-based
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export default defineTool({
  name: "get_new_users_by_period",
  title: "Admin: novos usuários por período",
  description: "Retorna a quantidade de novos usuários cadastrados em um intervalo, agrupados por dia, semana ou mês. Somente admin.",
  inputSchema: {
    start_date: z.string().describe("Data inicial (YYYY-MM-DD)."),
    end_date: z.string().describe("Data final inclusiva (YYYY-MM-DD)."),
    group_by: z.enum(["day", "week", "month"]).optional().describe("Agrupamento (padrão: day)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAdmin("get_new_users_by_period", async ({ start_date, end_date, group_by }, { admin }) => {
    const group = group_by ?? "day";
    const startISO = new Date(`${start_date}T00:00:00Z`).toISOString();
    const endISO = new Date(`${end_date}T23:59:59Z`).toISOString();

    const { data, error, count } = await admin
      .from("profiles")
      .select("created_at", { count: "exact" })
      .gte("created_at", startISO)
      .lte("created_at", endISO);
    if (error) return toolError(error.message);

    const buckets: Record<string, number> = {};
    for (const row of data ?? []) {
      const k = bucketKey(new Date(row.created_at), group);
      buckets[k] = (buckets[k] ?? 0) + 1;
    }
    const series = Object.entries(buckets)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([period, new_users]) => ({ period, new_users }));

    const out = { start_date, end_date, group_by: group, total_new_users: count ?? series.reduce((a, b) => a + b.new_users, 0), series };
    return {
      content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      structuredContent: out,
    };
  }),
});