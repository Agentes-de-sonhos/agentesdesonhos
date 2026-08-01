import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isDirectoryDetailPath } from "@/lib/directoryNavigation";

/**
 * Correção global do Mapa do Turismo: ao ENTRAR em qualquer rota de perfil
 * comercial, a página sempre começa no topo. Ao voltar para as listagens
 * (/mapa-turismo e /mapa-turismo/cruzeiros) nada é tocado, preservando a
 * restauração de filtros, URL e posição de rolagem já aprovada.
 */
export function DirectoryDetailScrollTop() {
  const { pathname } = useLocation();
  const previous = useRef<string | null>(null);

  useLayoutEffect(() => {
    const changed = previous.current !== pathname;
    previous.current = pathname;
    if (!changed) return;
    if (!isDirectoryDetailPath(pathname)) return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}