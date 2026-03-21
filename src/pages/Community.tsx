import { useState, useRef, useCallback } from "react";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCommunity } from "@/hooks/useCommunity";
import { useCommunityMembership } from "@/hooks/useCommunityMembership";
import { useCommunityFeed } from "@/hooks/useCommunityFeed";
import { CommunityGate } from "@/components/community/CommunityGate";
import { CommunityFeedSection } from "@/components/community/CommunityFeedSection";
import { CommunityLeftSidebar } from "@/components/community/CommunityLeftSidebar";
import { CommunityRightSidebar } from "@/components/community/CommunityRightSidebar";
import { MemberDirectory } from "@/components/community/MemberDirectory";
import { MemberProfileDialog } from "@/components/community/MemberProfileDialog";
import { FamTripsSection } from "@/components/community/FamTripsSection";
import { OnlineMeetingsSection } from "@/components/community/OnlineMeetingsSection";
import { InPersonEventsSection } from "@/components/community/InPersonEventsSection";
import { WorkshopsSection } from "@/components/community/WorkshopsSection";
import { PaidTrainingsSection } from "@/components/community/PaidTrainingsSection";
import { WhatsAppSection } from "@/components/community/WhatsAppSection";
import { HighlightsSection } from "@/components/community/HighlightsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ShieldX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CommunityMember } from "@/types/community-members";

export default function Community() {
  return (
    <SubscriptionGuard feature="community">
      <CommunityContent />
    </SubscriptionGuard>
  );
}

function CommunityContent() {
  const isMobile = useIsMobile();
  const { membership, isLoading: memberLoading, isMember, isBlocked, join, isJoining } =
    useCommunityMembership();
  const {
    famTrips, upcomingMeetings, pastMeetings, inPersonEvents,
    workshops, getWorkshopsByCategory, paidTrainings,
    whatsappCommunity, highlights, currentPrize,
    hasVoted, vote, isVoting, currentMonth, currentYear, isLoading,
  } = useCommunity();
  const { posts } = useCommunityFeed();

  const [activeSection, setActiveSection] = useState("feed");
  const [filterSpecialty, setFilterSpecialty] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);
  const opportunitiesRef = useRef<HTMLDivElement>(null);

  // Members query for right sidebar
  const { data: members = [] } = useQuery({
    queryKey: ["community-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*")
        .in("status", ["approved_unverified", "verified"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, agency_name, city, state")
        .in("user_id", userIds);
      return data.map((m: any) => ({
        ...m,
        profile: profiles?.find((p: any) => p.user_id === m.user_id),
      })) as CommunityMember[];
    },
  });

  const handleNavigate = useCallback((section: string) => {
    setActiveSection(section);
    const refs: Record<string, React.RefObject<HTMLDivElement>> = {
      feed: feedRef,
      members: membersRef,
      content: contentRef,
      events: eventsRef,
      opportunities: opportunitiesRef,
    };
    const ref = refs[section];
    ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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

  if (!isMember) {
    return (
      <DashboardLayout>
        <CommunityGate onJoin={join} isJoining={isJoining} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          pageKey="comunidade"
          title="Travel Experts"
          subtitle="Conecte-se, aprenda e cresça com a nossa comunidade"
          icon={Users}
          adminTab="community"
        />

        {/* 3-column layout */}
        <div className="flex gap-6">
          {/* Left Sidebar - hidden on mobile */}
          {!isMobile && (
            <aside className="w-[240px] shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin">
              <CommunityLeftSidebar
                membership={membership as CommunityMember}
                activeSection={activeSection}
                onNavigate={handleNavigate}
                filterSpecialty={filterSpecialty}
                onFilterSpecialty={setFilterSpecialty}
              />
            </aside>
          )}

          {/* Central Feed */}
          <main className="flex-1 min-w-0 space-y-8">
            <div ref={feedRef}>
              <CommunityFeedSection
                famTrips={famTrips}
                events={inPersonEvents}
              />
            </div>

            {/* Members Section */}
            <div ref={membersRef} className="scroll-mt-20">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Membros da Comunidade
              </h2>
              <MemberDirectory />
            </div>

            {/* Content Section */}
            <div ref={contentRef} className="scroll-mt-20 space-y-8">
              <FamTripsSection trips={famTrips} />
              <OnlineMeetingsSection upcoming={upcomingMeetings} past={pastMeetings} />
              <PaidTrainingsSection trainings={paidTrainings} />
              <WhatsAppSection community={whatsappCommunity} />
            </div>

            {/* Events Section */}
            <div ref={eventsRef} className="scroll-mt-20 space-y-8">
              <InPersonEventsSection events={inPersonEvents} />
              <WorkshopsSection
                workshops={workshops}
                getWorkshopsByCategory={getWorkshopsByCategory}
              />
            </div>

            {/* Opportunities / Highlights */}
            <div ref={opportunitiesRef} className="scroll-mt-20">
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
          </main>

          {/* Right Sidebar - hidden on mobile */}
          {!isMobile && (
            <aside className="w-[260px] shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin">
              <CommunityRightSidebar
                members={members}
                highlights={highlights}
                events={inPersonEvents}
                posts={posts}
                onMemberClick={setSelectedMember}
              />
            </aside>
          )}
        </div>
      </div>

      <MemberProfileDialog
        member={selectedMember}
        open={!!selectedMember}
        onOpenChange={(open) => !open && setSelectedMember(null)}
      />
    </DashboardLayout>
  );
}
