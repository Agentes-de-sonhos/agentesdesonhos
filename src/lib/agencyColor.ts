/**
 * Agency Theme helpers.
 *
 * The Public Digital Wallet (and, progressively, other public links) is
 * driven by a single "Agency Theme". When the agency defines a primary
 * color in `profiles.agency_primary_color` (HEX), this module produces an
 * inline-style object that overrides the relevant shadcn / Tailwind HSL
 * tokens on the page root:
 *
 *   --wallet-brand        — raw brand color (used by custom wallet UI)
 *   --wallet-brand-soft   — light tint companion (backgrounds, badges)
 *   --primary             — shadcn primary (Buttons, Calendar selection,
 *                           focus accents, etc.)
 *   --primary-foreground  — readable text on top of primary
 *   --ring                — focus ring color
 *   --sidebar-primary     — sidebar accents (safety net for nested UI)
 *
 * Overriding `--primary` is what makes every shadcn component inside the
 * wallet (Buttons, Inputs, Calendar, etc.) inherit the agency identity
 * without any component-level changes.
 */

export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null;
  let v = input.trim();
  if (!v) return null;
  if (!v.startsWith("#")) v = `#${v}`;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return null;
  return v.toUpperCase();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const v = normalizeHex(hex);
  if (!v) return null;
  return {
    r: parseInt(v.slice(1, 3), 16),
    g: parseInt(v.slice(3, 5), 16),
    b: parseInt(v.slice(5, 7), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** Returns "H S% L%" — the format Tailwind/shadcn HSL CSS vars expect. */
export function hexToHslTriplet(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Lighter, low-saturation companion used for soft backgrounds/badges. */
export function hexToSoftHslTriplet(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l0 = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l0 > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  // Cap saturation and force a high lightness for a pastel/tinted surface.
  const softS = Math.min(s * 100, 60);
  return `${Math.round(h)} ${Math.round(softS)}% 94%`;
}

/** Perceived luminance (0-1) of an sRGB color. */
function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const toLin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
}

/** Returns the HSL triplet for the text color that reads best on top of `hex`. */
function readableForegroundHsl(hex: string): string {
  const lum = relativeLuminance(hex);
  // Light brand → near-black text; dark brand → white text. Threshold tuned
  // so brand colors like vivid yellow/lime get dark text.
  if (lum !== null && lum > 0.6) return "222 47% 11%";
  return "0 0% 100%";
}

/**
 * Returns inline style props that activate the Agency Theme.
 * Spread onto the public page root element:
 *
 *   <div style={getWalletBrandStyle(profile.agency_primary_color)}>...</div>
 *
 * Returns an empty object when no valid color is provided — components fall
 * back to the platform default defined in index.css.
 */
export function getWalletBrandStyle(
  hex: string | null | undefined,
): React.CSSProperties {
  const normalized = normalizeHex(hex || undefined);
  if (!normalized) return {};
  const brand = hexToHslTriplet(normalized);
  const soft = hexToSoftHslTriplet(normalized);
  if (!brand || !soft) return {};
  const fg = readableForegroundHsl(normalized);
  return {
    ["--wallet-brand" as any]: brand,
    ["--wallet-brand-soft" as any]: soft,
    // Drive shadcn tokens so every Button / Input focus / Calendar / etc.
    // inside the wallet auto-themes with the agency color.
    ["--primary" as any]: brand,
    ["--primary-foreground" as any]: fg,
    ["--ring" as any]: brand,
    ["--sidebar-primary" as any]: brand,
    ["--sidebar-primary-foreground" as any]: fg,
  } as React.CSSProperties;
}