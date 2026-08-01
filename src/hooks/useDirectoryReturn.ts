import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  consumeDirectoryScrollRestore,
  markDirectoryScrollRestore,
  resolveDirectoryReturn,
  type DirectoryReturn,
} from "@/lib/directoryNavigation";

interface UseDirectoryReturnOptions {
  /** Categoria real do fornecedor — usada como fallback em acesso direto. */
  category?: string | null;
  /** Caminho fixo de fallback (ex.: listagem de cruzeiros). */
  fallbackPath?: string;
}

/**
 * Hook compartilhado por todas as páginas de detalhe do Mapa do Turismo.
 * Garante que "Voltar ao diretório" volte para a categoria/filtros de origem.
 */
export function useDirectoryReturn({ category, fallbackPath }: UseDirectoryReturnOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  const target: DirectoryReturn = resolveDirectoryReturn(location.state, {
    category,
    path: fallbackPath,
  });

  const goBackToDirectory = useCallback(() => {
    markDirectoryScrollRestore(target.scrollY);
    navigate(target.path);
  }, [navigate, target.path, target.scrollY]);

  return { goBackToDirectory, returnPath: target.path };
}

/** Restaura a posição de rolagem no diretório após o retorno de um perfil. */
export function useDirectoryScrollRestore(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const scrollY = consumeDirectoryScrollRestore();
    if (scrollY == null) return;
    const id = window.setTimeout(() => window.scrollTo({ top: scrollY, behavior: "auto" }), 60);
    return () => window.clearTimeout(id);
  }, [ready]);
}
