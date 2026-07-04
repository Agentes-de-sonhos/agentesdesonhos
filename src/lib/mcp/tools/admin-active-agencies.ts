import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withAdmin, toolError } from "./_admin";

export default defineTool({
  name: "get_active_agencies",
  title: "Admin: agências ativas",
  description: "Lista agências/contas com assinatura ativa, com plano, dono, e última atividade. Somente admin.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Máx. de linhas (padrão 50)."),
    offset: z.number().int().min(0).optional().describe("Deslocamento (padrão 0)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAdmin("get_active_agencies", async ({ limit, offset }, { admin }) => {
    const lim = limit ?? 50;
    const off = offset ?? 0;
    const nowISO = new Date().toISOString();

    const { data: subs, error } = await admin
      .from("subscriptions")
      .select("user_id, plan, is_active, started_at, expires_at")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${nowISO}`)
      .order("started_at", { ascending: false })
      .range(off, off + lim - 1);
    if (error) return toolError(error.message);

    const userIds = (subs ?? []).map((s) => s.user_id);
    if (userIds.length === 0) {
      return { content: [{ type: "text", text: "[]" }], structuredContent: { agencies: [], count: 0 } };
    }

    const [{ data: profiles }, { data: presence }] = await Promise.all([
      admin.from("profiles").select("user_id, name, agency_name, created_at").in("user_id", userIds),
      admin.from("user_presence").select("user_id, last_active_at").in("user_id", userIds),
    ]);
    const profMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const presenceMap = new Map((presence ?? []).map((p) => [p.user_id, p.last_active_at]));

    const emailMap = new Map<string, string | null>();
    await Promise.all(
      userIds.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        emailMap.set(id, data?.user?.email ?? null);
      }),
    );

    const agencies = (subs ?? []).map((s) => {
      const p = profMap.get(s.user_id);
      return {
        agency_id: s.user_id,
        agency_name: p?.agency_name ?? null,
        owner_name: p?.name ?? null,
        owner_email: emailMap.get(s.user_id) ?? null,
        plan: s.plan,
        status: "active",
        created_at: p?.created_at ?? s.started_at,
        last_activity_at: presenceMap.get(s.user_id) ?? null,
      };
    });

    return {
      content: [{ type: "text", text: JSON.stringify(agencies, null, 2) }],
      structuredContent: { agencies, count: agencies.length, limit: lim, offset: off },
    };
  }),
});