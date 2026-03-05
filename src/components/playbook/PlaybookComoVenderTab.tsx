import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import type { PlaybookSection, PlaybookBlock } from "@/types/playbook";
import { BlockRenderer } from "./BlockRenderer";
import { PlaybookInlineEditor } from "./PlaybookInlineEditor";
import { PlaybookPdfSection } from "./PlaybookPdfSection";
import { cn } from "@/lib/utils";

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

/* ── Section card with inline editing ── */
function SectionCard({
  sectionDef,
  blocks,
  intro,
  onSaveIntro,
}: {
  sectionDef: (typeof COMO_VENDER_SECTIONS)[number];
  blocks: PlaybookBlock[];
  intro?: string;
  onSaveIntro?: (html: string) => Promise<void>;
}) {
  const Icon = sectionDef.icon;

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
                  className="playbook-content max-w-none text-foreground/85"
                  dangerouslySetInnerHTML={{ __html: intro }}
                />
              )}
            </>
          )}

          {blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
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

  // Parse section intros keyed by section id
  const sectionIntros: Record<string, string | undefined> = {};
  const sectionBlocks: Record<string, PlaybookBlock[]> = {};

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
  const hasAnyContent = globalIntro || allBlocks.length > 0 || Object.values(sectionIntros).some(Boolean);

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

  return (
    <div className="flex gap-6">
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
                onClick={() => setActiveSection(s.id)}
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
                onClick={() => setActiveSection(s.id)}
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

      {/* ── Main content: only the active section ── */}
      <div className="flex-1 min-w-0 pb-20 lg:pb-6 space-y-4">
        <SectionCard
          key={activeSection}
          sectionDef={activeDef}
          blocks={sectionBlocks[activeSection] || []}
          intro={sectionIntros[activeSection]}
          onSaveIntro={onSaveSection ? (html) => handleSaveSectionIntro(activeSection, html) : undefined}
        />

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
