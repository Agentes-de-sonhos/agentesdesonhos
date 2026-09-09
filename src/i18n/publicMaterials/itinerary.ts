/**
 * Dicionário de tradução do ROTEIRO PÚBLICO (link do cliente final e PDF).
 *
 * Cobre apenas texto fixo/automático (rótulos, títulos, estados vazios,
 * mensagens de erro, período do dia, tipo de viagem, orçamento, interesses
 * de passageiros). Texto livre digitado pelo agente (títulos/descrições de
 * atividades, introdução do destino, seção de valores) NUNCA é traduzido
 * por este dicionário.
 */
import { format } from "date-fns";
import { ptBR, it as itIT } from "date-fns/locale";
import {
  createTranslator,
  PublicLocale,
  pluralize,
  formatPublicNumber,
} from "./locale";

export type ItineraryDictionary = {
  headerBadge: string;
  defaultAgencyName: string;
  loadingAlt: string;
  notFoundTitle: string;
  notFoundGenericMessage: string;
  loadErrorMessage: string;
  backHome: string;
  headlineFallback: string; // "{count} {days} para viver {destination} de um jeito único."
  travelersCount: string; // "{count} {travelers}"
  fontDecreaseAria: string;
  fontDefaultAria: string;
  fontIncreaseAria: string;
  passengersTitle: string;
  passengerFallbackName: string;
  babyLabel: string;
  childLabel: string; // "Criança ({age} anos)"
  adultLabel: string;
  calendarSectionTitle: string;
  dayByDayTitle: string;
  activityCountSuffix: string; // "{count} {activities}"
  pricingSectionTitle: string;
  helpTitle: string;
  helpSubtitle: string;
  helpAria: string;
  whatsappCta: string;
  documentsLabel: string;
  mapsTitle: string;
  tripTypeFamilia: string;
  tripTypeCasal: string;
  tripTypeLuaDeMel: string;
  tripTypeSozinho: string;
  tripTypeCorporativo: string;
  tripTypeFamiliaCriancaPequena: string;
  tripTypeFamiliaAdolescentes: string;
  tripTypeGrupoAmigos: string;
  tripTypeMelhorIdade: string;
  budgetEconomico: string;
  budgetConforto: string;
  budgetLuxo: string;
  periodManha: string;
  periodTarde: string;
  periodNoite: string;
  interestGastronomia: string;
  interestCultura: string;
  interestHistoria: string;
  interestCompras: string;
  interestNatureza: string;
  interestPraia: string;
  interestEsportes: string;
  interestFutebol: string;
  interestBasquete: string;
  interestParques: string;
  interestVidaNoturna: string;
  interestRelaxamento: string;
  interestLuxo: string;
  interestExperienciasLocais: string;
  interestMuseus: string;
  interestFotografia: string;
  interestAventura: string;
  interestShows: string;
  interestVidaUrbana: string;
  // PDF
  pdfRoteiroBadge: string;
  pdfDaysUnit: string; // "{count} {days}"
  pdfGalleryTitle: string;
  pdfPassengersLabel: string;
  pdfAgeSuffix: string; // "{age} anos"
  pdfProfileLabel: string;
  pdfDestinationLabel: string;
  pdfPeriodLabel: string;
  pdfTravelersLabel: string;
  pdfDayProgrammingTitle: string;
  pdfNoDaysScheduled: string;
  pdfDayLabel: string; // "Dia {number}"
  pdfConsultantLabel: string;
  pdfWhatsappCta: string;
  pdfPreparedFor: string; // "Preparado especialmente para {name}"
  pdfGeneratedAt: string; // "Gerado em {date} • Agentes de Sonhos"
  whatsappAria: string;
  whatsappMessageTemplate: string; // "Olá! Vi o roteiro para {destination} e gostaria de mais informações."
  invalidLinkMessage: string;
  checkLinkMessage: string;
  documentFallbackName: string;
};

