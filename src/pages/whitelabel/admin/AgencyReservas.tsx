import { Ticket } from "lucide-react";
import { ReservasTab } from "@/components/reservas/ReservasTab";
import { useBookingRequestCapability } from "@/hooks/useBookingRequestCapability";

/**
 * Página administrativa própria de Reservas no painel white label.
 * Reutiliza integralmente a listagem existente (`ReservasTab`) — nenhuma
 * regra, status ou consulta é alterada nesta etapa.
 */
export default function AgencyReservas() {
  const { canUseBookingRequests, loading } = useBookingRequestCapability();

  return (
    <div className="w-full min-w-0 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Ticket className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Reservas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Acompanhe as solicitações de reserva recebidas dos seus clientes.
          </p>
        </div>
      </div>

      {!loading && !canUseBookingRequests ? (
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            Solicitações de reserva não estão disponíveis
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Este recurso não está habilitado para o seu acesso atual.
          </p>
        </div>
      ) : (
        <ReservasTab />
      )}
    </div>
  );
}
