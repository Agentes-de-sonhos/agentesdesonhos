import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCommunity } from "@/hooks/useCommunity";
import { useCommunityMembership } from "@/hooks/useCommunityMembership";
import { CommunityGate } from "@/components/community/CommunityGate";
import { CommunityFeedSection } from "@/components/community/CommunityFeedSection";
import { MemberDirectory } from "@/components/community/MemberDirectory";
import { FamTripsSection } from "@/components/community/FamTripsSection";
import { OnlineMeetingsSection } from "@/components/community/OnlineMeetingsSection";
import { InPersonEventsSection } from "@/components/community/InPersonEventsSection";
import { WorkshopsSection } from "@/components/community/WorkshopsSection";
import { PaidTrainingsSection } from "@/components/community/PaidTrainingsSection";
import { WhatsAppSection } from "@/components/community/WhatsAppSection";
import { HighlightsSection } from "@/components/community/HighlightsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageSquare, UserCheck, Compass, ShieldX } from "lucide-react";

export default function Community() {
  return (
    <SubscriptionGuard feature="community">
      <CommunityContent />
    </SubscriptionGuard>
  );
}

function CommunityContent() {
  const { membership, isLoading: memberLoading, isMember, isBlocked, join, isJoining } =
    useCommunityMembership();

  const {
    famTrips, upcomingMeetings, pastMeetings, inPersonEvents,
    workshops, getWorkshopsByCategory, paidTrainings,
    whatsappCommunity, highlights, currentPrize,
    hasVoted, vote, isVoting, currentMonth, currentYear, isLoading,
  } = useCommunity();

  if (memberLoading || isLoading) {
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

  // Blocked user
  if (isBlocked) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center py-20 space-y-4">
          <ShieldX className="h-16 w-16 mx-auto text-destructive/60" />
          <h2 className="text-xl font-bold text-foreground">Acesso revisado</h2>
          <p className="text-muted-foreground">
            Seu acesso à comunidade foi revisado e não atende aos critérios atuais.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Gate for non-members
  if (!isMember) {
    return (
      <DashboardLayout>
        <CommunityGate onJoin={join} isJoining={isJoining} />
      </DashboardLayout>
    );
  }

  // Full community access
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          pageKey="comunidade"
          title="Travel Experts"
          subtitle="Conecte-se, aprenda e cresça com a nossa comunidade de agentes de viagem"
          icon={Users}
          adminTab="community"
        />

        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="feed" className="gap-1.5">
              <MessageSquare className="h-4 w-4" /> Feed
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5">
              <UserCheck className="h-4 w-4" /> Membros
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5">
              <Compass className="h-4 w-4" /> Conteúdos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-6">
            <CommunityFeedSection />
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <MemberDirectory />
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            <div className="space-y-8">
              <FamTripsSection trips={famTrips} />
              <OnlineMeetingsSection upcoming={upcomingMeetings} past={pastMeetings} />
              <InPersonEventsSection events={inPersonEvents} />
              <WorkshopsSection
                workshops={workshops}
                getWorkshopsByCategory={getWorkshopsByCategory}
              />
              <PaidTrainingsSection trainings={paidTrainings} />
              <WhatsAppSection community={whatsappCommunity} />
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
