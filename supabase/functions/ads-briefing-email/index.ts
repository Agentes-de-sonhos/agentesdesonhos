// Server-to-server endpoint: receives an ADS briefing and e-mails it to the owner.
// Own auth (x-ads-relay-token, SHA-256 checked against ads_briefing_integration).
// No CORS, POST only, anon/JWT never accepted as authorization.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  MAX_REQUEST_BYTES, sha256Hex, timingSafeEqualHex, validateAdsPayload,
} from "../_shared/adsBriefingContract.ts";
import { sendAdsDelivery } from "../_shared/adsBriefingSend.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Método não permitido." });

  const token = req.headers.get("x-ads-relay-token") ?? "";
  if (token.length < 32 || token.length > 512) return json(401, { error: "Não autorizado." });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: integ } = await supabase.from("ads_briefing_integration")
    .select("token_sha256,enabled").eq("id", "sites-briefing").maybeSingle();
  const hash = await sha256Hex(token);
  if (!integ || integ.enabled !== true || !timingSafeEqualHex(hash, String(integ.token_sha256))) {
    return json(401, { error: "Não autorizado." });
  }

  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_REQUEST_BYTES) return json(413, { error: "Requisição excede 22MiB." });
  let text: string;
  try {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAX_REQUEST_BYTES) return json(413, { error: "Requisição excede 22MiB." });
    text = new TextDecoder().decode(buf);
  } catch { return json(400, { error: "Corpo inválido." }); }

  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return json(400, { error: "JSON inválido." }); }
  const v = validateAdsPayload(raw);
  if (!v.ok) return json(400, { error: v.error });

  const jobId = v.payload.job.id;
  const jobSha = await sha256Hex(v.jobJsonText);
  const { data: enq, error: enqErr } = await supabase.rpc("ads_enqueue_briefing", {
    p_job_id: jobId, p_payload: v.payload, p_job_json_text: v.jobJsonText, p_job_sha256: jobSha,
  });
  if (enqErr) { console.error(`[ads-briefing] enqueue-error job=${jobId}`); return json(500, { error: "Erro ao registrar o briefing." }); }
  if (enq === "conflict") return json(409, { error: "job_id já registrado com conteúdo diferente." });

  const r = await sendAdsDelivery(supabase, Deno.env.get("RESEND_API_KEY") ?? "", jobId);
  if (r.status === "sent") return json(200, { job_id: jobId, status: "sent", provider_message_id: r.provider_message_id });
  if (r.status === "failed") return json(202, { job_id: jobId, status: "failed" });
  return json(202, { job_id: jobId, status: "queued" });
});
