/**
 * Resolução do login do Painel Administrativo White Label.
 *
 * O colaborador digita o e-mail/login visível; o servidor localiza o
 * identificador técnico correspondente SOMENTE dentro da agência dona do
 * hostname acessado. Nada disso é exibido, logado ou persistido pelo cliente.
 */
import { supabase } from "@/integrations/supabase/client";
import { normalizeHostname } from "@/lib/agencyDomains";

export interface AgencyAdminLoginResolution {
  /** Identificador técnico do colaborador, quando houver. */
  email: string | null;
  /** true quando o login pertence a um colaborador de equipe da agência. */
  team: boolean;
}

export async function resolveAgencyAdminLogin(
  hostname: string,
  login: string,
): Promise<AgencyAdminLoginResolution> {
  const host = normalizeHostname(hostname);
  const value = (login || "").trim().toLowerCase();
  if (!host || !value) return { email: null, team: false };
  try {
    const { data } = await supabase.functions.invoke("agency-admin-resolve-login", {
      body: { login: value, hostname: host },
    });
    const email = (data as { email?: unknown } | null)?.email;
    if (typeof email === "string" && email) {
      return { email, team: Boolean((data as { team?: boolean }).team) };
    }
  } catch {
    // Falha de rede/resolução segue com o valor digitado (contas master).
  }
  return { email: null, team: false };
}
