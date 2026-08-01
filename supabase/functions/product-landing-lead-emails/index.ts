// Queue worker: sends "new lead" e-mails for white-label product landings.
// Invoked by pg_cron (shared secret) or manually with the same secret.
// Never touches lead/CRM records: a failure here only affects the delivery row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderLeadEmail } from "./template.ts";
import { drainConversationalQueue } from "./conversational.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const FROM = "Agentes de Sonhos <fernando.nobre@agentesdesonhos.com.br>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("LEAD_EMAIL_CRON_SECRET") ?? "";
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";

  let limit = 20;
  try {
    const body = await req.json();
    if (Number.isFinite(body?.limit)) limit = Math.min(100, Math.max(1, Number(body.limit)));
  } catch { /* cron sends a minimal body */ }

  const { data: claimed, error } = await supabase.rpc(
    "claim_product_landing_lead_deliveries",
    { p_limit: limit },
  );
  if (error) {
    console.error(`[lead-emails] claim-error err=${error.message}`);
    return new Response(JSON.stringify({ error: "Erro ao ler a fila de envios." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = (claimed ?? []) as any[];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    if (!resendKey) {
      await supabase.rpc("complete_product_landing_lead_delivery", {
        p_delivery_id: row.delivery_id,
        p_status: "failed",
        p_error: "Credencial de e-mail não configurada.",
      });
      failed++;
      continue;
    }
    try {
      const mail = renderLeadEmail(row);
      // One request per recipient: no CC/BCC, team e-mails never cross-exposed.
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: FROM,
          to: [row.recipient_email],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`[lead-emails] provider-error status=${res.status}`);
        await supabase.rpc("complete_product_landing_lead_delivery", {
          p_delivery_id: row.delivery_id,
          p_status: "failed",
          p_error: `Provedor de e-mail retornou ${res.status}.`,
        });
        failed++;
        continue;
      }
      await supabase.rpc("complete_product_landing_lead_delivery", {
        p_delivery_id: row.delivery_id,
        p_status: "sent",
        p_provider_message_id: payload?.id ?? null,
      });
      sent++;
    } catch (e) {
      console.error(`[lead-emails] send-exception lead=${row.lead_id}`);
      await supabase.rpc("complete_product_landing_lead_delivery", {
        p_delivery_id: row.delivery_id,
        p_status: "failed",
        p_error: "Falha temporária no envio do e-mail.",
      });
      failed++;
    }
  }

  console.log(`[lead-emails] done claimed=${rows.length} sent=${sent} failed=${failed}`);

  // Same cron pass also drains the conversational lead-form queue.
  const conversational = await drainConversationalQueue(supabase, resendKey, FROM, limit);

  return new Response(JSON.stringify({ claimed: rows.length, sent, failed, conversational }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});