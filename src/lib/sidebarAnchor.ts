/**
 * Tokens e utilitários de estabilidade vertical da sidebar principal.
 *
 * A linha principal de todo item/cabeçalho compartilha a mesma geometria vertical
 * (altura mínima, padding, line-height e alinhamento) nos estados recolhido e
 * expandido — só a largura anima.
 */
export const SIDEBAR_ROW_CLASS =
  "flex items-center gap-3 min-h-8 py-0 leading-5";

/** Gap vertical entre linhas principais — idêntico em collapsed/expanded. */
export const SIDEBAR_ROW_GAP_CLASS = "gap-0.5";

/**
 * Delta de scroll necessário para manter o item âncora na mesma coordenada
 * vertical após a expansão. Positivo = o item desceu (rolar para baixo),
 * negativo = subiu, zero = estável (ou dados inválidos).
 */
export function calculateAnchorScrollDelta(beforeTop: number, afterTop: number): number {
  if (!Number.isFinite(beforeTop) || !Number.isFinite(afterTop)) return 0;
  const delta = afterTop - beforeTop;
  if (Math.abs(delta) < 1) return 0;
  return Math.round(delta);
}
