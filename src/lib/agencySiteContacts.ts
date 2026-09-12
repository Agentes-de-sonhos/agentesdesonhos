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
}

const CONTACTS_BY_HOSTNAME: Record<string, AgencySiteContacts> = {
  "casanovatur.demo.local": {
    email: "contact@casanovatur.com.br",
    instagram: "https://www.instagram.com/casanova_viagens_rs",
    instagramLabel: "@casanova_viagens_rs",
  },
};

function normalizeHost(hostname?: string | null): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function resolveSiteContacts(hostname?: string | null): AgencySiteContacts {
  return CONTACTS_BY_HOSTNAME[normalizeHost(hostname)] ?? {};
}
