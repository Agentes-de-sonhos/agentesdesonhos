import { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Info, CheckSquare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { PlaybookSection } from "@/types/playbook";
import { BlockRenderer } from "./BlockRenderer";
import { PlaybookInlineEditor } from "./PlaybookInlineEditor";
import { cn } from "@/lib/utils";

interface PlaybookChecklistTabProps {
  section: PlaybookSection | undefined;
  destinationSlug: string;
  onSaveSection?: (content: any) => Promise<void>;
}

/* ── Types ── */
interface ChecklistSection {
  title: string;
  items: string[];
}

interface ParsedChecklist {
  sections: ChecklistSection[];
  footer: string | null;
}

/* ── Parsing ── */

/** Detect if a line is a section header like "1. Title", "2. Title", etc. */
function isSectionHeader(text: string): boolean {
  return /^\s*\d+[\.\)\-]\s+/.test(text);
}

/** Detect closing/motivational phrases that should NOT be checklist items */
function isFooterPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("resultado de um checklist") ||
    lower.includes("profissional que segue") ||
    lower.includes("checklist bem aplicado") ||
    lower.includes("bom trabalho") ||
    lower.includes("sucesso nas vendas") ||
    (text.startsWith("✅") && text.length > 60) ||
    (text.startsWith("🎯") && text.length > 60) ||
    (text.startsWith("💡") && text.length > 60)
  );
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function parseChecklistSections(html: string | undefined): ParsedChecklist {
  if (!html) return { sections: [], footer: null };

  // Convert HTML to lines
  const raw = html
    .replace(/<\/?(ul|ol)[^>]*>/gi, "")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<h[1-6][^>]*>/gi, "\n");

  const lines = raw
    .split("\n")
    .map((l) => l.replace(/<[^>]*>/g, "").trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { sections: [], footer: null };

  const sections: ChecklistSection[] = [];
  let currentSection: ChecklistSection | null = null;
  let footer: string | null = null;

  for (const line of lines) {
    // Check if it's a footer/closing phrase
    if (isFooterPhrase(line)) {
      footer = line;
      continue;
    }

    // Check if it's a section header
    if (isSectionHeader(line)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line,
        items: [],
      };
      continue;
    }

    // It's a regular item
    if (currentSection) {
      // Clean leading bullets/dashes
      const cleaned = line.replace(/^[\-•●◦▪︎▸►→☐☑✓✔\*]\s*/, "").trim();
      if (cleaned.length > 0) {
        currentSection.items.push(cleaned);
      }
    } else {
      // No section yet — create a default one
      currentSection = { title: "", items: [] };
      const cleaned = line.replace(/^[\-•●◦▪︎▸►→☐☑✓✔\*]\s*/, "").trim();
      if (cleaned.length > 0) {
        currentSection.items.push(cleaned);
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return { sections, footer };
}

function getStorageKey(slug: string) {
  return `playbook-checklist-${slug}`;
}

/** Get total item count across all sections */
function getTotalItems(sections: ChecklistSection[]): number {
  return sections.reduce((sum, s) => sum + s.items.length, 0);
}

/** Build a global index for an item within a section */
function getGlobalIndex(sections: ChecklistSection[], sectionIdx: number, itemIdx: number): number {
  let idx = 0;
  for (let s = 0; s < sectionIdx; s++) {
    idx += sections[s].items.length;
  }
  return idx + itemIdx;
}

export function PlaybookChecklistTab({
  section,
  destinationSlug,
  onSaveSection,
}: PlaybookChecklistTabProps) {
  const storageKey = getStorageKey(destinationSlug);

  const handleSaveIntro = useCallback(
    async (html: string) => {
      if (!onSaveSection) return;
      const currentContent = section?.content || {};
      await onSaveSection({ ...currentContent, intro: html });
    },
    [onSaveSection, section]
  );

  const intro = section?.content?.intro || "";
  const parsed = useMemo(() => parseChecklistSections(intro), [intro]);

  // Load checked state from localStorage
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch {
      // ignore
    }
  }, [checked, storageKey]);

  const toggleItem = (globalIdx: number) => {
    setChecked((prev) => ({ ...prev, [globalIdx]: !prev[globalIdx] }));
  };

  const resetAll = () => setChecked({});

  const totalItems = getTotalItems(parsed.sections);
  const checkedCount = Array.from({ length: totalItems }, (_, i) => i).filter(
    (i) => checked[i]
  ).length;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  const hasContent =
    intro || (section?.content?.blocks && section.content.blocks.length > 0);

  // Empty state
  if (!section || !hasContent) {
    if (onSaveSection) {
      return (
        <div className="space-y-4">
          <PlaybookInlineEditor
            content=""
            onSave={handleSaveIntro}
            placeholder="Cole seu checklist aqui. Seções numeradas (1. Título) serão mantidas como cabeçalhos e os itens abaixo viram checkboxes."
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Info className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Checklist Final</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Conteúdo em breve. Esta seção será preenchida com o checklist final do destino.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin inline editor */}
      {onSaveSection && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-5 pb-4">
            <PlaybookInlineEditor
              content={intro}
              onSave={handleSaveIntro}
              placeholder="Cole o checklist aqui. Seções numeradas serão mantidas como cabeçalhos."
            >
              {parsed.sections.length > 0 && (
                <SectionedChecklistDisplay
                  parsed={parsed}
                  checked={checked}
                  onToggle={toggleItem}
                  onReset={resetAll}
                  progress={progress}
                  checkedCount={checkedCount}
                  totalItems={totalItems}
                  getGlobalIndex={(sIdx, iIdx) =>
                    getGlobalIndex(parsed.sections, sIdx, iIdx)
                  }
                />
              )}
            </PlaybookInlineEditor>
          </CardContent>
        </Card>
      )}

      {/* Agent view: interactive checklist */}
      {!onSaveSection && parsed.sections.length > 0 && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-5 pb-4">
            <SectionedChecklistDisplay
              parsed={parsed}
              checked={checked}
              onToggle={toggleItem}
              onReset={resetAll}
              progress={progress}
              checkedCount={checkedCount}
              totalItems={totalItems}
              getGlobalIndex={(sIdx, iIdx) =>
                getGlobalIndex(parsed.sections, sIdx, iIdx)
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Render remaining blocks */}
      {section?.content?.blocks?.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}

/* ── Sectioned Checklist Display ── */
function SectionedChecklistDisplay({
  parsed,
  checked,
  onToggle,
  onReset,
  progress,
  checkedCount,
  totalItems,
  getGlobalIndex,
}: {
  parsed: ParsedChecklist;
  checked: Record<number, boolean>;
  onToggle: (globalIdx: number) => void;
  onReset: () => void;
  progress: number;
  checkedCount: number;
  totalItems: number;
  getGlobalIndex: (sectionIdx: number, itemIdx: number) => number;
}) {
  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CheckSquare className="h-5 w-5 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            {checkedCount} de {totalItems} concluídos
          </span>
        </div>
        {checkedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground gap-1"
            onClick={onReset}
          >
            <RotateCcw className="h-3 w-3" />
            Resetar
          </Button>
        )}
      </div>
      <Progress value={progress} className="h-2" />

      {/* Sections */}
      <div className="space-y-6">
        {parsed.sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {/* Section header */}
            {section.title && (
              <h3 className="text-base font-bold text-foreground mb-2 mt-1">
                {section.title}
              </h3>
            )}

            {/* Items */}
            <ul className="space-y-1">
              {section.items.map((item, iIdx) => {
                const globalIdx = getGlobalIndex(sIdx, iIdx);
                const isChecked = !!checked[globalIdx];
                return (
                  <li
                    key={iIdx}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50",
                      isChecked && "bg-primary/5"
                    )}
                    onClick={() => onToggle(globalIdx)}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => onToggle(globalIdx)}
                      className="mt-0.5 shrink-0"
                    />
                    <span
                      className={cn(
                        "text-sm leading-relaxed transition-all duration-200",
                        isChecked
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      )}
                    >
                      {item}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer phrase */}
      {parsed.footer && (
        <div className="mt-4 p-4 rounded-lg bg-accent/30 border border-border">
          <p className="text-sm text-foreground/80 italic text-center leading-relaxed">
            {parsed.footer}
          </p>
        </div>
      )}

      {progress === 100 && (
        <div className="text-center py-3 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
          ✅ Checklist completo! Parabéns!
        </div>
      )}
    </div>
  );
}