const pt: ItineraryDictionary = {
  headerBadge: "Roteiro de Viagem",
  defaultAgencyName: "Sua viagem",
  loadingAlt: "Carregando",
  notFoundTitle: "Roteiro não encontrado",
  notFoundGenericMessage: "O link pode estar incorreto ou o roteiro não está mais disponível.",
  loadErrorMessage: "Erro ao carregar roteiro",
  backHome: "Ir para o início",
  headlineFallback: "{count} {days} para viver {destination} de um jeito único.",
  travelersCount: "{count} {travelers}",
  fontDecreaseAria: "Diminuir fonte",
  fontDefaultAria: "Fonte padrão",
  fontIncreaseAria: "Aumentar fonte",
  passengersTitle: "Passageiros",
  passengerFallbackName: "Passageiro",
  babyLabel: "Bebê",
  childLabel: "Criança ({age} anos)",
  adultLabel: "Adulto",
  calendarSectionTitle: "Calendário da Viagem",
  dayByDayTitle: "Dia a Dia",
  activityCountSuffix: "{count} {activities}",
  pricingSectionTitle: "Valores e Condições",
  helpTitle: "Precisa de ajuda?",
  helpSubtitle: "Fale com seu consultor de viagens.",
  helpAria: "Ver consultor",
  whatsappCta: "Falar no WhatsApp",
  documentsLabel: "Documentos",
  mapsTitle: "Abrir no Google Maps",
  tripTypeFamilia: "Viagem em Família",
  tripTypeCasal: "Viagem de Casal",
  tripTypeLuaDeMel: "Lua de Mel",
  tripTypeSozinho: "Viagem Solo",
  tripTypeCorporativo: "Viagem Corporativa",
  tripTypeFamiliaCriancaPequena: "Família com criança pequena",
  tripTypeFamiliaAdolescentes: "Família com adolescentes",
  tripTypeGrupoAmigos: "Grupo de amigos",
  tripTypeMelhorIdade: "Melhor idade",
  budgetEconomico: "Econômico",
  budgetConforto: "Conforto",
  budgetLuxo: "Luxo",
  periodManha: "Manhã",
  periodTarde: "Tarde",
  periodNoite: "Noite",
  interestGastronomia: "Gastronomia",
  interestCultura: "Cultura",
  interestHistoria: "História",
  interestCompras: "Compras",
  interestNatureza: "Natureza",
  interestPraia: "Praia",
  interestEsportes: "Esportes",
  interestFutebol: "Futebol",
  interestBasquete: "Basquete",
  interestParques: "Parques",
  interestVidaNoturna: "Vida noturna",
  interestRelaxamento: "Relaxamento",
  interestLuxo: "Luxo",
  interestExperienciasLocais: "Experiências locais",
  interestMuseus: "Museus",
  interestFotografia: "Fotografia",
  interestAventura: "Aventura",
  interestShows: "Shows",
  interestVidaUrbana: "Vida urbana",
  pdfRoteiroBadge: "✦ Roteiro de Viagem",
  pdfDaysUnit: "{count} {days}",
  pdfGalleryTitle: "Galeria do destino",
  pdfPassengersLabel: "👥 Passageiros",
  pdfAgeSuffix: "{age} anos",
  pdfProfileLabel: "✨ Perfil da viagem",
  pdfDestinationLabel: "📍 Destino",
  pdfPeriodLabel: "📅 Período",
  pdfTravelersLabel: "👥 Viajantes",
  pdfDayProgrammingTitle: "Programação Dia a Dia",
  pdfNoDaysScheduled: "Nenhum dia programado",
  pdfDayLabel: "Dia {number}",
  pdfConsultantLabel: "Seu consultor de viagens",
  pdfWhatsappCta: "💬 Falar no WhatsApp",
  pdfPreparedFor: "Preparado especialmente para {name}",
  pdfGeneratedAt: "Gerado em {date} • Agentes de Sonhos",
  whatsappAria: "Falar no WhatsApp",
  whatsappMessageTemplate: "Olá! Vi o roteiro para {destination} e gostaria de mais informações.",
  invalidLinkMessage: "Link inválido",
  checkLinkMessage: "Verifique o link e tente novamente.",
  documentFallbackName: "arquivo",
};

