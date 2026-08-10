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

const ELIGIBLE_STATUSES = ["active", "trialing", "past_due", "unpaid"];

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

/**
 * Extrai o fim do período vigente de forma compatível com a API atual do Stripe
 * (2025-08-27.basil), onde `current_period_end` vive nos itens da assinatura.
 * Retorna epoch em segundos ou null quando não houver valor utilizável.
 */
export function extractPeriodEnd(sub: any): number | null {
  const candidates = [
    sub?.items?.data?.[0]?.current_period_end,
    sub?.cancel_at,
    sub?.current_period_end,
    sub?.trial_end,
    sub?.ended_at,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

const toIsoOrNull = (epochSeconds: number | null): string | null => {
  if (epochSeconds === null) return null;
  const date = new Date(epochSeconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    log("missing STRIPE_SECRET_KEY");
    return json(
      { error: "Serviço de pagamento indisponível no momento.", code: "stripe_error" },
      502,
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
    return json(
      { error: "Sessão não encontrada. Entre novamente e tente cancelar.", code: "not_authenticated" },
      401,
    );
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return json(
      { error: "Sua sessão expirou. Entre novamente e tente cancelar.", code: "not_authenticated" },
      401,
    );
  }

  // 2) Payload (opcional)
  let reason = "";
  try {
    const raw = await req.text();
    if (raw) {
      const body = JSON.parse(raw);
      if (body?.reason !== undefined && typeof body.reason !== "string") {
        return json({ error: "Motivo do cancelamento inválido.", code: "invalid_payload" }, 400);
      }
      reason = typeof body?.reason === "string" ? body.reason.slice(0, 1000) : "";
    }
  } catch (_) {
    return json({ error: "Não foi possível ler os dados enviados.", code: "invalid_payload" }, 400);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  try {
    // 3) Assinatura local (fonte prioritária dos IDs do Stripe)
    const { data: localSub } = await supabase
      .from("subscriptions")
      .select("id, plan, stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    log("local subscription", {
      found: !!localSub,
      has_subscription_id: !!localSub?.stripe_subscription_id,
      has_customer_id: !!localSub?.stripe_customer_id,
    });

    let sub: any = null;
    let strategy = "none";

    const pickEligible = (list: any[]) =>
      list.find((s) => ELIGIBLE_STATUSES.includes(s?.status)) ?? null;

    const listForCustomer = async (customerId: string) => {
      const res = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 20,
      });
      return pickEligible(res.data);
    };

    // a) stripe_subscription_id
    if (localSub?.stripe_subscription_id) {
      try {
        const retrieved = await stripe.subscriptions.retrieve(localSub.stripe_subscription_id);
        if (ELIGIBLE_STATUSES.includes(retrieved?.status)) {
          sub = retrieved;
          strategy = "stripe_subscription_id";
        } else {
          log("stored subscription not eligible", { status: retrieved?.status });
        }
      } catch (e) {
        log("retrieve by stored subscription id failed", String(e));
      }
    }

    // b) stripe_customer_id
    if (!sub && localSub?.stripe_customer_id) {
      sub = await listForCustomer(localSub.stripe_customer_id);
      if (sub) strategy = "stripe_customer_id";
    }

    // c) fallback por e-mail (todos os customers) e por metadata
    if (!sub && user.email) {
      const byEmail = await stripe.customers.list({ email: user.email, limit: 20 });
      for (const customer of byEmail.data) {
        sub = await listForCustomer(customer.id);
        if (sub) {
          strategy = "customer_email";
          break;
        }
      }
    }

    if (!sub) {
      try {
        const search = await stripe.customers.search({
          query: `metadata['supabase_user_id']:'${user.id}'`,
          limit: 10,
        });
        for (const customer of search.data) {
          sub = await listForCustomer(customer.id);
          if (sub) {
            strategy = "customer_metadata";
            break;
          }
        }
      } catch (e) {
        log("customer search fallback failed", String(e));
      }
    }

    if (!sub) {
      log("subscription not found", { user_id: user.id });
      return json(
        {
          error:
            "Não localizamos uma assinatura ativa vinculada à sua conta. Fale com o suporte informando o e-mail usado no pagamento.",
          code: "subscription_not_found",
        },
        404,
      );
    }

    log("subscription resolved", { strategy, status: sub.status, id: sub.id });

    // Autocura dos IDs + expires_at
    const persist = async (periodEndIso: string | null, customerId: string, subscriptionId: string) => {
      const payload: Record<string, unknown> = {
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      };
      if (periodEndIso) payload.expires_at = periodEndIso;
      const { error } = await supabase
        .from("subscriptions")
        .update(payload)
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (error) log("subscriptions update failed (non-blocking)", error.message);
    };

    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? "";

    // 4) Idempotência: já agendada
    if (sub.cancel_at_period_end === true) {
      const periodEnd = extractPeriodEnd(sub);
      await persist(toIsoOrNull(periodEnd), customerId, sub.id);
      log("already scheduled", { id: sub.id });
      return json(
        {
          success: true,
          already_scheduled: true,
          cancel_at: periodEnd,
          subscription_id: sub.id,
        },
        200,
      );
    }

    // 5) Agenda o cancelamento
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

    const periodEnd = extractPeriodEnd(updated);
    await persist(toIsoOrNull(periodEnd), customerId, updated.id);

    log("subscription scheduled for cancellation", {
      id: updated.id,
      strategy,
      has_period_end: periodEnd !== null,
    });

    return json(
      {
        success: true,
        already_scheduled: false,
        cancel_at: periodEnd,
        subscription_id: updated.id,
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("STRIPE/UNEXPECTED ERROR", message);
    return json(
      {
        error: "O provedor de pagamento não respondeu. Tente novamente em alguns minutos.",
        code: "stripe_error",
      },
      502,
    );
  }
});
