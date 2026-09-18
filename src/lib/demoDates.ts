/**
 * Etapa 3 — gatilho de datas relativas do cenário demonstrativo.
 *
 * O cliente apenas SUGERE que o cenário pode precisar de atualização; toda a
 * autorização e a regra de uma vez por dia ficam no servidor. Aqui só evitamos
 * chamadas repetidas (e qualquer loop) no mesmo dia/aba.
 */

/** Hosts técnicos de demonstração e o cenário correspondente. */
export const DEMO_SCENARIO_BY_HOST: Record<string, string> = {
  "casanovatur.demo.local": "casa-nova-tur",
  /** Carga demonstrativa canônica, editável pelas telas reais da Gestão. */
  "sitelab.local": "sitelab-base-canonical",
};

/** "Hoje" no fuso America/Sao_Paulo (mesma referência usada no servidor). */
export function saoPauloToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Cenário demo do host atual (null quando não é um host de demonstração). */
export function demoScenarioForHost(hostname: string | null | undefined): string | null {
  if (!hostname) return null;
  return DEMO_SCENARIO_BY_HOST[hostname.trim().toLowerCase()] ?? null;
}

/** Chave de controle diário por cenário — impede repetição e loops. */
export function demoDatesStorageKey(slug: string, today: string): string {
  return `demo-dates:${slug}:${today}`;
}

/**
 * Verdadeiro quando o gatilho ainda não rodou hoje nesta origem. Falha de
 * storage (modo restrito) nunca deve quebrar a página: assume "já rodou".
 */
export function shouldTriggerToday(
  storage: Pick<Storage, "getItem" | "setItem">,
  slug: string,
  today: string,
): boolean {
  try {
    return storage.getItem(demoDatesStorageKey(slug, today)) === null;
  } catch {
    return false;
  }
}

/** Marca o dia como já disparado (idempotência do gatilho no navegador). */
export function markTriggeredToday(
  storage: Pick<Storage, "getItem" | "setItem">,
  slug: string,
  today: string,
): void {
  try {
    storage.setItem(demoDatesStorageKey(slug, today), "1");
  } catch {
    /* storage indisponível — o servidor continua sendo a fonte da verdade */
  }
}
