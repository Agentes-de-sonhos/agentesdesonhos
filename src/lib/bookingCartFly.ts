/**
 * Microinteração "voou para o carrinho" do ORÇAMENTO PÚBLICO.
 *
 * Usa coordenadas reais do botão de origem e do carrinho visível no momento
 * (desktop ou mobile). Respeita `prefers-reduced-motion` e nunca deixa
 * elementos órfãos no DOM: a bolha é removida no fim, no cancelamento e por
 * um timeout de segurança.
 */

export const BOOKING_FLY_DURATION_MS = 420;
export const BOOKING_CART_TARGET_ATTR = "data-booking-cart-target";
export const BOOKING_FLY_ATTR = "data-booking-cart-fly";

export function prefersReducedMotion(win: Window | undefined = typeof window !== "undefined" ? window : undefined): boolean {
  try {
    return !!win?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  } catch {
    return false;
  }
}

/** Carrinho atualmente visível (desktop ou mobile). */
export function findCartTarget(doc: Document | undefined = typeof document !== "undefined" ? document : undefined): HTMLElement | null {
  if (!doc) return null;
  const nodes = Array.from(doc.querySelectorAll<HTMLElement>(`[${BOOKING_CART_TARGET_ATTR}]`));
  const visible = nodes.find((el) => el.getClientRects().length > 0 || el.offsetParent !== null);
  return visible || nodes[0] || null;
}

/** Remove qualquer bolha remanescente (defensivo contra órfãos). */
export function clearBookingFlyBubbles(doc: Document | undefined = typeof document !== "undefined" ? document : undefined): void {
  doc?.querySelectorAll(`[${BOOKING_FLY_ATTR}]`).forEach((el) => el.remove());
}

interface FlyOptions {
  imageUrl?: string | null;
  document?: Document;
  window?: Window;
}

/**
 * Anima uma bolha da origem até o carrinho. Retorna a função de limpeza.
 * Com movimento reduzido, não cria nada (apenas o estado/badge é atualizado).
 */
export function flyToCart(
  origin: DOMRect | null,
  target: DOMRect | null,
  options: FlyOptions = {},
): () => void {
  const doc = options.document ?? (typeof document !== "undefined" ? document : undefined);
  const win = options.window ?? (typeof window !== "undefined" ? window : undefined);
  const noop = () => {};
  if (!doc || !origin || !target) return noop;
  if (prefersReducedMotion(win)) return noop;

  const size = 36;
  const bubble = doc.createElement("div");
  bubble.setAttribute(BOOKING_FLY_ATTR, "true");
  bubble.setAttribute("aria-hidden", "true");
  bubble.style.position = "fixed";
  bubble.style.left = `${origin.left + origin.width / 2 - size / 2}px`;
  bubble.style.top = `${origin.top + origin.height / 2 - size / 2}px`;
  bubble.style.width = `${size}px`;
  bubble.style.height = `${size}px`;
  bubble.style.borderRadius = "9999px";
  bubble.style.zIndex = "70";
  bubble.style.pointerEvents = "none";
  bubble.style.background = "hsl(var(--primary))";
  bubble.style.backgroundSize = "cover";
  bubble.style.backgroundPosition = "center";
  bubble.style.boxShadow = "0 12px 28px -10px rgba(0,0,0,0.45)";
  if (options.imageUrl) bubble.style.backgroundImage = `url("${options.imageUrl}")`;
  doc.body.appendChild(bubble);

  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    bubble.remove();
  };

  const dx = target.left + target.width / 2 - (origin.left + origin.width / 2);
  const dy = target.top + target.height / 2 - (origin.top + origin.height / 2);

  const animate = (bubble as any).animate as HTMLElement["animate"] | undefined;
  if (typeof animate === "function") {
    const anim = animate.call(
      bubble,
      [
        { transform: "translate3d(0,0,0) scale(1)", opacity: 1 },
        {
          transform: `translate3d(${dx * 0.55}px, ${dy * 0.55 - 42}px, 0) scale(0.8)`,
          opacity: 0.95,
          offset: 0.6,
        },
        { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.24)`, opacity: 0.15 },
      ] as Keyframe[],
      { duration: BOOKING_FLY_DURATION_MS, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
    );
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
  }

  const timer = (win?.setTimeout ?? setTimeout)(cleanup, BOOKING_FLY_DURATION_MS + 250);
  return () => {
    (win?.clearTimeout ?? clearTimeout)(timer as any);
    cleanup();
  };
}