const it: ItineraryDictionary = {
  headerBadge: "Itinerario di Viaggio",
  defaultAgencyName: "Il tuo viaggio",
  loadingAlt: "Caricamento",
  notFoundTitle: "Itinerario non trovato",
  notFoundGenericMessage: "Il link potrebbe essere errato o l'itinerario non è più disponibile.",
  loadErrorMessage: "Errore durante il caricamento dell'itinerario",
  backHome: "Vai alla home",
  headlineFallback: "{count} {days} per vivere {destination} in modo unico.",
  travelersCount: "{count} {travelers}",
  fontDecreaseAria: "Diminuisci il testo",
  fontDefaultAria: "Testo standard",
  fontIncreaseAria: "Aumenta il testo",
  passengersTitle: "Passeggeri",
  passengerFallbackName: "Passeggero",
  babyLabel: "Neonato",
  childLabel: "Bambino ({age} anni)",
  adultLabel: "Adulto",
  calendarSectionTitle: "Calendario del Viaggio",
  dayByDayTitle: "Giorno per Giorno",
  activityCountSuffix: "{count} {activities}",
  pricingSectionTitle: "Prezzi e Condizioni",
  helpTitle: "Hai bisogno di aiuto?",
  helpSubtitle: "Parla con il tuo consulente di viaggio.",
  helpAria: "Vedi consulente",
  whatsappCta: "Scrivi su WhatsApp",
  documentsLabel: "Documenti",
  mapsTitle: "Apri su Google Maps",
  tripTypeFamilia: "Viaggio in Famiglia",
  tripTypeCasal: "Viaggio di Coppia",
  tripTypeLuaDeMel: "Luna di Miele",
  tripTypeSozinho: "Viaggio da Solo",
  tripTypeCorporativo: "Viaggio Aziendale",
  tripTypeFamiliaCriancaPequena: "Famiglia con bambino piccolo",
  tripTypeFamiliaAdolescentes: "Famiglia con adolescenti",
  tripTypeGrupoAmigos: "Gruppo di amici",
  tripTypeMelhorIdade: "Terza età",
  budgetEconomico: "Economico",
  budgetConforto: "Comfort",
  budgetLuxo: "Lusso",
  periodManha: "Mattina",
  periodTarde: "Pomeriggio",
  periodNoite: "Sera",
  interestGastronomia: "Gastronomia",
  interestCultura: "Cultura",
  interestHistoria: "Storia",
  interestCompras: "Shopping",
  interestNatureza: "Natura",
  interestPraia: "Spiaggia",
  interestEsportes: "Sport",
  interestFutebol: "Calcio",
  interestBasquete: "Basket",
  interestParques: "Parchi",
  interestVidaNoturna: "Vita notturna",
  interestRelaxamento: "Relax",
  interestLuxo: "Lusso",
  interestExperienciasLocais: "Esperienze locali",
  interestMuseus: "Musei",
  interestFotografia: "Fotografia",
  interestAventura: "Avventura",
  interestShows: "Spettacoli",
  interestVidaUrbana: "Vita urbana",
  pdfRoteiroBadge: "✦ Itinerario di Viaggio",
  pdfDaysUnit: "{count} {days}",
  pdfGalleryTitle: "Galleria della destinazione",
  pdfPassengersLabel: "👥 Passeggeri",
  pdfAgeSuffix: "{age} anni",
  pdfProfileLabel: "✨ Profilo del viaggio",
  pdfDestinationLabel: "📍 Destinazione",
  pdfPeriodLabel: "📅 Periodo",
  pdfTravelersLabel: "👥 Viaggiatori",
  pdfDayProgrammingTitle: "Programma Giorno per Giorno",
  pdfNoDaysScheduled: "Nessun giorno programmato",
  pdfDayLabel: "Giorno {number}",
  pdfConsultantLabel: "Il tuo consulente di viaggio",
  pdfWhatsappCta: "💬 Scrivi su WhatsApp",
  pdfPreparedFor: "Preparato appositamente per {name}",
  pdfGeneratedAt: "Generato il {date} • Agentes de Sonhos",
  whatsappAria: "Scrivi su WhatsApp",
  whatsappMessageTemplate: "Ciao! Ho visto l'itinerario per {destination} e vorrei maggiori informazioni.",
  invalidLinkMessage: "Link non valido",
  checkLinkMessage: "Verifica il link e riprova.",
  documentFallbackName: "file",
};

