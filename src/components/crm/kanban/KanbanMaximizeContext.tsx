import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

interface KanbanMaximizeValue {
  isMaximized: boolean;
  toggle: () => void;
  exit: () => void;
  /** Elemento raiz da área maximizada (usado para a Fullscreen API). */
  registerSurface: (el: HTMLElement | null) => void;
  /** Slot compartilhado da linha de controles (abas + busca + ações). */
  toolbarEl: HTMLElement | null;
  setToolbarEl: (el: HTMLElement | null) => void;
}

const KanbanMaximizeContext = createContext<KanbanMaximizeValue>({
  isMaximized: false,
  toggle: () => {},
  exit: () => {},
  registerSurface: () => {},
  toolbarEl: null,
  setToolbarEl: () => {},
});

/**
 * Modo "maximizar" compartilhado pelos funis (Oportunidades e Operações).
 * Tenta usar a Fullscreen API do navegador a partir do clique do usuário; se
 * indisponível ou negada, mantém o fallback maximizado dentro da janela
 * (position: fixed / inset: 0 / 100dvh) feito por KanbanMaximizeSurface.
 */
export function KanbanMaximizeProvider({ children }: { children: React.ReactNode }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [toolbarEl, setToolbarEl] = useState<HTMLElement | null>(null);
  const surfaceRef = useRef<HTMLElement | null>(null);

  const registerSurface = useCallback((el: HTMLElement | null) => {
    surfaceRef.current = el;
  }, []);

  const requestFullscreen = useCallback(() => {
    const el = surfaceRef.current;
    if (!el || typeof document === "undefined") return;
    if (document.fullscreenElement) return;
    try {
      const p = el.requestFullscreen?.({ navigationUI: "hide" } as FullscreenOptions);
      // Fallback já ativo: apenas ignoramos a rejeição.
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      /* fallback maximizado dentro da janela */
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) return;
    try {
      const p = document.exitFullscreen?.();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      /* noop */
    }
  }, []);

  const toggle = useCallback(() => {
    setIsMaximized((v) => {
      const next = !v;
      // requestAnimationFrame mantém o gesto do usuário e garante que a
      // superfície já esteja montada em tela cheia antes do pedido.
      if (next) requestAnimationFrame(() => requestFullscreen());
      else exitFullscreen();
      return next;
    });
  }, [requestFullscreen, exitFullscreen]);

  const exit = useCallback(() => {
    setIsMaximized(false);
    exitFullscreen();
  }, [exitFullscreen]);

  // Esc sai do modo maximizado (quando não estamos em fullscreen nativo,
  // onde o próprio navegador dispara fullscreenchange)
  useEffect(() => {
    if (!isMaximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) setIsMaximized(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMaximized]);

  // Mantém o estado interno sincronizado com a tela cheia real
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setIsMaximized(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Evita rolagem dupla do body enquanto maximizado
  useEffect(() => {
    if (!isMaximized) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMaximized]);

  const value = useMemo(
    () => ({ isMaximized, toggle, exit, registerSurface, toolbarEl, setToolbarEl }),
    [isMaximized, toggle, exit, registerSurface, toolbarEl]
  );

  return (
    <KanbanMaximizeContext.Provider value={value}>{children}</KanbanMaximizeContext.Provider>
  );
}

export function useKanbanMaximize() {
  return useContext(KanbanMaximizeContext);
}
