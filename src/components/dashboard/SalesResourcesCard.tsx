import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Plane,
  Images,
  ChevronDown,
  ArrowRight,
  Loader2,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMaterials } from "@/hooks/useMaterials";
import { SocialPostCard } from "@/components/materials/SocialPostCard";
import { useMemo } from "react";

interface ResourceItem {
  title: string;
  icon: LucideIcon;
  url: string;
}

const ITEMS: ResourceItem[] = [
  { title: "Bloqueios Aéreos", icon: Plane, url: "/bloqueios-aereos" },
  { title: "Materiais de Divulgação", icon: Images, url: "/materiais" },
];

export function SalesResourcesCard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const { materials, isLoading, groupIntoGalleries } = useMaterials();

  const recentGalleries = useMemo(() => {
    if (!materials) return [];
    return groupIntoGalleries(materials).slice(0, 3);
  }, [materials, groupIntoGalleries]);

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[hsl(var(--section-news))]" />
              Recursos de Vendas
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-news))]" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mt-1 text-muted-foreground hover:text-foreground transition-transform flex-shrink-0"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expandir seção" : "Recolher seção"}
            aria-expanded={!collapsed}
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
          </Button>
        </div>

        {!collapsed && (
          <div className="space-y-5">
            {/* Compact top: info + shortcut buttons side by side */}
            <div className="flex flex-col md:flex-row md:items-stretch gap-3 w-full">
              <div className="flex-1 rounded-xl bg-[hsl(var(--section-news))]/5 border border-[hsl(var(--section-news))]/15 px-3 py-2.5 space-y-0.5">
                <p className="text-sm font-semibold text-foreground leading-tight">💼 Mais oportunidades para vender</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Encontre bloqueios aéreos exclusivos e materiais prontos para impulsionar suas vendas.
                </p>
              </div>
              <div className="flex flex-row gap-2 md:flex-shrink-0">
                {ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.url}
                      onClick={() => navigate(item.url)}
                      aria-label={`Acessar ${item.title}`}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 border border-transparent flex-1 md:flex-initial",
                        "bg-[hsl(var(--section-news))]/15 text-[hsl(var(--section-news))]",
                        "hover:scale-[1.02] hover:shadow-md hover:border-border/50"
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} />
                      <span className="leading-tight">{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent materials preview */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentGalleries.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Nenhum material disponível no momento.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
                  {recentGalleries.map((gallery) => (
                    <SocialPostCard key={gallery.id} gallery={gallery} />
                  ))}
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/materiais")}
                    className="gap-1"
                  >
                    Ver todos os materiais
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}