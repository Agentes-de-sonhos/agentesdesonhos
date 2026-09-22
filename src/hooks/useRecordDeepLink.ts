import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Abre um registro exato vindo de um link direto (ex.: `?sale=<id>` ou
 * `?operation=<id>`), sem corrida de cache:
 *
 * - espera a lista terminar de carregar/atualizar antes de decidir;
 * - se o id não estiver na lista (cache velho, outro mês, fora do limite),
 *   busca direto no servidor respeitando as permissões da conta;
 * - cada par "id#tentativa" é consultado UMA única vez;
 * - falha transitória PRESERVA o parâmetro na URL e oferece uma nova tentativa
 *   real e limitada; o parâmetro só é removido com resposta definitiva
 *   (aberto com sucesso, ou inexistente/inacessível).
 */
export function useRecordDeepLink<T extends { id: string }>(opts: {
  param: string | null;
  /** true quando a lista em cache não está carregando nem atualizando. */
  listReady: boolean;
  list: T[];
  fetchById: (id: string) => Promise<{ data: T | null; error: unknown }>;
  onOpen: (record: T, fromList: boolean) => void;
  onClear: () => void;
  messages: { transient: string; exhausted: string; missing: string };
  maxAttempts?: number;
}) {
  const {
    param,
    listReady,
    list,
    fetchById,
    onOpen,
    onClear,
    messages,
    maxAttempts = 3,
  } = opts;

  const [attempt, setAttempt] = useState(0);
  const attemptedRef = useRef<string>("");

  // Refs para callbacks: o efeito não deve reexecutar por identidade de função.
  const cbRef = useRef({ fetchById, onOpen, onClear, messages });
  cbRef.current = { fetchById, onOpen, onClear, messages };

  useEffect(() => {
    if (!param || !listReady) return;
    const attemptKey = `${param}#${attempt}`;
    if (attemptedRef.current === attemptKey) return;
    attemptedRef.current = attemptKey;

    const { fetchById: doFetch, onOpen: open, onClear: clear, messages: msg } = cbRef.current;

    const inList = list.find((r) => r.id === param);
    if (inList) {
      open(inList, true);
      clear();
      return;
    }

    let active = true;
    (async () => {
      const { data, error } = await doFetch(param);
      if (!active) return;
      if (error) {
        const canRetry = attempt + 1 < maxAttempts;
        toast.error(
          canRetry ? msg.transient : msg.exhausted,
          canRetry
            ? { action: { label: "Tentar novamente", onClick: () => setAttempt((n) => n + 1) } }
            : undefined,
        );
        return;
      }
      if (!data) {
        toast.error(msg.missing);
        clear();
        return;
      }
      open(data, false);
      clear();
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param, attempt, listReady, list, maxAttempts]);
}
