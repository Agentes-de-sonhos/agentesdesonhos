import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LogOut, Loader2, Save, BadgeCheck, Clock, XCircle, Award,
} from "lucide-react";
import { toast } from "sonner";
import {
  GuideLanguagesEditor, CertificationsEditor, ChipsMultiSelect, type GuideLanguage,
} from "@/components/tour-guides/GuideFormFields";
import { GuideGalleryUploader, GuidePhotoUploader } from "@/components/tour-guides/GuideGalleryUploader";
import { COUNTRY_OPTIONS, SPECIALTY_OPTIONS, SERVICE_OPTIONS } from "@/i18n/cadastroGuia";
import type { TourGuide } from "@/hooks/useTourGuides";

interface Props {
  guide: TourGuide;
}

export function GuideProfileEditor({ guide }: Props) {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: guide.full_name,
    professional_name: guide.professional_name || "",
    photo_url: guide.photo_url,
    city: guide.city || "",
    country: guide.country || "Brasil",
    regions: (guide.regions || []).join(", "),
    languages: (guide.languages || []) as GuideLanguage[],
    specialties: guide.specialties || [],
    services: guide.services || [],
    bio: guide.bio || "",
    differentials: guide.differentials || "",
    certifications: guide.certifications || [],
    gallery_urls: guide.gallery_urls || [],
    whatsapp: guide.whatsapp,
    email: guide.email || "",
    instagram: guide.instagram || "",
    website: guide.website || "",
  });

  useEffect(() => {
    setForm({
      full_name: guide.full_name,
      professional_name: guide.professional_name || "",
      photo_url: guide.photo_url,
      city: guide.city || "",
      country: guide.country || "Brasil",
      regions: (guide.regions || []).join(", "),
      languages: (guide.languages || []) as GuideLanguage[],
      specialties: guide.specialties || [],
      services: guide.services || [],
      bio: guide.bio || "",
      differentials: guide.differentials || "",
      certifications: guide.certifications || [],
      gallery_urls: guide.gallery_urls || [],
      whatsapp: guide.whatsapp,
      email: guide.email || "",
      instagram: guide.instagram || "",
      website: guide.website || "",
    });
  }, [guide]);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tour_guides")
        .update({
          full_name: form.full_name,
          professional_name: form.professional_name || null,
          photo_url: form.photo_url,
          city: form.city || null,
          country: form.country,
          regions: form.regions.split(",").map((s) => s.trim()).filter(Boolean),
          languages: form.languages as any,
          specialties: form.specialties,
          services: form.services,
          bio: form.bio || null,
          differentials: form.differentials || null,
          certifications: form.certifications.filter((c) => c.trim()),
          gallery_urls: form.gallery_urls,
          whatsapp: form.whatsapp,
          email: form.email || null,
          instagram: form.instagram || null,
          website: form.website || null,
        })
        .eq("id", guide.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Perfil atualizado!");
      queryClient.invalidateQueries({ queryKey: ["tour-guide-own"] });
    } finally {
      setSaving(false);
    }
  };

  const StatusBanner = () => {
    if (guide.status === "approved") {
      return (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-4 py-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <BadgeCheck className="h-4 w-4 shrink-0" />
          <span>Seu perfil está <strong>aprovado</strong> e visível no Mapa do Turismo.</span>
        </div>
      );
    }
    if (guide.status === "pending") {
      return (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <Clock className="h-4 w-4 shrink-0" />
          <span>Seu perfil está em <strong>análise</strong>. Você pode editar enquanto aguarda.</span>
        </div>
      );
    }
    return (
      <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 px-4 py-3 flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300">
        <XCircle className="h-4 w-4 shrink-0" />
        <span>Seu perfil foi <strong>rejeitado</strong>. Edite as informações e entre em contato com o suporte.</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Meu perfil de Guia</span>
          </div>
          <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in pb-32">
        <StatusBanner />

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-semibold border-b pb-2">1. Informações básicas</h2>
            <div>
              <Label>Foto de perfil</Label>
              <div className="mt-2">
                <GuidePhotoUploader value={form.photo_url} onChange={(v) => update("photo_url", v)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Nome completo</Label>
                <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Nome profissional</Label>
                <Input value={form.professional_name} onChange={(e) => update("professional_name", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>País</Label>
                <Select value={form.country} onValueChange={(v) => update("country", v)}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Regiões atendidas (separadas por vírgula)</Label>
              <Input value={form.regions} onChange={(e) => update("regions", e.target.value)} className="mt-1 rounded-xl" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-base font-semibold border-b pb-2">2. Idiomas</h2>
            <GuideLanguagesEditor value={form.languages} onChange={(v) => update("languages", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-base font-semibold border-b pb-2">3. Especialidades</h2>
            <ChipsMultiSelect options={SPECIALTY_OPTIONS} value={form.specialties} onChange={(v) => update("specialties", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-base font-semibold border-b pb-2">4. Serviços oferecidos</h2>
            <ChipsMultiSelect options={SERVICE_OPTIONS} value={form.services} onChange={(v) => update("services", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-base font-semibold border-b pb-2">5. Sobre você</h2>
            <div>
              <Label>Descrição profissional (bio)</Label>
              <Textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} rows={4} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>Diferenciais</Label>
              <Textarea value={form.differentials} onChange={(e) => update("differentials", e.target.value)} rows={3} className="mt-1 rounded-xl" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-base font-semibold border-b pb-2">6. Certificações</h2>
            <CertificationsEditor value={form.certifications} onChange={(v) => update("certifications", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-base font-semibold border-b pb-2">7. Galeria de fotos</h2>
            <GuideGalleryUploader value={form.gallery_urls} onChange={(v) => update("gallery_urls", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-base font-semibold border-b pb-2">8. Contato</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>E-mail de contato</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => update("instagram", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Site</Label>
                <Input value={form.website} onChange={(e) => update("website", e.target.value)} className="mt-1 rounded-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-card/95 backdrop-blur-sm z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Plano: <Badge variant="secondary" className="ml-1">{guide.plan_type === "premium" ? "Premium" : "Free"}</Badge>
          </p>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2 ml-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}
