import { useEffect, useMemo, useState, useCallback } from "react";
import { resolveServiceImages, isGoogleImageRef, type ResolvedServiceImage } from "@/lib/serviceImages";

/**
 * Resolve imagens persistidas de um serviço (Storage + Google Places) e mantém
 * o controle das que falharam no carregamento, garantindo que nunca sobre um
 * ícone de imagem quebrada na tela.
 */
export function useServiceImages(refs: string[] | undefined, placeId?: string | null) {
  const key = useMemo(() => JSON.stringify(refs || []) + "|" + (placeId || ""), [refs, placeId]);
  const [items, setItems] = useState<ResolvedServiceImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const list = (refs || []).filter(Boolean);
    setFailed(new Set());
    if (list.length === 0) {
      setItems([]);
      return;
    }
    const needsAsync = list.some(isGoogleImageRef);
    if (!needsAsync) {
      setItems(list.map((ref) => ({ ref, src: ref, origin: "uploaded" as const, attributions: [] })));
      return;
    }
    let alive = true;
    setLoading(true);
    resolveServiceImages(list, placeId)
      .then((res) => { if (alive) setItems(res); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const markFailed = useCallback((ref: string) => {
    setFailed((prev) => {
      if (prev.has(ref)) return prev;
      const next = new Set(prev);
      next.add(ref);
      console.warn("[useServiceImages] imagem indisponível", ref.slice(0, 80));
      return next;
    });
  }, []);

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
