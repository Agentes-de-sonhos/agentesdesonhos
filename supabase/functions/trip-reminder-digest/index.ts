// Daily 07:00 (Brasília) digest: e-mails each agent about clients departing
// in N days and returning N days ago (N = 1..3 per agent, default 1).
// Invoked by pg_cron with x-cron-secret. Idempotent via trip_email_reminder_log.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const FROM = "Agentes de Sonhos <fernando.nobre@agentesdesonhos.com.br>";
const EXCLUDED = ["archived", "cancelado", "cancelled", "canceled"];

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

/** Today in America/Sao_Paulo as YYYY-MM-DD. */
function todayBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
const br = (ymd: string) => ymd.split("-").reverse().join("/");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type Trip = { id: string; user_id: string; client_name: string | null; destination: string | null; trip_title: string | null; start_date: string | null; end_date: string | null; status: string | null };
type Item = { trip: Trip; kind: "departure" | "return"; date: string; days: number };

function render(items: Item[]): string {
  const row = (i: Item) => {
    const who = esc(i.trip.client_name || "Cliente");
    const where = esc(i.trip.destination || i.trip.trip_title || "");
    const when = i.kind === "departure"
      ? `embarca em ${i.days === 1 ? "1 dia" : `${i.days} dias`} (${br(i.date)})`
      : `retornou há ${i.days === 1 ? "1 dia" : `${i.days} dias`} (${br(i.date)})`;
    return `<li style="margin:0 0 8px"><strong>${who}</strong>${where ? ` — ${where}` : ""}<br><span style="color:#555">${when}</span></li>`;
  };
  const dep = items.filter((i) => i.kind === "departure");
  const ret = items.filter((i) => i.kind === "return");
  const block = (title: string, list: Item[], tip: string) => list.length
    ? `<h3 style="color:#1d4ed8;margin:24px 0 8px">${title}</h3><ul style="padding-left:18px;margin:0">${list.map(row).join("")}</ul><p style="color:#777;font-size:13px">${tip}</p>`
    : "";
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#fff;color:#222">
<h2 style="margin:0 0 4px">Seu resumo de viagens de hoje</h2>
<p style="color:#555;margin:0">Lembretes dos seus clientes com base nas datas das viagens.</p>
${block("✈️ Embarques próximos", dep, "Uma boa hora para desejar boa viagem e conferir documentos.")}
${block("🧳 Retornos recentes", ret, "Uma boa hora para dar boas-vindas e pedir uma avaliação.")}
<p style="color:#999;font-size:12px;margin-top:32px">Você pode mudar ou desligar esses lembretes em Minhas Configurações.</p></div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const secret = Deno.env.get("LEAD_EMAIL_CRON_SECRET") ?? "";
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "Não autorizado" }, 401);
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!resendKey) return json({ error: "E-mail não configurado" }, 500);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const today = todayBR();

  // Candidate window: departures today+1..+3, returns today-3..-1.
  const sel = "id, user_id, client_name, destination, trip_title, start_date, end_date, status";
  const [depQ, retQ, setQ] = await Promise.all([
    sb.from("trips").select(sel).gte("start_date", addDays(today, 1)).lte("start_date", addDays(today, 3)),
    sb.from("trips").select(sel).gte("end_date", addDays(today, -3)).lte("end_date", addDays(today, -1)),
    sb.from("trip_email_reminder_settings").select("user_id, departure_days, return_days"),
  ]);
  if (depQ.error || retQ.error || setQ.error) {
    console.error(depQ.error ?? retQ.error ?? setQ.error);
    return json({ error: "Falha ao consultar viagens" }, 500);
  }
  const settings = new Map((setQ.data ?? []).map((s) => [s.user_id, s]));
  const cfg = (u: string) => settings.get(u) ?? { departure_days: 1, return_days: 1 };
  const ok = (t: Trip) => !EXCLUDED.includes((t.status ?? "").toLowerCase());

  const items: Item[] = [];
  for (const t of (depQ.data ?? []) as Trip[]) {
    const n = cfg(t.user_id).departure_days;
    if (ok(t) && n > 0 && t.start_date === addDays(today, n)) items.push({ trip: t, kind: "departure", date: t.start_date!, days: n });
  }
  for (const t of (retQ.data ?? []) as Trip[]) {
    const n = cfg(t.user_id).return_days;
    if (ok(t) && n > 0 && t.end_date === addDays(today, -n)) items.push({ trip: t, kind: "return", date: t.end_date!, days: n });
  }
  if (!items.length) return json({ ok: true, sent: 0 });

  // Drop already-sent reminders.
  const { data: logged } = await sb.from("trip_email_reminder_log").select("trip_id, kind, target_date")
    .in("trip_id", [...new Set(items.map((i) => i.trip.id))]);
  const seen = new Set((logged ?? []).map((l) => `${l.trip_id}|${l.kind}|${l.target_date}`));
  const pending = items.filter((i) => !seen.has(`${i.trip.id}|${i.kind}|${i.date}`));

  const byUser = new Map<string, Item[]>();
  for (const i of pending) byUser.set(i.trip.user_id, [...(byUser.get(i.trip.user_id) ?? []), i]);

  let sent = 0, failed = 0;
  for (const [userId, list] of byUser) {
    const { data: u } = await sb.auth.admin.getUserById(userId);
    const to = u?.user?.email;
    if (!to) continue;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from: FROM, to: [to], subject: `Lembrete de viagens — ${list.length} cliente(s)`, html: render(list) }),
    });
    if (!res.ok) { failed++; console.error("resend", res.status, await res.text()); continue; }
    await sb.from("trip_email_reminder_log").insert(list.map((i) => ({ trip_id: i.trip.id, kind: i.kind, target_date: i.date, user_id: userId })));
    sent++;
  }
  return json({ ok: true, sent, failed });
});
