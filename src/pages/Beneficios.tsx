import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBenefits } from "@/hooks/useBenefits";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { BenefitSearchBar } from "@/components/benefits/BenefitSearchBar";
import { BenefitFilters } from "@/components/benefits/BenefitFilters";
import { BenefitCard } from "@/components/benefits/BenefitCard";
import { BenefitDetailDialog } from "@/components/benefits/BenefitDetailDialog";
import { ShareBenefitDialog } from "@/components/benefits/ShareBenefitDialog";
import { BenefitContributorsRanking } from "@/components/benefits/BenefitContributorsRanking";
import { Skeleton } from "@/components/ui/skeleton";
import type { Benefit } from "@/types/benefits";

export default function Beneficios() {
  const {
    benefits, isLoading, userConfirmations,
    createBenefit, isCreating, confirmBenefit,
    useComments, addComment, isAddingComment, ranking,
  } = useBenefits();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [detailBenefit, setDetailBenefit] = useState<Benefit | null>(null);

  // Filter benefits
  const filtered = useMemo(() => {
    let result = benefits;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.company_name.toLowerCase().includes(q) ||
          b.destination?.toLowerCase().includes(q) ||
          b.short_description?.toLowerCase().includes(q) ||
          b.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (selectedCategory) result = result.filter((b) => b.category === selectedCategory);
    if (selectedDestination) result = result.filter((b) => b.destination === selectedDestination);
    return result;
  }, [benefits, search, selectedCategory, selectedDestination]);

  const getUserConfirmationType = (benefitId: string) => {
    const c = userConfirmations.find((uc) => uc.benefit_id === benefitId);
    return c?.confirmation_type || null;
  };

  // Comments for detail dialog
  const commentsQuery = useComments(detailBenefit?.id || null);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            pageKey="beneficios"
            title="Benefícios e Descontos"
            subtitle="Descubra tarifas agente, cortesias e descontos exclusivos oferecidos por empresas do turismo."
            icon={Tag}
          />
          <Button
            onClick={() => setShareOpen(true)}
            size="lg"
            className="shrink-0 mt-1"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar benefício
          </Button>
        </div>

        <BenefitSearchBar value={search} onChange={setSearch} />

        <BenefitFilters
          selectedCategory={selectedCategory}
          selectedDestination={selectedDestination}
          onCategoryChange={setSelectedCategory}
          onDestinationChange={setSelectedDestination}
        />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Cards grid */}
          <div className="flex-1">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg font-medium">Nenhum benefício encontrado</p>
                <p className="text-sm mt-1">Tente ajustar os filtros ou compartilhe um novo benefício!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filtered.map((b) => (
                  <BenefitCard
                    key={b.id}
                    benefit={b}
                    userConfirmationType={getUserConfirmationType(b.id)}
                    onConfirm={(type) => confirmBenefit({ benefitId: b.id, type })}
                    onViewDetails={() => setDetailBenefit(b)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: ranking */}
          <div className="lg:w-72 shrink-0">
            <BenefitContributorsRanking ranking={ranking} />
          </div>
        </div>
      </div>

      <ShareBenefitDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onSubmit={createBenefit}
        isSubmitting={isCreating}
      />

      <BenefitDetailDialog
        benefit={detailBenefit}
        open={!!detailBenefit}
        onClose={() => setDetailBenefit(null)}
        comments={commentsQuery.data || []}
        isLoadingComments={commentsQuery.isLoading}
        onAddComment={(content) => detailBenefit && addComment({ benefitId: detailBenefit.id, content })}
        isAddingComment={isAddingComment}
        userConfirmationType={detailBenefit ? getUserConfirmationType(detailBenefit.id) : null}
        onConfirm={(type) => detailBenefit && confirmBenefit({ benefitId: detailBenefit.id, type })}
      />
    </DashboardLayout>
  );
}
