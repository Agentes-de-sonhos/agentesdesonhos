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
  name: "list_trips",
  title: "List trips",
  description: "List the signed-in user's trips / digital wallets, most recent first.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 25)."),
    upcoming_only: z.boolean().optional().describe("If true, only trips with end_date >= today."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, upcoming_only }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("trips")
      .select("id, client_name, destination, start_date, end_date, status, created_at")
      .eq("user_id", ctx.getUserId())
      .order("start_date", { ascending: false })
      .limit(limit ?? 25);
    if (upcoming_only) {
      const today = new Date().toISOString().slice(0, 10);
      q = q.gte("end_date", today);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { trips: data ?? [] },
    };
  },
});
