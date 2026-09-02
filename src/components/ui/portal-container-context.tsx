import * as React from "react";

/**
 * Contexto genérico para definir o container dos Portals do Radix.
 *
 * Por padrão é `null`, o que faz os componentes manterem o comportamento
 * original (portal em document.body). Superfícies em fullscreen/maximizadas
 * podem fornecer seu próprio elemento para que os overlays continuem visíveis
 * dentro do mesmo contexto visual.
 */
const PortalContainerContext = React.createContext<HTMLElement | null>(null);

export function PortalContainerProvider({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: React.ReactNode;
}) {
  return (
    <PortalContainerContext.Provider value={container ?? null}>
      {children}
    </PortalContainerContext.Provider>
  );
}

/** Retorna o container atual ou `undefined` (Radix então usa document.body). */
export function usePortalContainer(): HTMLElement | undefined {
  return React.useContext(PortalContainerContext) ?? undefined;
}
