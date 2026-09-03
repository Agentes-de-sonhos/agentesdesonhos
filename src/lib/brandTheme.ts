/**
 * Identidade visual GLOBAL das agências white label.
 *
 * Fonte ÚNICA de cores: a configuração já existente da agência
 * (`profiles.agency_primary_color`) mais a nova cor secundária
 * (`profiles.agency_secondary_color`, opcionalmente gerada automaticamente
 * a partir da principal).
 *
 * Este módulo transforma esse par de cores em um conjunto de variáveis CSS
 * aplicadas na raiz do documento (ver `useAgencyBrandTheme`), de modo que
 * TODOS os componentes — inclusive os renderizados em Portal (dialogs,
 * popovers, selects, calendários, tooltips) — herdem o tema do tenant:
 *
 *   --brand-primary / --brand-secondary / --brand-on-primary
 *   --brand-primary-hover / --brand-focus-ring
 *
 * Além disso sobrescrevemos os tokens do design system (`--primary`, `--ring`,
 * `--accent`, `--sidebar-*`) para que botões, campos, abas, checkboxes,
 * switches, progresso e seleção de datas acompanhem a marca sem hardcode.
 *
 * Cores semânticas (erro, alerta, sucesso, status) NUNCA são alteradas: elas
 * comunicam informação, não identidade.
 */

/** Azul atual da plataforma — fallback quando a agência não configurou cor. */
export const BRAND_FALLBACK_PRIMARY = "#0284C7";

type RGB = [number, number, number];

export function normalizeBrandHex(input: string | null | undefined): string | null {
  if (!input) return null;
  let v = String(input).trim();
  if (!v) return null;
  if (!v.startsWith("#")) v = `#${v}`;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return null;
  return v.toUpperCase();
}

function parseHex(hex: string | null | undefined): RGB | null {
  const v = normalizeBrandHex(hex);
  if (!v) return null;
  return [
    parseInt(v.slice(1, 3), 16),
    parseInt(v.slice(3, 5), 16),
    parseInt(v.slice(5, 7), 16),
  ];
}

function toHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function mix(a: RGB, b: RGB, amount: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ];
}

