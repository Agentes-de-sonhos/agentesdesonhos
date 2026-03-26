import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, ShoppingCart, Users, Phone } from "lucide-react";
import { OperatorHero } from "@/components/operator/OperatorHero";
import { OperatorInfoCard } from "@/components/operator/OperatorInfoCard";
import { SalesChannelCards } from "@/components/operator/SalesChannelCards";
import { ContactCards } from "@/components/operator/ContactCards";
import { OperatorSidebar } from "@/components/operator/OperatorSidebar";
import { SupplierMaterialsCard } from "@/components/supplier/SupplierMaterialsCard";
import { OperatorReviewModal } from "@/components/operator/OperatorReviewModal";
import { OperatorReviewsList } from "@/components/operator/OperatorReviewsList";
import { useOperatorReviews } from "@/hooks/useOperatorReviews";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useOperatorUpdate } from "@/hooks/useOperatorUpdate";
import { toast } from "sonner";
import { EditModeProvider } from "@/contexts/EditModeContext";
import { EditModeToggle } from "@/components/edit-mode/EditModeToggle";
import { EditableSection } from "@/components/edit-mode/EditableSection";
import { HeroEditForm } from "@/components/edit-mode/forms/HeroEditForm";
import { TextEditForm } from "@/components/edit-mode/forms/TextEditForm";
import { TagsEditForm } from "@/components/edit-mode/forms/TagsEditForm";
import { SocialLinksEditForm } from "@/components/edit-mode/forms/SocialLinksEditForm";
import { CompanyInfoEditForm } from "@/components/edit-mode/forms/CompanyInfoEditForm";

