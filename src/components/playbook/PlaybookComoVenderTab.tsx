import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Eye,
  Users,
  Target,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
  XCircle,
  Handshake,
  CheckSquare,
  List,
  Clock,
  Zap,
  Check,
  ChevronRight,
  Circle,
  Copy,
} from "lucide-react";
import type { PlaybookSection, PlaybookBlock } from "@/types/playbook";
import { BlockRenderer } from "./BlockRenderer";
import { PlaybookInlineEditor } from "./PlaybookInlineEditor";
import { PlaybookPdfSection } from "./PlaybookPdfSection";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── Fixed section definitions ── */
const COMO_VENDER_SECTIONS = [
  { id: "visao_comercial", label: "Visão Comercial", icon: Eye },
  { id: "perfil_passageiro", label: "Psicologia do Passageiro", icon: Users },
  { id: "posicionamento", label: "Posicionamento na Venda", icon: Target },
  { id: "metodo_consultivo", label: "Venda Consultiva", icon: MessageSquare },
  { id: "roteiro_estrategico", label: "Roteiro Estratégico de Venda", icon: List },
  { id: "argumentos", label: "Argumentos de Venda", icon: TrendingUp },
  { id: "objecoes", label: "Objeções e Respostas", icon: ShieldCheck },
  { id: "upsell", label: "Estratégias de Upsell", icon: Handshake },
  { id: "erros", label: "Erros que Perdem Vendas", icon: XCircle },
  { id: "checklist", label: "Checklist Rápido", icon: CheckSquare },
] as const;

type SectionId = (typeof COMO_VENDER_SECTIONS)[number]["id"];

/* ── Helpers ── */
function getSectionBlocks(blocks: PlaybookBlock[] | undefined, sectionId: string): PlaybookBlock[] {
  if (!blocks) return [];
  return blocks.filter((b) => (b as any).section === sectionId);
}

function estimateReadingTime(intro?: string, blocks?: PlaybookBlock[]): number {
  let wordCount = 0;
  if (intro) {
    wordCount += intro.replace(/<[^>]+>/g, "").split(/\s+/).length;
  }
  if (blocks) {
    blocks.forEach((b) => {
      wordCount += (b.content || "").replace(/<[^>]+>/g, "").split(/\s+/).length;
      if (b.items) b.items.forEach((item) => (wordCount += item.split(/\s+/).length));
    });
  }
  return Math.max(1, Math.ceil(wordCount / 200));
}

