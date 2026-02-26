import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  AlertTriangle,
  Target,
  Zap,
  Eye,
  Users,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
  XCircle,
  Handshake,
  CheckSquare,
  List,
  ChevronRight,
  Info,
} from "lucide-react";
import type { PlaybookSection, PlaybookBlock } from "@/types/playbook";
import { cn } from "@/lib/utils";

/* ── Fixed section definitions ── */
const COMO_VENDER_SECTIONS = [
  { id: "visao_comercial", label: "Visão Comercial", icon: Eye },
  { id: "perfil_passageiro", label: "Perfil do Passageiro", icon: Users },
  { id: "posicionamento", label: "Posicionamento na Venda", icon: Target },
  { id: "metodo_consultivo", label: "Venda Consultiva", icon: MessageSquare },
  { id: "sete_passos", label: "7 Passos da Venda", icon: List },
  { id: "argumentos", label: "Argumentos Prontos", icon: TrendingUp },
  { id: "objecoes", label: "Objeções e Respostas", icon: ShieldCheck },
  { id: "erros", label: "Erros que Perdem Vendas", icon: XCircle },
  { id: "fechamento", label: "Estratégias de Fechamento", icon: Handshake },
  { id: "checklist", label: "Checklist Rápido", icon: CheckSquare },
] as const;

type SectionId = (typeof COMO_VENDER_SECTIONS)[number]["id"];

/* ── Block type config ── */
const blockStyleMap: Record<string, { icon: typeof Lightbulb; label: string; border: string; bg: string; iconColor: string }> = {
  tip: { icon: Lightbulb, label: "Dica", border: "border-l-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", iconColor: "text-amber-600" },
  alert: { icon: AlertTriangle, label: "Atenção", border: "border-l-red-500", bg: "bg-red-50 dark:bg-red-950/30", iconColor: "text-red-600" },
  strategy: { icon: Target, label: "Estratégia", border: "border-l-primary", bg: "bg-sky-50 dark:bg-sky-950/30", iconColor: "text-primary" },
  insight: { icon: Zap, label: "Insight", border: "border-l-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30", iconColor: "text-violet-600" },
  highlight: { icon: Zap, label: "Destaque", border: "border-l-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30", iconColor: "text-violet-600" },
  checklist: { icon: CheckSquare, label: "Checklist", border: "border-l-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", iconColor: "text-emerald-600" },
  text: { icon: Info, label: "Informação", border: "border-l-border", bg: "bg-card", iconColor: "text-muted-foreground" },
};

/* ── Helpers ── */
function getSectionBlocks(blocks: PlaybookBlock[] | undefined, sectionId: string): PlaybookBlock[] {
  if (!blocks) return [];
  return blocks.filter((b) => (b as any).section === sectionId);
}

/* ── Inline block renderer ── */
function ContentBlock({ block }: { block: PlaybookBlock }) {
  const style = blockStyleMap[block.type] || blockStyleMap.text;
  const Icon = style.icon;

  if (block.type === "text") {
    return (
      <div className="space-y-2">
        {block.title && <h4 className="font-semibold text-foreground">{block.title}</h4>}
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{block.content}</p>
        {block.items && block.items.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border-l-4 p-4 space-y-2", style.border, style.bg)}>
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg bg-background/80 shadow-sm", style.iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold">
          {style.label}
        </Badge>
        {block.title && <span className="font-semibold text-sm text-foreground">{block.title}</span>}
      </div>
      <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{block.content}</p>
      {block.items && block.items.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
              {block.type === "checklist" ? (
                <CheckSquare className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              )}
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Section card ── */
function SectionCard({ sectionDef, blocks, intro }: { sectionDef: (typeof COMO_VENDER_SECTIONS)[number]; blocks: PlaybookBlock[]; intro?: string }) {
  const Icon = sectionDef.icon;
  const hasContent = intro || blocks.length > 0;

  return (
    <section id={`cv-${sectionDef.id}`} className="scroll-mt-28">
      <Card className="border-0 shadow-sm overflow-hidden">
        {/* Section header bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-foreground">{sectionDef.label}</h3>
        </div>

        <CardContent className="pt-5 pb-6 space-y-4">
          {!hasContent && (
            <p className="text-sm text-muted-foreground italic">Conteúdo em breve para esta seção.</p>
          )}

          {intro && (
            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{intro}</p>
          )}

          {blocks.map((block) => (
            <ContentBlock key={block.id} block={block} />
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

/* ── Main component ── */
interface PlaybookComoVenderTabProps {
  section: PlaybookSection | undefined;
}

export function PlaybookComoVenderTab({ section }: PlaybookComoVenderTabProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("visao_comercial");
  const containerRef = useRef<HTMLDivElement>(null);

  // Observe which section is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.id.replace("cv-", "") as SectionId;
          setActiveSection(id);
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0.1 }
    );

    COMO_VENDER_SECTIONS.forEach((s) => {
      const el = document.getElementById(`cv-${s.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [section]);

  const scrollTo = useCallback((id: SectionId) => {
    const el = document.getElementById(`cv-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Parse section intros keyed by section id
  const sectionIntros: Record<string, string | undefined> = {};
  const sectionBlocks: Record<string, PlaybookBlock[]> = {};

  // Content structure: section.content may have a `sections` map or flat blocks with `section` field
  const content = section?.content as any;
  const allBlocks: PlaybookBlock[] = content?.blocks || [];

  COMO_VENDER_SECTIONS.forEach((s) => {
    sectionIntros[s.id] = content?.sections?.[s.id]?.intro;
    sectionBlocks[s.id] = getSectionBlocks(allBlocks, s.id);
  });

  // Fallback: if no blocks have section field, distribute all blocks to first section
  const hasAnySectionField = allBlocks.some((b: any) => b.section);
  if (!hasAnySectionField && allBlocks.length > 0) {
    sectionBlocks["visao_comercial"] = allBlocks;
  }

  const globalIntro = content?.intro;

  // Check if there's any content at all
  const hasAnyContent = globalIntro || allBlocks.length > 0 || Object.values(sectionIntros).some(Boolean);

  if (!section && !hasAnyContent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <TrendingUp className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Como Vender</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Conteúdo em breve. Esta seção será preenchida com estratégias de venda para este destino.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-6" ref={containerRef}>
      {/* ── Sidebar / Table of Contents ── */}
      <nav className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-24 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-2">
            Índice
          </p>
          {COMO_VENDER_SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            const hasContent = sectionBlocks[s.id]?.length > 0 || sectionIntros[s.id];

            return (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 text-left",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : hasContent
                    ? "text-foreground hover:bg-accent"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile TOC (horizontal scroll) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t px-3 py-2 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {COMO_VENDER_SECTIONS.map((s) => {
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground"
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 space-y-6 pb-20 lg:pb-6">
        {/* Global intro */}
        {globalIntro && (
          <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{globalIntro}</p>
            </CardContent>
          </Card>
        )}

        {/* Render each section */}
        {COMO_VENDER_SECTIONS.map((s) => (
          <SectionCard
            key={s.id}
            sectionDef={s}
            blocks={sectionBlocks[s.id] || []}
            intro={sectionIntros[s.id]}
          />
        ))}
      </div>
    </div>
  );
}
