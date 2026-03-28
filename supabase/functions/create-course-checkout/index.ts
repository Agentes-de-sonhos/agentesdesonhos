import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) throw new Error("Usuário não autenticado");

    const { course_id } = await req.json();
    if (!course_id) throw new Error("ID do curso não informado");

    // Get course
    const { data: course, error: courseError } = await supabaseAdmin
      .from("marketplace_courses")
      .select("*")
      .eq("id", course_id)
      .eq("status", "approved")
      .eq("is_active", true)
      .single();
    if (courseError || !course) throw new Error("Curso não encontrado ou não disponível");

    // Check if already enrolled
    const { data: existing } = await supabaseAdmin
      .from("marketplace_enrollments")
      .select("id")
      .eq("course_id", course_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) throw new Error("Você já está matriculado neste curso");

    // Free course
    if (course.price <= 0) {
      await supabaseAdmin.from("marketplace_enrollments").insert({
        course_id,
        user_id: user.id,
        amount_paid: 0,
      });
      // Increment enrolled count
      await supabaseAdmin.rpc("increment_enrolled_count" as any, { _course_id: course_id } as any).catch(() => {});
      return new Response(JSON.stringify({ enrolled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stripe checkout
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: course.title,
              description: course.description || undefined,
              images: course.cover_image_url ? [course.cover_image_url] : undefined,
            },
            unit_amount: Math.round(course.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        course_id,
        user_id: user.id,
        type: "marketplace_course",
      },
      success_url: `${req.headers.get("origin")}/cursos/${course_id}?enrolled=true`,
      cancel_url: `${req.headers.get("origin")}/cursos/${course_id}`,
    });

    // We'll handle enrollment via webhook or success redirect
    // For now, we also create a pending enrollment to be confirmed
    await supabaseAdmin.from("marketplace_enrollments").insert({
      course_id,
      user_id: user.id,
      stripe_session_id: session.id,
      amount_paid: course.price,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-course-checkout error:", error);
    const isUserError = error instanceof Error && (
      error.message.includes("não encontrado") ||
      error.message.includes("já está matriculado")
    );
    return new Response(
      JSON.stringify({ error: isUserError ? error.message : "Erro ao processar pagamento. Tente novamente." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: isUserError ? 400 : 500,
      }
    );
  }
});
