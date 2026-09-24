/**
 * Contatos públicos adicionais do site White Label, por hostname.
 *
 * O cadastro da agência continua sendo a fonte de telefone/WhatsApp/endereço.
 * Este mapa é apenas configuração declarativa para canais que o cadastro ainda
 * não guarda (e-mail público e Instagram). Sem condicional por agência no JSX:
 * a apresentação lê `resolveSiteContacts(hostname)` e ignora o que não existir.
 */
export interface AgencySiteContacts {
  /** E-mail público oficial (exibido como link mailto). */
  email?: string;
  /** Perfil público no Instagram (URL completa). */
  instagram?: string;
  /** Rótulo curto do perfil (ex.: @agencia). */
  instagramLabel?: string;
  /** WhatsApp/telefone público do site quando difere do cadastro (briefing). */
  phone?: string;
}

const CONTACTS_BY_HOSTNAME: Record<string, AgencySiteContacts> = {
  "casanovatur.demo.local": {
    email: "contact@casanovatur.com.br",
    instagram: "https://www.instagram.com/casanova_viagens_rs",
    instagramLabel: "@casanova_viagens_rs",
  },
  "www.essyatur.com.br": {
    email: "contato@essyatur.com.br",
    instagram: "https://www.instagram.com/essyatur",
    instagramLabel: "@essyatur",
    phone: "(11) 96494-2210",
  },
};

function normalizeHost(hostname?: string | null): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function resolveSiteContacts(hostname?: string | null): AgencySiteContacts {
  return CONTACTS_BY_HOSTNAME[normalizeHost(hostname)] ?? {};
}

/** Aplica os contatos declarados do hostname ao cadastro (só telefone público). */
export function withSiteContacts<T extends { hostname: string; phone: string | null }>(info: T): T {
  const phone = resolveSiteContacts(info.hostname).phone;
  return phone ? { ...info, phone } : info;
}

/** Hosts alternativos que redirecionam para o hostname canônico do tenant. */
const CANONICAL_REDIRECTS: Record<string, string> = {
  "essyatur.com.br": "www.essyatur.com.br",
};

export function canonicalRedirectHost(hostname?: string | null): string | null {
  return CANONICAL_REDIRECTS[normalizeHost(hostname)] ?? null;
}
