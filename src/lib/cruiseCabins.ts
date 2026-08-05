/**
 * Cruzeiro — opções de cabine (alternativas) e vídeo do navio.
 *
 * As opções de cabine são ALTERNATIVAS entre si: nunca são somadas.
 * O `amount` do serviço corresponde SEMPRE ao preço da opção base
 * (a única marcada com `is_base`).
 *
 * Retrocompatível: cruzeiros antigos possuem apenas `cabin_type` + `price`/`amount`.
 */

export const CRUISE_CABIN_TYPES = [
  { value: "interna", label: "Interna" },
  { value: "externa", label: "Externa / Vista para o mar" },
  { value: "varanda", label: "Varanda" },
  { value: "suite", label: "Suíte" },
  { value: "outro", label: "Outro" },
] as const;

export type CruiseCabinType = (typeof CRUISE_CABIN_TYPES)[number]["value"];

export interface CruiseCabinOption {
  id?: string;
  /** Tipo da cabine (interna, externa, varanda, suite, outro ou legado livre). */
  cabin_type: string;
  /** Nome livre usado quando `cabin_type === "outro"`. */
  custom_label?: string;
  /** Valor TOTAL desta alternativa. */
  price: number;
  /** Opção considerada no total do orçamento (exatamente uma). */
  is_base?: boolean;
}

const LEGACY_LABELS: Record<string, string> = {
  interna: "Interna",
  externa: "Externa / Vista para o mar",
  varanda: "Varanda",
  suite: "Suíte",
  outro: "Outro",
};

/** Rótulo amigável de uma opção de cabine. */
export function cabinOptionLabel(cabin: Pick<CruiseCabinOption, "cabin_type" | "custom_label">): string {
  const custom = (cabin.custom_label || "").trim();
  if (cabin.cabin_type === "outro") return custom || "Outra cabine";
  const known = LEGACY_LABELS[String(cabin.cabin_type || "").toLowerCase()];
  if (known) return known;
  const raw = String(cabin.cabin_type || "").trim();
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);
  return custom || "Cabine";
}

export function newCabinId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch { /* ignore */ }
  return `cab_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Normaliza as opções de cabine de um cruzeiro.
 * - Usa `service_data.cabins` quando existir e for válido.
 * - Caso contrário, cria uma única opção a partir de `cabin_type` + (`price` | amount) — legado.
 * - Garante exatamente uma opção base (a primeira marcada, ou a primeira da lista).
 */
export function normalizeCruiseCabins(serviceData: any, amount?: number): CruiseCabinOption[] {
  const data = serviceData || {};
  const raw = Array.isArray(data.cabins) ? data.cabins : [];
  const parsed: CruiseCabinOption[] = raw
    .filter((c: any) => c && typeof c === "object")
    .map((c: any) => ({
      id: typeof c.id === "string" && c.id ? c.id : newCabinId(),
      cabin_type: String(c.cabin_type || "").trim() || "outro",
      custom_label: typeof c.custom_label === "string" ? c.custom_label : undefined,
      price: Number(c.price) || 0,
      is_base: !!c.is_base,
    }));

  if (parsed.length === 0) {
    const legacyPrice = Number(data.price) || Number(amount) || 0;
    const legacyType = String(data.cabin_type || "").trim();
    if (!legacyType && legacyPrice <= 0) return [];
    return [
      {
        id: newCabinId(),
        cabin_type: legacyType || "outro",
        price: legacyPrice,
        is_base: true,
      },
    ];
  }

  return ensureSingleBase(parsed);
}

/** Garante exatamente uma opção base, preservando a escolha existente quando houver. */
export function ensureSingleBase(cabins: CruiseCabinOption[], preferredIndex?: number): CruiseCabinOption[] {
  if (cabins.length === 0) return [];
  let baseIdx =
    preferredIndex != null && preferredIndex >= 0 && preferredIndex < cabins.length
      ? preferredIndex
      : cabins.findIndex((c) => c.is_base);
  if (baseIdx < 0) baseIdx = 0;
  return cabins.map((c, i) => ({ ...c, is_base: i === baseIdx }));
}

/** Preço da opção base — valor que deve alimentar o `amount` do serviço. */
export function baseCabinPrice(cabins: CruiseCabinOption[], fallback = 0): number {
  if (!cabins.length) return fallback;
  const base = cabins.find((c) => c.is_base) || cabins[0];
  return Number(base.price) || 0;
}

/* ─────────────────── Vídeo do navio ─────────────────── */

export interface ShipVideoEmbed {
  provider: "youtube" | "vimeo";
  embedUrl: string;
}

/**
 * Valida e converte uma URL de vídeo (YouTube ou Vimeo) em URL de embed segura.
 * Retorna null para qualquer coisa inválida — nunca aceita HTML/iframe arbitrário.
 */
export function parseShipVideoUrl(input?: string | null): ShipVideoEmbed | null {
  const value = (input || "").trim();
  if (!value || /[<>"']/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  const ytId = (id: string | null) => (id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null);

  if (host === "youtu.be") {
    const id = ytId(url.pathname.split("/").filter(Boolean)[0] || null);
    return id ? { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` } : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      const id = ytId(url.searchParams.get("v"));
      return id ? { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` } : null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
      const id = ytId(parts[1] || null);
      return id ? { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` } : null;
    }
    return null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const idPart = parts[0] === "video" ? parts[1] : parts[0];
    const hash = parts[0] === "video" ? parts[2] : parts[1];
    if (idPart && /^\d{5,12}$/.test(idPart)) {
      const suffix = hash && /^[A-Za-z0-9]{4,20}$/.test(hash) ? `?h=${hash}` : "";
      return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${idPart}${suffix}` };
    }
    return null;
  }
  return null;
}
