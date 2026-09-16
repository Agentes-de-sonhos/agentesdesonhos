/**
 * Etapa 3 — atualização das datas do cenário de demonstração.
 *
 * Regras invioláveis:
 * - só age em tenants com cenário marcado `is_demo` em `demo_scenarios`;
 * - o hostname informado pelo cliente NUNCA autoriza nada: ele é apenas
 *   conferido contra o hostname do cenário; a autorização vem do próprio
 *   registro do cenário (ou de uma sessão do dono do tenant);
 * - no máximo uma execução por dia (America/Sao_Paulo), com lock;
 * - todos os registros mapeados são deslocados pelo MESMO delta; qualquer falha
 *   desfaz tudo o que já havia sido aplicado (rollback compensatório);
 * - `created_at`, histórico, IDs, tokens e códigos permanecem intactos.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

import {
  computeDelta,
  planUpdates,
  rollbackPlan,
  saoPauloToday,
  shiftableTables,
  shouldShift,
  targetWindow,
  type PlannedUpdate,
  type ScenarioRow,
} from "./date-shift.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    let body: { slug?: unknown; hostname?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const slug = typeof body.slug === "string" ? body.slug.trim().slice(0, 120) : "";
    const hostname = typeof body.hostname === "string" ? body.hostname.trim().slice(0, 200) : "";
    if (!slug) return json({ error: "Cenário não informado." }, 400);

    /** Autorização: o cenário precisa existir e estar marcado como demo. */
    const { data: scenario } = await admin
      .from("demo_scenarios")
      .select("id, user_id, slug, hostname, is_demo, dates_shifted_on, dates_locked_at")
      .eq("slug", slug)
      .maybeSingle();

    if (!scenario || scenario.is_demo !== true) {
      // Tenants reais/não-demo nunca são alterados nem revelados.
      return json({ error: "Cenário de demonstração não encontrado." }, 404);
    }
    if (hostname && scenario.hostname && hostname !== scenario.hostname) {
      return json({ error: "Cenário de demonstração não encontrado." }, 404);
    }

    const today = saoPauloToday();
    const decision = shouldShift(scenario, today);
    if (!decision.shift) {
      return json({ success: true, shifted: false, reason: decision.reason, today });
    }

    /** Lock atômico: só um chamador do dia consegue marcar o cenário. */
    const lockedAt = new Date().toISOString();
    const { data: locked } = await admin
      .from("demo_scenarios")
      .update({ dates_locked_at: lockedAt })
      .eq("id", scenario.id)
      .neq("dates_shifted_on", today)
      .or(`dates_locked_at.is.null,dates_locked_at.eq.${scenario.dates_locked_at ?? ""}`)
      .select("id")
      .maybeSingle();
    if (!locked?.id) {
      return json({ success: true, shifted: false, reason: "locked", today });
    }

    const releaseLock = async (extra: Record<string, unknown> = {}) => {
      await admin
        .from("demo_scenarios")
        .update({ dates_locked_at: null, updated_at: new Date().toISOString(), ...extra })
        .eq("id", scenario.id);
    };

    /** Registros mapeados do cenário — nada fora do mapa é tocado. */
    const { data: records } = await admin
      .from("demo_scenario_records")
      .select("table_name, record_id")
      .eq("scenario_id", scenario.id);
    const idsByTable = new Map<string, string[]>();
    for (const r of records ?? []) {
      const ids = idsByTable.get(r.table_name) ?? [];
      ids.push(r.record_id);
      idsByTable.set(r.table_name, ids);
    }

    /** Âncora do delta: data de embarque atual da oportunidade do cenário. */
    const anchorIds = idsByTable.get("opportunities") ?? idsByTable.get("trips") ?? [];
    if (anchorIds.length === 0) {
      await releaseLock();
      return json({ success: true, shifted: false, reason: "no_anchor", today });
    }
    const anchorTable = idsByTable.get("opportunities") ? "opportunities" : "trips";
    const { data: anchors } = await admin
      .from(anchorTable)
      .select("id, start_date")
      .in("id", anchorIds)
      .order("start_date", { ascending: true });
    const currentStart = (anchors ?? []).find(
      (a: { start_date: string | null }) => !!a.start_date,
    )?.start_date as string | undefined;
    if (!currentStart) {
      await releaseLock();
      return json({ success: true, shifted: false, reason: "no_anchor", today });
    }

    const delta = computeDelta(currentStart, today);
    if (delta === 0) {
      await releaseLock({ dates_shifted_on: today });
      return json({ success: true, shifted: false, reason: "already_aligned", today, delta: 0 });
    }

    const applied: PlannedUpdate[] = [];
    try {
      for (const table of shiftableTables()) {
        const ids = idsByTable.get(table);
        if (!ids || ids.length === 0) continue;
        const { data: rows, error } = await admin.from(table).select("*").in("id", ids);
        if (error) throw new Error(`${table}: ${error.message}`);
        for (const update of planUpdates(table, (rows ?? []) as ScenarioRow[], delta)) {
          const { error: upErr } = await admin
            .from(update.table)
            .update(update.patch)
            .eq("id", update.id);
          if (upErr) throw new Error(`${update.table}: ${upErr.message}`);
          applied.push(update);
        }
      }
    } catch (err) {
      // Rollback total: nenhum deslocamento parcial sobrevive.
      for (const undo of rollbackPlan(applied)) {
        await admin.from(undo.table).update(undo.patch).eq("id", undo.id);
      }
      await releaseLock();
      console.error("demo-dates rollback", err);
      return json({ error: "Falha ao atualizar as datas do cenário." }, 400);
    }

    await releaseLock({ dates_shifted_on: today });

    return json({
      success: true,
      shifted: true,
      today,
      delta,
      window: targetWindow(today),
      updated_records: applied.length,
    });
  } catch (err) {
    console.error("demo-dates error", err);
    return json({ error: "Erro ao processar solicitação." }, 500);
  }
});
