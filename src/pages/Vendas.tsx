import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Briefcase, Loader2 } from "lucide-react";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { BookingList } from "@/components/vendas/BookingList";
import { BookingFormDialog } from "@/components/vendas/BookingFormDialog";
import { BookingDetailDialog } from "@/components/vendas/BookingDetailDialog";
import { useBookings } from "@/hooks/useBookings";

export default function Vendas() {
  const { bookings, isLoading, createBooking, updateBooking, deleteBooking } = useBookings();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
              onNew={() => setShowCreate(true)}
              onSelect={(id) => setSelectedId(id)}
              onDelete={(id) => deleteBooking.mutate(id)}
            />
          )}

          <BookingFormDialog
            open={showCreate}
            onOpenChange={setShowCreate}
            onSubmit={(values) => {
              createBooking.mutate(values, { onSuccess: () => setShowCreate(false) });
            }}
            isLoading={createBooking.isPending}
          />

          {selectedId && (
            <BookingDetailDialog
              bookingId={selectedId}
              open={!!selectedId}
              onOpenChange={(open) => { if (!open) setSelectedId(null); }}
            />
          )}
        </div>
      </DashboardLayout>
    </SubscriptionGuard>
  );
}
