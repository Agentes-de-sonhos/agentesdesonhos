import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_clients",
  title: "List clients",
  description: "List the signed-in user's CRM clients (most recent first).",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 25)."),
    search: z.string().optional().describe("Optional case-insensitive name/email substring filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("clients")
      .select("id, name, email, phone, status, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (search && search.trim()) {
      const s = search.trim().replace(/[%,]/g, "");
      q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { clients: data ?? [] },
    };
  },
});
