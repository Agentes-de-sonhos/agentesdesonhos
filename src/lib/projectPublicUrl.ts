/**
 * Constrói o link público de um projeto (orçamento, carteira digital ou
 * roteiro) reutilizando exclusivamente os helpers oficiais de domínio, para
 * preservar domínio personalizado da agência e o formato /{slug}/{código}.
 *
 * Retorna `null` quando o projeto não está efetivamente publicado ou quando
 * não existe link público válido — nesse caso a UI apenas desabilita a ação,
 * sem publicar nem gerar código.
 */
import { buildCarteiraLink } from "@/lib/carteira-domain";
import { buildOrcamentoLink } from "@/lib/orcamento-domain";
import { buildRoteiroLink } from "@/lib/roteiro-domain";

export type ProjectKind = "quote" | "trip" | "itinerary";

export interface ProjectPublicUrlInput {
  kind: ProjectKind;
  /** Status bruto vindo do banco (quotes.status, trips.status, itineraries.status). */
  status?: string | null;
  publicAccessCode?: string | null;
  /** Nome da agência do dono do projeto (master, no caso de colaborador). */
  agencyName?: string | null;
  /** Domínio personalizado ativo da agência, quando houver. */
  customDomain?: string | null;
}

/** `true` apenas quando o registro está efetivamente publicado. */
export function isProjectPublished(kind: ProjectKind, status?: string | null): boolean {
  const value = (status || "").toLowerCase();
  switch (kind) {
    case "quote":
      return value === "published";
    case "trip":
      return value === "active";
    case "itinerary":
      return value === "published" || value === "approved";
  }
}

export function buildProjectPublicUrl({
  kind,
  status,
  publicAccessCode,
  agencyName,
  customDomain,
}: ProjectPublicUrlInput): string | null {
  if (!isProjectPublished(kind, status)) return null;
  const code = (publicAccessCode || "").trim();
  if (!code) return null;

  const domain = (customDomain || "").trim() || null;
  const agency = (agencyName || "").trim();
  // Sem domínio próprio, o helper oficial precisa do nome da agência para
  // montar o slug público — sem ele não há link válido.
  if (!domain && !agency) return null;

  switch (kind) {
    case "quote":
      return buildOrcamentoLink(agency, code, domain);
    case "trip":
      return buildCarteiraLink(agency, code, domain);
    case "itinerary":
      return buildRoteiroLink(agency, code, domain);
  }
}
