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
import { ContactCards } from "@/components/operator/ContactCards";
import { OperatorSidebar } from "@/components/operator/OperatorSidebar";
import { SupplierMaterialsCard } from "@/components/supplier/SupplierMaterialsCard";
import { OperatorReviewModal } from "@/components/operator/OperatorReviewModal";
import { OperatorReviewsList } from "@/components/operator/OperatorReviewsList";
import { useSupplierReviews } from "@/hooks/useSupplierReviews";
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

interface SupplierContact {
  id: string;
  supplier_id: string;
  name: string;
  position: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
}

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["trade-supplier", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_suppliers")
        .select(`*, supplier_specialties (specialty_id, specialties (id, name))`)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const specialties = data.supplier_specialties?.map((ss: any) => ss.specialties?.name).filter(Boolean) || [];
      return { ...data, specialtiesList: specialties as string[] };
    },
    enabled: !!id,
  });

  const { data: contacts } = useQuery({
    queryKey: ["supplier-contacts", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("supplier_contacts").select("*").eq("supplier_id", id!).order("name");
      if (error) throw error;
      return data as SupplierContact[];
    },
    enabled: !!id,
  });

  const updateMutation = useOperatorUpdate(id || "", "trade_suppliers");

  const { reviews, isLoading: reviewsLoading, userReview, averageRating, totalReviews, submitReview, deleteReview } = useSupplierReviews(id || "");

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
            <div className="lg:col-span-2 space-y-6"><Skeleton className="h-48 w-full rounded-2xl" /><Skeleton className="h-48 w-full rounded-2xl" /></div>
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!supplier) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="h-20 w-20 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-6"><Building2 className="h-10 w-10 text-muted-foreground/40" /></div>
          <h2 className="text-xl font-semibold text-foreground">Fornecedor não encontrado</h2>
          <p className="text-muted-foreground mt-2 mb-8">O fornecedor que você está procurando não existe ou foi removido.</p>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/mapa-turismo")}><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao diretório</Button>
        </div>
      </DashboardLayout>
    );
  }

  const content = (
    <SupplierContent
      supplier={supplier}
      contacts={contacts}
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

function SupplierContent({ supplier, contacts, isAdmin, navigate, reviewModalOpen, setReviewModalOpen, handleReviewClick, reviews, reviewsLoading, userReview, averageRating, totalReviews, submitReview, deleteReview, updateMutation }: any) {
  const [editName, setEditName] = useState(supplier.name);
  const [editLogo, setEditLogo] = useState(supplier.logo_url);
  const [editHowToSell, setEditHowToSell] = useState(supplier.how_to_sell || "");
  const [editSalesChannel, setEditSalesChannel] = useState(supplier.sales_channel || "");
  const [editPracticalNotes, setEditPracticalNotes] = useState(supplier.practical_notes || "");

  const buildSocialLinks = () => {
    const links: Record<string, string> = {};
    if (supplier.website_url) links.website = supplier.website_url;
    if (supplier.instagram_url) links.instagram = supplier.instagram_url;
    if (Array.isArray(supplier.other_social_media)) {
      (supplier.other_social_media as any[]).forEach((s: any) => { if (s?.type && s?.url) links[s.type.toLowerCase()] = s.url; });
    }
    return links;
  };

  const [editSocialLinks, setEditSocialLinks] = useState<Record<string, string>>(buildSocialLinks);

  const contactsText = contacts?.map((c: any) => {
    const parts = [c.name];
    if (c.position) parts.push(c.position);
    if (c.phone) parts.push(`Tel: ${c.phone}`);
    if (c.whatsapp) parts.push(`WhatsApp: ${c.whatsapp}`);
    if (c.email) parts.push(`Email: ${c.email}`);
    return parts.join("\n");
  }).join("\n\n") || "";

  const socialLinks: Record<string, string> = {};
  if (supplier.website_url) socialLinks.website = supplier.website_url;
  if (supplier.instagram_url) socialLinks.instagram = supplier.instagram_url;
  if (Array.isArray(supplier.other_social_media)) {
    (supplier.other_social_media as any[]).forEach((s: any) => { if (s?.type && s?.url) socialLinks[s.type.toLowerCase()] = s.url; });
  }

  const wrap = (content: React.ReactNode, editForm: React.ReactNode, onSave: () => Promise<void>, onCancel: () => void) => {
    if (!isAdmin) return content;
    return <EditableSection editForm={editForm} onSave={onSave} onCancel={onCancel}>{content}</EditableSection>;
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
        {wrap(
          <OperatorHero name={supplier.name} category={supplier.category} logoUrl={supplier.logo_url} averageRating={averageRating} totalReviews={totalReviews} onReviewClick={handleReviewClick} />,
          <HeroEditForm name={editName} logoUrl={editLogo} onNameChange={setEditName} onLogoChange={setEditLogo} />,
          async () => { await updateMutation.mutateAsync({ name: editName, logo_url: editLogo }); },
          () => { setEditName(supplier.name); setEditLogo(supplier.logo_url); }
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* How to sell */}
            {isAdmin ? (
              <EditableSection
                editForm={<TextEditForm label="Como Vender" value={editHowToSell} onChange={setEditHowToSell} />}
                onSave={async () => { await updateMutation.mutateAsync({ how_to_sell: editHowToSell || null }); }}
                onCancel={() => setEditHowToSell(supplier.how_to_sell || "")}
              >
                <OperatorInfoCard icon={ShoppingCart} title="Como Vender">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {supplier.how_to_sell || <span className="italic text-muted-foreground">Clique no lápis para adicionar</span>}
                  </p>
                </OperatorInfoCard>
              </EditableSection>
            ) : supplier.how_to_sell ? (
              <OperatorInfoCard icon={ShoppingCart} title="Como Vender">
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{supplier.how_to_sell}</p>
              </OperatorInfoCard>
            ) : null}

            {/* Sales channel */}
            {isAdmin ? (
              <EditableSection
                editForm={<TextEditForm label="Canais de Venda" value={editSalesChannel} onChange={setEditSalesChannel} />}
                onSave={async () => { await updateMutation.mutateAsync({ sales_channel: editSalesChannel || null }); }}
                onCancel={() => setEditSalesChannel(supplier.sales_channel || "")}
              >
                <OperatorInfoCard icon={Users} title="Canais de Venda">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {supplier.sales_channel || <span className="italic text-muted-foreground">Clique no lápis para adicionar</span>}
                  </p>
                </OperatorInfoCard>
              </EditableSection>
            ) : supplier.sales_channel ? (
              <OperatorInfoCard icon={Users} title="Canais de Venda">
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{supplier.sales_channel}</p>
              </OperatorInfoCard>
            ) : null}

            {/* Contacts (read-only for now — stored in separate table) */}
            {contactsText && (
              <OperatorInfoCard icon={Phone} title="Contatos Comerciais" iconColor="text-emerald-600">
                <ContactCards contacts={contactsText} />
              </OperatorInfoCard>
            )}

            {/* Practical notes */}
            {isAdmin ? (
              <EditableSection
                editForm={<TextEditForm label="Observações Práticas" value={editPracticalNotes} onChange={setEditPracticalNotes} />}
                onSave={async () => { await updateMutation.mutateAsync({ practical_notes: editPracticalNotes || null }); }}
                onCancel={() => setEditPracticalNotes(supplier.practical_notes || "")}
              >
                <OperatorInfoCard icon={ShoppingCart} title="Observações Práticas">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {supplier.practical_notes || <span className="italic text-muted-foreground">Clique no lápis para adicionar</span>}
                  </p>
                </OperatorInfoCard>
              </EditableSection>
            ) : supplier.practical_notes ? (
              <OperatorInfoCard icon={ShoppingCart} title="Observações Práticas">
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{supplier.practical_notes}</p>
              </OperatorInfoCard>
            ) : null}

            <OperatorReviewsList reviews={reviews} isLoading={reviewsLoading} isAdmin={isAdmin} onDeleteReview={(reviewId: string, reason: string) => deleteReview.mutate({ reviewId, reason })} isDeleting={deleteReview.isPending} />
            <SupplierMaterialsCard supplierId={supplier.id} supplierName={supplier.name} />
          </div>

          {/* Sidebar */}
          <div className="space-y-5 lg:sticky lg:top-6">
            {/* Social links */}
            {isAdmin ? (
              <EditableSection
                editForm={<SocialLinksEditForm links={editSocialLinks} onChange={setEditSocialLinks} />}
                onSave={async () => {
                  const { website, instagram, ...rest } = editSocialLinks;
                  const otherMedia = Object.entries(rest).filter(([, v]) => v).map(([type, url]) => ({ type, url }));
                  await updateMutation.mutateAsync({
                    website_url: website || null,
                    instagram_url: instagram || null,
                    other_social_media: otherMedia.length > 0 ? otherMedia : null,
                  });
                }}
                onCancel={() => setEditSocialLinks(buildSocialLinks())}
              >
                <OperatorSidebar operator={{
                  specialties: supplier.specialtiesList.join(", "),
                  website: supplier.website_url,
                  instagram: supplier.instagram_url,
                  social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
                  category: supplier.category,
                }} />
              </EditableSection>
            ) : (
              <OperatorSidebar operator={{
                specialties: supplier.specialtiesList.join(", "),
                website: supplier.website_url,
                instagram: supplier.instagram_url,
                social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
                category: supplier.category,
              }} />
            )}
          </div>
        </div>
      </div>

      <OperatorReviewModal open={reviewModalOpen} onOpenChange={setReviewModalOpen} onSubmit={(data: any) => { submitReview.mutate(data, { onSuccess: () => setReviewModalOpen(false) }); }} isSubmitting={submitReview.isPending} existingReview={userReview} operatorName={supplier.name} />
    </DashboardLayout>
  );
}
