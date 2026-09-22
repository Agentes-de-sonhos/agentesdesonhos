// Aviso por WhatsApp para a agência quando chega uma solicitação pelo site.
//
// PREPARADO E DESATIVADO: sem Content SID de template aprovado e sem
// configuração válida, nada é enviado — a função apenas informa o motivo. Nunca
// mandamos mensagem livre fora da janela de atendimento e nunca inventamos SID.
//
// Variáveis de ambiente necessárias para ativar:
//   WHATSAPP_REQUEST_TEMPLATE_SID  Content SID do template aprovado (HX...)
//   WHATSAPP_FROM                  número remetente aprovado (whatsapp:+55...)
// Credenciais da Twilio: pelo conector Twilio (gateway), nunca em código.

export type WhatsappNotifyStatus = "sent" | "awaiting_template" | "skipped" | "failed";

export interface WhatsappNotifyResult {
  status: WhatsappNotifyStatus;
  reason: string;
}

export interface WhatsappNotifyConfig {
  contentSid?: string | null;
  from?: string | null;
}

/** Só E.164 válido é aceito como destinatário. */
export function isE164(value: string | null | undefined): boolean {
  return typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value);
}

/** Variáveis do template: {{1}} nome do agente/agência, {{2}} link da oportunidade. */
export function templateVariables(agentName: string, opportunityUrl: string): Record<string, string> {
  return { "1": agentName, "2": opportunityUrl };
}

/**
 * Decide o que fazer com o aviso. Retorna `awaiting_template` enquanto a
 * configuração estiver incompleta: a solicitação segue válida e o envio pode
 * ser retomado depois, sem risco de notificar duas vezes (a fila no banco tem
 * uma linha única por solicitação e canal).
 */
export function planWhatsappNotify(
  recipient: string | null | undefined,
  config: WhatsappNotifyConfig,
): WhatsappNotifyResult {
  if (!isE164(recipient)) {
    return { status: "skipped", reason: "Agência sem WhatsApp válido no perfil." };
  }
  const sid = (config.contentSid ?? "").trim();
  const from = (config.from ?? "").trim();
  if (!sid || !from) {
    return { status: "awaiting_template", reason: "Template do WhatsApp ainda não aprovado/configurado." };
  }
  if (!sid.startsWith("HX")) {
    return { status: "awaiting_template", reason: "Content SID do template inválido." };
  }
  return { status: "sent", reason: "Configuração completa: envio liberado." };
}

/** Configuração lida do ambiente, sem nunca expor valores em log. */
export function whatsappConfigFromEnv(env: (key: string) => string | undefined): WhatsappNotifyConfig {
  return {
    contentSid: env("WHATSAPP_REQUEST_TEMPLATE_SID") ?? null,
    from: env("WHATSAPP_FROM") ?? null,
  };
}
