import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function deriveSecret(apiKey: string): Promise<string> {
  const data = new TextEncoder().encode(`telegram-webhook:${apiKey}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function slugify(s: string): string {
  return (s || "fornecedor")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 60) || "fornecedor";
}

async function downloadTelegramFile(filePath: string, apiKey: string, lovableKey: string): Promise<ArrayBuffer> {
  const r = await fetch(`${GATEWAY_URL}/file/${filePath}`, {
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": apiKey },
  });
  if (!r.ok) throw new Error(`download ${r.status}`);
  return await r.arrayBuffer();
}

async function getFilePath(fileId: string, apiKey: string, lovableKey: string): Promise<string> {
  const r = await fetch(`${GATEWAY_URL}/getFile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_id: fileId }),
  });
  const j = await r.json();
  if (!r.ok || !j?.result?.file_path) throw new Error(`getFile ${r.status}`);
  return j.result.file_path as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!TELEGRAM_API_KEY || !LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
      console.error("Missing env vars");
      return new Response(JSON.stringify({ ok: false }), { status: 500, headers: corsHeaders });
    }

    const expected = await deriveSecret(TELEGRAM_API_KEY);
    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (!safeEqual(got, expected)) {
      console.warn("Invalid telegram secret token");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const update = await req.json();
    const updateId = update?.update_id;
    const msg = update?.message ?? update?.edited_message ?? update?.channel_post ?? update?.edited_channel_post;
    if (!msg || typeof updateId !== "number") {
      return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Idempotência
    const { error: dupErr } = await supabase
      .from("telegram_processed_updates")
      .insert({ update_id: updateId });
    if (dupErr && dupErr.code === "23505") {
      return new Response(JSON.stringify({ ok: true, dup: true }), { headers: corsHeaders });
    }

    const hubChatId = msg?.chat?.id;
    if (!hubChatId) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

    // Detecta origem real (mensagens encaminhadas — Opção 2)
    // forward_origin (Bot API >= 7) ou forward_from_chat (legado)
    const fOrigin = msg?.forward_origin;
    const fFromChat = msg?.forward_from_chat;
    const fFromUser = msg?.forward_from || fOrigin?.sender_user;
    const originChat = fOrigin?.chat || fOrigin?.sender_chat || fFromChat || null;

    const sourceChatId = originChat?.id ?? hubChatId;
    const sourceTitle =
      originChat?.title ||
      originChat?.username ||
      fOrigin?.sender_user_name ||
      (fFromUser ? `${fFromUser.first_name || ""} ${fFromUser.last_name || ""}`.trim() || fFromUser.username : null) ||
      msg?.chat?.title ||
      msg?.chat?.username ||
      `Chat ${sourceChatId}`;
    const sourceType = originChat?.type || msg?.chat?.type;

    // Procura mapeamento (origem real OU hub)
    const { data: mapping } = await supabase
      .from("telegram_supplier_channels")
      .select("supplier_id, category_default, is_active, chat_id")
      .eq("chat_id", sourceChatId)
      .maybeSingle();

    if (!mapping || !mapping.is_active) {
      // Registra como pendente — usando a origem real quando for forward
      await supabase.from("telegram_pending_chats").upsert({
        chat_id: sourceChatId,
        chat_title: sourceTitle,
        chat_type: sourceType,
        last_seen_at: new Date().toISOString(),
        message_count: 1,
      }, { onConflict: "chat_id" });
      return new Response(JSON.stringify({ ok: true, pending: true, forwarded: !!originChat }), { headers: corsHeaders });
    }

    // Identifica arquivos
    type Item = { fileId: string; mime: string; ext: string; type: "imagem" | "pdf" };
    const items: Item[] = [];

    if (Array.isArray(msg.photo) && msg.photo.length > 0) {
      const largest = msg.photo[msg.photo.length - 1];
      items.push({ fileId: largest.file_id, mime: "image/jpeg", ext: "jpg", type: "imagem" });
    }
    if (msg.document) {
      const mime = msg.document.mime_type || "";
      if (mime.startsWith("image/")) {
        const ext = mime.split("/")[1] || "jpg";
        items.push({ fileId: msg.document.file_id, mime, ext, type: "imagem" });
      } else if (mime === "application/pdf") {
        items.push({ fileId: msg.document.file_id, mime, ext: "pdf", type: "pdf" });
      }
    }

    if (items.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no media" }), { headers: corsHeaders });
    }

    // Buscar slug do fornecedor
    const { data: supplier } = await supabase
      .from("tour_operators")
      .select("id, name")
      .eq("id", mapping.supplier_id)
      .maybeSingle();
    const supplierName = supplier?.name || "fornecedor";
    const supplierSlug = slugify(supplierName);

    const caption = (msg.caption || "").trim();
    const mediaGroupId = msg.media_group_id ? String(msg.media_group_id) : `tg-${sourceChatId}-${msg.message_id}`;
    const batchId = `tg-${mediaGroupId}`;

    const dateStr = new Date().toISOString().slice(0, 10);
    const titleBase = caption ? caption.split("\n")[0].slice(0, 100) : `${supplierName} — ${dateStr}`;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        const filePath = await getFilePath(it.fileId, TELEGRAM_API_KEY, LOVABLE_API_KEY);
        const bytes = await downloadTelegramFile(filePath, TELEGRAM_API_KEY, LOVABLE_API_KEY);
        const objectPath = `telegram/${supplierSlug}/${batchId}/${msg.message_id}-${i}.${it.ext}`;

        const { error: upErr } = await supabase.storage
          .from("materials")
          .upload(objectPath, bytes, { contentType: it.mime, upsert: true });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from("materials").getPublicUrl(objectPath);

        await supabase.from("materials").insert({
          supplier_id: mapping.supplier_id,
          category: mapping.category_default || "Promocional",
          material_type: it.type,
          title: titleBase,
          file_url: pub.publicUrl,
          thumbnail_url: it.type === "imagem" ? pub.publicUrl : null,
          caption: caption || null,
          batch_id: batchId,
          order_index: i,
          is_active: true,
        });
      } catch (e) {
        console.error("Item processing failed:", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, count: items.length }), { headers: corsHeaders });
  } catch (e) {
    console.error("telegram-webhook error:", e);
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: corsHeaders });
  }
});