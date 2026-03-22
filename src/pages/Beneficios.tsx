import { useState, useMemo, useEffect } from "react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { useDebounce } from "@/hooks/useDebounce";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ComingSoonOverlay } from "@/components/subscription/ComingSoonOverlay";
import { useBenefits } from "@/hooks/useBenefits";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tag, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const debouncedSearch = useDebounce(search, 300);

  // Filter benefits
  const filtered = useMemo(() => {
    let result = benefits;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
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
  }, [benefits, debouncedSearch, selectedCategory, selectedDestination]);

  const { paginatedItems: paginatedBenefits, currentPage, totalPages, totalItems, pageSize, goToPage, resetPage } = usePagination(filtered, { pageSize: 20 });

  // Reset page when filters change
  useEffect(() => { resetPage(); }, [debouncedSearch, selectedCategory, selectedDestination, resetPage]);

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
      <ComingSoonOverlay pageKey="beneficios" />
      <div className="space-y-6">
        <PageHeader
          pageKey="beneficios"
          title="Benefícios e Descontos"
          subtitle="Descubra tarifas agente, cortesias e descontos exclusivos oferecidos por empresas do turismo."
          icon={Tag}
        />

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <BenefitSearchBar value={search} onChange={setSearch} />
          </div>
          <Button
            onClick={() => setShareOpen(true)}
            size="lg"
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar benefício
          </Button>
        </div>

        <BenefitFilters
          selectedCategory={selectedCategory}
          selectedDestination={selectedDestination}
          onCategoryChange={setSelectedCategory}
          onDestinationChange={setSelectedDestination}
        />

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-10 px-6">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
                <Tag className="h-10 w-10 text-primary/60" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center animate-bounce" style={{ animationDuration: '2.5s' }}>
                <Search className="h-4 w-4 text-accent-foreground/50" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhum benefício por aqui… ainda 😉
            </h3>
            <p className="text-muted-foreground max-w-md mb-1">
              Estamos sempre descobrindo novas tarifas agente, descontos e cortesias.
            </p>
            <p className="text-muted-foreground max-w-md mb-6">
              Se você conhece algum benefício, compartilhe com a comunidade!
            </p>
            <Button onClick={() => setShareOpen(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar benefício
            </Button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="grid gap-4 md:grid-cols-2">
                {paginatedBenefits.map((b) => (
                  <BenefitCard
                    key={b.id}
                    benefit={b}
                    userConfirmationType={getUserConfirmationType(b.id)}
                    onConfirm={(type) => confirmBenefit({ benefitId: b.id, type })}
                    onViewDetails={() => setDetailBenefit(b)}
                  />
                ))}
              </div>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                totalItems={totalItems}
                pageSize={pageSize}
              />
            </div>
            <div className="lg:w-72 shrink-0">
              <BenefitContributorsRanking ranking={ranking} />
            </div>
          </div>
        )}
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
