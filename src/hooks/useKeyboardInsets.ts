import { useEffect, useState } from "react";

/**
 * Altura ocupada pelo teclado virtual, em pixels.
 *
 * Usa `window.visualViewport`, que é o único sinal confiável e independente de
 * aparelho: quando o teclado abre, a altura visual encolhe em relação à altura
 * da janela. Sem visualViewport (desktop e navegadores antigos) o valor é 0 e
 * nada muda no layout.
 */
export function useKeyboardInset(active = true): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!active) {
      setInset(0);
      return;
    }
    const vv = typeof window !== "undefined" ? window.visualViewport : undefined;
    if (!vv) return;

    const update = () => {
      // offsetTop entra na conta porque o iOS desloca o viewport ao focar campos.
      const hidden = window.innerHeight - vv.height - vv.offsetTop;
      setInset(hidden > 80 ? Math.round(hidden) : 0);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);

  return inset;
}

/** Elementos que merecem ser revelados acima do teclado ao receberem foco. */
export function isFocusableFormElement(target: EventTarget | null): boolean {
  if (!target || !(target as HTMLElement).tagName) return false;
  const tag = (target as HTMLElement).tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || (target as HTMLElement).role === "combobox";
}

/**
 * Mantém o campo focado visível acima do teclado dentro de um contêiner rolável.
 * Não depende de aparelho: apenas rola o contêiner até o campo.
 */
export function useRevealFocusedField(
  containerRef: { current: HTMLElement | null },
  active = true,
): void {
  useEffect(() => {
    if (!active) return;
    const node = containerRef.current;
    if (!node) return;

    let frame = 0;
    const onFocusIn = (event: Event) => {
      if (!isFocusableFormElement(event.target)) return;
      const element = event.target as HTMLElement;
      window.clearTimeout(frame);
      // O teclado só termina de abrir depois do foco: um atraso curto evita
      // rolar para a posição antiga.
      frame = window.setTimeout(() => {
        element.scrollIntoView?.({ block: "center", behavior: "smooth" });
      }, 180);
    };

    node.addEventListener("focusin", onFocusIn);
    return () => {
      window.clearTimeout(frame);
      node.removeEventListener("focusin", onFocusIn);
    };
  }, [containerRef, active]);
}

/**
 * "Próximo" do teclado: foca o campo seguinte do mesmo contêiner em vez de
 * fechar o teclado. Em `textarea` o Enter continua criando uma nova linha.
 */
export function focusNextField(container: HTMLElement | null, current: HTMLElement | null): boolean {
  if (!container || !current) return false;
  const fields = Array.from(
    container.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([disabled]), textarea:not([disabled])"),
  ).filter((el) => el.tabIndex !== -1 && !el.hidden && el.getAttribute("aria-hidden") !== "true");
  const index = fields.indexOf(current);
  if (index < 0 || index + 1 >= fields.length) return false;
  const next = fields[index + 1];
  next.focus();
  next.scrollIntoView?.({ block: "center", behavior: "smooth" });
  return true;
}
