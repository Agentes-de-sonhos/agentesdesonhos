/**
 * Normalização da resposta da importação de hospedagem por IA.
 *
 * A edge function `import-hotel-document` passou a devolver uma lista
 * (`hotels`), mas respostas antigas/singulares continuam válidas — um único
 * documento com um hotel deve se comportar exatamente como antes.
 */

export interface HotelImportLike {
  nome_hotel?: string;
  cidade?: string;
  check_in?: string;
  check_out?: string;
  codigo_reserva?: string;
  localizador?: string;
  valor_total?: number | null;
  valor_total_brl?: number | null;
  [key: string]: any;
}

export function hotelHasUsefulData(h: HotelImportLike | null | undefined): boolean {
  if (!h || typeof h !== "object") return false;
  return !!(
    h.nome_hotel ||
    h.cidade ||
    h.check_in ||
    h.check_out ||
    h.codigo_reserva ||
    h.localizador ||
    typeof h.valor_total === "number" ||
    typeof h.valor_total_brl === "number"
  );
}

/** Ordena cronologicamente por check-in; itens sem data preservam a ordem original. */
export function sortHotelsChronologically<T extends HotelImportLike>(list: T[]): T[] {
  return list
    .map((h, i) => ({ h, i }))
    .sort((a, b) => {
      const da = String(a.h.check_in || "");
      const db = String(b.h.check_in || "");
      if (da && db && da !== db) return da < db ? -1 : 1;
      if (da && !db) return -1;
      if (!da && db) return 1;
      return a.i - b.i;
    })
    .map((x) => x.h);
}

/**
 * Extrai todos os hotéis úteis da resposta da edge function.
 * Aceita `hotels`, `hospedagens`, array puro, `data` singular, o próprio corpo
 * e `partial_data` (retorno parcial/baixa confiança).
 */
export function extractParsedHotels<T extends HotelImportLike>(body: any): T[] {
  if (!body) return [];

  const candidates: any[] = [];
  const pushList = (value: any) => {
    if (Array.isArray(value)) candidates.push(...value);
  };

  if (body.success) {
    pushList(body.hotels);
    pushList(body.hospedagens);
    pushList(body.data?.hotels);
    pushList(body.data?.hospedagens);
    if (Array.isArray(body.data)) pushList(body.data);
    if (candidates.length === 0 && body.data && typeof body.data === "object") candidates.push(body.data);
    if (candidates.length === 0) candidates.push(body);
  }

  let useful = candidates.filter(hotelHasUsefulData);

  if (useful.length === 0) {
    const partial = body.partial_data;
    if (Array.isArray(partial)) useful = partial.filter(hotelHasUsefulData);
    else if (hotelHasUsefulData(partial)) useful = [partial];
  }

  return sortHotelsChronologically(useful) as T[];
}
