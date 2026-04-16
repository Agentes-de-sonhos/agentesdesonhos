import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, FileText, ShoppingCart, Users, Phone, LogOut, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OperatorHero } from "@/components/operator/OperatorHero";
import { OperatorInfoCard } from "@/components/operator/OperatorInfoCard";
import { SalesChannelCards } from "@/components/operator/SalesChannelCards";
import { ContactCards } from "@/components/operator/ContactCards";
import { CompetitiveAdvantagesCard } from "@/components/operator/CompetitiveAdvantagesCard";
import { RichTextWithLinks } from "@/components/operator/RichTextWithLinks";
import { BusinessHoursCard } from "@/components/operator/BusinessHoursCard";
import { CertificationsCard } from "@/components/operator/CertificationsCard";
import { OperatorSidebar } from "@/components/operator/OperatorSidebar";
import { SupplierMaterialsCard } from "@/components/supplier/SupplierMaterialsCard";
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
import { BusinessHoursEditForm } from "@/components/edit-mode/forms/BusinessHoursEditForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface BusinessHours {
  commercial?: string;
  after_hours?: string;
  emergency?: string;
}

export default function SupplierProfileEdit() {
  const { user, signOut } = useAuth();

  const { data: operator, isLoading } = useQuery({
    queryKey: ["supplier-own-operator", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_operators")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!operator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Perfil não encontrado</h2>
          <p className="text-muted-foreground mt-2">Nenhum perfil de empresa vinculado à sua conta.</p>
          <Button variant="outline" className="mt-6 rounded-xl" onClick={() => signOut()}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <EditModeProvider>
      <SupplierProfileContent operator={operator} signOut={signOut} />
    </EditModeProvider>
  );
}

function SupplierProfileContent({ operator, signOut }: { operator: any; signOut: () => Promise<void> }) {
  const updateMutation = useOperatorUpdate(operator.id, "tour_operators");
  const [materialsModalOpen, setMaterialsModalOpen] = useState(false);

  // Edit states
  const [editName, setEditName] = useState(operator.name);
  const [editLogo, setEditLogo] = useState(operator.logo_url);
  const [editShortDesc, setEditShortDesc] = useState(operator.short_description || "");
  const [editAdvantages, setEditAdvantages] = useState(operator.competitive_advantages || "");
  const [editHowToSell, setEditHowToSell] = useState(operator.how_to_sell || "");
  const [editBusinessHours, setEditBusinessHours] = useState<BusinessHours>(
    (operator.business_hours as BusinessHours) || {}
  );
  const [editCertifications, setEditCertifications] = useState(operator.certifications || "");
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
      Object.entries(operator.social_links as Record<string, string>).forEach(([k, v]) => {
        if (v) links[k] = String(v);
      });
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

  const placeholder = <span className="italic text-muted-foreground">Clique no lápis para adicionar</span>;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Perfil da Empresa</span>
          </div>
          <div className="flex items-center gap-3">
            <EditModeToggle />
            <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
        {/* Hero - no rating */}
        <EditableSection
          editForm={<HeroEditForm name={editName} logoUrl={editLogo} onNameChange={setEditName} onLogoChange={setEditLogo} />}
          onSave={async () => { await updateMutation.mutateAsync({ name: editName, logo_url: editLogo }); }}
          onCancel={() => { setEditName(operator.name); setEditLogo(operator.logo_url); }}
        >
          <OperatorHero name={operator.name} category={operator.category} logoUrl={operator.logo_url} />
        </EditableSection>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sobre */}
            <EditableSection
              editForm={<TextEditForm label="Sobre a Empresa (máx 10 linhas)" value={editShortDesc} onChange={setEditShortDesc} />}
              onSave={async () => { await updateMutation.mutateAsync({ short_description: editShortDesc || null }); }}
              onCancel={() => setEditShortDesc(operator.short_description || "")}
            >
              <OperatorInfoCard icon={FileText} title="Sobre a Empresa" iconColor="text-sky-600">
                {operator.short_description ? <RichTextWithLinks text={operator.short_description} lineClamp={10} /> : placeholder}
              </OperatorInfoCard>
            </EditableSection>

            {/* Diferenciais */}
            <EditableSection
              editForm={<TextEditForm label="Diferenciais Competitivos (1 por linha, máx 7)" value={editAdvantages} onChange={setEditAdvantages} />}
              onSave={async () => { await updateMutation.mutateAsync({ competitive_advantages: editAdvantages || null }); }}
              onCancel={() => setEditAdvantages(operator.competitive_advantages || "")}
            >
              {operator.competitive_advantages ? (
                <CompetitiveAdvantagesCard advantages={operator.competitive_advantages} />
              ) : (
                <OperatorInfoCard icon={FileText} title="Diferenciais Competitivos" iconColor="text-amber-600">
                  {placeholder}
                </OperatorInfoCard>
              )}
            </EditableSection>

            {/* Como Vender */}
            <EditableSection
              editForm={<TextEditForm label="Como Vender" value={editHowToSell} onChange={setEditHowToSell} />}
              onSave={async () => { await updateMutation.mutateAsync({ how_to_sell: editHowToSell || null }); }}
              onCancel={() => setEditHowToSell(operator.how_to_sell || "")}
            >
              <OperatorInfoCard icon={ShoppingCart} title="Como Vender">
                {operator.how_to_sell ? <RichTextWithLinks text={operator.how_to_sell} /> : placeholder}
              </OperatorInfoCard>
            </EditableSection>

            {/* Canais de Venda */}
            <EditableSection
              editForm={<TextEditForm label="Canais de Venda" value={editSalesChannels} onChange={setEditSalesChannels} />}
              onSave={async () => { await updateMutation.mutateAsync({ sales_channels: editSalesChannels || null }); }}
              onCancel={() => setEditSalesChannels(operator.sales_channels || "")}
            >
              <OperatorInfoCard icon={Users} title="Canais de Venda">
                {operator.sales_channels ? <SalesChannelCards salesChannels={operator.sales_channels} /> : placeholder}
              </OperatorInfoCard>
            </EditableSection>

            {/* Contatos Comerciais */}
            <EditableSection
              editForm={<TextEditForm label="Contatos Comerciais" value={editContacts} onChange={setEditContacts} />}
              onSave={async () => { await updateMutation.mutateAsync({ commercial_contacts: editContacts || null }); }}
              onCancel={() => setEditContacts(operator.commercial_contacts || "")}
            >
              <OperatorInfoCard icon={Phone} title="Contatos Comerciais" iconColor="text-emerald-600">
                {operator.commercial_contacts ? <ContactCards contacts={operator.commercial_contacts} /> : placeholder}
              </OperatorInfoCard>
            </EditableSection>

            {/* Horários */}
            <EditableSection
              editForm={<BusinessHoursEditForm data={editBusinessHours} onChange={setEditBusinessHours} />}
              onSave={async () => {
                const hasData = Object.values(editBusinessHours).some(Boolean);
                await updateMutation.mutateAsync({ business_hours: hasData ? editBusinessHours : null });
              }}
              onCancel={() => setEditBusinessHours((operator.business_hours as BusinessHours) || {})}
            >
              {operator.business_hours ? (
                <BusinessHoursCard hours={operator.business_hours as BusinessHours} />
              ) : (
                <OperatorInfoCard icon={FileText} title="Horários de Funcionamento" iconColor="text-sky-600">
                  {placeholder}
                </OperatorInfoCard>
              )}
            </EditableSection>

            {/* Materiais - view only with contact modal */}
            <div onClick={() => setMaterialsModalOpen(true)} className="cursor-pointer">
              <SupplierMaterialsCard supplierId={operator.id} supplierName={operator.name} />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5 lg:sticky lg:top-20">
            {/* Specialties */}
            <EditableSection
              editForm={<TagsEditForm tags={editSpecialties} onChange={setEditSpecialties} />}
              onSave={async () => { await updateMutation.mutateAsync({ specialties: editSpecialties.join(", ") || null }); }}
              onCancel={() => setEditSpecialties(operator.specialties?.split(",").map((s: string) => s.trim()).filter(Boolean) || [])}
            >
              <OperatorSidebar operator={{ specialties: operator.specialties, category: "", social_links: null }} />
            </EditableSection>

            {/* Social links */}
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

            {/* Company info */}
            <EditableSection
              editForm={<CompanyInfoEditForm data={editCompanyInfo} onChange={setEditCompanyInfo} />}
              onSave={async () => { await updateMutation.mutateAsync(editCompanyInfo); }}
              onCancel={() => setEditCompanyInfo({ category: operator.category || "", founded_year: operator.founded_year, annual_revenue: operator.annual_revenue, employees: operator.employees, executive_team: operator.executive_team })}
            >
              <OperatorSidebar operator={{ category: operator.category, founded_year: operator.founded_year, annual_revenue: operator.annual_revenue, employees: operator.employees, executive_team: operator.executive_team, specialties: null, social_links: null }} />
            </EditableSection>

            {/* Certifications */}
            <EditableSection
              editForm={<TextEditForm label="Certificações (1 por linha)" value={editCertifications} onChange={setEditCertifications} />}
              onSave={async () => { await updateMutation.mutateAsync({ certifications: editCertifications || null }); }}
              onCancel={() => setEditCertifications(operator.certifications || "")}
            >
              {operator.certifications ? (
                <CertificationsCard certifications={operator.certifications} />
              ) : (
                <OperatorInfoCard icon={FileText} title="Certificações" iconColor="text-emerald-600">
                  {placeholder}
                </OperatorInfoCard>
              )}
            </EditableSection>
          </div>
        </div>
      </div>

      {/* Materials Contact Modal */}
      <Dialog open={materialsModalOpen} onOpenChange={setMaterialsModalOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Materiais de Divulgação</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Para incluir ou gerenciar materiais de divulgação, entre em contato com a equipe comercial.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <a
              href="mailto:fernando.nobre@agentesdesonhos.com.br"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Enviar e-mail para a equipe comercial
            </a>
            <p className="text-xs text-muted-foreground mt-3">
              fernando.nobre@agentesdesonhos.com.br
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
