import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { file_path, trip_id, password, share_token, slug, expires_in } = await req.json();

    if (!file_path) {
      return new Response(
        JSON.stringify({ error: "Caminho do arquivo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting - prevent brute force on password
    const clientIP = getClientIP(req);
    const rlResult = await checkRateLimit(clientIP, "get-secure-voucher", 20, 60);
    if (!rlResult.allowed) {
      return rateLimitResponse(corsHeaders, rlResult.retryAfterMs);
    }

    // Two access paths: authenticated user (trip owner) or public access via password/token
    const authHeader = req.headers.get("authorization");
    let authorized = false;

    // Path 1: Authenticated user - verify they own the trip
    if (authHeader && trip_id) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        // Check trip ownership
        const { data: trip } = await adminClient
          .from("trips")
          .select("user_id")
          .eq("id", trip_id)
          .maybeSingle();

        if (trip && trip.user_id === user.id) {
          authorized = true;
        }
      }
    }

    // Path 2: Public access via share_token or slug + password
    if (!authorized) {
      if (!share_token && !slug) {
        return new Response(
          JSON.stringify({ error: "Acesso não autorizado" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the trip
      let tripQuery = adminClient.from("trips").select("id, access_password, user_id");
      if (slug) {
        tripQuery = tripQuery.eq("slug", slug);
      } else {
        tripQuery = tripQuery.eq("share_token", share_token);
      }

      const { data: trip } = await tripQuery.maybeSingle();

      if (!trip) {
        return new Response(
          JSON.stringify({ error: "Carteira não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify password if set
      if (trip.access_password) {
        if (!password || password !== trip.access_password) {
          // Add small delay to prevent timing attacks
          await new Promise((r) => setTimeout(r, 500));
          return new Response(
            JSON.stringify({ error: "Senha incorreta" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Verify the file belongs to this trip's owner folder
      const ownerFolder = trip.user_id + "/";
      if (!file_path.startsWith(ownerFolder) && !file_path.startsWith("itinerary/") && !file_path.startsWith("itinerary-docs/") && !file_path.startsWith("itinerary-periods/")) {
        return new Response(
          JSON.stringify({ error: "Acesso não autorizado a este arquivo" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      authorized = true;
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: "Acesso não autorizado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL — default 120s, max 7 days (604800s)
    const ttl = Math.min(Math.max(Number(expires_in) || 120, 60), 604800);
    const { data, error } = await adminClient.storage
      .from("vouchers")
      .createSignedUrl(file_path, ttl);

    if (error || !data?.signedUrl) {
      console.error("Signed URL error:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar acesso ao arquivo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: data.signedUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-secure-voucher error:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao processar solicitação" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
