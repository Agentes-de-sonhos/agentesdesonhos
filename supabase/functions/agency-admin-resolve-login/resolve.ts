/**
 * Resolução segura do login do Painel Administrativo White Label (/gestao/login).
 *
 * Helpers PUROS (sem rede/banco) para que as regras de segurança sejam
 * testáveis de verdade. A agência é SEMPRE resolvida pelo hostname acessado;
 * nunca por agency_id vindo do navegador.
 */

/** Hosts de preview/dev da plataforma (Origin nunca bate com o domínio da agência). */
export const PREVIEW_HOST_SUFFIXES = [
  "lovable.app",
  "lovableproject.com",
  "lovableproject-dev.com",
  "localhost",
];

/** Minúsculas, sem porta. Mantém o prefixo www (o candidato cuida das variações). */
export function normalizeHost(host: string): string {
  return (host || "").trim().toLowerCase().replace(/:\d+$/, "");
}

/** Host sem www e sem porta — usado para comparar Origin com o hostname enviado. */
export function rootHost(host: string): string {
  return normalizeHost(host).replace(/^www\./, "");
}

export function hostOf(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return normalizeHost(new URL(raw).hostname);
  } catch {
    return null;
  }
}

export function isPreviewHost(host: string): boolean {
  return PREVIEW_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
}

/**
 * O Origin/Referer da página precisa corresponder ao hostname enviado
 * (raiz e www são o mesmo site). Exceção documentada: hosts de preview/dev da
 * Lovable, onde o site white label é alcançado via `?__agency_host=...`.
 */
export function originAllowed(
  headers: { origin: string | null; referer: string | null },
  hostname: string,
): boolean {
  const origin = hostOf(headers.origin) ?? hostOf(headers.referer);
  if (!origin) return false;
  if (isPreviewHost(origin)) return true;
  return rootHost(origin) === rootHost(hostname);
}

/** Hostnames a procurar em agency_public_domains: exato, sem www e com www. */
export function hostCandidates(hostname: string): string[] {
  const host = normalizeHost(hostname);
  if (!host || !host.includes(".")) return [];
  const root = rootHost(host);
  return Array.from(new Set([host, root, `www.${root}`]));
}

/** Logins equivalentes aceitos (mesma tolerância do login tradicional). */
export function loginCandidates(login: string): string[] {
  const normalized = (login || "").toLowerCase().trim();
  if (!normalized) return [];
  const candidates = new Set([normalized]);
  if (normalized.endsWith("@agentedesonhos.com.br")) {
    candidates.add(normalized.replace("@agentedesonhos.com.br", "@agentesdesonhos.com.br"));
  }
  if (normalized.endsWith("@agentesdesonhos.com.br")) {
    candidates.add(normalized.replace("@agentesdesonhos.com.br", "@agentedesonhos.com.br"));
  }
  return Array.from(candidates);
}

export interface DomainRow {
  user_id: string;
  hostname: string;
  is_active: boolean;
  admin_portal_enabled: boolean;
}

/**
 * Agência dona do domínio: precisa existir, estar ativa e ter o painel
 * habilitado. Qualquer outra situação devolve null (resposta genérica).
 */
export function resolveAgencyFromDomains(
  rows: DomainRow[] | null | undefined,
  hostname: string,
): string | null {
  const candidates = hostCandidates(hostname);
  if (!candidates.length) return null;
  const row = (rows ?? []).find(
    (r) =>
      candidates.includes(normalizeHost(r.hostname)) && r.is_active && r.admin_portal_enabled,
  );
  return row?.user_id ?? null;
}

export interface MemberRow {
  agency_id: string;
  login_normalized: string;
  status: string;
  synthetic_email: string | null;
}

/**
 * Colaborador ATIVO da agência do domínio com o login informado.
 * Nunca escolhe "o mais recente" nem o primeiro resultado global: o
 * agency_id do domínio e o login normalizado são obrigatórios.
 */
export function pickAgencyMember(
  rows: MemberRow[] | null | undefined,
  agencyId: string,
  login: string,
): MemberRow | null {
  const logins = loginCandidates(login);
  if (!agencyId || !logins.length) return null;
  const matches = (rows ?? []).filter(
    (r) =>
      r.agency_id === agencyId &&
      logins.includes((r.login_normalized || "").toLowerCase().trim()) &&
      r.status === "active" &&
      !!r.synthetic_email,
  );
  return matches.length === 1 ? matches[0] : (matches[0] ?? null);
}
