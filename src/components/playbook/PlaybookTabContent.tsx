import { Card, CardContent } from "@/components/ui/card";
import { Clock, Info } from "lucide-react";
import type { PlaybookSection } from "@/types/playbook";
import { BlockRenderer } from "./BlockRenderer";
import { PlaybookInlineEditor } from "./PlaybookInlineEditor";
import { PlaybookPdfSection } from "./PlaybookPdfSection";
import { useCallback, useMemo } from "react";

interface PlaybookTabContentProps {
  section: PlaybookSection | undefined;
  tabLabel: string;
  onSaveSection?: (content: any) => Promise<void>;
}

function estimateReadingTime(intro?: string, blocks?: any[]): number {
  let wordCount = 0;
  if (intro) wordCount += intro.replace(/<[^>]+>/g, "").split(/\s+/).length;
  if (blocks) {
    blocks.forEach((b: any) => {
      wordCount += (b.content || "").replace(/<[^>]+>/g, "").split(/\s+/).length;
      if (b.items) b.items.forEach((item: string) => (wordCount += item.split(/\s+/).length));
    });
  }
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function PlaybookTabContent({ section, tabLabel, onSaveSection }: PlaybookTabContentProps) {
  const handleSaveIntro = useCallback(
    async (html: string) => {
      if (!onSaveSection) return;
      const currentContent = section?.content || {};
      await onSaveSection({ ...currentContent, intro: html });
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

  const pdfUrl = section?.content?.pdf_url;
  const hasTextContent = section?.content?.intro || (section?.content?.blocks && section.content.blocks.length > 0);

  const readingTime = useMemo(
    () => estimateReadingTime(section?.content?.intro, section?.content?.blocks),
    [section]
  );

  if (!section || (!hasTextContent && !pdfUrl)) {
    if (onSaveSection) {
      return (
        <div className="space-y-4">
          <PlaybookInlineEditor
            content=""
            onSave={handleSaveIntro}
            placeholder={`Clique em "Editar" para adicionar conteúdo à aba ${tabLabel}.`}
          />
          <PlaybookPdfSection
            pdfUrl={undefined}
            onSavePdfUrl={handleSavePdfUrl}
            tabLabel={tabLabel}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Info className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{tabLabel}</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Conteúdo em breve. Esta seção será preenchida com informações estratégicas e comerciais sobre o destino.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Reading time indicator */}
      {hasTextContent && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">{readingTime} min de leitura</span>
        </div>
      )}

      {onSaveSection ? (
        <Card className="rounded-2xl border-border/40 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-5 pb-4">
            <PlaybookInlineEditor
              content={section.content.intro || ""}
              onSave={handleSaveIntro}
              placeholder="Adicione uma introdução para esta aba..."
            />
          </CardContent>
        </Card>
      ) : (
        section.content.intro && (
          <Card className="rounded-2xl border-border/40 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-5 pb-4">
              <div
                className="prose prose-sm max-w-prose text-foreground/80 leading-relaxed
                  prose-headings:text-foreground prose-headings:font-bold
                  prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                  prose-p:leading-relaxed prose-p:mb-4 prose-a:text-primary
                  [&>h2]:mt-8 [&>h2]:mb-3 [&>h3]:mt-6 [&>h3]:mb-2
                  [&>ul]:space-y-1.5 [&>ol]:space-y-1.5"
                dangerouslySetInnerHTML={{ __html: section.content.intro }}
              />
            </CardContent>
          </Card>
        )
      )}

      <div className="space-y-4 max-w-prose">
        {section.content.blocks?.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>

      {/* Optional PDF section */}
      <PlaybookPdfSection
        pdfUrl={pdfUrl}
        onSavePdfUrl={onSaveSection ? handleSavePdfUrl : undefined}
        tabLabel={tabLabel}
      />
    </div>
  );
}
