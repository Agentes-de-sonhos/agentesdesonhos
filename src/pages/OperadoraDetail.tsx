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
import { EditModeProvider, useEditMode } from "@/contexts/EditModeContext";
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
    reviews, isLoading: reviewsLoading, userReview,
    averageRating, totalReviews, submitReview, deleteReview,
  } = useOperatorReviews(id || "");

  const handleReviewClick = () => {
    if (!user) { toast.error("Você precisa estar logado para avaliar"); return; }
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
          <h2 className="text-xl font-semibold text-foreground">Operadora não encontrada</h2>
          <p className="text-muted-foreground mt-2 mb-8">A operadora que você está procurando não existe ou foi removida.</p>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/mapa-turismo")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao diretório
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const content = (
    <OperadoraContent
      operator={operator}
      isAdmin={isAdmin}
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
  );

  return isAdmin ? <EditModeProvider>{content}</EditModeProvider> : content;
}

function OperadoraContent({ operator, isAdmin, navigate, reviewModalOpen, setReviewModalOpen, handleReviewClick, reviews, reviewsLoading, userReview, averageRating, totalReviews, submitReview, deleteReview, updateMutation }: any) {
  // Inline edit state
  const [editName, setEditName] = useState(operator.name);
  const [editLogo, setEditLogo] = useState(operator.logo_url);
  const [editHowToSell, setEditHowToSell] = useState(operator.how_to_sell || "");
  const [editSalesChannels, setEditSalesChannels] = useState(operator.sales_channels || "");
  const [editContacts, setEditContacts] = useState(operator.commercial_contacts || "");
  const [editSpecialties, setEditSpecialties] = useState<string[]>(
    operator.specialties?.split(",").map((s: string) => s.trim()).filter(Boolean) || []
  );

  const buildSocialLinks = () => {
    const links: Record<string, string> = {};
    if (operator.website) links.website = operator.website;
    if (operator.instagram) links.instagram = operator.instagram;
    if (operator.social_links && typeof operator.social_links === "object") {
      Object.entries(operator.social_links as Record<string, string>).forEach(([k, v]) => { if (v) links[k] = String(v); });
    }
    return links;
  };

  const [editSocialLinks, setEditSocialLinks] = useState<Record<string, string>>(buildSocialLinks);
  const [editCompanyInfo, setEditCompanyInfo] = useState({
    category: operator.category || "",
    founded_year: operator.founded_year,
    annual_revenue: operator.annual_revenue,
    employees: operator.employees,
    executive_team: operator.executive_team,
  });

  const makeSection = (
    content: React.ReactNode,
    editForm: React.ReactNode,
    onSave: () => Promise<void>,
    onCancel: () => void,
    showEmpty?: boolean
  ) => {
    if (!isAdmin) return content || null;
    return (
      <EditableSection editForm={editForm} onSave={onSave} onCancel={onCancel}>
        {content || (showEmpty ? content : null)}
      </EditableSection>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/mapa-turismo")} className="rounded-xl text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao diretório
          </Button>
          {isAdmin && <EditModeToggle />}
        </div>

        {/* Hero */}
        {isAdmin ? (
          <EditableSection
            editForm={<HeroEditForm name={editName} logoUrl={editLogo} onNameChange={setEditName} onLogoChange={setEditLogo} />}
            onSave={async () => { await updateMutation.mutateAsync({ name: editName, logo_url: editLogo }); }}
            onCancel={() => { setEditName(operator.name); setEditLogo(operator.logo_url); }}
          >
            <OperatorHero name={operator.name} category={operator.category} logoUrl={operator.logo_url} averageRating={averageRating} totalReviews={totalReviews} onReviewClick={handleReviewClick} />
          </EditableSection>
        ) : (
          <OperatorHero name={operator.name} category={operator.category} logoUrl={operator.logo_url} averageRating={averageRating} totalReviews={totalReviews} onReviewClick={handleReviewClick} />
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* How to sell */}
            {isAdmin ? (
              <EditableSection
                editForm={<TextEditForm label="Como Vender" value={editHowToSell} onChange={setEditHowToSell} />}
                onSave={async () => { await updateMutation.mutateAsync({ how_to_sell: editHowToSell || null }); }}
                onCancel={() => setEditHowToSell(operator.how_to_sell || "")}
              >
                <OperatorInfoCard icon={ShoppingCart} title="Como Vender">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {operator.how_to_sell || <span className="italic text-muted-foreground">Clique no lápis para adicionar</span>}
                  </p>
                </OperatorInfoCard>
              </EditableSection>
            ) : operator.how_to_sell ? (
              <OperatorInfoCard icon={ShoppingCart} title="Como Vender">
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{operator.how_to_sell}</p>
              </OperatorInfoCard>
            ) : null}

            {/* Sales channels */}
            {isAdmin ? (
              <EditableSection
                editForm={<TextEditForm label="Canais de Venda" value={editSalesChannels} onChange={setEditSalesChannels} />}
                onSave={async () => { await updateMutation.mutateAsync({ sales_channels: editSalesChannels || null }); }}
                onCancel={() => setEditSalesChannels(operator.sales_channels || "")}
              >
                <OperatorInfoCard icon={Users} title="Canais de Venda">
                  {operator.sales_channels ? <SalesChannelCards salesChannels={operator.sales_channels} /> : <p className="text-sm italic text-muted-foreground">Clique no lápis para adicionar</p>}
                </OperatorInfoCard>
              </EditableSection>
            ) : operator.sales_channels ? (
              <OperatorInfoCard icon={Users} title="Canais de Venda">
                <SalesChannelCards salesChannels={operator.sales_channels} />
              </OperatorInfoCard>
            ) : null}

            {/* Contacts */}
            {isAdmin ? (
              <EditableSection
                editForm={<TextEditForm label="Contatos Comerciais" value={editContacts} onChange={setEditContacts} />}
                onSave={async () => { await updateMutation.mutateAsync({ commercial_contacts: editContacts || null }); }}
                onCancel={() => setEditContacts(operator.commercial_contacts || "")}
              >
                <OperatorInfoCard icon={Phone} title="Contatos Comerciais" iconColor="text-emerald-600">
                  {operator.commercial_contacts ? <ContactCards contacts={operator.commercial_contacts} /> : <p className="text-sm italic text-muted-foreground">Clique no lápis para adicionar</p>}
                </OperatorInfoCard>
              </EditableSection>
            ) : operator.commercial_contacts ? (
              <OperatorInfoCard icon={Phone} title="Contatos Comerciais" iconColor="text-emerald-600">
                <ContactCards contacts={operator.commercial_contacts} />
              </OperatorInfoCard>
            ) : null}

            <OperatorReviewsList reviews={reviews} isLoading={reviewsLoading} isAdmin={isAdmin} onDeleteReview={(reviewId: string, reason: string) => deleteReview.mutate({ reviewId, reason })} isDeleting={deleteReview.isPending} />
            <SupplierMaterialsCard supplierId={operator.id} supplierName={operator.name} />
          </div>

          {/* Sidebar */}
          <div className="space-y-5 lg:sticky lg:top-6">
            {/* Specialties */}
            {isAdmin ? (
              <EditableSection
                editForm={<TagsEditForm tags={editSpecialties} onChange={setEditSpecialties} />}
                onSave={async () => { await updateMutation.mutateAsync({ specialties: editSpecialties.join(", ") || null }); }}
                onCancel={() => setEditSpecialties(operator.specialties?.split(",").map((s: string) => s.trim()).filter(Boolean) || [])}
              >
                <OperatorSidebar operator={{ specialties: operator.specialties, category: "", social_links: null }} />
              </EditableSection>
            ) : (
              operator.specialties && <OperatorSidebar operator={{ specialties: operator.specialties, category: "", social_links: null }} />
            )}

            {/* Social links */}
            {isAdmin ? (
              <EditableSection
                editForm={<SocialLinksEditForm links={editSocialLinks} onChange={setEditSocialLinks} />}
                onSave={async () => {
                  const { website, instagram, ...rest } = editSocialLinks;
                  await updateMutation.mutateAsync({ website: website || null, instagram: instagram || null, social_links: Object.keys(rest).length > 0 ? rest : null });
                }}
                onCancel={() => setEditSocialLinks(buildSocialLinks())}
              >
                <OperatorSidebar operator={{ social_links: operator.social_links as Record<string, string> | null, website: operator.website, instagram: operator.instagram, category: "", specialties: null }} />
              </EditableSection>
            ) : (
              <OperatorSidebar operator={{ social_links: operator.social_links as Record<string, string> | null, website: operator.website, instagram: operator.instagram, category: "", specialties: null }} />
            )}

            {/* Company info */}
            {isAdmin ? (
              <EditableSection
                editForm={<CompanyInfoEditForm data={editCompanyInfo} onChange={setEditCompanyInfo} />}
                onSave={async () => { await updateMutation.mutateAsync(editCompanyInfo); }}
                onCancel={() => setEditCompanyInfo({ category: operator.category || "", founded_year: operator.founded_year, annual_revenue: operator.annual_revenue, employees: operator.employees, executive_team: operator.executive_team })}
              >
                <OperatorSidebar operator={{ category: operator.category, founded_year: operator.founded_year, annual_revenue: operator.annual_revenue, employees: operator.employees, executive_team: operator.executive_team, specialties: null, social_links: null }} />
              </EditableSection>
            ) : (
              <OperatorSidebar operator={{ category: operator.category, founded_year: operator.founded_year, annual_revenue: operator.annual_revenue, employees: operator.employees, executive_team: operator.executive_team, specialties: null, social_links: null }} />
            )}
          </div>
        </div>
      </div>

      <OperatorReviewModal open={reviewModalOpen} onOpenChange={setReviewModalOpen} onSubmit={(data: any) => { submitReview.mutate(data, { onSuccess: () => setReviewModalOpen(false) }); }} isSubmitting={submitReview.isPending} existingReview={userReview} operatorName={operator.name} />
    </DashboardLayout>
  );
}
