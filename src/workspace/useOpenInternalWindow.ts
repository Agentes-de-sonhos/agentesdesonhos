import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "./WorkspaceProvider";
import { titleForPath } from "./routeTitle";

/**
 * Abre um caminho interno em uma NOVA JANELA DENTRO DO SISTEMA (aba do
 * workspace, até 10 janelas de conteúdo), mantendo a janela atual aberta.
 *
 * Quando o usuário não usa o workspace (preferência desligada ou plano sem o
 * recurso), navega normalmente na mesma janela — sem abrir aba do navegador.
 */
export function useOpenInternalWindow() {
  const workspace = useWorkspace();
  const navigate = useNavigate();

  return useCallback(
    (path: string, title?: string) => {
      if (workspace) {
        workspace.openOrActivateTab(path, title ?? titleForPath(path.split("?")[0]));
        return;
      }
      navigate(path);
    },
    [workspace, navigate],
  );
}
