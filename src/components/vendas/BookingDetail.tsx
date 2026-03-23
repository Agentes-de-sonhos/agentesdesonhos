import { useMemo } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookingDetail } from "@/hooks/useBookings";
import { BookingHeader } from "./BookingHeader";
import { BookingFinancialSummary } from "./BookingFinancialSummary";
import { ServicesList } from "./ServicesList";
import { PaymentsList } from "./PaymentsList";
import { CommissionsList } from "./CommissionsList";
import { BookingDocuments } from "./BookingDocuments";

interface Props {
  bookingId: string;
  onBack: () => void;
}

export function BookingDetail({ bookingId, onBack }: Props) {
  const detail = useBookingDetail(bookingId);
  const { booking, services, payments, commissions, documents, isLoading } = detail;

  const summary = useMemo(() => {
    const totalSold = services.reduce((s, sv) => s + Number(sv.sale_price), 0);
    const totalCost = services.reduce((s, sv) => s + Number(sv.cost_price), 0);
    const totalCommission = commissions.reduce((s, c) => s + Number(c.commission_amount), 0);
    const commissionReceived = commissions.filter((c) => c.status === "recebido").reduce((s, c) => s + Number(c.commission_amount), 0);
    const totalPaid = payments.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);
    const totalPayments = payments.reduce((s, p) => s + Number(p.amount), 0);
    const profit = totalSold - totalCost;
    return { totalSold, totalCost, totalCommission, commissionReceived, totalPaid, totalPayments, profit };
  }, [services, payments, commissions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para vendas
      </Button>

      {/* 1. Header */}
      <BookingHeader booking={booking} />

      {/* 2. Financial Summary */}
      <BookingFinancialSummary summary={summary} />

      {/* 3. Services */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-primary" />
          Serviços
        </h2>
        <ServicesList
          bookingId={bookingId}
          services={services}
          onAdd={(v) => detail.addService.mutate(v)}
          onUpdate={(v) => detail.updateService.mutate(v)}
          onDelete={(id) => detail.deleteService.mutate(id)}
          onDuplicate={(svc) => {
            detail.addService.mutate({
              booking_id: svc.booking_id,
              service_type: svc.service_type,
              supplier_id: svc.supplier_id,
              description: svc.description,
              sale_price: svc.sale_price,
              cost_price: svc.cost_price,
              expected_commission: svc.expected_commission,
              expected_commission_date: svc.expected_commission_date,
              status: svc.status,
            });
          }}
          isAdding={detail.addService.isPending}
        />
      </section>

      {/* 4. Payments */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-emerald-500" />
          Pagamentos do Cliente
        </h2>
        <PaymentsList
          bookingId={bookingId}
          payments={payments}
          onAdd={(v) => detail.addPayment.mutate(v)}
          onUpdate={(v) => detail.updatePayment.mutate(v)}
          onDelete={(id) => detail.deletePayment.mutate(id)}
          isAdding={detail.addPayment.isPending}
        />
      </section>

      {/* 5. Commissions */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-violet-500" />
          Comissões
        </h2>
        <CommissionsList
          services={services}
          commissions={commissions}
          onAdd={(v) => detail.addCommission.mutate(v)}
          onUpdate={(v) => detail.updateCommission.mutate(v)}
          isAdding={detail.addCommission.isPending}
        />
      </section>

      {/* 6. Documents */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-amber-500" />
          Documentos
        </h2>
        <BookingDocuments bookingId={bookingId} documents={documents} booking={booking} services={services} payments={payments} />
      </section>
    </div>
  );
}
