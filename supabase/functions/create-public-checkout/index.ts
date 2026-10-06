import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_IDS: Record<string, string> = {
  profissional: "price_1TToCFFkGdVt5nieNMQEBoo1",
  premium: "price_1UL3WmFkGdVt5nieiiPBhTvG",
  ads_essencial: "price_1ULpgeFkGdVt5nie4zhdYYVm",
  ads_gestao: "price_1ULq6OFkGdVt5nien9POsrh1",
  ads_gestao_equipe: "price_1ULq7aFkGdVt5nieiHvSndPk",
  ads_essencial_gestao: "price_1ULqgMFkGdVt5niedJ9BdITk",
  ads_essencial_gestao_equipe: "price_1ULqhuFkGdVt5nief5qbZjCE",
};

const TRIAL_DAYS: Record<string, number> = {
  premium: 15,
};

// Allowlist estrita de origens externas autorizadas a iniciar o checkout.
const RETURN_ORIGIN_ALLOWLIST = new Set([
  "https://agentesdesonhos.com.br",
  "https://agentes-de-sonhos-gestao.nandonobre.chatgpt.site",
  "https://agentes-de-sonhos-planos.nandonobre.chatgpt.site",
  "https://agentes-de-sonhos-solucoes.nandonobre.chatgpt.site",
]);

const DEFAULT_ORIGIN = "https://app.agentesdesonhos.com.br";

// Origens externas não publicam a rota /planos: o cancelamento volta para a
// página raiz com a âncora do plano. O app mantém a própria rota de planos.
const CANCEL_URLS: Record<string, string> = {
  "https://agentes-de-sonhos-gestao.nandonobre.chatgpt.site":
    "https://agentes-de-sonhos-gestao.nandonobre.chatgpt.site/?checkout=cancelled#plano",
  "https://agentes-de-sonhos-planos.nandonobre.chatgpt.site":
    "https://agentes-de-sonhos-planos.nandonobre.chatgpt.site/?checkout=cancelled#planos",
  "https://agentesdesonhos.com.br":
    "https://agentesdesonhos.com.br/plano-completo/?checkout=cancelled",
  "https://agentes-de-sonhos-solucoes.nandonobre.chatgpt.site":
    "https://agentes-de-sonhos-solucoes.nandonobre.chatgpt.site/plano-completo/?checkout=cancelled",
  [DEFAULT_ORIGIN]: `${DEFAULT_ORIGIN}/planos?checkout=cancelled`,
};

const SUCCESS_URL = `${DEFAULT_ORIGIN}/ativar-cartao?session_id={CHECKOUT_SESSION_ID}`;


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const plan = body.plan || "profissional";
    
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Plano inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const bodyOrigin = typeof body.return_origin === "string" ? body.return_origin : "";
    const origin =
      bodyOrigin && RETURN_ORIGIN_ALLOWLIST.has(bodyOrigin) ? bodyOrigin : DEFAULT_ORIGIN;

    const trialDays = TRIAL_DAYS[plan];

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      ...(trialDays ? { subscription_data: { trial_period_days: trialDays } } : {}),
      // O sucesso cai sempre no app (rota existente); o cancelamento volta
      // para a origem externa autorizada que iniciou o checkout.
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URLS[origin],
      metadata: { plan },
    });


    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Public checkout error:", error);
    return new Response(JSON.stringify({ error: "Erro ao processar pagamento. Tente novamente." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});