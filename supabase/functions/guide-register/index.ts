import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GuideLanguage {
  code: string;
  level: string;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      email, password, full_name,
      professional_name, photo_url, city, country, regions,
      languages, specialties, services,
      bio, differentials, certifications, gallery_urls,
      whatsapp, contact_email, instagram, website,
    } = body;

    // ---------- VALIDATION ----------
    if (!email || !password || !full_name || !whatsapp) {
      return json(400, { error: "Campos obrigatórios: nome, e-mail, senha e WhatsApp." });
    }
    if (typeof password !== "string" || password.length < 6) {
      return json(400, { error: "A senha deve ter pelo menos 6 caracteres." });
    }
    if (!Array.isArray(languages) || languages.length === 0) {
      return json(400, { error: "Adicione pelo menos um idioma." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // ---------- 1. Create auth user ----------
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name: full_name.trim() },
    });

    if (createError || !newUser?.user) {
      console.error("createUser error:", createError);
      const msg = createError && /already\s+been\s+registered|already\s+exists|duplicate/i.test(createError.message)
        ? "Este e-mail já está cadastrado."
        : (createError?.message || "Erro ao criar conta.");
      return json(400, { error: msg });
    }

    const userId = newUser.user.id;

    // ---------- 2. Set role to fornecedor ----------
    // Trigger handle_new_user_role auto-inserts 'agente'. We update it to 'fornecedor'.
    const { data: existingRoles } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId);

    if (existingRoles && existingRoles.length > 0) {
      const { error: updErr } = await admin
        .from("user_roles")
        .update({ role: "fornecedor" })
        .eq("user_id", userId);
      if (updErr) console.warn("Role update warning:", updErr.message);
    } else {
      const { error: insErr } = await admin
        .from("user_roles")
        .insert({ user_id: userId, role: "fornecedor" });
      if (insErr) console.warn("Role insert warning:", insErr.message);
    }

    // ---------- 3. Create profile ----------
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        user_id: userId,
        name: full_name.trim(),
        phone: whatsapp || null,
      },
      { onConflict: "user_id" },
    );
    if (profileError) {
      console.warn("Profile upsert warning:", profileError.message);
    }

    // ---------- 4. Move uploaded files from temp/ to userId/ folder ----------
    const moveTempUrl = async (url: string | null | undefined): Promise<string | null> => {
      if (!url || typeof url !== "string") return url ?? null;
      const marker = "/storage/v1/object/public/tour-guides-gallery/";
      const idx = url.indexOf(marker);
      if (idx === -1) return url;
      const path = url.substring(idx + marker.length);
      if (!path.startsWith("temp/")) return url;
      const fileName = path.split("/").pop()!;
      const newPath = `${userId}/${fileName}`;
      const { error: moveErr } = await admin.storage
        .from("tour-guides-gallery")
        .move(path, newPath);
      if (moveErr) {
        console.warn("Move file failed:", path, moveErr.message);
        return url; // keep original if move fails
      }
      const { data } = admin.storage.from("tour-guides-gallery").getPublicUrl(newPath);
      return data.publicUrl;
    };

    const finalPhotoUrl = await moveTempUrl(photo_url);
    const finalGallery: string[] = [];
    if (Array.isArray(gallery_urls)) {
      for (const u of gallery_urls) {
        const moved = await moveTempUrl(u);
        if (moved) finalGallery.push(moved);
      }
    }

    // ---------- 5. Create tour_guides record ----------
    const { data: guide, error: guideError } = await admin
      .from("tour_guides")
      .insert({
        user_id: userId,
        full_name: full_name.trim(),
        professional_name: professional_name?.trim() || null,
        photo_url: finalPhotoUrl || null,
        city: city?.trim() || null,
        country: country?.trim() || "Brasil",
        regions: Array.isArray(regions) ? regions : [],
        languages: languages as GuideLanguage[],
        specialties: Array.isArray(specialties) ? specialties : [],
        services: Array.isArray(services) ? services : [],
        bio: bio?.trim() || null,
        differentials: differentials?.trim() || null,
        certifications: Array.isArray(certifications) ? certifications.filter(Boolean) : [],
        gallery_urls: finalGallery,
        whatsapp: whatsapp.trim(),
        email: contact_email?.trim() || email.trim().toLowerCase(),
        instagram: instagram?.trim() || null,
        website: website?.trim() || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (guideError) {
      console.error("Create guide error:", guideError);
      return json(500, {
        error: `Conta criada, mas houve um erro ao criar o perfil de guia: ${guideError.message}`,
      });
    }

    return json(200, { success: true, user_id: userId, guide_id: guide.id });
  } catch (err) {
    console.error("guide-register error:", err);
    return json(500, { error: (err as Error).message || "Erro ao processar solicitação." });
  }
});