const WHITE: RGB = [255, 255, 255];

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** "H S% L%" — formato exigido pelos tokens HSL do design system. */
export function toHslTriplet(hex: string): string {
  const rgb = parseHex(hex) ?? parseHex(BRAND_FALLBACK_PRIMARY)!;
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Tom claro derivado: ~12% da cor principal misturada com branco.
 * (Mantido dentro da faixa 10–15% pedida na configuração.)
 */
export function deriveSecondaryColor(primary: string | null | undefined): string {
  const rgb = parseHex(primary) ?? parseHex(BRAND_FALLBACK_PRIMARY)!;
  return toHex(mix(WHITE, rgb, 0.12));
}

/** Tom muito claro derivado (superfícies, cards, miolo de intervalo). */
export function deriveTertiaryColor(primary: string | null | undefined): string {
  return deriveSecondaryColor(primary);
}

export interface BrandPalette {
  primary: string;
  /** Variante da principal ajustada para leitura sobre fundos claros. */
  primaryReadable: string;
  primaryHover: string;
  onPrimary: string;
  /** Segundo acento real da marca (ações secundárias, foco/borda ativa). */
  secondary: string;
  secondaryHover: string;
  onSecondary: string;
  /** Tom muito claro: fundos suaves, cards selecionados, miolo de intervalo. */
  tertiary: string;
  onTertiary: string;
  /** Fundo de item selecionado / intervalo de datas. */
  selection: string;
  border: string;
}

export interface AgencyBrandInput {
  primary?: string | null;
  /**
   * Segundo acento da marca. Em cadastros legados este campo guardava o
   * "tom claro" — nesse caso ele é reinterpretado como terciária e o acento
   * acompanha a primária (aparência preservada).
   */
  secondary?: string | null;
  secondaryAuto?: boolean | null;
  /** Tom muito claro. Quando ausente/automático, derivado da primária. */
  tertiary?: string | null;
  tertiaryAuto?: boolean | null;
}

/** Texto legível (preto/branco) sobre uma cor de fundo. */
function readableOn(hex: string): string {
  const rgb = parseHex(hex) ?? parseHex(BRAND_FALLBACK_PRIMARY)!;
  return luminance(rgb) > 0.42 ? "#1E293B" : "#FFFFFF";
}

/**
 * Resolve a paleta efetiva da agência (contrato de 3 cores).
 * - Sem cor configurada → azul atual (fallback).
 * - Terciária ausente/automática → tom claro derivado da primária.
 * - Secundária ausente/automática → acompanha a primária.
 */
export function resolveBrandPalette(input: AgencyBrandInput): BrandPalette {
  const primaryHex = normalizeBrandHex(input.primary) ?? BRAND_FALLBACK_PRIMARY;

  // Cores muito claras são escurecidas para permanecerem legíveis como cor de
  // texto/ícone sobre fundo branco; a cor "pura" continua disponível em
  // --brand-primary-raw para superfícies preenchidas.
  let readable = parseHex(primaryHex)!;
  let guard = 0;
  while (luminance(readable) > 0.6 && guard < 6) {
    readable = [readable[0] * 0.82, readable[1] * 0.82, readable[2] * 0.82];
    guard += 1;
  }
  if (luminance(readable) < 0.02) readable = [readable[0] + 28, readable[1] + 28, readable[2] + 28];
  const primary = toHex(readable);

  const derivedLight = deriveTertiaryColor(primaryHex);
  const legacyManualLight =
    input.secondaryAuto === false ? normalizeBrandHex(input.secondary) ?? derivedLight : derivedLight;

  const tertiaryConfigured = normalizeBrandHex(input.tertiary);
  const tertiaryExplicit = tertiaryConfigured !== null || input.tertiaryAuto === false;
  // Migração compatível: quando a terciária ainda não foi configurada, ela é
  // exatamente o antigo "tom claro" (derivado ou manual) do cadastro atual.
  const tertiary =
    input.tertiaryAuto === false
      ? tertiaryConfigured ?? legacyManualLight
      : legacyManualLight;

  // O acento só entra em cena quando a agência já migrou para 3 cores; nos
  // cadastros antigos ele acompanha a primária, preservando a aparência.
  const secondary =
    tertiaryExplicit && input.secondaryAuto === false
      ? normalizeBrandHex(input.secondary) ?? primary
      : primary;

  const secondaryRgb = parseHex(secondary)!;

  return {
    primary,
    primaryReadable: primary,
    primaryHover: toHex([readable[0] * 0.85, readable[1] * 0.85, readable[2] * 0.85]),
    onPrimary: luminance(readable) > 0.42 ? "#1E293B" : "#FFFFFF",
    secondary,
    secondaryHover: toHex(mix(secondaryRgb, readable, 0.12)),
    onSecondary: readableOn(secondary),
    tertiary,
    onTertiary: readableOn(tertiary),
    selection: toHex(mix(WHITE, readable, 0.22)),
    border: toHex(mix(WHITE, readable, 0.45)),
  };
}

/**
 * Conjunto completo de variáveis CSS do tema da agência.
 * Pode ser aplicado inline (style) ou na raiz do documento.
 */
export function brandThemeVars(input: AgencyBrandInput): Record<string, string> {
  const p = resolveBrandPalette(input);
  const primaryHsl = toHslTriplet(p.primary);
  const onPrimaryHsl = toHslTriplet(p.onPrimary);
  const tertiaryHsl = toHslTriplet(p.tertiary);
  const neutralFg = "222 47% 11%";

  return {
    // ── Tokens públicos do design system de marca ──────────────────────────
    "--brand-primary": p.primary,
    "--brand-primary-hover": p.primaryHover,
    "--brand-secondary": p.secondary,
    "--brand-secondary-hover": p.secondaryHover,
    "--brand-on-secondary": p.onSecondary,
    "--brand-tertiary": p.tertiary,
    "--brand-on-tertiary": p.onTertiary,
    "--brand-on-primary": p.onPrimary,
    // Foco/borda ativa de campos, checkboxes e controles → secundária.
    "--brand-focus-ring": p.secondary,
    // Calendários de intervalo: extremos na primária, miolo na terciária.
    "--brand-range-edge": p.primary,
    "--brand-range-fill": p.tertiary,
    "--brand-selection": p.selection,
    "--brand-border": p.border,

    // ── Compatibilidade com tokens já usados no produto ───────────────────
    // (o antigo "tom claro" corresponde agora à terciária)
    "--wl-accent": p.primary,
    "--wl-accent-dark": p.primaryHover,
    "--wl-on-accent": p.onPrimary,
    "--wl-tint": `${p.primary}14`,
    "--wl-tint-strong": `${p.primary}24`,
    "--wl-tint-soft": `${p.primary}0d`,
    "--wl-border": `${p.primary}40`,
    "--agency-primary": p.primary,
    "--agency-primary-hover": p.primaryHover,
    "--agency-primary-active": p.primaryHover,
    "--agency-primary-soft": p.tertiary,
    "--agency-primary-soft-hover": p.secondaryHover,
    "--agency-primary-border": p.border,
    "--agency-primary-foreground": p.onPrimary,
    "--agency-focus-ring": p.secondary,
    "--agency-selection": p.selection,
    "--wallet-brand": primaryHsl,
    "--wallet-brand-soft": tertiaryHsl,

    // ── Sobrescrita dos tokens shadcn/Tailwind (HSL) ───────────────────────
    "--primary": primaryHsl,
    "--primary-foreground": onPrimaryHsl,
    "--ring": toHslTriplet(p.secondary),
    "--accent": tertiaryHsl,
    "--accent-foreground": neutralFg,
    "--sidebar-primary": primaryHsl,
    "--sidebar-primary-foreground": onPrimaryHsl,
    "--sidebar-ring": toHslTriplet(p.secondary),
    "--sidebar-accent": tertiaryHsl,
    "--sidebar-accent-foreground": neutralFg,
    "--gradient-primary": `linear-gradient(135deg, ${p.primary} 0%, ${p.primaryHover} 100%)`,
  };
}

/** Mesmo tema em formato de `style` inline (para escopar em um container). */
export function brandThemeStyle(input: AgencyBrandInput): React.CSSProperties {
  return brandThemeVars(input) as unknown as React.CSSProperties;
}
