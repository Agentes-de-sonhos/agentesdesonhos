import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CANCEL-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sessão não encontrada. Faça login novamente.");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Não foi possível validar sua sessão.");
    const user = userData.user;

    let reason = "";
    try {
      const body = await req.json();
      reason = typeof body?.reason === "string" ? body.reason.slice(0, 1000) : "";
    } catch (_) {
      // body opcional
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Localiza customer por e-mail; fallback metadata.supabase_user_id
    let customerId: string | null = null;
    const byEmail = await stripe.customers.list({ email: user.email, limit: 1 });
    if (byEmail.data.length > 0) {
      customerId = byEmail.data[0].id;
    } else {
      try {
        const search = await stripe.customers.search({
          query: `metadata['supabase_user_id']:'${user.id}'`,
          limit: 1,
        });
        if (search.data.length > 0) customerId = search.data[0].id;
      } catch (e) {
        log("customer search fallback failed", String(e));
      }
    }

    if (!customerId) {
      throw new Error(
        "Nenhuma assinatura encontrada para este e-mail. Verifique se você usou o mesmo e-mail no pagamento ou fale com o suporte."
      );
    }

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    if (subs.data.length === 0) {
      throw new Error("Não encontramos uma assinatura ativa para cancelar.");
    }
    const sub = subs.data[0];

    const updated = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
      cancellation_details: reason ? { comment: reason } : undefined,
      metadata: {
        ...(sub.metadata || {}),
        canceled_by: "in_app",
        canceled_by_user_id: user.id,
        cancel_reason: reason || "",
        canceled_requested_at: new Date().toISOString(),
      },
    });

    log("subscription scheduled for cancellation", { id: updated.id, period_end: updated.current_period_end });

    // Registra na tabela de assinaturas se existir expires_at
    try {
      await supabase
        .from("subscriptions")
        .update({
          expires_at: new Date(updated.current_period_end * 1000).toISOString(),
        })
        .eq("user_id", user.id)
        .eq("is_active", true);
    } catch (e) {
      log("subscriptions table update failed (non-blocking)", String(e));
    }

    return new Response(
      JSON.stringify({
        success: true,
        cancel_at: updated.current_period_end,
        subscription_id: updated.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});