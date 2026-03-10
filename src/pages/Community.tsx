import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCommunity } from "@/hooks/useCommunity";
import { FamTripsSection } from "@/components/community/FamTripsSection";
import { OnlineMeetingsSection } from "@/components/community/OnlineMeetingsSection";
import { InPersonEventsSection } from "@/components/community/InPersonEventsSection";
import { WorkshopsSection } from "@/components/community/WorkshopsSection";
import { PaidTrainingsSection } from "@/components/community/PaidTrainingsSection";
import { WhatsAppSection } from "@/components/community/WhatsAppSection";
import { HighlightsSection } from "@/components/community/HighlightsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

export default function Community() {
  const {
    famTrips,
    upcomingMeetings,
    pastMeetings,
    inPersonEvents,
    workshops,
    getWorkshopsByCategory,
    paidTrainings,
    whatsappCommunity,
    highlights,
    currentPrize,
    hasVoted,
    vote,
    isVoting,
    currentMonth,
    currentYear,
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
          <Skeleton className="h-48" />
          <div className="grid gap-4 md:grid-cols-2">
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
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Comunidade
          </h1>
          <p className="text-muted-foreground mt-1">
            Conecte-se, aprenda e cresça com a nossa comunidade de agentes de viagem
          </p>
        </div>

        {/* 1. Fam Trips & Exclusive Opportunities */}
        <FamTripsSection trips={famTrips} />

        {/* 2. Online Weekly Meetings */}
        <OnlineMeetingsSection upcoming={upcomingMeetings} past={pastMeetings} />

        {/* 3. In-Person Monthly Events */}
        <InPersonEventsSection events={inPersonEvents} />

        {/* 4. Professional Workshops */}
        <WorkshopsSection
          workshops={workshops}
          getWorkshopsByCategory={getWorkshopsByCategory}
        />

        {/* 5. Paid Training Opportunities */}
        <PaidTrainingsSection trainings={paidTrainings} />

        {/* 6. WhatsApp Community */}
        <WhatsAppSection community={whatsappCommunity} />

        {/* 7. Monthly Highlights & Prizes */}
        <HighlightsSection
          highlights={highlights}
          prize={currentPrize}
          currentMonth={currentMonth}
          currentYear={currentYear}
          hasVoted={hasVoted}
          onVote={vote}
          isVoting={isVoting}
        />
      </div>
    </DashboardLayout>
  );
}
