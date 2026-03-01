import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import type { PlaybookSection } from "@/types/playbook";
import { BlockRenderer } from "./BlockRenderer";

interface PlaybookTabContentProps {
  section: PlaybookSection | undefined;
  tabLabel: string;
}

export function PlaybookTabContent({ section, tabLabel }: PlaybookTabContentProps) {
  if (!section || (!section.content.intro && (!section.content.blocks || section.content.blocks.length === 0))) {
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
    <div className="space-y-4">
      {section.content.intro && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-5 pb-4">
            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
              {section.content.intro}
            </p>
          </CardContent>
        </Card>
      )}

      {section.content.blocks?.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}
