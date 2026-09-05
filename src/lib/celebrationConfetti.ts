/**
 * Confete sutil e breve (~1,8s) usado ao concluir uma venda no Kanban.
 *
 * Sem dependências novas: partículas em DOM dentro de um overlay
 * `pointer-events: none`, montado no elemento em tela cheia quando existir
 * (Fullscreen API só renderiza descendentes do elemento em fullscreen).
 * Respeita `prefers-reduced-motion` e limpa tudo ao final.
 */

const DURATION_MS = 1800;
const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#a855f7", "#06b6d4"];

function prefersReducedMotion(): boolean {
  try {
    return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  } catch {
    return false;
  }
}

function ensureKeyframes(doc: Document) {
  const id = "celebration-confetti-keyframes";
  if (doc.getElementById(id)) return;
  const style = doc.createElement("style");
  style.id = id;
  style.textContent = `@keyframes celebration-confetti-fall {
    0% { transform: translate3d(0,-10vh,0) rotate(0deg); opacity: 0; }
    12% { opacity: 1; }
    100% { transform: translate3d(var(--cx, 0px), 105vh, 0) rotate(var(--cr, 360deg)); opacity: 0; }
  }`;
  doc.head.appendChild(style);
}

/** Dispara os confetes. Retorna uma função de limpeza (idempotente). */
export function fireCelebrationConfetti(): () => void {
  if (typeof document === "undefined") return () => {};
  if (prefersReducedMotion()) return () => {};

  const host = (document.fullscreenElement as HTMLElement | null) ?? document.body;
  if (!host) return () => {};

  ensureKeyframes(document);

  const overlay = document.createElement("div");
  overlay.setAttribute("data-celebration-confetti", "true");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText =
    "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2147483000;";
  if (host === document.body) overlay.style.position = "fixed";

  const total = 42;
  for (let i = 0; i < total; i++) {
    const p = document.createElement("span");
    const size = 6 + Math.random() * 5;
    const drift = (Math.random() - 0.5) * 220;
    const delay = Math.random() * 350;
    p.style.cssText = [
      "position:absolute",
      `left:${Math.random() * 100}%`,
      "top:0",
      `width:${size}px`,
      `height:${size * (Math.random() > 0.5 ? 1 : 0.45)}px`,
      `background:${COLORS[i % COLORS.length]}`,
      `border-radius:${Math.random() > 0.5 ? "9999px" : "1px"}`,
      "opacity:0",
      `--cx:${drift}px`,
      `--cr:${Math.round(Math.random() * 720 - 360)}deg`,
      `animation:celebration-confetti-fall ${DURATION_MS - delay}ms cubic-bezier(.25,.7,.4,1) ${delay}ms forwards`,
    ].join(";");
    overlay.appendChild(p);
  }

  host.appendChild(overlay);

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    overlay.remove();
  };
  const timer = window.setTimeout(cleanup, DURATION_MS + 250);
  return cleanup;
}
