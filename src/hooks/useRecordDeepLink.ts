import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Phase = "idle" | "fetching" | "failed" | "done";

/** Estado da resolução, sempre escopado ao parâmetro atual. */
interface LinkState {
  param: string | null;
  attempt: number;
  phase: Phase;
}

/**
 * Abre um registro exato vindo de um link direto (ex.: `?sale=<id>` ou
 * `?operation=<id>`) com uma máquina de estado escopada pelo parâmetro:
 *
 * - espera a lista terminar de carregar/atualizar antes da PRIMEIRA decisão;
 * - se o id não estiver na lista (cache velho, outro mês, fora do limite),
 *   busca direto no servidor respeitando as permissões da conta;
 * - mudança de identidade da lista ou oscilação de "carregando" durante a
 *   consulta NÃO cancela nem suprime a tentativa em andamento;
 * - resposta tardia de um parâmetro antigo é descartada e nunca abre nada;
 * - se o registro chegar pela lista durante a consulta, abre UMA única vez;
 * - trocar, limpar ou reabrir o parâmetro reinicia as tentativas (um novo id
 *   sempre começa na tentativa 1);
 * - falha transitória PRESERVA o parâmetro e oferece nova tentativa explícita e
 *   limitada (sem loop); o parâmetro só é removido com resposta definitiva
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
  const { param, listReady, list, fetchById, onOpen, onClear, messages, maxAttempts = 3 } = opts;

  const stateRef = useRef<LinkState>({ param: null, attempt: 0, phase: "idle" });
  const [retryTick, setRetryTick] = useState(0);

  // Refs para callbacks: o efeito não deve reexecutar por identidade de função.
  const cbRef = useRef({ fetchById, onOpen, onClear, messages });
  cbRef.current = { fetchById, onOpen, onClear, messages };

  /* Guarda SÍNCRONA do parâmetro mais recente: atualizada já no render, então
     uma resposta que chega entre o render do novo parâmetro e o efeito seguinte
     também é descartada. */
  const latestParamRef = useRef<string | null>(param);
  latestParamRef.current = param;

  // Desmontagem: nenhum efeito colateral depois que a tela sai.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Troca/limpeza do parâmetro reinicia a máquina de estado.
    if (stateRef.current.param !== param) {
      stateRef.current = { param, attempt: 0, phase: "idle" };
    }
    if (!param) return;

    const state = stateRef.current;
    const { fetchById: doFetch, onOpen: open, onClear: clear, messages: msg } = cbRef.current;

    if (state.phase === "done" || state.phase === "failed") return;

    // Durante a consulta, se o registro aparecer na lista, abrimos uma única vez
    // (a resposta em voo passa a ser ignorada por mudança de fase).
    if (state.phase === "fetching") {
      const arrived = list.find((r) => r.id === param);
      if (arrived) {
        state.phase = "done";
        open(arrived, true);
        clear();
      }
      return;
    }

    // Fase "idle": só decide quando a lista está estável.
    if (!listReady) return;

    const inList = list.find((r) => r.id === param);
    if (inList) {
      state.phase = "done";
      open(inList, true);
      clear();
      return;
    }

    const myParam = param;
    const myAttempt = state.attempt + 1;
    state.attempt = myAttempt;
    state.phase = "fetching";

    void (async () => {
      const { data, error } = await doFetch(myParam);
      const current = stateRef.current;
      // Resposta obsoleta (parâmetro trocado, nova tentativa, ou já resolvido).
      if (current.param !== myParam || current.attempt !== myAttempt || current.phase !== "fetching") {
        return;
      }
      if (error) {
        current.phase = "failed";
        const canRetry = myAttempt < maxAttempts;
        toast.error(
          canRetry ? msg.transient : msg.exhausted,
          canRetry
            ? {
                action: {
                  label: "Tentar novamente",
                  onClick: () => {
                    const st = stateRef.current;
                    if (st.param !== myParam || st.attempt !== myAttempt || st.phase !== "failed") return;
                    st.phase = "idle";
                    setRetryTick((n) => n + 1);
                  },
                },
              }
            : undefined,
        );
        return;
      }
      if (!data) {
        current.phase = "done";
        toast.error(msg.missing);
        clear();
        return;
      }
      current.phase = "done";
      open(data, false);
      clear();
    })();
    // Sem cleanup de cancelamento: a obsolescência é decidida pelo estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param, listReady, list, retryTick, maxAttempts]);
}
