import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCommunity } from "@/hooks/useCommunity";
import { useCommunityMembership } from "@/hooks/useCommunityMembership";
import { CommunityFeedSection } from "@/components/community/CommunityFeedSection";
import { CommunityLeftSidebar } from "@/components/community/CommunityLeftSidebar";
import { MemberDirectory } from "@/components/community/MemberDirectory";
import { MemberProfileDialog } from "@/components/community/MemberProfileDialog";
import { FamTripsSection } from "@/components/community/FamTripsSection";
import { OnlineMeetingsSection } from "@/components/community/OnlineMeetingsSection";
import { InPersonEventsSection } from "@/components/community/InPersonEventsSection";
import { WorkshopsSection } from "@/components/community/WorkshopsSection";
import { PaidTrainingsSection } from "@/components/community/PaidTrainingsSection";
import { WhatsAppSection } from "@/components/community/WhatsAppSection";
import { HighlightsSection } from "@/components/community/HighlightsSection";
import { EditCommunityProfileDialog } from "@/components/community/EditCommunityProfileDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ShieldX } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CommunityMember } from "@/types/community-members";

export default function Community() {
  return <CommunityContent />;
}

function CommunityContent() {
  const isMobile = useIsMobile();
  const { membership, isLoading: memberLoading, isBlocked, updateProfile, isUpdating } =
    useCommunityMembership();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("feed");
  const {
    famTrips, upcomingMeetings, pastMeetings, inPersonEvents,
    workshops, getWorkshopsByCategory, paidTrainings,
    whatsappCommunity, highlights, currentPrize,
    hasVoted, vote, isVoting, currentMonth, currentYear, isLoading,
  } = useCommunity(activeSection);
  const [filterSpecialty, setFilterSpecialty] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);

  const handleNavigate = useCallback((section: string) => {
    setActiveSection(section);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          pageKey="comunidade"
          title="Comunidade"
          subtitle="A comunidade dos agentes de viagens — compartilhe dúvidas, experiências, dicas e oportunidades."
          icon={Users}
          adminTab="community"
        />

        {/* 2-column layout (left sidebar + main feed) */}
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
                onEditProfile={() => setEditProfileOpen(true)}
              />
            </aside>
          )}

          {/* Central Content */}
          <main className="flex-1 min-w-0 max-w-4xl mx-auto w-full">
            {activeSection === "feed" && (
              <CommunityFeedSection famTrips={famTrips} events={inPersonEvents} />
            )}

            {activeSection === "members" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Membros da Comunidade
                </h2>
                <MemberDirectory />
              </div>
            )}

            {activeSection === "content" && (
              <div className="space-y-8">
                <OnlineMeetingsSection upcoming={upcomingMeetings} past={pastMeetings} />
                <PaidTrainingsSection trainings={paidTrainings} />
                <WhatsAppSection community={whatsappCommunity} />
              </div>
            )}

            {activeSection === "events" && (
              <div className="space-y-8">
                <InPersonEventsSection events={inPersonEvents} />
                <WorkshopsSection workshops={workshops} getWorkshopsByCategory={getWorkshopsByCategory} />
              </div>
            )}

            {activeSection === "opportunities" && (
              <div className="space-y-8">
                <FamTripsSection trips={famTrips} />
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
            )}
          </main>
        </div>
      </div>

      <MemberProfileDialog
        member={selectedMember}
        open={!!selectedMember}
        onOpenChange={(open) => !open && setSelectedMember(null)}
      />

      <EditCommunityProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        membership={membership as CommunityMember}
        onSave={updateProfile}
        isSaving={isUpdating}
      />
    </DashboardLayout>
  );
}
