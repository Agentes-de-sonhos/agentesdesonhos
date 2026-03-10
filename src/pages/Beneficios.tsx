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
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Tag className="h-8 w-8 text-primary" />
            Benefícios e Descontos
          </h1>
          <p className="text-muted-foreground mt-1">
            Aproveite oportunidades exclusivas, workshops e treinamentos com condições especiais
          </p>
        </div>

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
