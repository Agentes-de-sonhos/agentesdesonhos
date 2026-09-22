import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Aviso interno de uma solicitação recebida pelo site da agência. */
export interface SiteRequestAlert {
  id: string;
  lead_name: string;
  service_label: string | null;
  destination: string | null;
  opportunity_id: string | null;
  created_at: string;
}

/**
 * Normaliza a linha vinda do Realtime. Só os campos exibidos no aviso — nada de
 * telefone, e-mail ou corpo da solicitação circulando na tela de aviso.
 */
export function toSiteRequestAlert(row: Record<string, unknown> | null | undefined): SiteRequestAlert | null {
  if (!row || typeof row.id !== "string") return null;
  return {
    id: row.id,
    lead_name: typeof row.lead_name === "string" ? row.lead_name : "Novo contato",
    service_label:
      typeof row.service_label === "string" && row.service_label
        ? row.service_label
        : typeof row.service_key === "string"
        ? row.service_key
        : null,
    destination: typeof row.destination === "string" ? row.destination : null,
    opportunity_id: typeof row.opportunity_id === "string" ? row.opportunity_id : null,
    created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
  };
}

/** Deep link do funil para uma oportunidade específica. */
export function opportunityDeepLink(opportunityId: string | null): string {
  return opportunityId ? `/crm?opportunity=${opportunityId}` : "/crm";
}

/**
 * Assina as solicitações públicas da PRÓPRIA agência (filtro estrito por
 * agency_user_id, reforçado pela RLS da tabela) e mantém uma fila de avisos sem
 * repetição: reconexão, refetch ou segunda inscrição não duplicam o pop-up.
 */
export function useAgencySiteRequestAlerts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [queue, setQueue] = useState<SiteRequestAlert[]>([]);
  const seenRef = useRef<Set<string>>(new Set());

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);

  useEffect(() => {
    if (!user?.id) return;
    seenRef.current = new Set();
    const channel = supabase
      .channel(`agency-site-requests:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agency_site_requests",
          filter: `agency_user_id=eq.${user.id}`,
        },
        (payload) => {
          const alert = toSiteRequestAlert(payload.new as Record<string, unknown>);
          if (!alert) return;
          if (seenRef.current.has(alert.id)) return;
          seenRef.current.add(alert.id);
          setQueue((q) => (q.some((item) => item.id === alert.id) ? q : [...q, alert]));
          // O funil recarrega sozinho, com dedupe por id feito pela própria query.
          qc.invalidateQueries({ queryKey: ["opportunities"] });
          qc.invalidateQueries({ queryKey: ["clients"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  return { current: queue[0] ?? null, pending: Math.max(0, queue.length - 1), dismiss };
}
