/**
 * Regras de validade de documentos (passaportes e vistos).
 * Datas "YYYY-MM-DD" são interpretadas manualmente para forçar o fuso local.
 */

export const VISA_TYPES = [
  "Visto Americano",
  "Visto Canadense",
  "Visto Mexicano",
  "ETIAS / Europa",
  "Visto Japonês",
  "Visto Australiano",
  "Visto Chinês",
  "Visto Indiano",
  "Outro visto",
] as const;

export type DocumentStatusKey = "vencido" | "critico" | "atencao" | "oportunidade" | "em_dia";

export interface DocumentStatus {
  key: DocumentStatusKey;
  label: string;
  /** Classe de cor semântica para badges. */
  className: string;
}

export const DOCUMENT_STATUS: Record<DocumentStatusKey, DocumentStatus> = {
  vencido: { key: "vencido", label: "Vencido", className: "bg-destructive text-destructive-foreground" },
  critico: { key: "critico", label: "Crítico (até 30 dias)", className: "bg-destructive/15 text-destructive" },
  atencao: { key: "atencao", label: "Atenção (até 3 meses)", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  oportunidade: { key: "oportunidade", label: "Renovar (até 6 meses)", className: "bg-yellow-400/15 text-yellow-700 dark:text-yellow-400" },
  em_dia: { key: "em_dia", label: "Em dia", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
};

/** Converte "YYYY-MM-DD" em Date no fuso local (meia-noite). */
export function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function todayLocalMidnight(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Dias restantes até o vencimento (negativo quando já venceu). */
export function daysUntil(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null;
  const target = parseLocalDate(dateValue);
  if (!target) return null;
  const diff = target.getTime() - todayLocalMidnight().getTime();
  return Math.round(diff / 86_400_000);
}

export function documentStatus(dateValue: string | null | undefined): DocumentStatus | null {
  const days = daysUntil(dateValue);
  if (days === null) return null;
  if (days < 0) return DOCUMENT_STATUS.vencido;
  if (days <= 30) return DOCUMENT_STATUS.critico;
  if (days <= 90) return DOCUMENT_STATUS.atencao;
  if (days <= 180) return DOCUMENT_STATUS.oportunidade;
  return DOCUMENT_STATUS.em_dia;
}

export function formatBrDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "—";
  const d = parseLocalDate(dateValue);
  if (!d) return dateValue;
  return d.toLocaleDateString("pt-BR");
}

/** Mensagem de cortesia para avisar o cliente com antecedência. */
export function expiryWhatsappMessage(params: {
  clientName: string;
  travelerName: string;
  documentLabel: string;
  dateValue: string | null | undefined;
}): string {
  const { clientName, travelerName, documentLabel, dateValue } = params;
  const quem = travelerName && travelerName !== clientName ? ` de ${travelerName}` : "";
  return (
    `Olá, ${clientName}! Tudo bem? Passando para avisar com antecedência que o ${documentLabel}${quem} ` +
    `vence em ${formatBrDate(dateValue)}. Como a renovação pode levar alguns meses, já estamos à disposição ` +
    `para orientar vocês caso tenham planos de viagem.`
  );
}

export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}
