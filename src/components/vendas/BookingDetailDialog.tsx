import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useBookingDetail, BOOKING_STATUSES } from "@/hooks/useBookings";
import { ServicesList } from "./ServicesList";
import { PaymentsList } from "./PaymentsList";
import { CommissionsList } from "./CommissionsList";

interface Props {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingDetailDialog({ bookingId, open, onOpenChange }: Props) {
  const {
    booking, services, payments, commissions, isLoading,
    addService, deleteService, addPayment, updatePayment, addCommission, updateCommission,
  } = useBookingDetail(bookingId);

  if (!open) return null;

  const totalPaid = payments.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);
  const totalCommReceived = commissions.filter((c) => c.status === "recebido").reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalCommExpected = commissions.reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalCost = services.reduce((s, sv) => s + Number(sv.cost_price), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                {booking?.trip_name}
                <Badge>{BOOKING_STATUSES[booking?.status ?? ""] || booking?.status}</Badge>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : booking ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Valor Total</p>
                <p className="text-lg font-bold text-primary">R$ {Number(booking.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Recebido</p>
                <p className="text-lg font-bold text-green-600">R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Custos</p>
                <p className="text-lg font-bold text-red-600">R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Comissões</p>
                <p className="text-lg font-bold">R$ {totalCommReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} / {totalCommExpected.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Cliente: <strong>{booking.client?.name || "Não vinculado"}</strong>
              {booking.start_date && <> • Início: {booking.start_date}</>}
              {booking.end_date && <> • Fim: {booking.end_date}</>}
            </div>

            <Tabs defaultValue="servicos" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="servicos">Serviços ({services.length})</TabsTrigger>
                <TabsTrigger value="pagamentos">Pagamentos ({payments.length})</TabsTrigger>
                <TabsTrigger value="comissoes">Comissões ({commissions.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="servicos">
                <ServicesList
                  bookingId={bookingId}
                  services={services}
                  onAdd={(v) => addService.mutate(v)}
                  onDelete={(id) => deleteService.mutate(id)}
                  isAdding={addService.isPending}
                />
              </TabsContent>

              <TabsContent value="pagamentos">
                <PaymentsList
                  bookingId={bookingId}
                  payments={payments}
                  onAdd={(v) => addPayment.mutate(v)}
                  onUpdate={(v) => updatePayment.mutate(v)}
                  isAdding={addPayment.isPending}
                />
              </TabsContent>

              <TabsContent value="comissoes">
                <CommissionsList
                  services={services}
                  commissions={commissions}
                  onAdd={(v) => addCommission.mutate(v)}
                  onUpdate={(v) => updateCommission.mutate(v)}
                  isAdding={addCommission.isPending}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
