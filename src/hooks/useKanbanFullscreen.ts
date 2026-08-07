import { useCallback, useEffect, useState } from "react";

/**
 * Modo "maximizar" para quadros Kanban.
 * Tenta usar a Fullscreen API no documento (mantendo diálogos em portal visíveis);
 * se indisponível, o consumidor aplica o fallback visual fixed/inset-0.
 * Esc sempre sai do modo.
 */
export function useKanbanFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enter = useCallback(async () => {
    setIsFullscreen(true);
    const el = document.documentElement as any;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req && !document.fullscreenElement) {
      try {
        await req.call(el);
      } catch {
        /* fallback visual já aplicado */
      }
    }
  }, []);

  const exit = useCallback(async () => {
    setIsFullscreen(false);
    const doc = document as any;
    const ex = document.exitFullscreen || doc.webkitExitFullscreen;
    if (ex && document.fullscreenElement) {
      try {
        await ex.call(document);
      } catch {
        /* noop */
      }
    }
  }, []);

  const toggle = useCallback(() => {
    if (isFullscreen) void exit();
    else void enter();
  }, [isFullscreen, enter, exit]);

  // Sincroniza quando o usuário sai da tela cheia nativa (Esc / F11)
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Esc no modo fallback (sem Fullscreen API ativa)
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) void exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen, exit]);

  // Evita rolagem dupla do body enquanto maximizado
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  return { isFullscreen, enter, exit, toggle };
}
