import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tag,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  ExternalLink,
  Info,
  CalendarDays,
  DollarSign,
  Users,
  UserCheck,
  Share2,
} from "lucide-react";

interface OperatorSidebarProps {
  operator: {
    specialties?: string | null;
    website?: string | null;
    instagram?: string | null;
    social_links?: Record<string, string> | null;
    category: string;
    founded_year?: number | null;
    annual_revenue?: string | null;
    employees?: number | null;
    executive_team?: string | null;
  };
}

const safeOpen = (url: string | null | undefined) => {
  if (!url) return;
  const sanitized =
    url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  window.open(sanitized, "_blank", "noopener,noreferrer");
};

const chipColors = [
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-cyan-50 text-cyan-700 border-cyan-200",
];

const socialConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  website: { icon: Globe, label: "Website", color: "text-primary" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-pink-500" },
  facebook: { icon: Facebook, label: "Facebook", color: "text-blue-600" },
  linkedin: { icon: Linkedin, label: "LinkedIn", color: "text-blue-700" },
  youtube: { icon: Youtube, label: "YouTube", color: "text-red-600" },
  tiktok: { icon: Share2, label: "TikTok", color: "text-foreground" },
};

export function OperatorSidebar({ operator }: OperatorSidebarProps) {
  const tags = operator.specialties?.split(",").map((s) => s.trim()).filter(Boolean) || [];

  // Build social links list from legacy fields + social_links JSON
  const socialLinks: { key: string; url: string }[] = [];
  if (operator.website) socialLinks.push({ key: "website", url: operator.website });
  if (operator.instagram) socialLinks.push({ key: "instagram", url: operator.instagram });
  if (operator.social_links && typeof operator.social_links === "object") {
    Object.entries(operator.social_links).forEach(([key, url]) => {
      if (url && !socialLinks.find((s) => s.key === key)) {
        socialLinks.push({ key, url: String(url) });
      }
    });
  }

  const infoItems = [
    { icon: Tag, label: "Categoria", value: operator.category },
    operator.founded_year && {
      icon: CalendarDays,
      label: "Ano de Fundação",
      value: String(operator.founded_year),
    },
    operator.annual_revenue && {
      icon: DollarSign,
      label: "Faturamento Anual",
      value: operator.annual_revenue,
    },
    operator.employees && {
      icon: Users,
      label: "Funcionários",
      value: String(operator.employees),
    },
    operator.executive_team && {
      icon: UserCheck,
      label: "Equipe Executiva",
      value: operator.executive_team,
    },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  // Only show company info if there's meaningful data beyond an empty category
  const hasCompanyInfo = infoItems.some(item => item.value && item.value.trim() !== "");

  return (
    <div className="space-y-5">
      {/* Specialties */}
      {tags.length > 0 && (
        <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Tag className="h-4 w-4 text-violet-600" />
              </div>
              Especialidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 hover:scale-105 cursor-default ${chipColors[i % chipColors.length]}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Share2 className="h-4 w-4 text-primary" />
              </div>
              Redes Sociais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {socialLinks.map(({ key, url }) => {
              const config = socialConfig[key] || { icon: ExternalLink, label: key, color: "text-muted-foreground" };
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => safeOpen(url)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors text-left"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                  <span className="truncate">{config.label}</span>
                  <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Company Info — rendered only once, only if there's data */}
      {hasCompanyInfo && (
        <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Info className="h-4 w-4 text-primary" />
              </div>
              Informações da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {infoItems.map(({ icon: Icon, label, value }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-muted/80 flex items-center justify-center mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
