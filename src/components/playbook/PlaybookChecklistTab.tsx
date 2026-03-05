import { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Info, CheckSquare, RotateCcw, Sparkles, Quote, Trophy } from "lucide-react";
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
  notes: string[]; // "Dica estratégica", "Regra de ouro", etc.
}

interface ParsedChecklist {
  introTitle: string | null;
  introText: string | null;
  sections: ChecklistSection[];
  closingBlocks: ClosingBlock[];
}

interface ClosingBlock {
  type: "quote" | "list" | "text";
  title?: string;
  content: string[];
}

/* ── Parsing ── */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function parseChecklistSections(html: string | undefined): ParsedChecklist {
  if (!html) return { introTitle: null, introText: null, sections: [], closingBlocks: [] };

  // Split by <hr> to get major blocks
  const blocks = html.split(/<hr\s*\/?>/i).map((b) => b.trim()).filter(Boolean);

  let introTitle: string | null = null;
  let introText: string | null = null;
  const sections: ChecklistSection[] = [];
  const closingBlocks: ClosingBlock[] = [];
  let pastNumberedSections = false;

  for (const block of blocks) {
    // Extract h1/h2/h3 title from this block
    const headingMatch = block.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
    const title = headingMatch ? stripTags(headingMatch[1]) : null;

    // Check if this is a numbered section (e.g., "1. Diagnóstico do Cliente")
    const isNumbered = title && /^\d+[\.\)\-]\s+/.test(title);

    if (isNumbered && !pastNumberedSections) {
      // Extract <li> items
      const liMatches = block.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
      const items = liMatches
        ? liMatches.map((li) => stripTags(li)).filter((t) => t.length > 0)
        : [];

      // Extract notes (paragraphs outside lists that aren't headings)
      const withoutHeadingsAndLists = block
        .replace(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/gi, "")
        .replace(/<ul[^>]*>[\s\S]*?<\/ul>/gi, "")
        .replace(/<ol[^>]*>[\s\S]*?<\/ol>/gi, "");
      const noteLines = stripTags(withoutHeadingsAndLists)
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      sections.push({ title: title!, items, notes: noteLines });
    } else if (!title && sections.length === 0 && !introTitle) {
      // Possible intro without heading — skip
    } else if (title && !isNumbered && sections.length === 0) {
      // Intro heading + text
      introTitle = title;
      const rest = block.replace(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/gi, "");
      introText = stripTags(rest) || null;
    } else {
      // Post-numbered-sections content (closing blocks)
      pastNumberedSections = true;

      const hasQuote = /<blockquote/i.test(block);
      const liMatches = block.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);

      if (hasQuote) {
        const quoteMatch = block.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
        closingBlocks.push({
          type: "quote",
          title: title || undefined,
          content: quoteMatch ? [stripTags(quoteMatch[1])] : [],
        });
      } else if (liMatches && liMatches.length > 0) {
        const items = liMatches.map((li) => stripTags(li)).filter(Boolean);
        // Also get trailing paragraph
        const afterList = block
          .replace(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/gi, "")
          .replace(/<ul[^>]*>[\s\S]*?<\/ul>/gi, "")
          .replace(/<ol[^>]*>[\s\S]*?<\/ol>/gi, "");
        const trailing = stripTags(afterList);
        const allContent = [...items];
        if (trailing) allContent.push(trailing);
        closingBlocks.push({
          type: "list",
          title: title || undefined,
          content: allContent,
        });
      } else if (title) {
        const rest = block.replace(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/gi, "");
        closingBlocks.push({
          type: "text",
          title,
          content: stripTags(rest) ? [stripTags(rest)] : [],
        });
      }
    }
  }

  return { introTitle, introText, sections, closingBlocks };
}

function getStorageKey(slug: string) {
  return `playbook-checklist-${slug}`;
}

function getTotalItems(sections: ChecklistSection[]): number {
  return sections.reduce((sum, s) => sum + s.items.length, 0);
}

