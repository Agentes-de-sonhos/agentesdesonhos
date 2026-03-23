import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Briefcase, Loader2 } from "lucide-react";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { BookingList } from "@/components/vendas/BookingList";
import { BookingFormDialog } from "@/components/vendas/BookingFormDialog";
import { BookingDetail } from "@/components/vendas/BookingDetail";
import { useBookings } from "@/hooks/useBookings";

export default function Vendas() {
  const { bookings, isLoading, paymentsByBooking, commissionsByBooking, createBooking, updateBooking, deleteBooking } = useBookings();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return (
      <SubscriptionGuard feature="financial">
        <DashboardLayout>
          <BookingDetail
            bookingId={selectedId}
            onBack={() => setSelectedId(null)}
          />
        </DashboardLayout>
      </SubscriptionGuard>
    );
  }

  return (
    <SubscriptionGuard feature="financial">
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeader
            pageKey="vendas"
            title="Financeiro & Vendas"
            subtitle="Gerencie vendas, serviços, recebimentos e comissões"
            icon={Briefcase}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <BookingList
              bookings={bookings}
              paymentsByBooking={paymentsByBooking}
              commissionsByBooking={commissionsByBooking}
              onNew={() => setShowCreate(true)}
              onSelect={(id) => setSelectedId(id)}
              onDelete={(id) => deleteBooking.mutate(id)}
            />
          )}

          <BookingFormDialog
            open={showCreate}
            onOpenChange={setShowCreate}
            onSubmit={(values) => {
              createBooking.mutate(values, {
                onSuccess: (data) => {
                  setShowCreate(false);
                  if (data?.id) setSelectedId(data.id);
                },
              });
            }}
            isLoading={createBooking.isPending}
          />
        </div>
      </DashboardLayout>
    </SubscriptionGuard>
  );
}
