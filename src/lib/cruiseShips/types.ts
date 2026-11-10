/**
 * Declarative model of a cruise ship page. One shared React page renders any
 * ship; adding a new ship = new content module + itinerary JSON + registry entry.
 */
export type CruiseSailingStatus = "published" | "official_checked" | "conflict";

export interface CruiseSailing {
  title?: string; // Named products with the same ports keep separate dates (e.g. Carnaval).
  note?: string;
  date: string; // YYYY-MM-DD
  n: number; // nights
  ports: string[]; // embark ... disembark (call order, sea days not inferred)
  source?: string;
  status: CruiseSailingStatus | string;
}

export interface CruiseItineraryFeed {
  checkedAt: string;
  from: string;
  to: string;
  scope: string;
  sailings: CruiseSailing[];
}

export interface CruisePhoto {
  key: string; // asset key
  label: string;
  category: string;
}

export interface CruiseShipContent {
  lineSlug: string;
  shipSlug: string;
  lineName: string;
  shipName: string;
  /** Title split exactly as approved: "Harmony" + <em>"of the Seas"</em>. */
  titleLead: string;
  titleTail: string;
  eyebrow: string;
  tagline: string;
  assets: Record<string, string>;
  hero: { image: string; video?: string | null; alt: string; caption: string; captionSmall: string; videoAria: string };
  tiles: { photo: string; alt: string; label: string }[];
  albumTile: { image: string; alt: string };
  credit: string;
  creditUrl?: string;
  photos: CruisePhoto[];
  photoCategories: string[];
  about: {
    eyebrow: string; titleA: string; titleB: string; text: string;
    stats: { value: string; label: string }[];
    techTitle: string; techText: string; techButton: string;
    why: { title: string; text: string }[];
  };
  experiences: {
    eyebrow: string; titleA: string; titleB: string;
    tabs: { key: string; label: string; image: string; title: string; text: string; items: string[] }[];
  };
  included: { title: string; items: { title: string; text: string }[] };
  cabins: {
    eyebrow: string; titleA: string; titleB: string; text: string;
    items: { name: string; lead: string; detail: string; image?: string | null }[];
    note: string;
  };
  routes: {
    eyebrow: string; titleA: string; titleB: string; text: string;
    homePortEyebrow: string; homePortText: string;
    regions: string[];
    /** Region resolved by the first rule whose ports intersect the sailing; fallback = last region. */
    regionRules: { region: string; ports: string[] }[];
    fallbackRegion: string;
    coordinates: Record<string, [number, number]>;
    feed: CruiseItineraryFeed;
    geography: string; // GeoJSON URL
    /** Official products whose complete port sequence is not yet verified. Never draw inferred routes. */
    announcements?: { id: string; title: string; n: number; region: string; text: string; dates: string[]; note: string; source: string }[];
    summaries?: { title: string; duration: string; text: string; source: string }[];
  };
  quote: { eyebrow: string; titleA: string; titleB: string; textA: string; textB: string };
  sources?: { label: string; url: string }[];
  tech: {
    title: string;
    subtitle?: string;
    facts?: { label: string; value: string; detail?: string }[];
    notes?: { title: string; text: string }[];
    paragraphs: string[];
  };
}
