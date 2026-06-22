import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData } = await client.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messageId = body?.message_id as string | undefined;
    const rating = body?.rating as "up" | "down" | undefined;
    const comment = (body?.comment as string | undefined)?.slice(0, 1000) ?? null;

    if (!messageId || (rating !== "up" && rating !== "down")) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await client
      .from("help_assistant_feedback")
      .upsert(
        { message_id: messageId, user_id: user.id, rating, comment },
        { onConflict: "message_id,user_id" },
      );

    if (error) {
      console.error("feedback error:", error.message);
      return new Response(JSON.stringify({ error: "Falha ao registrar feedback." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("feedback fatal:", err);
    return new Response(JSON.stringify({ error: "Falha temporária." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});