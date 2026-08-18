/**
 * Microtransição da solicitação White Label.
 *
 * Nada aqui fala de busca, oferta, disponibilidade, preço, progresso ou tempo
 * estimado: a solicitação é atendida por um consultor humano. O módulo só
 * define o conteúdo fixo, o elemento animado por categoria e o ritmo das
 * mensagens, para que o componente visual não duplique regras.
 */

/** Duração total da transição (ms) antes de abrir o modal da jornada. */
export const TRANSITION_DURATION_MS = 3000;

export const TRANSITION_TITLE = "Estamos preparando sua solicitação";

export const TRANSITION_SUBTITLE =
  "Em instantes, você poderá contar mais detalhes para que nossa equipe prepare uma proposta personalizada.";

/** Mensagens exibidas uma por vez, com fade suave. */
export const TRANSITION_MESSAGES = [
  "Organizando os detalhes da sua viagem…",
  "Cada escolha ajuda a tornar sua experiência mais especial.",
  "Agora vamos personalizar sua solicitação.",
] as const;

/** Ilustração vetorial (Lucide) por categoria de serviço. */
export type TransitionMotif =
  | "plane"
  | "stay"
  | "car"
  | "transfer"
  | "ticket"
  | "shield"
  | "ship"
  | "map";

const MOTIF_BY_SERVICE: Record<string, TransitionMotif> = {
  aereo: "plane",
  hospedagem: "stay",
  carro: "car",
  transfer: "transfer",
  ingressos: "ticket",
  seguro: "shield",
  cruzeiros: "ship",
  pacotes: "map",
  circuitos: "map",
};

export function transitionMotif(serviceKey: string): TransitionMotif {
  return MOTIF_BY_SERVICE[serviceKey] ?? "map";
}

/** Índice da mensagem visível em um dado instante da transição. */
export function messageIndexAt(elapsedMs: number, total = TRANSITION_MESSAGES.length): number {
  const slot = TRANSITION_DURATION_MS / total;
  const index = Math.floor(Math.max(0, elapsedMs) / slot);
  return Math.min(index, total - 1);
}
