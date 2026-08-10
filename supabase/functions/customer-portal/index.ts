import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ELIGIBLE_STATUSES = ["active", "trialing", "past_due", "unpaid"];

const log = (step: string, details?: unknown) => {
  console.log(`[CUSTOMER-PORTAL] ${step}`, details ? JSON.stringify(details) : "");
};

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    log("missing STRIPE_SECRET_KEY");
    return json(
      { error: "Pagamentos indisponíveis no momento.", code: "stripe_error" },
      503,
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // 1) Autenticação
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Sessão não encontrada.", code: "not_authenticated" }, 401);
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return json({ error: "Sessão inválida.", code: "not_authenticated" }, 401);
  }
  log("user", { id: user.id });

  // 2) Modo
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
  const origin = req.headers.get("origin") || "https://app.agentesdesonhos.com.br";

  try {
    // 3) Linha ativa local — fonte prioritária dos IDs
    const { data: localSub } = await supabase
      .from("subscriptions")
      .select("id, plan, stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    log("local subscription", {
      found: !!localSub,
      has_customer_id: !!localSub?.stripe_customer_id,
      has_subscription_id: !!localSub?.stripe_subscription_id,
    });

    let customerId: string | null = null;
    let subscription: any = null;
    let strategy = "none";
    let discoveredByFallback = false;

    const pickEligible = (list: any[]) =>
      list.find((s) => ELIGIBLE_STATUSES.includes(s?.status)) ?? null;

    const listForCustomer = async (id: string) => {
      const res = await stripe.subscriptions.list({ customer: id, status: "all", limit: 20 });
      return pickEligible(res.data);
    };

    const customerOf = (sub: any): string =>
      typeof sub?.customer === "string" ? sub.customer : sub?.customer?.id ?? "";

    // a) stripe_customer_id persistido
    if (localSub?.stripe_customer_id) {
      try {
        const customer = await stripe.customers.retrieve(localSub.stripe_customer_id);
        if (customer && !(customer as any).deleted) {
          customerId = customer.id;
          strategy = "stripe_customer_id";
          subscription = await listForCustomer(customer.id);
        }
      } catch (e) {
        log("retrieve stored customer failed", String(e));
      }
    }

    // b) customer derivado do stripe_subscription_id persistido
    if (!customerId && localSub?.stripe_subscription_id) {
      try {
        const retrieved = await stripe.subscriptions.retrieve(localSub.stripe_subscription_id);
        const derived = customerOf(retrieved);
        if (derived) {
          customerId = derived;
          subscription = retrieved;
          strategy = "stripe_subscription_id";
          discoveredByFallback = true;
        }
      } catch (e) {
        log("retrieve stored subscription failed", String(e));
      }
    }

    // c) fallback por e-mail — varre todos os customers e escolhe um válido
    if (!customerId && user.email) {
      try {
        const byEmail = await stripe.customers.list({ email: user.email, limit: 20 });
        let firstValid: string | null = null;
        for (const customer of byEmail.data) {
          if ((customer as any).deleted) continue;
          if (!firstValid) firstValid = customer.id;
          const sub = await listForCustomer(customer.id);
          if (sub) {
            customerId = customer.id;
            subscription = sub;
            break;
          }
        }
        if (!customerId && firstValid) customerId = firstValid;
        if (customerId) {
          strategy = "customer_email";
          discoveredByFallback = true;
        }
      } catch (e) {
        log("email fallback failed", String(e));
      }
    }

    // d) fallback por metadata.supabase_user_id
    if (!customerId) {
      try {
        const search = await stripe.customers.search({
          query: `metadata['supabase_user_id']:'${user.id}'`,
          limit: 10,
        });
        for (const customer of search.data) {
          if ((customer as any).deleted) continue;
          customerId = customer.id;
          subscription = (await listForCustomer(customer.id)) ?? subscription;
          strategy = "customer_metadata";
          discoveredByFallback = true;
          break;
        }
      } catch (e) {
        log("metadata fallback failed", String(e));
      }
    }

    if (!customerId) {
      log("customer not found", { user_id: user.id });
      return json(
        {
          error:
            "Não localizamos seus dados de cobrança. Fale com o suporte informando o e-mail usado no pagamento.",
          code: "subscription_not_found",
        },
        404,
      );
    }

    log("customer resolved", { strategy, has_subscription: !!subscription });

    // 4) Autocura dos IDs quando descobertos por fallback
    if (
      discoveredByFallback &&
      (localSub?.stripe_customer_id !== customerId ||
        (subscription?.id && localSub?.stripe_subscription_id !== subscription.id))
    ) {
      const payload: Record<string, unknown> = { stripe_customer_id: customerId };
      if (subscription?.id) payload.stripe_subscription_id = subscription.id;
      const { error } = await supabase
        .from("subscriptions")
        .update(payload)
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (error) log("self-heal update failed (non-blocking)", error.message);
      else log("self-heal ok", { strategy });
    }

    // 5) Cancelamento já agendado: não abrir novo flow de cancelamento
    const alreadyScheduled = subscription?.cancel_at_period_end === true;
    if (mode === "cancel" && alreadyScheduled) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/minha-conta`,
      });
      return json(
        {
          url: portal.url,
          state: "already_scheduled",
          message: "Seu cancelamento já está agendado. Nenhuma nova cobrança será feita.",
        },
        200,
      );
    }

    let flowData: Stripe.BillingPortal.SessionCreateParams.FlowData | undefined;
    if (mode === "cancel") {
      if (!subscription) {
        return json(
          {
            error: "Não encontramos uma assinatura ativa para cancelar. Fale com o suporte.",
            code: "subscription_not_found",
          },
          404,
        );
      }
      flowData = {
        type: "subscription_cancel",
        subscription_cancel: { subscription: subscription.id },
        after_completion: {
          type: "redirect",
          redirect: { return_url: `${origin}/minha-conta?canceled=1` },
        },
      };
    }

    // 6) mode=manage funciona normalmente mesmo com cancel_at_period_end=true
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/minha-conta`,
      ...(flowData ? { flow_data: flowData } : {}),
    });
    log("portal session", portal.id);

    return json(
      {
        url: portal.url,
        ...(alreadyScheduled ? { state: "already_scheduled" } : {}),
      },
      200,
    );
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    log("ERROR", raw);
    if (/No configuration provided/i.test(raw) || /default configuration has not been created/i.test(raw)) {
      return json(
        {
          error:
            "O portal de pagamentos ainda não está disponível. Já avisamos o suporte — tente novamente mais tarde.",
          code: "portal_not_configured",
        },
        503,
      );
    }
    return json(
      {
        error: "O provedor de pagamento não respondeu. Tente novamente em alguns minutos.",
        code: "stripe_error",
      },
      502,
    );
  }
});
