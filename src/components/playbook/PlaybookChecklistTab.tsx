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

/** Parse HTML content into checklist items by splitting on <li>, <br>, <p>, or newlines */
function parseChecklistItems(html: string | undefined): string[] {
  if (!html) return [];

  // First try to extract <li> items
  const liMatches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (liMatches && liMatches.length > 0) {
    return liMatches
      .map((li) => li.replace(/<\/?li[^>]*>/gi, "").trim())
      .map((text) => stripOuterTags(text))
      .filter((text) => text.length > 0);
  }

  // Fallback: split by <br>, <p>, or newlines
  const lines = html
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines;
}

function stripOuterTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function getStorageKey(slug: string) {
  return `playbook-checklist-${slug}`;
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
  const items = useMemo(() => parseChecklistItems(intro), [intro]);

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

  const toggleItem = (idx: number) => {
    setChecked((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const resetAll = () => setChecked({});

  const checkedCount = items.filter((_, i) => checked[i]).length;
  const progress = items.length > 0 ? (checkedCount / items.length) * 100 : 0;

  const hasContent = intro || (section?.content?.blocks && section.content.blocks.length > 0);

  // Empty state
  if (!section || !hasContent) {
    if (onSaveSection) {
      return (
        <div className="space-y-4">
          <PlaybookInlineEditor
            content=""
            onSave={handleSaveIntro}
            placeholder='Cole seu checklist aqui. Cada linha ou item de lista será convertido em um item interativo.'
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
              placeholder="Cole o checklist aqui. Cada linha ou item de lista será convertido automaticamente."
            >
              {/* Show the checklist preview even in read mode for admin */}
              {items.length > 0 && (
                <ChecklistDisplay
                  items={items}
                  checked={checked}
                  onToggle={toggleItem}
                  onReset={resetAll}
                  progress={progress}
                  checkedCount={checkedCount}
                />
              )}
            </PlaybookInlineEditor>
          </CardContent>
        </Card>
      )}

      {/* Agent view: interactive checklist */}
      {!onSaveSection && items.length > 0 && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-5 pb-4">
            <ChecklistDisplay
              items={items}
              checked={checked}
              onToggle={toggleItem}
              onReset={resetAll}
              progress={progress}
              checkedCount={checkedCount}
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

/* ── Checklist display sub-component ── */
function ChecklistDisplay({
  items,
  checked,
  onToggle,
  onReset,
  progress,
  checkedCount,
}: {
  items: string[];
  checked: Record<number, boolean>;
  onToggle: (idx: number) => void;
  onReset: () => void;
  progress: number;
  checkedCount: number;
}) {
  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CheckSquare className="h-5 w-5 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            {checkedCount} de {items.length} concluídos
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

      {/* Checklist items */}
      <ul className="space-y-1">
        {items.map((item, idx) => {
          const isChecked = !!checked[idx];
          return (
            <li
              key={idx}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50",
                isChecked && "bg-primary/5"
              )}
              onClick={() => onToggle(idx)}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggle(idx)}
                className="mt-0.5 shrink-0"
              />
              <span
                className={cn(
                  "text-sm leading-relaxed transition-all duration-200",
                  isChecked
                    ? "line-through text-muted-foreground"
                    : "text-foreground"
                )}
                dangerouslySetInnerHTML={{ __html: item }}
              />
            </li>
          );
        })}
      </ul>

      {progress === 100 && (
        <div className="text-center py-3 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
          ✅ Checklist completo! Parabéns!
        </div>
      )}
    </div>
  );
}
