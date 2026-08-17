import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  fetchRemoteImage,
  extensionForContentType,
} from "../_shared/remote-image-fetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Sessão expirada. Faça login novamente." }, 401);

    // Cliente com o JWT do usuário: o upload respeita as políticas por pasta.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user?.id) return json({ error: "Sessão expirada. Faça login novamente." }, 401);

    let body: { url?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Requisição inválida." }, 400);
    }
    const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
    if (!rawUrl || rawUrl.length > 2048) return json({ error: "Link inválido." }, 400);

    let image;
    try {
      image = await fetchRemoteImage(rawUrl);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "Não foi possível carregar a imagem deste link." }, 400);
    }

    const ext = extensionForContentType(image.contentType);
    const path = `${user.id}/quotes/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("quote-images")
      .upload(path, image.bytes, { contentType: image.contentType, upsert: false });

    if (uploadError) {
      console.error("import-quote-image upload failed", uploadError.message);
      return json({ error: "Não foi possível salvar a imagem. Tente novamente." }, 500);
    }

    const { data: pub } = supabase.storage.from("quote-images").getPublicUrl(path);
    return json({ url: pub.publicUrl });
  } catch (e) {
    console.error("import-quote-image error", e);
    return json({ error: "Não foi possível importar a imagem. Tente novamente." }, 500);
  }
});
