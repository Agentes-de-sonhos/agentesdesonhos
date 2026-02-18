import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  BookOpen,
  Target,
  TrendingUp,
  FileText,
  Plane,
  MapPin,
  Hotel,
  Car,
  Camera,
  UtensilsCrossed,
  Package,
  Shield,
  Users,
  Route,
  AlertTriangle,
  Lightbulb,
  CheckSquare,
} from "lucide-react";
import { usePlaybook } from "@/hooks/usePlaybook";
import { PlaybookTabContent } from "./PlaybookTabContent";
import { PLAYBOOK_TABS } from "@/types/playbook";
import { cn } from "@/lib/utils";

const iconMap: Record<string, typeof Target> = {
  Target, TrendingUp, FileText, Plane, MapPin, Hotel, Car, Camera,
  UtensilsCrossed, Package, Shield, Users, Route, AlertTriangle, Lightbulb, CheckSquare,
};

export default function PlaybookViewer() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { destination, sections, isLoading } = usePlaybook(slug);
  const [activeTab, setActiveTab] = useState<string>(PLAYBOOK_TABS[0].key);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!destination) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold mb-2">Playbook não encontrado</h2>
          <p className="text-muted-foreground mb-4">O destino solicitado não existe ou foi desativado.</p>
          <Button variant="outline" onClick={() => navigate("/educa-academy")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à Academy
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const activeSection = sections.find((s) => s.tab_key === activeTab);
  const activeTabData = PLAYBOOK_TABS.find((t) => t.key === activeTab)!;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/educa-academy")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-5 w-5 text-primary shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Playbook Comercial
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground truncate">{destination.name}</h1>
            {destination.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{destination.description}</p>
            )}
          </div>
        </div>

        {/* Horizontal Tab Navigation */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 -mx-1 px-1">
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 pb-2">
              {PLAYBOOK_TABS.map((tab, index) => {
                const Icon = iconMap[tab.icon] || Target;
                const isActive = activeTab === tab.key;
                const hasContent = sections.some((s) => s.tab_key === tab.key);

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 border",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                        : hasContent
                        ? "bg-card text-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                        : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{index + 1}</span>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          <PlaybookTabContent
            section={activeSection}
            tabLabel={activeTabData.label}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
