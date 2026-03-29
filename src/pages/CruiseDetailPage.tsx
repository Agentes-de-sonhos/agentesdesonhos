import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCruises } from "@/hooks/useCruises";
import {
  Ship, ArrowLeft, Globe, MapPin, Users, Anchor, Waves, Compass,
  ExternalLink, Loader2, Info
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIA_COLORS: Record<string, string> = {
  Luxo: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  Premium: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
  Contemporaneo: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
};

const TIPO_META: Record<string, { icon: typeof Ship; color: string; label: string }> = {
  Oceanico: { icon: Anchor, color: "text-cyan-600 dark:text-cyan-400", label: "Oceânico" },
  Fluvial: { icon: Waves, color: "text-emerald-600 dark:text-emerald-400", label: "Fluvial" },
  Expedicao: { icon: Compass, color: "text-orange-600 dark:text-orange-400", label: "Expedição" },
};

export default function CruiseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useCruises();

  const company = companies.find((c) => c.id === id);
  const tipoMeta = company ? TIPO_META[company.tipo] : null;
  const TipoIcon = tipoMeta?.icon || Ship;
  const isLuxo = company?.categoria === "Luxo";

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="py-24 text-center space-y-4">
          <Ship className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground text-lg">Companhia não encontrada</p>
          <Button variant="outline" onClick={() => navigate("/mapa-turismo/cruzeiros")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/mapa-turismo/cruzeiros")} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Companhias Marítimas
        </Button>

        {/* Hero Header */}
        <Card className={cn(
          "border-0 overflow-hidden",
          isLuxo
            ? "bg-gradient-to-br from-amber-50 via-card to-card dark:from-amber-950/40 dark:via-card ring-1 ring-amber-200/60 dark:ring-amber-800/40"
            : "bg-card ring-1 ring-border/40"
        )}>
          {isLuxo && <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />}
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Logo */}
              <div className={cn(
                "h-20 w-20 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 ring-1",
                isLuxo
                  ? "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/60 dark:to-amber-950 ring-amber-200/50"
                  : "bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-950 dark:to-cyan-900 ring-border/50"
              )}>
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.nome} className="h-full w-full object-contain p-2" />
                ) : (
                  <Ship className={cn("h-10 w-10", isLuxo ? "text-amber-600 dark:text-amber-400" : "text-cyan-600 dark:text-cyan-400")} />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{company.nome}</h1>
                  {company.descricao_curta && (
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{company.descricao_curta}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={cn("gap-1.5 px-3 py-1 text-xs font-semibold border", CATEGORIA_COLORS[company.categoria] || "")}>
                    {isLuxo && <span>✦</span>}
                    {company.categoria === "Contemporaneo" ? "Contemporâneo" : company.categoria}
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs font-medium">
                    <TipoIcon className={cn("h-3.5 w-3.5", tipoMeta?.color)} />
                    {tipoMeta?.label || company.tipo}
                  </Badge>
                  {company.subtipo && (
                    <Badge variant="outline" className="px-3 py-1 text-xs">{company.subtipo}</Badge>
                  )}
                </div>

                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> {company.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Regiões */}
          <Card className="border-0 ring-1 ring-border/40 bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm">Regiões Atendidas</h2>
                  <p className="text-xs text-muted-foreground">{company.regioes.length} {company.regioes.length === 1 ? "região" : "regiões"}</p>
                </div>
              </div>
              {company.regioes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {company.regioes.map((r) => (
                    <Badge key={r.id} variant="outline" className="px-3 py-1.5 text-xs font-medium bg-muted/50 hover:bg-muted transition-colors">
                      <MapPin className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      {r.nome}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma região cadastrada</p>
              )}
            </CardContent>
          </Card>

          {/* Perfis */}
          <Card className="border-0 ring-1 ring-border/40 bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-accent/50 flex items-center justify-center">
                  <Users className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm">Perfil do Viajante</h2>
                  <p className="text-xs text-muted-foreground">{company.perfis.length} {company.perfis.length === 1 ? "perfil" : "perfis"}</p>
                </div>
              </div>
              {company.perfis.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {company.perfis.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/15"
                    >
                      {p.nome}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum perfil cadastrado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info tip */}
        {company.descricao_curta && (
          <Card className="border-0 ring-1 ring-border/40 bg-muted/30">
            <CardContent className="p-5 flex gap-3">
              <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Sobre a companhia</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{company.descricao_curta}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
