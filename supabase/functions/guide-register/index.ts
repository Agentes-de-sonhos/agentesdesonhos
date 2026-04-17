import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GuideLanguage {
  code: string;
  level: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      // auth
      email, password, full_name,
      // guide profile
      professional_name, photo_url, city, country, regions,
      languages, specialties, services,
      bio, differentials, certifications, gallery_urls,
      whatsapp, contact_email, instagram, website,
    } = body;

    if (!email || !password || !full_name || !whatsapp) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: nome, e-mail, senha e WhatsApp." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(languages) || languages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Adicione pelo menos um idioma." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Create auth user
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: full_name.trim() },
    });

    if (createError) {
      const msg = /already\s+been\s+registered/i.test(createError.message)
        ? "Este e-mail já está cadastrado."
        : "Erro ao criar conta.";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;

    // 2. Set role to fornecedor
    await admin.from("user_roles").update({ role: "fornecedor" }).eq("user_id", userId);

    // 3. Create profile
    await admin.from("profiles").upsert({
      user_id: userId,
      name: full_name.trim(),
      phone: whatsapp || null,
    });

    // 4. Create tour_guides record
    const { data: guide, error: guideError } = await admin
      .from("tour_guides")
      .insert({
        user_id: userId,
        full_name: full_name.trim(),
        professional_name: professional_name?.trim() || null,
        photo_url: photo_url || null,
        city: city?.trim() || null,
        country: country?.trim() || "Brasil",
        regions: Array.isArray(regions) ? regions : [],
        languages: languages as GuideLanguage[],
        specialties: Array.isArray(specialties) ? specialties : [],
        services: Array.isArray(services) ? services : [],
        bio: bio?.trim() || null,
        differentials: differentials?.trim() || null,
        certifications: Array.isArray(certifications) ? certifications.filter(Boolean) : [],
        gallery_urls: Array.isArray(gallery_urls) ? gallery_urls : [],
        whatsapp: whatsapp.trim(),
        email: contact_email?.trim() || email,
        instagram: instagram?.trim() || null,
        website: website?.trim() || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (guideError) {
      console.error("Create guide error:", guideError);
      return new Response(
        JSON.stringify({ error: "Conta criada, mas houve um erro ao criar o perfil de guia." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, guide_id: guide.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("guide-register error:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao processar solicitação." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
