import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCommunity } from "@/hooks/useCommunity";
import { FamTripsSection } from "@/components/community/FamTripsSection";
import { WorkshopsSection } from "@/components/community/WorkshopsSection";
import { PaidTrainingsSection } from "@/components/community/PaidTrainingsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "lucide-react";

export default function Beneficios() {
  const {
    famTrips,
    workshops,
    getWorkshopsByCategory,
    paidTrainings,
    isLoading,
  } = useCommunity();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          pageKey="beneficios"
          title="Benefícios e Descontos"
          subtitle="Aproveite oportunidades exclusivas, workshops e treinamentos com condições especiais"
          icon={Tag}
        />

        <FamTripsSection trips={famTrips} />

        <WorkshopsSection
          workshops={workshops}
          getWorkshopsByCategory={getWorkshopsByCategory}
        />

        <PaidTrainingsSection trainings={paidTrainings} />
      </div>
    </DashboardLayout>
  );
}
