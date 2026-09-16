import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  demoScenarioForHost,
  markTriggeredToday,
  saoPauloToday,
  shouldTriggerToday,
} from "@/lib/demoDates";

/**
 * Etapa 3 — mantém as datas do cenário demonstrativo sempre próximas de hoje.
 *
 * Roda no máximo uma vez por dia por origem (site público e gestão compartilham
 * o mesmo controle) e apenas em hosts técnicos de demonstração. A autorização e
 * a regra definitiva de uma vez por dia ficam no servidor; aqui evitamos
 * chamadas repetidas e qualquer loop de atualização.
 */
export function DemoDatesRefresher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const slug = demoScenarioForHost(window.location.hostname);
    if (!slug) return;
    const today = saoPauloToday();
    if (!shouldTriggerToday(window.localStorage, slug, today)) return;
    // Marca antes de chamar: mesmo com erro, não insistimos no mesmo dia.
    markTriggeredToday(window.localStorage, slug, today);

    let active = true;
    void supabase.functions
      .invoke("demo-dates", { body: { slug, hostname: window.location.hostname } })
      .then(({ data }) => {
        if (!active) return;
        if ((data as { shifted?: boolean } | null)?.shifted) {
          // Recarrega os dados já em tela uma única vez, sem novo disparo.
          void queryClient.invalidateQueries();
        }
      })
      .catch(() => {
        /* cenário de demonstração: falha silenciosa, sem afetar a navegação */
      });

    return () => {
      active = false;
    };
  }, [queryClient]);

  return null;
}

export default DemoDatesRefresher;
