// Pure contract validation for "ads-briefing-email-v1" (no Deno/Node APIs
// beyond WebCrypto/atob, so it runs in the Edge runtime and in vitest).

export const ADS_SCHEMA = "ads-briefing-email-v1";
export const MAX_REQUEST_BYTES = 22 * 1024 * 1024;
export const MAX_JOB_JSON_BYTES = 200 * 1024;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS = 3;
export const JOB_ID_RE = /^(briefing-[0-9]+-v1|ads-email-test-v1)$/;
const FILENAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const FORBIDDEN_KEY_RE = /(edit_token|token_hash|password|passwd|secret|access_token|refresh_token|api_key|apikey|authorization|relay_token|session)/i;

const TYPES: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "image/svg+xml": ["svg"],
  "application/pdf": ["pdf"],
};

export interface AdsAttachment { filename: string; content_type: string; content: string }
export interface AdsJob {
  id: string; briefing_id: number; agency_name: string; is_test: boolean;
  briefing: Record<string, unknown>;
}
export interface AdsPayload { schema: string; job: AdsJob; attachments: AdsAttachment[] }
export type ValidationResult =
  | { ok: true; payload: AdsPayload; jobJsonText: string }
  | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const exactKeys = (o: Record<string, unknown>, keys: string[]) => {
  const k = Object.keys(o);
  return k.length === keys.length && keys.every((x) => k.includes(x));
};

function findForbiddenKey(v: unknown, depth = 0): boolean {
  if (depth > 20) return true;
  if (Array.isArray(v)) return v.some((x) => findForbiddenKey(x, depth + 1));
  if (isObj(v)) {
    return Object.entries(v).some(([k, x]) => FORBIDDEN_KEY_RE.test(k) || findForbiddenKey(x, depth + 1));
  }
  return false;
}

function decodeBase64(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4 !== 0) return null;
  try {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch { return null; }
}