/* ── Resumo Rápido block ── */
function ResumoRapido({ points }: { points: string[] }) {
  if (!points || points.length === 0) return null;

  return (
    <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-foreground tracking-tight">Resumo Rápido</h3>
      </div>
      <CardContent className="pt-1 pb-4 px-5">
        <ul className="space-y-2">
          {points.map((point, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85 leading-relaxed">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
              {point}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ── Section card with inline editing ── */
function SectionCard({
  sectionDef,
  blocks,
  intro,
  readingTime,
  onSaveIntro,
}: {
  sectionDef: (typeof COMO_VENDER_SECTIONS)[number];
  blocks: PlaybookBlock[];
  intro?: string;
  readingTime: number;
  onSaveIntro?: (html: string) => Promise<void>;
}) {
  const Icon = sectionDef.icon;

  return (
    <section id={`cv-${sectionDef.id}`} className="scroll-mt-28">
      <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden">
        {/* Section header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">{sectionDef.label}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">{readingTime} min de leitura</span>
          </div>
        </div>

        <CardContent className="pt-6 pb-8 space-y-5">
          <div className="max-w-prose">
            {onSaveIntro ? (
              <PlaybookInlineEditor
                content={intro || ""}
                onSave={onSaveIntro}
                placeholder="Conteúdo em breve para esta seção."
              />
            ) : (
              <>
                {!intro && blocks.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Conteúdo em breve para esta seção.</p>
                )}
                {intro && (
                  <div
                    className="playbook-content max-w-none text-foreground/85 leading-relaxed
                      [&>p]:mb-4 [&>h2]:mt-8 [&>h2]:mb-3 [&>h3]:mt-6 [&>h3]:mb-2
                      [&>ul]:space-y-1.5 [&>ol]:space-y-1.5"
                    dangerouslySetInnerHTML={{ __html: intro }}
                  />
                )}
              </>
            )}
          </div>

          {blocks.length > 0 && (
            <div className="space-y-4 max-w-prose">
              {blocks.map((block) => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/* ── Main component ── */
interface PlaybookComoVenderTabProps {
  section: PlaybookSection | undefined;
  onSaveSection?: (content: any) => Promise<void>;
}

export function PlaybookComoVenderTab({ section, onSaveSection }: PlaybookComoVenderTabProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("visao_comercial");
  const [visitedSections, setVisitedSections] = useState<Set<SectionId>>(new Set(["visao_comercial"]));

  // Parse section intros keyed by section id
  const sectionIntros: Record<string, string | undefined> = {};
  const sectionBlocks: Record<string, PlaybookBlock[]> = {};

  const content = section?.content as any;
  const allBlocks: PlaybookBlock[] = content?.blocks || [];
  const summaryPoints: string[] = content?.summary_points || [];

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
  const hasAnyContent = globalIntro || allBlocks.length > 0 || Object.values(sectionIntros).some(Boolean);

  // Reading time per section
  const readingTimes = useMemo(() => {
    const times: Record<string, number> = {};
    COMO_VENDER_SECTIONS.forEach((s) => {
      times[s.id] = estimateReadingTime(sectionIntros[s.id], sectionBlocks[s.id]);
    });
    return times;
  }, [section]);

  // Handle section navigation with progress tracking
  const handleSetActiveSection = useCallback((sectionId: SectionId) => {
    setActiveSection(sectionId);
    setVisitedSections((prev) => new Set([...prev, sectionId]));
  }, []);

  // Save handler for individual sub-sections
  const handleSaveSectionIntro = useCallback(
    async (sectionId: string, html: string) => {
      if (!onSaveSection) return;
      const currentContent = section?.content || {};
      const updatedContent = {
        ...currentContent,
        sections: {
          ...(currentContent as any).sections,
          [sectionId]: {
            ...((currentContent as any).sections?.[sectionId] || {}),
            intro: html,
          },
        },
      };
      await onSaveSection(updatedContent);
    },
    [onSaveSection, section]
  );

  const handleSavePdfUrl = useCallback(
    async (url: string | null) => {
      if (!onSaveSection) return;
      const currentContent = section?.content || {};
      await onSaveSection({ ...currentContent, pdf_url: url || undefined });
    },
    [onSaveSection, section]
  );

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

  // Find active section definition
  const activeDef = COMO_VENDER_SECTIONS.find((s) => s.id === activeSection)!;
  const activeIdx = COMO_VENDER_SECTIONS.findIndex((s) => s.id === activeSection);

  // Total reading time
  const totalReadingTime = Object.values(readingTimes).reduce((a, b) => a + b, 0);

  return (
    <div className="flex gap-6">
      {/* ── Sidebar / Table of Contents ── */}
      <nav className="hidden lg:block w-60 shrink-0">
        <div className="sticky top-24 space-y-1">
          {/* Progress summary */}
          <div className="px-3 pb-3 mb-2 border-b border-border/40">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Índice do Capítulo
            </p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{totalReadingTime} min de leitura total</span>
            </div>
            <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(visitedSections.size / COMO_VENDER_SECTIONS.length) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {visitedSections.size} de {COMO_VENDER_SECTIONS.length} seções visitadas
            </p>
          </div>

          {COMO_VENDER_SECTIONS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            const isVisited = visitedSections.has(s.id) && !isActive;
            const hasContent = sectionBlocks[s.id]?.length > 0 || sectionIntros[s.id];

            return (
              <button
                key={s.id}
                onClick={() => handleSetActiveSection(s.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 text-left group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-accent"
                )}
              >
                {/* Progress indicator */}
                <div className="w-4 flex items-center justify-center shrink-0">
                  {isActive ? (
                    <ChevronRight className="h-3.5 w-3.5" />
                  ) : isVisited ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Circle className="h-2.5 w-2.5 text-muted-foreground/40" />
                  )}
                </div>
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
            const isVisited = visitedSections.has(s.id) && !isActive;
            return (
              <button
                key={s.id}
                onClick={() => handleSetActiveSection(s.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isVisited
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/60 text-muted-foreground"
                )}
              >
                {isVisited && <Check className="h-3 w-3" />}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content: only the active section ── */}
      <div className="flex-1 min-w-0 pb-20 lg:pb-6 space-y-5">
        {/* Resumo Rápido - only on first section */}
        {activeSection === "visao_comercial" && (
          <ResumoRapido points={summaryPoints} />
        )}

        <SectionCard
          key={activeSection}
          sectionDef={activeDef}
          blocks={sectionBlocks[activeSection] || []}
          intro={sectionIntros[activeSection]}
          readingTime={readingTimes[activeSection] || 1}
          onSaveIntro={onSaveSection ? (html) => handleSaveSectionIntro(activeSection, html) : undefined}
        />

        {/* Section navigation */}
        <div className="flex items-center justify-between pt-2">
          {activeIdx > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => handleSetActiveSection(COMO_VENDER_SECTIONS[activeIdx - 1].id)}
            >
              ← {COMO_VENDER_SECTIONS[activeIdx - 1].label}
            </Button>
          ) : <div />}
          {activeIdx < COMO_VENDER_SECTIONS.length - 1 ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => handleSetActiveSection(COMO_VENDER_SECTIONS[activeIdx + 1].id)}
            >
              {COMO_VENDER_SECTIONS[activeIdx + 1].label} →
            </Button>
          ) : <div />}
        </div>

        {/* Optional PDF section */}
        <PlaybookPdfSection
          pdfUrl={content?.pdf_url}
          onSavePdfUrl={onSaveSection ? handleSavePdfUrl : undefined}
          tabLabel="Como Vender"
        />
      </div>
    </div>
  );
}