export default function OperadoraDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const { data: operator, isLoading } = useQuery({
    queryKey: ["tour-operator", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_operators")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateMutation = useOperatorUpdate(id || "", "tour_operators");

  const {
    reviews,
    isLoading: reviewsLoading,
    userReview,
    averageRating,
    totalReviews,
    submitReview,
    deleteReview,
  } = useOperatorReviews(id || "");

  const handleReviewClick = () => {
    if (!user) {
      toast.error("Você precisa estar logado para avaliar");
      return;
    }
    setReviewModalOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-6xl mx-auto">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!operator) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="h-20 w-20 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
            <Building2 className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Operadora não encontrada
          </h2>
          <p className="text-muted-foreground mt-2 mb-8">
            A operadora que você está procurando não existe ou foi removida.
          </p>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => navigate("/mapa-turismo")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao diretório
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <EditModeProvider>
      <OperadoraDetailContent
        operator={operator}
        isAdmin={isAdmin}
        user={user}
        navigate={navigate}
        reviewModalOpen={reviewModalOpen}
        setReviewModalOpen={setReviewModalOpen}
        handleReviewClick={handleReviewClick}
        reviews={reviews}
        reviewsLoading={reviewsLoading}
        userReview={userReview}
        averageRating={averageRating}
        totalReviews={totalReviews}
        submitReview={submitReview}
        deleteReview={deleteReview}
        updateMutation={updateMutation}
      />
    </EditModeProvider>
  );
}

function OperadoraDetailContent({
  operator,
  isAdmin,
  navigate,
  reviewModalOpen,
  setReviewModalOpen,
  handleReviewClick,
  reviews,
  reviewsLoading,
  userReview,
  averageRating,
  totalReviews,
  submitReview,
  deleteReview,
  updateMutation,
}: any) {
  // Edit state for each section
  const [editName, setEditName] = useState(operator.name);
  const [editLogo, setEditLogo] = useState(operator.logo_url);
  const [editHowToSell, setEditHowToSell] = useState(operator.how_to_sell || "");
  const [editSalesChannels, setEditSalesChannels] = useState(operator.sales_channels || "");
  const [editContacts, setEditContacts] = useState(operator.commercial_contacts || "");
  const [editSpecialties, setEditSpecialties] = useState<string[]>(
    operator.specialties?.split(",").map((s: string) => s.trim()).filter(Boolean) || []
  );
  const [editSocialLinks, setEditSocialLinks] = useState<Record<string, string>>(() => {
    const links: Record<string, string> = {};
    if (operator.website) links.website = operator.website;
    if (operator.instagram) links.instagram = operator.instagram;
    if (operator.social_links && typeof operator.social_links === "object") {
      Object.entries(operator.social_links as Record<string, string>).forEach(([k, v]) => {
        if (v) links[k] = String(v);
      });
    }
    return links;
  });
  const [editCompanyInfo, setEditCompanyInfo] = useState({
    category: operator.category || "",
    founded_year: operator.founded_year,
    annual_revenue: operator.annual_revenue,
    employees: operator.employees,
    executive_team: operator.executive_team,
  });

  const resetHero = () => { setEditName(operator.name); setEditLogo(operator.logo_url); };
  const resetHowToSell = () => setEditHowToSell(operator.how_to_sell || "");
  const resetSalesChannels = () => setEditSalesChannels(operator.sales_channels || "");
  const resetContacts = () => setEditContacts(operator.commercial_contacts || "");
  const resetSpecialties = () => setEditSpecialties(operator.specialties?.split(",").map((s: string) => s.trim()).filter(Boolean) || []);
  const resetSocialLinks = () => {
    const links: Record<string, string> = {};
    if (operator.website) links.website = operator.website;
    if (operator.instagram) links.instagram = operator.instagram;
    if (operator.social_links && typeof operator.social_links === "object") {
      Object.entries(operator.social_links as Record<string, string>).forEach(([k, v]) => {
        if (v) links[k] = String(v);
      });
    }
    setEditSocialLinks(links);
  };
  const resetCompanyInfo = () => setEditCompanyInfo({
    category: operator.category || "",
    founded_year: operator.founded_year,
    annual_revenue: operator.annual_revenue,
    employees: operator.employees,
    executive_team: operator.executive_team,
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        {/* Top bar with back + edit toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/mapa-turismo")}
            className="rounded-xl text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao diretório
          </Button>
          {isAdmin && <EditModeToggle />}
        </div>

        {/* Hero */}
        <EditableSection
          editForm={
            <HeroEditForm
              name={editName}
              logoUrl={editLogo}
              onNameChange={setEditName}
              onLogoChange={setEditLogo}
            />
          }
          onSave={async () => {
            await updateMutation.mutateAsync({ name: editName, logo_url: editLogo });
          }}
          onCancel={resetHero}
        >
          <OperatorHero
            name={operator.name}
            category={operator.category}
            logoUrl={operator.logo_url}
            averageRating={averageRating}
            totalReviews={totalReviews}
            onReviewClick={handleReviewClick}
          />
        </EditableSection>

        {/* Two-column layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* How to sell */}
            <EditableSection
              editForm={
                <TextEditForm label="Como Vender" value={editHowToSell} onChange={setEditHowToSell} />
              }
              onSave={async () => {
                await updateMutation.mutateAsync({ how_to_sell: editHowToSell || null });
              }}
              onCancel={resetHowToSell}
            >
              {operator.how_to_sell && (
                <OperatorInfoCard icon={ShoppingCart} title="Como Vender">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {operator.how_to_sell}
                  </p>
                </OperatorInfoCard>
              )}
              {!operator.how_to_sell && isAdmin && (
                <OperatorInfoCard icon={ShoppingCart} title="Como Vender">
                  <p className="text-sm text-muted-foreground italic">Clique no lápis para adicionar</p>
                </OperatorInfoCard>
              )}
            </EditableSection>

            {/* Sales channels */}
            <EditableSection
              editForm={
                <TextEditForm label="Canais de Venda" value={editSalesChannels} onChange={setEditSalesChannels} />
              }
              onSave={async () => {
                await updateMutation.mutateAsync({ sales_channels: editSalesChannels || null });
              }}
              onCancel={resetSalesChannels}
            >
              {operator.sales_channels && (
                <OperatorInfoCard icon={Users} title="Canais de Venda">
                  <SalesChannelCards salesChannels={operator.sales_channels} />
                </OperatorInfoCard>
              )}
              {!operator.sales_channels && isAdmin && (
                <OperatorInfoCard icon={Users} title="Canais de Venda">
                  <p className="text-sm text-muted-foreground italic">Clique no lápis para adicionar</p>
                </OperatorInfoCard>
              )}
            </EditableSection>

            {/* Contacts */}
            <EditableSection
              editForm={
                <TextEditForm label="Contatos Comerciais" value={editContacts} onChange={setEditContacts} />
              }
              onSave={async () => {
                await updateMutation.mutateAsync({ commercial_contacts: editContacts || null });
              }}
              onCancel={resetContacts}
            >
              {operator.commercial_contacts && (
                <OperatorInfoCard icon={Phone} title="Contatos Comerciais" iconColor="text-emerald-600">
                  <ContactCards contacts={operator.commercial_contacts} />
                </OperatorInfoCard>
              )}
              {!operator.commercial_contacts && isAdmin && (
                <OperatorInfoCard icon={Phone} title="Contatos Comerciais" iconColor="text-emerald-600">
                  <p className="text-sm text-muted-foreground italic">Clique no lápis para adicionar</p>
                </OperatorInfoCard>
              )}
            </EditableSection>

            {/* Reviews */}
            <OperatorReviewsList
              reviews={reviews}
              isLoading={reviewsLoading}
              isAdmin={isAdmin}
              onDeleteReview={(reviewId: string, reason: string) => deleteReview.mutate({ reviewId, reason })}
              isDeleting={deleteReview.isPending}
            />

            {/* Materials */}
            <SupplierMaterialsCard
              supplierId={operator.id}
              supplierName={operator.name}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-5 lg:sticky lg:top-6">
            {/* Specialties */}
            <EditableSection
              editForm={
                <TagsEditForm tags={editSpecialties} onChange={setEditSpecialties} />
              }
              onSave={async () => {
                await updateMutation.mutateAsync({ specialties: editSpecialties.join(", ") || null });
              }}
              onCancel={resetSpecialties}
            >
              <OperatorSidebar operator={{
                ...operator,
                social_links: null,
                category: "",
                specialties: operator.specialties,
              }} />
            </EditableSection>

            {/* Social links */}
            <EditableSection
              editForm={
                <SocialLinksEditForm links={editSocialLinks} onChange={setEditSocialLinks} />
              }
              onSave={async () => {
                const { website, instagram, ...otherLinks } = editSocialLinks;
                await updateMutation.mutateAsync({
                  website: website || null,
                  instagram: instagram || null,
                  social_links: Object.keys(otherLinks).length > 0 ? otherLinks : null,
                });
              }}
              onCancel={resetSocialLinks}
            >
              {/* Rendered inside OperatorSidebar already — show a minimal version for social */}
              <div /> {/* placeholder - sidebar already shown above */}
            </EditableSection>

            {/* Company info */}
            <EditableSection
              editForm={
                <CompanyInfoEditForm data={editCompanyInfo} onChange={setEditCompanyInfo} />
              }
              onSave={async () => {
                await updateMutation.mutateAsync({
                  category: editCompanyInfo.category || null,
                  founded_year: editCompanyInfo.founded_year,
                  annual_revenue: editCompanyInfo.annual_revenue,
                  employees: editCompanyInfo.employees,
                  executive_team: editCompanyInfo.executive_team,
                });
              }}
              onCancel={resetCompanyInfo}
            >
              <div /> {/* placeholder - info shown in sidebar */}
            </EditableSection>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <OperatorReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        onSubmit={(data: any) => {
          submitReview.mutate(data, {
            onSuccess: () => setReviewModalOpen(false),
          });
        }}
        isSubmitting={submitReview.isPending}
        existingReview={userReview}
        operatorName={operator.name}
      />
    </DashboardLayout>
  );
}