export const itineraryTranslator = createTranslator<ItineraryDictionary>({
  "pt-BR": pt,
  "it-IT": it,
});

/** Rótulos de tipo de viagem, indexados pela mesma chave usada no banco. */
export function tripTypeLabel(locale: PublicLocale | string | null | undefined, tripType: string): string {
  const t = itineraryTranslator(locale);
  const map: Record<string, keyof ItineraryDictionary> = {
    familia: "tripTypeFamilia",
    casal: "tripTypeCasal",
    lua_de_mel: "tripTypeLuaDeMel",
    sozinho: "tripTypeSozinho",
    solo: "tripTypeSozinho",
    corporativo: "tripTypeCorporativo",
    familia_crianca_pequena: "tripTypeFamiliaCriancaPequena",
    familia_adolescentes: "tripTypeFamiliaAdolescentes",
    grupo_amigos: "tripTypeGrupoAmigos",
    melhor_idade: "tripTypeMelhorIdade",
  };
  const key = map[tripType];
  return key ? t(key) : tripType.replace("_", " ");
}

export function budgetLabel(locale: PublicLocale | string | null | undefined, budgetLevel: string): string {
  const t = itineraryTranslator(locale);
  const map: Record<string, keyof ItineraryDictionary> = {
    economico: "budgetEconomico",
    conforto: "budgetConforto",
    luxo: "budgetLuxo",
  };
  const key = map[budgetLevel];
  return key ? t(key) : budgetLevel;
}

export function periodLabel(locale: PublicLocale | string | null | undefined, period: "manha" | "tarde" | "noite"): string {
  const t = itineraryTranslator(locale);
  const map = { manha: "periodManha", tarde: "periodTarde", noite: "periodNoite" } as const;
  return t(map[period]);
}

const INTEREST_KEY_MAP: Record<string, keyof ItineraryDictionary> = {
  gastronomia: "interestGastronomia",
  cultura: "interestCultura",
  historia: "interestHistoria",
  compras: "interestCompras",
  natureza: "interestNatureza",
  praia: "interestPraia",
  esportes: "interestEsportes",
  futebol: "interestFutebol",
  basquete: "interestBasquete",
  parques: "interestParques",
  vida_noturna: "interestVidaNoturna",
  relaxamento: "interestRelaxamento",
  luxo: "interestLuxo",
  experiencias_locais: "interestExperienciasLocais",
  museus: "interestMuseus",
  fotografia: "interestFotografia",
  aventura: "interestAventura",
  shows: "interestShows",
  vida_urbana: "interestVidaUrbana",
};

/** Traduz um interesse de passageiro pela chave do banco. Cai no rótulo pt-BR original quando desconhecido. */
export function passengerInterestLabel(
  locale: PublicLocale | string | null | undefined,
  interestKey: string,
  fallbackLabel?: string
): string {
  const t = itineraryTranslator(locale);
  const key = INTEREST_KEY_MAP[interestKey];
  return key ? t(key) : fallbackLabel ?? interestKey;
}

/** "{count} dia(s)" / "{count} giorno/i" — pluralização localizada. */
export function daysCountLabel(locale: PublicLocale | string | null | undefined, count: number): string {
  const forms =
    normalizeIsItalian(locale)
      ? { one: "giorno", other: "giorni" }
      : { one: "dia", other: "dias" };
  return `${formatPublicNumber(count, locale)} ${pluralize(locale, count, forms)}`;
}

