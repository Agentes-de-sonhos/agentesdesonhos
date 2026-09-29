// Shared send step for ADS briefing e-mails (used by the endpoint and the retry cron).
import { buildAdsEmail, type AdsPayload } from "./adsBriefingContract.ts";

// deno-lint-ignore no-explicit-any
type Sb = any;

export async function sendAdsDelivery(supabase: Sb, resendKey: string, jobId: string):
  Promise<{ status: "sent" | "queued" | "failed" | "busy"; provider_message_id?: string }> {
  const { data, error } = await supabase.rpc("ads_claim_briefing_delivery", { p_job_id: jobId });
  if (error) { console.error(`[ads-briefing] claim-error job=${jobId}`); return { status: "queued" }; }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    const { data: cur } = await supabase.from("ads_briefing_email_deliveries")
      .select("status,provider_message_id").eq("job_id", jobId).maybeSingle();
    if (cur?.status === "sent") return { status: "sent", provider_message_id: cur.provider_message_id ?? undefined };
    if (cur?.status === "failed") return { status: "failed" };
    return { status: "busy" };
  }
  let ok = false; let providerId: string | null = null; let safeError: string | null = null;
  if (!resendKey) {
    safeError = "Credencial de e-mail não configurada.";
  } else {
    try {
      const mail = buildAdsEmail(row.payload as AdsPayload, row.job_json_text, row.job_sha256);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
          "Idempotency-Key": `ads-briefing/${jobId}`,
        },
        body: JSON.stringify(mail),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.id) { ok = true; providerId = String(body.id); }
      else safeError = `Provedor de e-mail retornou ${res.status}.`;
    } catch {
      safeError = "Falha temporária no envio do e-mail.";
    }
  }
  const { data: done } = await supabase.rpc("ads_complete_briefing_delivery", {
    p_job_id: jobId, p_success: ok, p_provider_message_id: providerId, p_error: safeError,
  });
  console.log(`[ads-briefing] attempt job=${jobId} ok=${ok}`);
  if (ok) return { status: "sent", provider_message_id: providerId! };
  return { status: done === "failed" ? "failed" : "queued" };
}

export async function drainAdsBriefingEmails(supabase: Sb, resendKey: string, limit = 5) {
  const { data, error } = await supabase.rpc("ads_due_briefing_deliveries", { p_limit: limit });
  if (error) { console.error("[ads-briefing] due-error"); return { claimed: 0, sent: 0 }; }
  let sent = 0;
  const ids = ((data ?? []) as { job_id: string }[]).map((r) => r.job_id);
  for (const id of ids) {
    const r = await sendAdsDelivery(supabase, resendKey, id);
    if (r.status === "sent") sent++;
  }
  return { claimed: ids.length, sent };
}
