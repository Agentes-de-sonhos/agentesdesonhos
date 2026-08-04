import * as XLSX from "xlsx";
import { normalizeText } from "./eligibility";
import type { RaffleParticipant } from "./types";

const NAME_KEYS = ["nome", "name", "participante", "agente", "aluno", "nome completo"];

function findKey(keys: string[], matchers: RegExp): string | undefined {
  return keys.find((k) => matchers.test(normalizeText(k)));
}

/**
 * Converte linhas de planilha em participantes preservando TODAS as colunas originais.
 * Mantém exatamente o contrato do upload CSV/Excel anterior (coluna nome + empresa/agência).
 */
export function rowsToParticipants(rows: Record<string, unknown>[]): RaffleParticipant[] {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  const nameKey = keys.find((k) => NAME_KEYS.includes(normalizeText(k))) || keys[0];
  const agencyKey = findKey(keys, /agencia|agency|empresa|loja|operadora/);
  const emailKey = findKey(keys, /e.?mail/);
  const phoneKey = findKey(keys, /telefone|celular|whats|phone/);
  const cityKey = findKey(keys, /^cidade$|^city$|municipio/);
  const stateKey = findKey(keys, /^estado$|^uf$|^state$/);
  const countryKey = findKey(keys, /^pais$|^country$/);
  const statusKey = findKey(keys, /status|situacao/);
  const attendedKey = findKey(keys, /presenca|presente|compareceu|attend|check.?in/);
  const minutesKey = findKey(keys, /minuto|tempo|watched|duracao/);
  const surveyKey = findKey(keys, /pesquisa|survey|avaliacao|nps/);
  const enrolledKey = findKey(keys, /inscricao|inscrito em|data|registrado/);

  const str = (v: unknown) => {
    const s = String(v ?? "").trim();
    return s || null;
  };
  const bool = (v: unknown): boolean | null => {
    const s = normalizeText(v);
    if (!s) return null;
    if (/^(sim|s|yes|y|true|1|presente|compareceu)$/.test(s)) return true;
    if (/^(nao|n|no|false|0|ausente|faltou)$/.test(s)) return false;
    return null;
  };

  return rows
    .map((row, index) => {
      const name = String(row[nameKey] ?? "").trim();
      const minutes = minutesKey ? Number(String(row[minutesKey] ?? "").replace(",", ".")) : NaN;
      const participant: RaffleParticipant = {
        id: `file-${index}`,
        name,
        email: emailKey ? str(row[emailKey]) : null,
        phone: phoneKey ? str(row[phoneKey]) : null,
        company: agencyKey ? str(row[agencyKey]) : null,
        city: cityKey ? str(row[cityKey]) : null,
        state: stateKey ? str(row[stateKey]) : null,
        country: countryKey ? str(row[countryKey]) : null,
        enrolledAt: enrolledKey ? str(row[enrolledKey]) : null,
        registrationStatus: statusKey ? str(row[statusKey]) : null,
        attended: attendedKey ? bool(row[attendedKey]) : null,
        watchedMinutes: Number.isFinite(minutes) ? minutes : null,
        surveyAnswered: surveyKey ? (bool(row[surveyKey]) ?? !!str(row[surveyKey])) : null,
        eventsParticipated: null,
        isSubscriber: null,
        raw: { ...row },
      };
      return participant;
    })
    .filter((p) => !!p.name);
}

export function detectFileCapabilities(rows: Record<string, unknown>[]) {
  if (!rows.length) {
    return {
      attendance: false,
      watchedMinutes: false,
      survey: false,
      registrationStatus: false,
      subscribers: false,
    };
  }
  const keys = Object.keys(rows[0]);
  return {
    attendance: !!findKey(keys, /presenca|presente|compareceu|attend|check.?in/),
    watchedMinutes: !!findKey(keys, /minuto|tempo|watched|duracao/),
    survey: !!findKey(keys, /pesquisa|survey|avaliacao|nps/),
    registrationStatus: !!findKey(keys, /status|situacao/),
    subscribers: false,
  };
}

export interface ParsedRaffleFile {
  participants: RaffleParticipant[];
  rows: Record<string, unknown>[];
  capabilities: ReturnType<typeof detectFileCapabilities>;
}

/** Lê xlsx/xls/csv (mesma leitura via XLSX usada anteriormente). */
export async function parseRaffleFile(file: File): Promise<ParsedRaffleFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return {
    rows,
    participants: rowsToParticipants(rows),
    capabilities: detectFileCapabilities(rows),
  };
}