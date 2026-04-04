import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Permanent voucher file proxy.
 * URL format: /serve-voucher?token=<share_token>&file=<file_path>
 * 
 * Validates that the trip exists and has a valid share_token,
 * then streams the file directly from storage. No expiration — 
 * works as long as the trip and file exist.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const shareToken = url.searchParams.get("token");
    const filePath = url.searchParams.get("file");

    if (!shareToken || !filePath) {
      return new Response("Parâmetros inválidos", { status: 400, headers: corsHeaders });
    }

    // Validate token format (hex, 32 chars)
    if (!/^[a-f0-9]{32}$/.test(shareToken)) {
      return new Response("Token inválido", { status: 400, headers: corsHeaders });
    }

    // Sanitize file path — prevent path traversal
    if (filePath.includes("..") || filePath.startsWith("/")) {
      return new Response("Caminho inválido", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Verify trip exists with this share_token
    const { data: trip } = await adminClient
      .from("trips")
      .select("id, user_id")
      .eq("share_token", shareToken)
      .maybeSingle();

    if (!trip) {
      return new Response("Carteira não encontrada", { status: 404, headers: corsHeaders });
    }

    // Verify the file belongs to the trip owner
    const ownerPrefix = trip.user_id + "/";
    if (!filePath.startsWith(ownerPrefix)) {
      return new Response("Acesso não autorizado", { status: 403, headers: corsHeaders });
    }

    // Download the file from storage
    const { data: fileData, error } = await adminClient.storage
      .from("vouchers")
      .download(filePath);

    if (error || !fileData) {
      return new Response("Arquivo não encontrado", { status: 404, headers: corsHeaders });
    }

    // Determine content type from extension
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const contentTypes: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";

    // Extract filename for download
    const fileName = filePath.split("/").pop() || "documento";

    return new Response(fileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("serve-voucher error:", err);
    return new Response("Erro interno", { status: 500, headers: corsHeaders });
  }
});
