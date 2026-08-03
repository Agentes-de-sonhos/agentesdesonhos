/**
 * Paleta ÚNICA de especialidades do Mapa do Turismo.
 * Mesma lista usada pelos cards da listagem e pelo bloco "Especialidades"
 * do perfil comercial — a cor é determinística pelo índice da lista normalizada,
 * então a mesma especialidade da mesma empresa recebe a mesma cor nos dois lugares.
 */
export const SPECIALTY_CHIP_COLORS = [
  "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
  "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
  "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800",
] as const;

/** Classe de cor determinística para a especialidade na posição `index`. */
export function getSpecialtyChipClass(index: number): string {
  const n = SPECIALTY_CHIP_COLORS.length;
  const i = ((Math.trunc(index) % n) + n) % n;
  return SPECIALTY_CHIP_COLORS[i];
}

/** Altura uniforme do chip nos cards (px) — base do cálculo de 3 linhas visuais. */
export const CARD_CHIP_HEIGHT_PX = 22;
/** Gap entre chips nos cards (px) — Tailwind gap-1.5. */
export const CARD_CHIP_GAP_PX = 6;

/** max-height que comporta exatamente `lines` linhas inteiras de chips. */
export function chipRowsMaxHeight(lines: number): string {
  const rows = Math.max(1, Math.trunc(lines));
  return `${rows * CARD_CHIP_HEIGHT_PX + (rows - 1) * CARD_CHIP_GAP_PX}px`;
}