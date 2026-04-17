import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, MapPin, Globe, Instagram, BadgeCheck, MessageCircle, Mail, Award,
} from "lucide-react";
import { LANGUAGE_LEVELS } from "@/i18n/cadastroGuia";

const levelLabel = (lv: string) => LANGUAGE_LEVELS.find((l) => l.value === lv)?.label || lv;

export default function GuideDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: guide, isLoading } = useQuery({
    queryKey: ["tour-guide", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("tour_guides")
        .select("*")
        .eq("id", id)
        .eq("status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </DashboardLayout>
    );
  }

  if (!guide) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 space-y-3">
          <p className="text-muted-foreground">Guia não encontrado.</p>
          <Button variant="outline" onClick={() => navigate("/mapa-turismo?categoria=Guias")}>Voltar</Button>
        </div>
      </DashboardLayout>
    );
  }

  const langs = (guide.languages as Array<{ code: string; level: string }>) || [];
  const wppHref = `https://wa.me/${guide.whatsapp.replace(/\D/g, "")}`;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/mapa-turismo?categoria=Guias")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar para Guias
        </Button>

        {/* Hero */}
        <Card className="overflow-hidden border-0 shadow-card">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden bg-muted ring-2 ring-border shrink-0">
                {guide.photo_url ? (
                  <img src={guide.photo_url} alt={guide.full_name} className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    {guide.professional_name || guide.full_name}
                  </h1>
                  {guide.is_verified && (
                    <Badge variant="secondary" className="gap-1">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verificado
                    </Badge>
                  )}
                </div>
                {guide.professional_name && guide.professional_name !== guide.full_name && (
                  <p className="text-sm text-muted-foreground">{guide.full_name}</p>
                )}
                {(guide.city || guide.country) && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[guide.city, guide.country].filter(Boolean).join(", ")}
                  </p>
                )}
                {langs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {langs.map((l, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {l.code} · {levelLabel(l.level)}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-3">
                  <Button asChild size="sm" className="gap-2">
                    <a href={wppHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                  {guide.email && (
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={`mailto:${guide.email}`}><Mail className="h-4 w-4" /> E-mail</a>
                    </Button>
                  )}
                  {guide.instagram && (
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={guide.instagram.startsWith("http") ? guide.instagram : `https://instagram.com/${guide.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer">
                        <Instagram className="h-4 w-4" /> Instagram
                      </a>
                    </Button>
                  )}
                  {guide.website && (
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={guide.website} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" /> Site</a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {guide.bio && (
              <Card><CardContent className="p-6">
                <h3 className="font-semibold mb-2">Sobre</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{guide.bio}</p>
              </CardContent></Card>
            )}
            {guide.differentials && (
              <Card><CardContent className="p-6">
                <h3 className="font-semibold mb-2">Diferenciais</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{guide.differentials}</p>
              </CardContent></Card>
            )}
            {guide.gallery_urls && guide.gallery_urls.length > 0 && (
              <Card><CardContent className="p-6">
                <h3 className="font-semibold mb-3">Galeria</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {guide.gallery_urls.map((url: string) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-xl overflow-hidden bg-muted block">
                      <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </a>
                  ))}
                </div>
              </CardContent></Card>
            )}
          </div>

          <div className="space-y-4">
            {guide.specialties && guide.specialties.length > 0 && (
              <Card><CardContent className="p-5">
                <h3 className="font-semibold mb-2 text-sm">Especialidades</h3>
                <div className="flex flex-wrap gap-1.5">
                  {guide.specialties.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </CardContent></Card>
            )}
            {guide.services && guide.services.length > 0 && (
              <Card><CardContent className="p-5">
                <h3 className="font-semibold mb-2 text-sm">Serviços</h3>
                <div className="flex flex-wrap gap-1.5">
                  {guide.services.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </CardContent></Card>
            )}
            {guide.regions && guide.regions.length > 0 && (
              <Card><CardContent className="p-5">
                <h3 className="font-semibold mb-2 text-sm">Regiões atendidas</h3>
                <div className="flex flex-wrap gap-1.5">
                  {guide.regions.map((r: string) => (
                    <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                  ))}
                </div>
              </CardContent></Card>
            )}
            {guide.certifications && guide.certifications.length > 0 && (
              <Card><CardContent className="p-5">
                <h3 className="font-semibold mb-2 text-sm flex items-center gap-1"><Award className="h-4 w-4" /> Certificações</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {guide.certifications.map((c: string, i: number) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </CardContent></Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
