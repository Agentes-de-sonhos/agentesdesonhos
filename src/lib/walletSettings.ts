import { supabase } from "@/integrations/supabase/client";

export interface AgencyWalletSettings {
  show_calendar: boolean;
  show_next_service: boolean;
  show_next_activity: boolean;
  show_support_tools: boolean;
  show_signature: boolean;
  show_whatsapp: boolean;
}

export const DEFAULT_WALLET_SETTINGS: AgencyWalletSettings = {
  show_calendar: true,
  show_next_service: false,
  show_next_activity: false,
  show_support_tools: false,
  show_signature: true,
  show_whatsapp: true,
};

export const WALLET_MODULES: Array<{
  key: keyof AgencyWalletSettings;
  label: string;
  description: string;
}> = [
  {
    key: "show_calendar",
    label: "Calendário da viagem",
    description: "Exibe o calendário com as datas e navegação entre meses.",
  },
  {
    key: "show_next_service",
    label: "Próximo serviço contratado",
    description: "Card destacando o próximo serviço da viagem.",
  },
  {
    key: "show_next_activity",
    label: "Próxima atividade do roteiro",
    description: "Exibe a próxima atividade programada com horário e local.",
  },
  {
    key: "show_support_tools",
    label: "Ferramentas de apoio ao passageiro",
    description: "Conversores, clima e recursos adicionais para o passageiro.",
  },
  {
    key: "show_signature",
    label: "Assinatura / Consultor responsável",
    description: "Mostra a foto, nome e dados do consultor responsável.",
  },
  {
    key: "show_whatsapp",
    label: "Botão WhatsApp",
    description: "Botão direto de WhatsApp (pode ficar ativo sem a assinatura).",
  },
];

export async function fetchAgencyWalletSettings(userId: string | null | undefined): Promise<AgencyWalletSettings> {
  if (!userId) return { ...DEFAULT_WALLET_SETTINGS };
  const { data, error } = await supabase.rpc("get_agency_wallet_settings", { _user_id: userId });
  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return { ...DEFAULT_WALLET_SETTINGS };
  }
  const row: any = Array.isArray(data) ? data[0] : data;
  return {
    show_calendar: row.show_calendar ?? true,
    show_next_service: row.show_next_service ?? false,
    show_next_activity: row.show_next_activity ?? false,
    show_support_tools: row.show_support_tools ?? false,
    show_signature: row.show_signature ?? true,
    show_whatsapp: row.show_whatsapp ?? true,
  };
}

export type WalletModuleOverrides = Partial<AgencyWalletSettings>;

/** Mantém apenas chaves conhecidas com valor booleano explícito. */
export function sanitizeWalletOverrides(value: unknown): WalletModuleOverrides {
  const out: WalletModuleOverrides = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const { key } of WALLET_MODULES) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === "boolean") out[key] = v;
  }
  return out;
}

/** Precedência: ajuste explícito da carteira > padrão da agência > padrão do sistema. */
export function resolveWalletSettings(agency: Partial<AgencyWalletSettings> | null | undefined, overrides: unknown): AgencyWalletSettings {
  return { ...DEFAULT_WALLET_SETTINGS, ...(agency || {}), ...sanitizeWalletOverrides(overrides) };
}

/** Padrão da agência DONA da viagem (resolvido no servidor; vazio se o usuário não for da mesma agência). */
export async function fetchTripAgencyWalletDefaults(tripId: string): Promise<AgencyWalletSettings> {
  const { data, error } = await supabase.rpc("get_trip_agency_wallet_defaults" as never, { _trip_id: tripId } as never);
  const row: any = Array.isArray(data) ? data[0] : data;
  if (error || !row) return { ...DEFAULT_WALLET_SETTINGS };
  return resolveWalletSettings(row, null);
}
