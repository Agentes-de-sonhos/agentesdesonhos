import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withAdmin, toolError, PREMIUM_PLANS } from "./_admin";

export default defineTool({
  name: "list_premium_users",
  title: "Admin: listar usuários Premium",
  description: "Lista usuários com planos pagos, com paginação, filtros por status e busca por nome/e-mail/agência. Somente admin.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Máx. de linhas (padrão 25)."),
    offset: z.number().int().min(0).optional().describe("Deslocamento para paginação (padrão 0)."),
    status: z.enum(["active", "canceled", "past_due"]).optional().describe("Filtrar por status de assinatura."),
    search: z.string().optional().describe("Busca por nome, e-mail ou nome da agência."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAdmin("list_premium_users", async ({ limit, offset, status, search }, { admin }) => {
    const lim = limit ?? 25;
    const off = offset ?? 0;
    const now = new Date().toISOString();

    let q = admin
      .from("subscriptions")
      .select("user_id, plan, is_active, started_at, expires_at, stripe_subscription_id")
      .in("plan", PREMIUM_PLANS as unknown as string[])
      .order("started_at", { ascending: false });

    if (status === "active") q = q.eq("is_active", true).or(`expires_at.is.null,expires_at.gt.${now}`);
    else if (status === "canceled") q = q.eq("is_active", false);
    else if (status === "past_due") q = q.eq("is_active", true).lte("expires_at", now);

    const { data: subs, error } = await q.range(off, off + lim - 1);
    if (error) return toolError(error.message);

    const userIds = (subs ?? []).map((s) => s.user_id);
    if (userIds.length === 0) {
      return { content: [{ type: "text", text: "[]" }], structuredContent: { users: [], count: 0 } };
    }

    let profQ = admin.from("profiles").select("user_id, name, agency_name").in("user_id", userIds);
    if (search && search.trim()) {
      const s = search.trim().replace(/[%,]/g, "");
      profQ = profQ.or(`name.ilike.%${s}%,agency_name.ilike.%${s}%`);
    }
    const { data: profiles, error: pErr } = await profQ;
    if (pErr) return toolError(pErr.message);

    const profMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    // Emails via auth admin API
    const emailMap = new Map<string, string | null>();
    await Promise.all(
      userIds.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        emailMap.set(id, data?.user?.email ?? null);
      }),
    );

    // Presence
    const { data: presence } = await admin.from("user_presence").select("user_id, last_active_at").in("user_id", userIds);
    const presenceMap = new Map((presence ?? []).map((p) => [p.user_id, p.last_active_at]));

    const users = (subs ?? [])
      .filter((s) => !search || profMap.has(s.user_id) || emailMap.get(s.user_id)?.toLowerCase().includes(search.toLowerCase()))
      .map((s) => {
        const prof = profMap.get(s.user_id);
        const derivedStatus = !s.is_active
          ? "canceled"
          : s.expires_at && new Date(s.expires_at).getTime() <= Date.now()
            ? "past_due"
            : "active";
        return {
          user_id: s.user_id,
          name: prof?.name ?? null,
          email: emailMap.get(s.user_id) ?? null,
          agency_name: prof?.agency_name ?? null,
          plan: s.plan,
          subscription_status: derivedStatus,
          subscription_started_at: s.started_at,
          subscription_expires_at: s.expires_at,
          last_active_at: presenceMap.get(s.user_id) ?? null,
        };
      });

    return {
      content: [{ type: "text", text: JSON.stringify(users, null, 2) }],
      structuredContent: { users, count: users.length, limit: lim, offset: off },
    };
  }),
});