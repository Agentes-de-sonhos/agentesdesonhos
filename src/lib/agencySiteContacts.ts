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

const BARDELLI_CONTACTS: AgencySiteContacts = {
  email: "barbara@bardelliviagens.com.br",
  instagram: "https://www.instagram.com/bardelliviagens/",
  instagramLabel: "@bardelliviagens",
  phone: "(11) 97576-7319",
};

const CONTACTS_BY_HOSTNAME: Record<string, AgencySiteContacts> = {
  "bardelliviagens.com.br": BARDELLI_CONTACTS,
  "www.bardelliviagens.com.br": BARDELLI_CONTACTS,
  "destinoscomaju.com.br": {
    email: "contato@destinoscomaju.com.br",
    instagram: "https://instagram.com/destinoscomaju",
    instagramLabel: "@destinoscomaju",
    phone: "(11) 95741-4840",
  },
  "www.destinoscomaju.com.br": {
    email: "contato@destinoscomaju.com.br",
    instagram: "https://instagram.com/destinoscomaju",
    instagramLabel: "@destinoscomaju",
    phone: "(11) 95741-4840",
  },
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

// Telefone/WhatsApp principal da Paraíso Viagens (briefing Fernando, 20/10/2026):
// vale para todo contato e envio de solicitações do site.
const PARAISO_CONTACTS: AgencySiteContacts = {
  phone: "(48) 99946-6467",
};

const PARAISO_HOSTS = ["paraisoviagens.com", "www.paraisoviagens.com"];

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
  "omundoemcores.com.br": "www.omundoemcores.com.br",
};

export function canonicalRedirectHost(hostname?: string | null): string | null {
  return CANONICAL_REDIRECTS[normalizeHost(hostname)] ?? null;
}