function magicOk(type: string, b: Uint8Array): boolean {
  const s = (o: number, arr: number[]) => arr.every((x, i) => b[o + i] === x);
  switch (type) {
    case "image/png": return s(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg": return s(0, [0xff, 0xd8, 0xff]);
    case "image/webp": return s(0, [0x52, 0x49, 0x46, 0x46]) && s(8, [0x57, 0x45, 0x42, 0x50]);
    case "application/pdf": return s(0, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    case "image/svg+xml": {
      const head = new TextDecoder().decode(b.slice(0, 4096)).toLowerCase();
      const all = new TextDecoder().decode(b).toLowerCase();
      return head.includes("<svg") && !all.includes("<script") && !/\son\w+\s*=/.test(all);
    }
  }
  return false;
}

export function validateAdsPayload(raw: unknown): ValidationResult {
  const bad = (error: string): ValidationResult => ({ ok: false, error });
  if (!isObj(raw) || !exactKeys(raw, ["schema", "job", "attachments"])) return bad("Estrutura do payload inválida.");
  if (raw.schema !== ADS_SCHEMA) return bad("Schema não suportado.");
  const job = raw.job;
  if (!isObj(job) || !exactKeys(job, ["id", "briefing_id", "agency_name", "is_test", "briefing"])) return bad("Estrutura do job inválida.");
  if (typeof job.id !== "string" || !JOB_ID_RE.test(job.id)) return bad("job.id inválido.");
  if (typeof job.briefing_id !== "number" || !Number.isSafeInteger(job.briefing_id) || job.briefing_id < 0) return bad("job.briefing_id inválido.");
  if (typeof job.is_test !== "boolean") return bad("job.is_test inválido.");
  if (job.id === "ads-email-test-v1") {
    if (job.is_test !== true) return bad("job.is_test incoerente com job.id.");
  } else {
    if (job.is_test !== false) return bad("job.is_test incoerente com job.id.");
    if (job.id !== `briefing-${job.briefing_id}-v1`) return bad("job.id não corresponde a job.briefing_id.");
  }
  if (typeof job.agency_name !== "string" || !job.agency_name.trim() || job.agency_name.length > 200) return bad("job.agency_name inválido.");
  if (!isObj(job.briefing)) return bad("job.briefing inválido.");
  if (findForbiddenKey(job.briefing)) return bad("job.briefing contém campos de autenticação não permitidos.");

  const jobJsonText = JSON.stringify(job);
  if (new TextEncoder().encode(jobJsonText).length > MAX_JOB_JSON_BYTES) return bad("Briefing excede 200KB.");

  const atts = raw.attachments;
  if (!Array.isArray(atts) || atts.length > MAX_ATTACHMENTS) return bad("Anexos inválidos (máximo 3).");
  const names = new Set<string>();
  for (const a of atts) {
    if (!isObj(a) || !exactKeys(a, ["filename", "content_type", "content"])) return bad("Anexo com estrutura inválida.");
    if (typeof a.filename !== "string" || !FILENAME_RE.test(a.filename) || a.filename.includes("..")) return bad("Nome de anexo inválido.");
    const lower = a.filename.toLowerCase();
    if (lower === "briefing.json" || names.has(lower)) return bad("Nome de anexo duplicado ou reservado.");
    names.add(lower);
    const exts = typeof a.content_type === "string" ? TYPES[a.content_type] : undefined;
    if (!exts) return bad("Tipo de anexo não permitido.");
    if (!exts.includes(lower.split(".").pop() ?? "")) return bad("Extensão do anexo não corresponde ao tipo.");
    if (typeof a.content !== "string") return bad("Conteúdo de anexo inválido.");
    const bytes = decodeBase64(a.content);
    if (!bytes || bytes.length === 0) return bad("Conteúdo de anexo não é base64 válido.");
    if (bytes.length > MAX_ATTACHMENT_BYTES) return bad("Anexo excede 5MiB.");
    if (!magicOk(a.content_type as string, bytes)) return bad("Conteúdo do anexo não corresponde ao tipo.");
  }
  return { ok: true, payload: raw as unknown as AdsPayload, jobJsonText };
}

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function sanitizeSubjectName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f<>\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export const ADS_FROM = "Agentes de Sonhos <fernando.nobre@agentesdesonhos.com.br>";
export const ADS_TO = "fernando.nobre@agentesdesonhos.com.br";

export function buildAdsEmail(payload: AdsPayload, jobJsonText: string, jobSha256: string) {
  const job = payload.job;
  const subject = `[Briefing ADS] ${job.id}${job.is_test ? " [TESTE]" : ""} | ${sanitizeSubjectName(job.agency_name)}`;
  const fmt = (v: unknown): string => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "string") return v.length > 500 ? v.slice(0, 500) + "…" : v;
    const s = JSON.stringify(v);
    return s.length > 500 ? s.slice(0, 500) + "…" : s;
  };
  const lines = Object.entries(job.briefing).map(([k, v]) => `- ${k}: ${fmt(v)}`);
  const text = [
    `Novo briefing ADS${job.is_test ? " (TESTE)" : ""}`,
    "",
    `Job: ${job.id}`,
    `Briefing nº: ${job.briefing_id}`,
    `Agência: ${job.agency_name}`,
    `SHA-256 do job: ${jobSha256}`,
    `Anexos: briefing.json${payload.attachments.map((a) => ", " + a.filename).join("")}`,
    "",
    "Resumo das respostas:",
    ...lines,
    "",
    "ADS_JOB_JSON_BEGIN",
    jobJsonText,
    "ADS_JOB_JSON_END",
  ].join("\n");
  const utf8 = new TextEncoder().encode(jobJsonText);
  let bin = "";
  for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
  const attachments = [
    { filename: "briefing.json", content: btoa(bin), content_type: "application/json" },
    ...payload.attachments.map((a) => ({ filename: a.filename, content: a.content, content_type: a.content_type })),
  ];
  return {
    from: ADS_FROM,
    to: [ADS_TO],
    subject,
    text,
    attachments,
  };
}
