import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

  // Extract customer email based on event type
  let customerEmail: string | null = null;
  let sessionId: string | null = null;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    customerEmail = session.customer_details?.email || session.customer_email || null;
    sessionId = session.id;
  } else if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    sessionId = paymentIntent.id;

    // buscar checkout session associada
    try {
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: paymentIntent.id,
      });

      if (sessions.data.length > 0) {
        const session = sessions.data[0];
        customerEmail = session.customer_details?.email || session.customer_email || null;
      }
    } catch (err) {
      console.error("Error retrieving checkout session:", err);
    }

    // Try to get email from receipt_email or charges
    customerEmail = paymentIntent.receipt_email || null;

    if (!customerEmail && paymentIntent.latest_charge) {
      try {
        const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
        customerEmail = charge.billing_details?.email || null;
      } catch (chargeErr) {
        console.error("Error retrieving charge for email:", chargeErr);
      }
    }

    // Try customer object as fallback
    if (!customerEmail && paymentIntent.customer) {
      try {
        const customer = await stripe.customers.retrieve(paymentIntent.customer as string);
        if (customer && !customer.deleted) {
          customerEmail = (customer as Stripe.Customer).email || null;
        }
      } catch (custErr) {
        console.error("Error retrieving customer for email:", custErr);
      }
    }
  } else {
    // Acknowledge other events
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!customerEmail) {
    console.error(`No customer email found for ${event.type}:`, sessionId);
    return new Response(JSON.stringify({ error: "No customer email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const normalizedEmail = customerEmail.trim().toLowerCase();
  const activationToken = crypto.randomUUID();
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // Check for duplicate to avoid re-processing
  const { data: existing } = await adminClient
    .from("card_activations")
    .select("id")
    .eq("stripe_session_id", sessionId!)
    .maybeSingle();

  if (existing) {
    console.log(`Activation already exists for session ${sessionId}, skipping.`);
    return new Response(JSON.stringify({ received: true, already_processed: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Save activation token
  const { error: insertError } = await adminClient.from("card_activations").insert({
    email: normalizedEmail,
    stripe_session_id: sessionId!,
    activation_token: activationToken,
    payment_status: "paid",
    used: false,
  });

  if (insertError) {
    console.error("Error inserting activation:", insertError);
    return new Response(JSON.stringify({ error: "Failed to create activation" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const activationUrl = `https://agentesdesonhos.lovable.app/ativar-cartao?token=${activationToken}`;
  console.log(`✅ Activation token created for ${normalizedEmail} via ${event.type}: ${activationUrl}`);

  // Send activation email via Resend
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (resendApiKey) {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Fernando Nobre <fernando.nobre@agentesdesonhos.com.br>",
        to: [normalizedEmail],
        subject: "Bem-vindo ao Agentes de Sonhos — Ative sua conta",
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #333;">Seu pagamento foi confirmado com sucesso! 🎉</h2>
          <p style="font-size: 16px; color: #555;">Agora finalize seu cadastro na plataforma Agentes de Sonhos clicando no botão abaixo:</p>
          <p style="margin: 24px 0;">
            <a href="${activationUrl}" style="background-color: #7c3aed; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Criar minha conta</a>
          </p>
          <p style="font-size: 14px; color: #888;">Esse link é único e válido por 24 horas.</p>
        </div>`,
      }),
    });
    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend email error:", errBody);
    } else {
      console.log(`📧 Activation email sent to ${normalizedEmail}`);
    }
  } else {
    console.warn("RESEND_API_KEY not configured, skipping email");
  }

  return new Response(JSON.stringify({ received: true, email: normalizedEmail }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