export function travelersCountLabel(locale: PublicLocale | string | null | undefined, count: number): string {
  const forms =
    normalizeIsItalian(locale)
      ? { one: "viaggiatore", other: "viaggiatori" }
      : { one: "viajante", other: "viajantes" };
  return `${formatPublicNumber(count, locale)} ${pluralize(locale, count, forms)}`;
}

export function activitiesCountLabel(locale: PublicLocale | string | null | undefined, count: number): string {
  const forms =
    normalizeIsItalian(locale)
      ? { one: "attività", other: "attività" }
      : { one: "atividade", other: "atividades" };
  return `${formatPublicNumber(count, locale)} ${pluralize(locale, count, forms)}`;
}

function normalizeIsItalian(locale: PublicLocale | string | null | undefined): boolean {
  return typeof locale === "string" && locale.toLowerCase().startsWith("it");
}

/**
 * Cabeçalho de dia localizado — substitui `formatItineraryDayHeader` (pt-BR
 * fixo) apenas nas superfícies públicas. Mantém o formato original em
 * pt-BR ("Segunda-feira, 08 de Julho") e produz o equivalente em it-IT
 * ("Lunedì, 08 luglio").
 */
export function formatPublicItineraryDayHeader(
  date: Date,
  locale: PublicLocale | string | null | undefined
): string {
  const isItalian = normalizeIsItalian(locale);
  const weekdaysPt = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const monthsPt = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const weekdaysIt = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const monthsIt = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

  const weekdays = isItalian ? weekdaysIt : weekdaysPt;
  const months = isItalian ? monthsIt : monthsPt;
  const weekday = weekdays[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  return isItalian ? `${weekday}, ${day} ${month}` : `${weekday}, ${day} de ${month}`;
}

/** Locale date-fns correspondente ao locale público (apenas para formatação, nunca tradução de texto livre). */
function dateFnsLocale(locale: PublicLocale | string | null | undefined) {
  return normalizeIsItalian(locale) ? itIT : ptBR;
}

/** Faixa "08 de jul – 15 de jul de 2026" (pt-BR, byte-idêntico ao original) / "08 lug – 15 lug 2026" (it-IT). */
export function formatPublicHeroDateRange(
  start: Date,
  end: Date,
  locale: PublicLocale | string | null | undefined
): string {
  const dfLocale = dateFnsLocale(locale);
  if (normalizeIsItalian(locale)) {
    return `${format(start, "dd MMM", { locale: dfLocale })} – ${format(end, "dd MMM yyyy", { locale: dfLocale })}`;
  }
  return `${format(start, "dd 'de' MMM", { locale: dfLocale })} – ${format(end, "dd 'de' MMM 'de' yyyy", { locale: dfLocale })}`;
}

/** Data curta do card do dia da faixa horizontal: dia da semana abreviado + número + mês abreviado. */
export function formatPublicDayStripParts(date: Date, locale: PublicLocale | string | null | undefined) {
  const dfLocale = dateFnsLocale(locale);
  return {
    weekday: format(date, "EEE", { locale: dfLocale }).slice(0, 3),
    day: format(date, "dd", { locale: dfLocale }),
    month: format(date, "MMM", { locale: dfLocale }).replace(".", ""),
  };
}

/** Data curta dd/MM/yyyy no locale público (usada no PDF). */
export function formatPublicPdfDate(date: Date, locale: PublicLocale | string | null | undefined): string {
  return format(date, "dd/MM/yyyy", { locale: dateFnsLocale(locale) });
}

/** "Gerado em 8 de setembro de 2026" (pt-BR) / "Generato il 8 settembre 2026" (it-IT), usando o rótulo já traduzido. */
export function formatPublicLongDateFns(date: Date, locale: PublicLocale | string | null | undefined): string {
  const dfLocale = dateFnsLocale(locale);
  return normalizeIsItalian(locale)
    ? format(date, "d MMMM yyyy", { locale: dfLocale })
    : format(date, "d 'de' MMMM 'de' yyyy", { locale: dfLocale });
}
