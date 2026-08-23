/**
 * Área do Cliente White Label — Etapa 2 (estrutura visual).
 *
 * Navegação declarativa e única fonte de verdade para desktop, mobile e testes.
 * Nada aqui consulta dados: apenas descreve as seções e o que já é funcional
 * nesta etapa (`ready`) versus o que ainda está em preparação (`preparing`).
 */

export type ClientAreaView = "inicio" | "viagens" | "documentos" | "perfil" | "atendimento";

export interface ClientAreaNavItem {
  view: ClientAreaView;
  label: string;
  /** Rótulo curto usado na navegação inferior do celular. */
  shortLabel: string;
  /** `false` quando a seção existe apenas como estrutura desta etapa. */
  ready: boolean;
  /** Aparece na barra inferior do celular. */
  mobileBar: boolean;
}

export const CLIENT_AREA_NAV: ClientAreaNavItem[] = [
  { view: "inicio", label: "Início", shortLabel: "Início", ready: true, mobileBar: true },
  { view: "viagens", label: "Minhas viagens", shortLabel: "Viagens", ready: true, mobileBar: true },
  { view: "documentos", label: "Meus documentos", shortLabel: "Documentos", ready: true, mobileBar: true },
  { view: "perfil", label: "Meu perfil", shortLabel: "Perfil", ready: true, mobileBar: true },
  { view: "atendimento", label: "Falar com a agência", shortLabel: "Atendimento", ready: true, mobileBar: false },
];

export const PREPARING_HINT = "Disponível nas próximas etapas.";

const VIEWS = CLIENT_AREA_NAV.map((i) => i.view);

/** Lê a seção atual da query string (`?area=`), com fallback seguro. */
export function viewFromSearch(search: string): ClientAreaView {
  const raw = (new URLSearchParams(search || "").get("area") || "").trim().toLowerCase();
  return (VIEWS as string[]).includes(raw) ? (raw as ClientAreaView) : "inicio";
}

/** Primeiro nome para saudação; string vazia quando não há nome cadastrado. */
export function firstName(name?: string | null): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}
