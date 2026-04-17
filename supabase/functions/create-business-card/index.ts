import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  return /^\+?\d{8,15}$/.test(cleaned);
}

function sanitize(val: string | null | undefined, maxLen: number): string | null {
  if (!val) return null;
  return val.trim().slice(0, maxLen) || null;
}

function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.length < 3) return { valid: false, error: "O slug deve ter pelo menos 3 caracteres" };
  if (slug.length > 60) return { valid: false, error: "O slug deve ter no máximo 60 caracteres" };
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length > 2) {
    return { valid: false, error: "Slug inválido. Use apenas letras minúsculas, números e hífens" };
  }
  return { valid: true };
}

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

    // Rate limiting by IP — strict for anonymous card creation
    const clientIP = getClientIP(req);
    const rlResult = await checkRateLimit(clientIP, "create-business-card", 5, 60);
    if (!rlResult.allowed) {
      return rateLimitResponse(corsHeaders, rlResult.retryAfterMs);
    }

    const body = await req.json();

    // Validate slug
    const rawSlug = String(body.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
    const slugCheck = validateSlug(rawSlug);
    if (!slugCheck.valid) {
      return new Response(
        JSON.stringify({ error: slugCheck.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    const name = sanitize(body.name, 100);
    if (!name) {
      return new Response(
        JSON.stringify({ error: "Nome é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate optional fields
    const email = sanitize(body.email, 255);
    if (email && !validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: "E-mail inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phone = sanitize(body.phone, 20);
    if (phone && !validatePhone(phone)) {
      return new Response(
        JSON.stringify({ error: "Telefone inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const whatsapp = sanitize(body.whatsapp, 20);
    if (whatsapp && !validatePhone(whatsapp)) {
      return new Response(
        JSON.stringify({ error: "WhatsApp inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate slug
    const { data: existing } = await adminClient
      .from("business_cards")
      .select("id")
      .eq("slug", rawSlug)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Esse slug já está em uso. Escolha outro." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect authenticated user (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      if (data?.user) userId = data.user.id;
    }

    // Defense in depth: enforce 3-card limit per authenticated user
    if (userId) {
      const { count: existingCount } = await adminClient
        .from("business_cards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if ((existingCount ?? 0) >= 3) {
        return new Response(
          JSON.stringify({
            error: "Você já atingiu o limite de 3 cartões virtuais. Exclua um existente para criar outro.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Sanitize label (optional)
    const label = sanitize(body.label, 60);

    // Sanitize buttons (max 6)
    let buttons: { text: string; url: string }[] = [];
    if (Array.isArray(body.buttons)) {
      buttons = body.buttons
        .slice(0, 6)
        .filter((b: any) => typeof b?.text === "string" && typeof b?.url === "string")
        .map((b: any) => ({
          text: b.text.trim().slice(0, 50),
          url: b.url.trim().slice(0, 500),
        }))
        .filter((b: any) => b.text && b.url);
    }

    // Sanitize social links
    let socialLinks: Record<string, string> = {};
    if (body.social_links && typeof body.social_links === "object") {
      const allowedKeys = ["instagram", "facebook", "linkedin", "twitter", "youtube", "tiktok"];
      for (const key of allowedKeys) {
        const val = body.social_links[key];
        if (typeof val === "string" && val.trim()) {
          socialLinks[key] = val.trim().slice(0, 500);
        }
      }
    }

    // Sanitize logos
    let logos: string[] = [];
    if (Array.isArray(body.logos)) {
      logos = body.logos
        .slice(0, 3)
        .filter((l: any) => typeof l === "string" && l.startsWith("http"))
        .map((l: string) => l.slice(0, 1000));
    }

    // Validate color format
    const primaryColor = /^#[0-9a-fA-F]{6}$/.test(body.primary_color) ? body.primary_color : "#0284c7";
    const secondaryColor = /^#[0-9a-fA-F]{6}$/.test(body.secondary_color) ? body.secondary_color : "#f97316";

    // Insert using service_role
    const { data: card, error: insertError } = await adminClient
      .from("business_cards")
      .insert({
        slug: rawSlug,
        label,
        name,
        title: sanitize(body.title, 100),
        agency_name: sanitize(body.agency_name, 100),
        phone,
        whatsapp,
        email,
        website: sanitize(body.website, 500),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        cover_url: sanitize(body.cover_url, 1000),
        buttons: buttons as any,
        social_links: socialLinks as any,
        logos: logos as any,
        user_id: userId,
        is_active: true,
      })
      .select("id, slug")
      .single();

    if (insertError) {
      console.error("Business card insert error:", insertError);
      if (insertError.message?.includes("unique") || insertError.message?.includes("duplicate")) {
        return new Response(
          JSON.stringify({ error: "Esse slug já está em uso. Escolha outro." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro ao criar cartão. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, slug: card.slug, id: card.id }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-business-card error:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao processar solicitação" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
