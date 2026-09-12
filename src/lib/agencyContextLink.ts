/**
 * Fonte ÚNICA de geração de links internos das superfícies white label
 * (Site, Área do Cliente e Gestão são três superfícies do MESMO tenant).
 *
 * Em hosts técnicos autorizados (prévia Lovable / localhost) o contexto do
 * tenant vive no parâmetro `__agency_host`; qualquer link entre superfícies
 * precisa preservá-lo, senão o roteador deixa de reconhecer a agência.
 *
 * Em domínios reais o parâmetro é IGNORADO e removido dos links gerados —
 * o tenant vem sempre do hostname, sem qualquer possibilidade de spoofing.
 *
 * Nenhum hostname de tenant é embutido aqui: o valor sempre vem da URL atual
 * (resolver/configuração), de modo que qualquer tenant futuro funciona sem
 * novo desenvolvimento.
 */
import { isPotentialAgencyHost, isTechnicalPreviewHost, normalizeHostname } from "./agencyDomains";

export const AGENCY_HOST_PARAM = "__agency_host";

/** Tenant técnico em vigor, ou null quando o host não aceita override. */
export function agencyContextHost(hostname: string, search: string): string | null {
  if (!isTechnicalPreviewHost(hostname)) return null;
  const candidate = normalizeHostname(
    new URLSearchParams(search || "").get(AGENCY_HOST_PARAM) || "",
  );
  return candidate && isPotentialAgencyHost(candidate) ? candidate : null;
}

interface Parts {
  pathname: string;
  params: URLSearchParams;
  hash: string;
}

function splitPath(path: string): Parts {
  const hashAt = path.indexOf("#");
  const hash = hashAt >= 0 ? path.slice(hashAt) : "";
  const noHash = hashAt >= 0 ? path.slice(0, hashAt) : path;
  const qAt = noHash.indexOf("?");
  return {
    pathname: qAt >= 0 ? noHash.slice(0, qAt) : noHash,
    params: new URLSearchParams(qAt >= 0 ? noHash.slice(qAt + 1) : ""),
    hash,
  };
}

function join({ pathname, params, hash }: Parts): string {
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

/** Remove o contexto técnico de um caminho (usado em domínios reais). */
export function stripAgencyContext(path: string): string {
  if (!path.startsWith("/") || !path.includes(AGENCY_HOST_PARAM)) return path;
  const parts = splitPath(path);
  parts.params.delete(AGENCY_HOST_PARAM);
  return join(parts);
}

/**
 * Caminho interno com o contexto do tenant preservado (query + hash na ordem
 * correta). Caminhos externos/absolutos e âncoras puras não são alterados.
 */
export function withAgencyContext(path: string, hostname: string, search: string): string {
  if (!path.startsWith("/")) return path;
  const host = agencyContextHost(hostname, search);
  if (!host) return stripAgencyContext(path);
  const parts = splitPath(path);
  parts.params.set(AGENCY_HOST_PARAM, host);
  return join(parts);
}

/** Versão de conveniência baseada na URL atual do navegador. */
export function agencyContextHref(path: string): string {
  if (typeof window === "undefined") return path;
  return withAgencyContext(path, window.location.hostname, window.location.search);
}
