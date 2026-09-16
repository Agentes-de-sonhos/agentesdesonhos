import { useEffect, useMemo, useState, useCallback } from "react";
import {
  resolveServiceImages,
  buildSyncServiceImages,
  hasPendingGoogleRefs,
  type ResolvedServiceImage,
} from "@/lib/serviceImages";

/**
 * Resolve imagens persistidas de um serviço (Storage + Google Places) e mantém
 * o controle das que falharam no carregamento, garantindo que nunca sobre um
 * ícone de imagem quebrada na tela.
 *
 * Regra de estabilidade: URLs diretas (Storage/externas) e referências do Google
 * já resolvidas na sessão são entregues de forma SINCRONA, no primeiro render.
 * Nenhuma miniatura passa por um estado vazio ("Indisponível") por causa de um
 * simples re-render ou remount — o placeholder de falha só aparece depois de uma
 * tentativa real de resolução concluída sem foto (ou erro de carregamento).
 */
export function useServiceImages(refs: string[] | undefined, placeId?: string | null) {
  const key = useMemo(() => JSON.stringify(refs || []) + "|" + (placeId || ""), [refs, placeId]);

  // Snapshot síncrono: o que já é conhecido sem nenhuma chamada de rede.
  const sync = useMemo(
    () => buildSyncServiceImages(refs || [], placeId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const pendingAsync = useMemo(
    () => hasPendingGoogleRefs(refs || [], placeId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const [resolved, setResolved] = useState<{ key: string; items: ResolvedServiceImage[] } | null>(null);
  const [failedByKey, setFailedByKey] = useState<{ key: string; refs: Set<string> }>({ key, refs: new Set() });

  const isResolved = resolved?.key === key;
  const items = isResolved ? resolved!.items : sync;
  const loading = !isResolved && pendingAsync;

  useEffect(() => {
    if (!pendingAsync) {
      // Nada a resolver: o snapshot síncrono já é o resultado final.
      setResolved({ key, items: sync });
      return;
    }
    let alive = true;
    resolveServiceImages((refs || []).filter(Boolean), placeId)
      .then((res) => { if (alive) setResolved({ key, items: res }); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const failed = failedByKey.key === key ? failedByKey.refs : EMPTY_SET;

  const markFailed = useCallback((ref: string) => {
    setFailedByKey((prev) => {
      const base = prev.key === key ? prev.refs : new Set<string>();
      if (base.has(ref)) return prev.key === key ? prev : { key, refs: base };
      const next = new Set(base);
      next.add(ref);
      console.warn("[useServiceImages] imagem indisponível", ref.slice(0, 80));
      return { key, refs: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const usable = useMemo(
    () => items.filter((i) => !!i.src && !failed.has(i.ref)),
    [items, failed],
  );

  const hasGoogleImage = usable.some((i) => i.origin === "google_places");
  const attributions = useMemo(
    () => Array.from(new Set(usable.flatMap((i) => i.attributions || []))),
    [usable],
  );

  return { items, usable, loading, markFailed, hasGoogleImage, attributions };
}

const EMPTY_SET: Set<string> = new Set();
