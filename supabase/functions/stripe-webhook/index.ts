import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1TLxTbFkGdVt5nie0MpVjQM3": "profissional",
  "price_1TLxU4FkGdVt5nieNT6rfU3u": "premium",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server configuration incomplete" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const traceId = event.id;
  console.log(`[${traceId}] Processing ${event.type}`);

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // ─── checkout.session.completed ───
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = (session.customer_details?.email || session.customer_email || "").trim().toLowerCase();
    const sessionId = session.id;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null;

    if (!customerEmail) {
      console.error(`[${traceId}] No customer email in checkout session`);
      return new Response(JSON.stringify({ error: "No customer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine plan from metadata or subscription price
    let plan = session.metadata?.plan || "profissional";
    if (subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId as string);
        const priceId = sub.items.data[0]?.price?.id;
        if (priceId && PRICE_TO_PLAN[priceId]) {
          plan = PRICE_TO_PLAN[priceId];
        }
      } catch (e) {
        console.error(`[${traceId}] Error fetching subscription:`, e);
      }
    }

    // Check for duplicate
    const { data: existing } = await adminClient
      .from("card_activations")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existing) {
      console.log(`[${traceId}] Activation already exists for session ${sessionId}`);
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1 });
    let existingUserId: string | null = null;
    
    // Search by email
    const { data: userByEmail } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("user_id", (await adminClient.auth.admin.listUsers()).data?.users?.find(u => u.email?.toLowerCase() === customerEmail)?.id || "00000000-0000-0000-0000-000000000000")
      .maybeSingle();

    // For existing users: update subscription directly
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const matchedUser = authUsers?.users?.find(u => u.email?.toLowerCase() === customerEmail);
    
    if (matchedUser) {
      existingUserId = matchedUser.id;
      console.log(`[${traceId}] Existing user found: ${existingUserId}, upgrading to ${plan}`);
      
      // Update subscription for existing user
      await adminClient
        .from("subscriptions")
        .update({
          plan,
          is_active: true,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq("user_id", existingUserId);

      return new Response(JSON.stringify({ received: true, user_upgraded: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // New user: create activation token
    const activationToken = crypto.randomUUID();
    const { error: insertError } = await adminClient.from("card_activations").insert({
      email: customerEmail,
      stripe_session_id: sessionId,
      activation_token: activationToken,
      payment_status: "paid",
      used: false,
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    });

    if (insertError) {
      console.error(`[${traceId}] Error inserting activation:`, insertError);
      return new Response(JSON.stringify({ error: "Failed to create activation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const activationUrl = `https://app.agentesdesonhos.com.br/ativar-cartao?token=${activationToken}`;
    console.log(`[${traceId}] ✅ Activation token created for ${customerEmail} (${plan}): ${activationUrl}`);

    // Send activation email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const planLabel = plan === "premium" ? "Premium" : "Profissional";
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Fernando Nobre <fernando.nobre@agentesdesonhos.com.br>",
          to: [customerEmail],
          subject: `Bem-vindo ao Agentes de Sonhos — Ative seu Plano ${planLabel}`,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #333;">Seu pagamento do Plano ${planLabel} foi confirmado! 🎉</h2>
            <p style="font-size: 16px; color: #555;">Agora finalize seu cadastro na plataforma Agentes de Sonhos clicando no botão abaixo:</p>
            <p style="margin: 24px 0;">
              <a href="${activationUrl}" style="background-color: #7c3aed; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Criar minha conta</a>
            </p>
            <p style="font-size: 14px; color: #888;">Esse link é único e válido por 24 horas.</p>
            <p style="font-size: 14px; color: #888;">Seu plano: <strong>${planLabel} (R$${plan === "premium" ? "98" : "49"}/mês)</strong></p>
          </div>`,
        }),
      });
      if (!emailRes.ok) {
        console.error(`[${traceId}] Resend email error:`, await emailRes.text());
      } else {
        console.log(`[${traceId}] 📧 Activation email sent to ${customerEmail}`);
      }
    }

    return new Response(JSON.stringify({ received: true, email: customerEmail }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── invoice.paid ───
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
          const email = (customer as Stripe.Customer).email?.trim().toLowerCase();
          if (email) {
            // Find user and ensure subscription is active
            const { data: authUsers } = await adminClient.auth.admin.listUsers();
            const user = authUsers?.users?.find(u => u.email?.toLowerCase() === email);
            if (user) {
              await adminClient
                .from("subscriptions")
                .update({ is_active: true })
                .eq("user_id", user.id);
              console.log(`[${traceId}] invoice.paid: subscription activated for ${email}`);
            }
          }
        }
      } catch (e) {
        console.error(`[${traceId}] Error processing invoice.paid:`, e);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── customer.subscription.updated ───
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = priceId ? PRICE_TO_PLAN[priceId] || "profissional" : "profissional";
    const isActive = subscription.status === "active" || subscription.status === "trialing";

    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
          const email = (customer as Stripe.Customer).email?.trim().toLowerCase();
          if (email) {
            const { data: authUsers } = await adminClient.auth.admin.listUsers();
            const user = authUsers?.users?.find(u => u.email?.toLowerCase() === email);
            if (user) {
              await adminClient
                .from("subscriptions")
                .update({
                  plan,
                  is_active: isActive,
                  stripe_subscription_id: subscription.id,
                })
                .eq("user_id", user.id);
              console.log(`[${traceId}] subscription.updated: ${email} -> ${plan} (active: ${isActive})`);
            }
          }
        }
      } catch (e) {
        console.error(`[${traceId}] Error processing subscription.updated:`, e);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── customer.subscription.deleted ───
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
          const email = (customer as Stripe.Customer).email?.trim().toLowerCase();
          if (email) {
            const { data: authUsers } = await adminClient.auth.admin.listUsers();
            const user = authUsers?.users?.find(u => u.email?.toLowerCase() === email);
            if (user) {
              await adminClient
                .from("subscriptions")
                .update({
                  plan: "start",
                  is_active: true,
                  stripe_subscription_id: null,
                })
                .eq("user_id", user.id);
              console.log(`[${traceId}] subscription.deleted: ${email} downgraded to start`);
            }
          }
        }
      } catch (e) {
        console.error(`[${traceId}] Error processing subscription.deleted:`, e);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── customer.subscription.created ───
  if (event.type === "customer.subscription.created") {
    const subscription = event.data.object as Stripe.Subscription;
    console.log(`[${traceId}] subscription.created: ${subscription.id} (handled via checkout.session.completed)`);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Acknowledge all other events
  console.log(`[${traceId}] Unhandled event type: ${event.type}`);
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});