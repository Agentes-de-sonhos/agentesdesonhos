import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CUSTOMER-PORTAL] ${step}`, details ? JSON.stringify(details) : "");
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
    if (userError) throw new Error("Não foi possível validar sua sessão.");
    const user = userData.user;
    if (!user?.email) throw new Error("Usuário sem e-mail vinculado.");
    log("user", { id: user.id, email: user.email });

    let mode: "manage" | "cancel" = "manage";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.mode === "cancel") mode = "cancel";
      } catch (_) {
        // body opcional
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // 1) Tenta pelo e-mail
    let customerId: string | null = null;
    const byEmail = await stripe.customers.list({ email: user.email, limit: 1 });
    if (byEmail.data.length > 0) {
      customerId = byEmail.data[0].id;
    } else {
      // 2) Fallback: busca por metadata.supabase_user_id (caso o e-mail no Stripe seja outro)
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
    log("customer", customerId);

    const origin = req.headers.get("origin") || "https://app.agentesdesonhos.com.br";

    // Se for cancelamento, abrir direto o flow de cancelamento da assinatura ativa
    let flowData: Stripe.BillingPortal.SessionCreateParams.FlowData | undefined;
    if (mode === "cancel") {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      if (subs.data.length === 0) {
        throw new Error(
          "Não encontramos uma assinatura ativa para cancelar. Se você acredita que isso é um erro, fale com o suporte."
        );
      }
      flowData = {
        type: "subscription_cancel",
        subscription_cancel: { subscription: subs.data[0].id },
        after_completion: {
          type: "redirect",
          redirect: { return_url: `${origin}/minha-conta?canceled=1` },
        },
      };
      log("cancel flow prepared", subs.data[0].id);
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/minha-conta`,
      ...(flowData ? { flow_data: flowData } : {}),
    });
    log("portal session", portal.id);

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    log("ERROR", raw);
    // Mensagens específicas do Stripe (ex.: portal não configurado)
    let message = raw;
    if (/No configuration provided/i.test(raw) || /default configuration has not been created/i.test(raw)) {
      message =
        "O portal de assinaturas ainda não foi configurado no Stripe. Acesse o painel do Stripe e salve as configurações do Customer Portal para liberar o cancelamento.";
    }
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
