export type RaffleSource = "file" | "academy_event";

export interface RaffleParticipant {
  /** Chave estável dentro da sessão (user_id da Academy ou índice do arquivo). */
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  enrolledAt?: string | null;
  registrationStatus?: string | null;
  attended?: boolean | null;
  watchedMinutes?: number | null;
  surveyAnswered?: boolean | null;
  surveyScore?: number | null;
  eventsParticipated?: number | null;
  /** null = integração com assinantes ainda não disponível (nunca inventar valor). */
  isSubscriber?: boolean | null;
  /** Snapshot de todos os campos originais (arquivo ou RPC). */
  raw: Record<string, unknown>;
}

export interface RaffleFilters {
  onlyConfirmed: boolean;
  onlyAttended: boolean;
  excludeCancelled: boolean;
  excludeDuplicateEmails: boolean;
  excludePreviousWinners: boolean;
  minWatchedMinutes: number | null;
  onlySurveyAnswered: boolean;
  onlySubscribers: boolean;
  states: string[];
  cities: string[];
  countries: string[];
  agencies: string[];
  search: string;
}

export const DEFAULT_RAFFLE_FILTERS: RaffleFilters = {
  onlyConfirmed: false,
  onlyAttended: false,
  excludeCancelled: true,
  excludeDuplicateEmails: true,
  excludePreviousWinners: true,
  minWatchedMinutes: null,
  onlySurveyAnswered: false,
  onlySubscribers: false,
  states: [],
  cities: [],
  countries: [],
  agencies: [],
  search: "",
};

export interface EligibilityResult {
  participant: RaffleParticipant;
  eligible: boolean;
  /** Motivo da inelegibilidade (PT-BR) — vazio quando elegível. */
  reason: string | null;
  isDuplicate: boolean;
}

export interface EligibilityContext {
  /** Nomes/e-mails já sorteados (normalizados) a serem excluídos. */
  previousWinnerKeys?: Set<string>;
  /** Disponibilidade real de dados opcionais na origem atual. */
  capabilities?: RaffleCapabilities;
}

export interface RaffleCapabilities {
  attendance: boolean;
  watchedMinutes: boolean;
  survey: boolean;
  registrationStatus: boolean;
  subscribers: boolean;
}

export const EMPTY_CAPABILITIES: RaffleCapabilities = {
  attendance: false,
  watchedMinutes: false,
  survey: false,
  registrationStatus: false,
  subscribers: false,
};