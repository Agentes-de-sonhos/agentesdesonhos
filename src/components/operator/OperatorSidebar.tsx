import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tag,
  Globe,
  Instagram,
  ExternalLink,
  Info,
  CalendarDays,
  DollarSign,
  Users,
  UserCheck,
} from "lucide-react";

interface OperatorSidebarProps {
  operator: {
    specialties?: string | null;
    website?: string | null;
    instagram?: string | null;
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

export function OperatorSidebar({ operator }: OperatorSidebarProps) {
  const tags = operator.specialties?.split(",").map((s) => s.trim()).filter(Boolean) || [];

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

  return (
    <div className="space-y-5 lg:sticky lg:top-6">
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

      {/* Links */}
      {(operator.website || operator.instagram) && (
        <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Outras Redes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {operator.website && (
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl border-border/80 hover:border-primary/30 hover:bg-primary/5 transition-all"
                onClick={() => safeOpen(operator.website)}
              >
                <Globe className="h-4 w-4 mr-2 text-primary" />
                Website
                <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
              </Button>
            )}
            {operator.instagram && (
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl border-border/80 hover:border-pink-400/30 hover:bg-pink-50 transition-all"
                onClick={() => safeOpen(operator.instagram)}
              >
                <Instagram className="h-4 w-4 mr-2 text-pink-500" />
                Instagram
                <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Company Info */}
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
    </div>
  );
}
