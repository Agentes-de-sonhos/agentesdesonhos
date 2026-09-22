import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";

/** Aviso interno de um pedido de reserva confirmado no orçamento público. */
export interface BookingRequestAlert {
  id: string;
  client_name: string;
  protocol: string | null;
  destination: string | null;
  opportunity_id: string | null;
  created_at: string;
}

/**
 * Normaliza a linha do Realtime. Apenas o que o aviso exibe — sem telefone,
 * e-mail, valores ou observações do viajante circulando no pop-up.
 */
export function toBookingRequestAlert(
  row: Record<string, unknown> | null | undefined,
): BookingRequestAlert | null {
  if (!row || typeof row.id !== "string") return null;
  return {
    id: row.id,
    client_name: typeof row.client_name === "string" ? row.client_name : "Cliente",
    protocol: typeof row.protocol === "string" ? row.protocol : null,
    destination: typeof row.destination === "string" ? row.destination : null,
    opportunity_id: typeof row.opportunity_id === "string" ? row.opportunity_id : null,
    created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
  };
}

/** Deep link da ficha do pedido; sem ficha, cai na Central de Reservas. */
export function bookingRequestDeepLink(
  travelFileId: string | null | undefined,
  opportunityId?: string | null,
): string {
  if (travelFileId) return `/reservas/${travelFileId}`;
  if (opportunityId) return `/crm?opportunity=${opportunityId}`;
  return "/reservas";
}

/** Resolve a ficha do pedido pelo RPC isolado por agência. */
export async function fetchBookingRequestFile(requestId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("booking_request_file_link" as any, {
    p_request_id: requestId,
  });
  if (error) return null;
  const row = Array.isArray(data) ? (data[0] as any) : (data as any);
  return (row?.travel_file_id as string | undefined) ?? null;
}

/**
 * Assina os pedidos de reserva da PRÓPRIA agência (filtro estrito por
 * agency_id, reforçado pela RLS) e mantém uma fila sem repetição: reconexão,
 * refetch ou segunda inscrição não duplicam o pop-up. A Central de Reservas é
 * atualizada sozinha, com dedupe por id feito pelas próprias queries.
 */
export function useBookingRequestAlerts() {
  const { agencyOwnerId } = useAgencyOwnerId();
  const qc = useQueryClient();
  const [queue, setQueue] = useState<BookingRequestAlert[]>([]);
  const seenRef = useRef<Set<string>>(new Set());

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);

  useEffect(() => {
    if (!agencyOwnerId) return;
    seenRef.current = new Set();
    const channel = supabase
      .channel(`quote-booking-requests:${agencyOwnerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quote_booking_requests",
          filter: `agency_id=eq.${agencyOwnerId}`,
        },
        (payload) => {
          const alert = toBookingRequestAlert(payload.new as Record<string, unknown>);
          if (!alert) return;
          if (seenRef.current.has(alert.id)) return;
          seenRef.current.add(alert.id);
          setQueue((q) => (q.some((item) => item.id === alert.id) ? q : [...q, alert]));
          qc.invalidateQueries({ queryKey: ["travel-files"] });
          qc.invalidateQueries({ queryKey: ["booking-requests"] });
          qc.invalidateQueries({ queryKey: ["opportunities"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agencyOwnerId, qc]);

  return { current: queue[0] ?? null, pending: Math.max(0, queue.length - 1), dismiss };
}
