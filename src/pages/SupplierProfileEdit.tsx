import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, FileText, ShoppingCart, Users, Phone, LogOut, Mail, Tag, Share2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { EditableSection } from "@/components/edit-mode/EditableSection";
import { HeroEditForm } from "@/components/edit-mode/forms/HeroEditForm";
import { TextEditForm } from "@/components/edit-mode/forms/TextEditForm";
import { TagsEditForm } from "@/components/edit-mode/forms/TagsEditForm";
import { SocialLinksEditForm } from "@/components/edit-mode/forms/SocialLinksEditForm";
import { CompanyInfoEditForm } from "@/components/edit-mode/forms/CompanyInfoEditForm";
import { BusinessHoursEditForm } from "@/components/edit-mode/forms/BusinessHoursEditForm";
import { MediaManagerModal } from "@/components/media/MediaManagerModal";
import { LanguageSelector } from "@/components/LanguageSelector";
import { type Lang, tp, getStoredLang, setStoredLang } from "@/i18n/supplierProfile";
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
  const [lang, setLang] = useState<Lang>(getStoredLang);

  const changeLang = (l: Lang) => {
    setLang(l);
    setStoredLang(l);
  };

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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex justify-end w-full max-w-lg mb-4">
          <LanguageSelector value={lang} onChange={changeLang} />
        </div>
        <div className="text-center">
          <Building2 className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">{tp(lang, "not_found_title")}</h2>
          <p className="text-muted-foreground mt-2">{tp(lang, "not_found_desc")}</p>
          <Button variant="outline" className="mt-6 rounded-xl" onClick={() => signOut()}>
            {tp(lang, "sign_out")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <EditModeProvider defaultEnabled>
      <SupplierProfileContent operator={operator} signOut={signOut} lang={lang} onLangChange={changeLang} />
    </EditModeProvider>
  );
}