function getGlobalIndex(sections: ChecklistSection[], sectionIdx: number, itemIdx: number): number {
  let idx = 0;
  for (let s = 0; s < sectionIdx; s++) idx += sections[s].items.length;
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

  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch {}
  }, [checked, storageKey]);

  const toggleItem = (globalIdx: number) => {
    setChecked((prev) => ({ ...prev, [globalIdx]: !prev[globalIdx] }));
  };
  const resetAll = () => setChecked({});

  const totalItems = getTotalItems(parsed.sections);
  const checkedCount = Array.from({ length: totalItems }, (_, i) => i).filter((i) => checked[i]).length;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  const hasContent = intro || (section?.content?.blocks && section.content.blocks.length > 0);

  if (!section || !hasContent) {
    if (onSaveSection) {
      return (
        <div className="space-y-4">
          <PlaybookInlineEditor
            content=""
            onSave={handleSaveIntro}
            placeholder="Cole seu checklist aqui. Seções com H1 numeradas serão mantidas como cabeçalhos."
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

  const checklistContent = (
    <SectionedChecklistDisplay
      parsed={parsed}
      checked={checked}
      onToggle={toggleItem}
      onReset={resetAll}
      progress={progress}
      checkedCount={checkedCount}
      totalItems={totalItems}
      getGlobalIndex={(sIdx, iIdx) => getGlobalIndex(parsed.sections, sIdx, iIdx)}
    />
  );

  return (
    <div className="space-y-4">
      {onSaveSection && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-5 pb-4">
            <PlaybookInlineEditor
              content={intro}
              onSave={handleSaveIntro}
              placeholder="Cole o checklist aqui."
            >
              {parsed.sections.length > 0 && checklistContent}
            </PlaybookInlineEditor>
          </CardContent>
        </Card>
      )}

      {!onSaveSection && parsed.sections.length > 0 && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-5 pb-4">{checklistContent}</CardContent>
        </Card>
      )}

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
    <div className="space-y-6">
      {/* Intro */}
      {parsed.introTitle && (
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-foreground mb-1">{parsed.introTitle}</h2>
          {parsed.introText && (
            <p className="text-sm text-muted-foreground">{parsed.introText}</p>
          )}
        </div>
      )}

      {/* Progress header */}
      <div className="space-y-2">
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
      </div>

      {/* Numbered sections */}
      <div className="space-y-6">
        {parsed.sections.map((section, sIdx) => {
          const sectionTotal = section.items.length;
          const sectionChecked = section.items.filter(
            (_, iIdx) => !!checked[getGlobalIndex(sIdx, iIdx)]
          ).length;
          const sectionDone = sectionTotal > 0 && sectionChecked === sectionTotal;

          return (
            <div
              key={sIdx}
              className={cn(
                "rounded-xl border p-4 transition-all duration-300",
                sectionDone
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              {/* Section header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-foreground">{section.title}</h3>
                <span className="text-xs text-muted-foreground font-medium">
                  {sectionChecked}/{sectionTotal}
                </span>
              </div>

              {/* Checklist items */}
              <ul className="space-y-1 mb-1">
                {section.items.map((item, iIdx) => {
                  const globalIdx = getGlobalIndex(sIdx, iIdx);
                  const isChecked = !!checked[globalIdx];
                  return (
                    <li
                      key={iIdx}
                      className={cn(
                        "flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50",
                        isChecked && "bg-primary/5"
                      )}
                      onClick={() => onToggle(globalIdx)}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => onToggle(globalIdx)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 shrink-0"
                      />
                      <span
                        className={cn(
                          "text-sm leading-relaxed transition-all duration-200",
                          isChecked ? "line-through text-muted-foreground" : "text-foreground"
                        )}
                      >
                        {item}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Section notes (Dica estratégica, Regra de ouro, etc.) */}
              {section.notes.length > 0 && (
                <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-full" />
                  <div className="flex items-start gap-2.5 pl-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      {section.notes.map((note, nIdx) => (
                        <p key={nIdx} className="text-sm text-foreground/80 font-medium italic leading-relaxed">
                          {note}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Closing blocks — premium style */}
      {parsed.closingBlocks.length > 0 && (
        <div className="space-y-5 mt-6">
          {parsed.closingBlocks.map((block, bIdx) => (
            <div
              key={bIdx}
              className={cn(
                "rounded-2xl border-2 p-6 relative overflow-hidden",
                block.type === "quote"
                  ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/25 shadow-lg shadow-primary/5"
                  : "bg-gradient-to-br from-accent/40 via-accent/20 to-transparent border-primary/15 shadow-lg shadow-primary/5"
              )}
            >
              {/* Decorative accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />

              {block.title && (
                <div className="flex items-center gap-2.5 mb-4">
                  {block.type === "quote" ? (
                    <Quote className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <Trophy className="h-5 w-5 text-primary shrink-0" />
                  )}
                  <h3 className="text-lg font-bold text-foreground">{block.title}</h3>
                </div>
              )}

              {block.type === "quote" ? (
                <div className="pl-4 border-l-3 border-primary/30">
                  {block.content.map((c, i) => (
                    <p key={i} className="text-base text-foreground/85 italic leading-relaxed text-center font-medium">
                      "{c}"
                    </p>
                  ))}
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {block.content.map((c, i) => (
                    <li key={i} className="text-sm text-foreground/85 leading-relaxed flex items-start gap-3">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 text-primary shrink-0 mt-0.5">
                        <span className="text-xs font-bold">✓</span>
                      </span>
                      <span className="font-medium">{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
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
