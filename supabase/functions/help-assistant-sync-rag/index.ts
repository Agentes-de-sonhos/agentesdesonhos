import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ragData from "./rag-data.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RawChunk {
  id: string;
  title: string;
  content: string;
  module?: string | null;
  submodule?: string | null;
  type?: string | null;
  audience?: string[] | null;
  plan?: string | null;
  permissions?: string | null;
  intents?: string[] | null;
  keywords?: string[] | null;
  confidence?: string | null;
  status?: string | null;
  related_ids?: string[] | null;
  source_reference?: string | null;
  last_reviewed?: string | null;
}

function buildSearchText(c: RawChunk): string {
  return [
    c.title,
    c.module ?? "",
    c.submodule ?? "",
    c.content,
    (c.intents ?? []).join(" "),
    (c.keywords ?? []).join(" "),
  ]
    .join(" \n ")
    .toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validar admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chunks = (ragData as RawChunk[]).filter(
      (c) => c.status === "pronto" && c.confidence === "confirmado",
    );

    const rows = chunks.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      module: c.module ?? null,
      submodule: c.submodule ?? null,
      type: c.type ?? null,
      audience: c.audience ?? [],
      plan: c.plan ?? null,
      permissions: c.permissions ?? null,
      intents: c.intents ?? [],
      keywords: c.keywords ?? [],
      confidence: c.confidence ?? null,
      status: c.status ?? null,
      related_ids: c.related_ids ?? [],
      source_reference: c.source_reference ?? null,
      last_reviewed: c.last_reviewed ?? null,
      search_text: buildSearchText(c),
      updated_at: new Date().toISOString(),
    }));

    // Upsert em lotes
    const batchSize = 200;
    let imported = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await admin
        .from("help_center_chunks")
        .upsert(batch, { onConflict: "id" });
      if (error) {
        console.error("Upsert error:", error.message);
        return new Response(
          JSON.stringify({ error: "Falha ao importar chunks.", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      imported += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_in_file: (ragData as RawChunk[]).length,
        eligible: chunks.length,
        imported,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("sync-rag error:", err);
    return new Response(JSON.stringify({ error: "Falha temporária. Tente novamente." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});