function SupplierProfileContent({ operator, signOut, lang, onLangChange }: { operator: any; signOut: () => Promise<void>; lang: Lang; onLangChange: (l: Lang) => void }) {
  const queryClient = useQueryClient();
  const updateMutation = useOperatorUpdate(operator.id, "tour_operators");
  const [materialsModalOpen, setMaterialsModalOpen] = useState(false);
  const [logoManagerOpen, setLogoManagerOpen] = useState(false);

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

  useEffect(() => {
    setEditName(operator.name);
    setEditLogo(operator.logo_url);
    setEditShortDesc(operator.short_description || "");
    setEditAdvantages(operator.competitive_advantages || "");
    setEditHowToSell(operator.how_to_sell || "");
    setEditBusinessHours((operator.business_hours as BusinessHours) || {});
    setEditCertifications(operator.certifications || "");
    setEditSalesChannels(operator.sales_channels || "");
    setEditContacts(operator.commercial_contacts || "");
    setEditSpecialties(operator.specialties?.split(",").map((s: string) => s.trim()).filter(Boolean) || []);
    setEditSocialLinks(buildSocialLinks());
    setEditCompanyInfo({
      category: operator.category || "",
      founded_year: operator.founded_year,
      annual_revenue: operator.annual_revenue,
      employees: operator.employees,
      executive_team: operator.executive_team,
    });
  }, [operator]);

  const handleLogoSelect = async (url: string) => {
    setEditLogo(url);
    setLogoManagerOpen(false);
    try {
      await updateMutation.mutateAsync({ logo_url: url });
      queryClient.invalidateQueries({ queryKey: ["supplier-own-operator"] });
    } catch {
      toast.error(tp(lang, "logo_error"));
    }
  };

  const placeholder = <span className="italic text-muted-foreground">{tp(lang, "edit_click")}</span>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">{tp(lang, "page_title")}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector value={lang} onChange={onLangChange} />
            <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" /> {tp(lang, "sign_out")}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
        <EditableSection
          editForm={<HeroEditForm name={editName} logoUrl={editLogo} onNameChange={setEditName} onLogoChange={setEditLogo} />}
          onSave={async () => { await updateMutation.mutateAsync({ name: editName, logo_url: editLogo }); }}
          onCancel={() => { setEditName(operator.name); setEditLogo(operator.logo_url); }}
          className="supplier-hero-edit"
        >
          {(startEditing) => (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-primary/10 border border-border/60 p-8 sm:p-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              <div className="relative flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => setLogoManagerOpen(true)}
                  className="relative group/logo cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  title={tp(lang, "change_logo")}
                >
                  <div className="h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex items-center justify-center shadow-sm overflow-hidden">
                    {editLogo ? (
                      <img src={editLogo} alt={operator.name} className="h-full w-full object-contain p-2" />
                    ) : (
                      <span className="text-2xl font-bold text-primary">{operator.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                    <Pencil className="h-5 w-5 text-white" />
                  </div>
                </button>
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl tracking-tight">{operator.name}</h1>
                  <p className="text-muted-foreground mt-1">{operator.category || tp(lang, "company")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={startEditing}
                className="absolute top-3 right-3 z-10 h-8 w-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 border border-primary/20"
                title={tp(lang, "edit_header")}
              >
                <Pencil className="h-3.5 w-3.5 text-primary" />
              </button>
            </div>
          )}
        </EditableSection>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <EditableSection
              editForm={<TextEditForm label={tp(lang, "about_label")} value={editShortDesc} onChange={setEditShortDesc} />}
              onSave={async () => { await updateMutation.mutateAsync({ short_description: editShortDesc || null }); }}
              onCancel={() => setEditShortDesc(operator.short_description || "")}
            >
              <OperatorInfoCard icon={FileText} title={tp(lang, "about")} iconColor="text-sky-600">
                {operator.short_description ? <RichTextWithLinks text={operator.short_description} lineClamp={10} /> : placeholder}
              </OperatorInfoCard>
            </EditableSection>

            <EditableSection
              editForm={<TextEditForm label={tp(lang, "advantages_label")} value={editAdvantages} onChange={setEditAdvantages} />}
              onSave={async () => { await updateMutation.mutateAsync({ competitive_advantages: editAdvantages || null }); }}
              onCancel={() => setEditAdvantages(operator.competitive_advantages || "")}
            >
              {operator.competitive_advantages ? (
                <CompetitiveAdvantagesCard advantages={operator.competitive_advantages} />
              ) : (
                <OperatorInfoCard icon={FileText} title={tp(lang, "advantages")} iconColor="text-amber-600">
                  {placeholder}
                </OperatorInfoCard>
              )}
            </EditableSection>

            <EditableSection
              editForm={<TextEditForm label={tp(lang, "how_to_sell")} value={editHowToSell} onChange={setEditHowToSell} />}
              onSave={async () => { await updateMutation.mutateAsync({ how_to_sell: editHowToSell || null }); }}
              onCancel={() => setEditHowToSell(operator.how_to_sell || "")}
            >
              <OperatorInfoCard icon={ShoppingCart} title={tp(lang, "how_to_sell")}>
                {operator.how_to_sell ? <RichTextWithLinks text={operator.how_to_sell} /> : placeholder}
              </OperatorInfoCard>
            </EditableSection>

            <EditableSection
              editForm={<TextEditForm label={tp(lang, "sales_channels")} value={editSalesChannels} onChange={setEditSalesChannels} />}
              onSave={async () => { await updateMutation.mutateAsync({ sales_channels: editSalesChannels || null }); }}
              onCancel={() => setEditSalesChannels(operator.sales_channels || "")}
            >
              <OperatorInfoCard icon={Users} title={tp(lang, "sales_channels")}>
                {operator.sales_channels ? <SalesChannelCards salesChannels={operator.sales_channels} /> : placeholder}
              </OperatorInfoCard>
            </EditableSection>

            <EditableSection
              editForm={<TextEditForm label={tp(lang, "contacts")} value={editContacts} onChange={setEditContacts} />}
              onSave={async () => { await updateMutation.mutateAsync({ commercial_contacts: editContacts || null }); }}
              onCancel={() => setEditContacts(operator.commercial_contacts || "")}
            >
              <OperatorInfoCard icon={Phone} title={tp(lang, "contacts")} iconColor="text-emerald-600">
                {operator.commercial_contacts ? <ContactCards contacts={operator.commercial_contacts} /> : placeholder}
              </OperatorInfoCard>
            </EditableSection>

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
                <OperatorInfoCard icon={FileText} title={tp(lang, "business_hours")} iconColor="text-sky-600">
                  {placeholder}
                </OperatorInfoCard>
              )}
            </EditableSection>

            <div onClick={() => setMaterialsModalOpen(true)} className="cursor-pointer">
              <SupplierMaterialsCard supplierId={operator.id} supplierName={operator.name} />
            </div>
          </div>

          <div className="space-y-5 lg:sticky lg:top-20">
            <EditableSection
              editForm={<TagsEditForm tags={editSpecialties} onChange={setEditSpecialties} />}
              onSave={async () => { await updateMutation.mutateAsync({ specialties: editSpecialties.join(", ") || null }); }}
              onCancel={() => setEditSpecialties(operator.specialties?.split(",").map((s: string) => s.trim()).filter(Boolean) || [])}
            >
              {operator.specialties ? (
                <OperatorSidebar operator={{ specialties: operator.specialties, category: "", social_links: null }} />
              ) : (
                <OperatorInfoCard icon={Tag} title={tp(lang, "specialties")} iconColor="text-violet-600">
                  {placeholder}
                </OperatorInfoCard>
              )}
            </EditableSection>

            <EditableSection
              editForm={<SocialLinksEditForm links={editSocialLinks} onChange={setEditSocialLinks} />}
              onSave={async () => {
                const { website, instagram, ...rest } = editSocialLinks;
                await updateMutation.mutateAsync({ website: website || null, instagram: instagram || null, social_links: Object.keys(rest).length > 0 ? rest : null });
              }}
              onCancel={() => setEditSocialLinks(buildSocialLinks())}
            >
              {(operator.website || operator.instagram || operator.social_links) ? (
                <OperatorSidebar operator={{ social_links: operator.social_links as Record<string, string> | null, website: operator.website, instagram: operator.instagram, category: "", specialties: null }} />
              ) : (
                <OperatorInfoCard icon={Share2} title={tp(lang, "social_links")} iconColor="text-primary">
                  {placeholder}
                </OperatorInfoCard>
              )}
            </EditableSection>

            <EditableSection
              editForm={<CompanyInfoEditForm data={editCompanyInfo} onChange={setEditCompanyInfo} />}
              onSave={async () => { await updateMutation.mutateAsync(editCompanyInfo); }}
              onCancel={() => setEditCompanyInfo({ category: operator.category || "", founded_year: operator.founded_year, annual_revenue: operator.annual_revenue, employees: operator.employees, executive_team: operator.executive_team })}
            >
              <OperatorSidebar operator={{ category: operator.category, founded_year: operator.founded_year, annual_revenue: operator.annual_revenue, employees: operator.employees, executive_team: operator.executive_team, specialties: null, social_links: null }} />
            </EditableSection>

            <EditableSection
              editForm={<TextEditForm label={tp(lang, "certifications_label")} value={editCertifications} onChange={setEditCertifications} />}
              onSave={async () => { await updateMutation.mutateAsync({ certifications: editCertifications || null }); }}
              onCancel={() => setEditCertifications(operator.certifications || "")}
            >
              {operator.certifications ? (
                <CertificationsCard certifications={operator.certifications} />
              ) : (
                <OperatorInfoCard icon={FileText} title={tp(lang, "certifications")} iconColor="text-emerald-600">
                  {placeholder}
                </OperatorInfoCard>
              )}
            </EditableSection>
          </div>
        </div>
      </div>

      <MediaManagerModal
        open={logoManagerOpen}
        onOpenChange={setLogoManagerOpen}
        onSelect={handleLogoSelect}
        accept="image"
      />

      <Dialog open={materialsModalOpen} onOpenChange={setMaterialsModalOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{tp(lang, "materials")}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              {tp(lang, "materials_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <a
              href="mailto:fernando.nobre@agentesdesonhos.com.br"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Mail className="h-4 w-4" />
              {tp(lang, "materials_email")}
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
