import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface KanbanMaximizeValue {
  isMaximized: boolean;
  toggle: () => void;
  exit: () => void;
}

const KanbanMaximizeContext = createContext<KanbanMaximizeValue>({
  isMaximized: false,
  toggle: () => {},
  exit: () => {},
});

/**
 * Modo "maximizar" compartilhado pelos funis (Oportunidades e Operações).
 * A área maximizada começa na linha das abas — o provider é montado em volta
 * do bloco de abas, e os funis apenas acionam o toggle.
 * Não usa a Fullscreen API do navegador (ocultaria elementos necessários).
 */
export function KanbanMaximizeProvider({ children }: { children: React.ReactNode }) {
  const [isMaximized, setIsMaximized] = useState(false);

  const toggle = useCallback(() => setIsMaximized((v) => !v), []);
  const exit = useCallback(() => setIsMaximized(false), []);

  // Esc sai do modo maximizado
  useEffect(() => {
    if (!isMaximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMaximized(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMaximized]);

  // Evita rolagem dupla do body enquanto maximizado
  useEffect(() => {
    if (!isMaximized) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMaximized]);

  const value = useMemo(() => ({ isMaximized, toggle, exit }), [isMaximized, toggle, exit]);

  return (
    <KanbanMaximizeContext.Provider value={value}>{children}</KanbanMaximizeContext.Provider>
  );
}

export function useKanbanMaximize() {
  return useContext(KanbanMaximizeContext);
}
