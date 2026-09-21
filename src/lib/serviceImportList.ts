/**
 * Normalização da resposta dos importadores de serviço por IA.
 *
 * As edge functions passaram a devolver uma lista (`items`) com um objeto por
 * serviço identificado no documento, mas respostas antigas/singulares continuam
 * válidas — um documento com um único serviço deve se comportar como antes.
 *
 * Generalização de `hotelImportList.ts`, que segue dedicado à hospedagem.
 */

export type ParsedServiceItem = Record<string, any>;

const META_KEYS = new Set(["confianca_extracao", "campos_nao_identificados", "observacoes"]);

/** Útil = qualquer campo principal preenchido (metadados não contam). */
export function serviceItemHasUsefulData(item: ParsedServiceItem | null | undefined): boolean {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  return Object.keys(item).some((k) => {
    if (META_KEYS.has(k)) return false;
    const v = (item as any)[k];
    if (v == null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return true;
  });
}

const DATE_KEYS = ["data", "data_inicio", "data_viagem", "data_visita", "check_in", "data_embarque", "data_retirada"];

function itemDate(item: ParsedServiceItem): string {
  for (const k of DATE_KEYS) {
    const v = item?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Ordena cronologicamente; itens sem data preservam a ordem original. */
export function sortServiceItemsChronologically<T extends ParsedServiceItem>(list: T[]): T[] {
  return list
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const da = itemDate(a.item);
      const db = itemDate(b.item);
      if (da && db && da !== db) return da < db ? -1 : 1;
      if (da && !db) return -1;
      if (!da && db) return 1;
      return a.i - b.i;
    })
    .map((x) => x.item);
}

/**
 * Extrai todos os serviços úteis do corpo devolvido pela edge function.
 * Aceita `items`, `itens`, `servicos`, array puro, `data` singular, o próprio
 * corpo e `partial_data` (retorno parcial/baixa confiança).
 */
export function extractParsedServices<T extends ParsedServiceItem>(body: any): T[] {
  if (!body) return [];

  const candidates: any[] = [];
  const pushList = (value: any) => {
    if (Array.isArray(value)) candidates.push(...value);
  };

  if (body.success) {
    pushList(body.items);
    pushList(body.itens);
    pushList(body.servicos);
    pushList(body.data?.items);
    pushList(body.data?.itens);
    pushList(body.data?.servicos);
    if (Array.isArray(body.data)) pushList(body.data);
    if (candidates.length === 0 && body.data && typeof body.data === "object") candidates.push(body.data);
    if (candidates.length === 0) candidates.push(body);
  }

  let useful = candidates.filter(serviceItemHasUsefulData);

  if (useful.length === 0) {
    const partial = body.partial_data;
    if (Array.isArray(partial)) useful = partial.filter(serviceItemHasUsefulData);
    else if (serviceItemHasUsefulData(partial)) useful = [partial];
  }

  return sortServiceItemsChronologically(useful) as T[];
}
