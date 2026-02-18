import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  AlertTriangle,
  Target,
  CheckSquare,
  Star,
  ChevronDown,
  Info,
} from "lucide-react";
import { useState } from "react";
import type { PlaybookSection, PlaybookBlock } from "@/types/playbook";
import { cn } from "@/lib/utils";

interface PlaybookTabContentProps {
  section: PlaybookSection | undefined;
  tabLabel: string;
}

const blockConfig: Record<string, { icon: typeof Lightbulb; color: string; label: string; border: string; bg: string }> = {
  tip: { icon: Lightbulb, color: "text-amber-600", label: "Dica Insider", border: "border-l-amber-500", bg: "bg-amber-50" },
  alert: { icon: AlertTriangle, color: "text-red-600", label: "Atenção", border: "border-l-red-500", bg: "bg-red-50" },
  strategy: { icon: Target, color: "text-primary", label: "Estratégia", border: "border-l-primary", bg: "bg-sky-50" },
  checklist: { icon: CheckSquare, color: "text-emerald-600", label: "Checklist", border: "border-l-emerald-500", bg: "bg-emerald-50" },
  highlight: { icon: Star, color: "text-violet-600", label: "Destaque", border: "border-l-violet-500", bg: "bg-violet-50" },
  text: { icon: Info, color: "text-muted-foreground", label: "Informação", border: "border-l-border", bg: "bg-card" },
};

function ContentBlock({ block }: { block: PlaybookBlock }) {
  const [open, setOpen] = useState(block.type === 'text');
  const config = blockConfig[block.type] || blockConfig.text;
  const Icon = config.icon;

  if (block.type === 'text') {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5 pb-4">
          {block.title && (
            <h4 className="font-semibold text-foreground mb-2">{block.title}</h4>
          )}
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {block.content}
          </div>
          {block.items && block.items.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("rounded-xl border-l-4 overflow-hidden", config.border, config.bg)}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-background/80 shadow-sm", config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider mb-1">
                {config.label}
              </Badge>
              {block.title && (
                <p className="font-semibold text-foreground text-sm">{block.title}</p>
              )}
            </div>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
              {block.content}
            </p>
            {block.items && block.items.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {block.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                    {block.type === 'checklist' ? (
                      <CheckSquare className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                    ) : (
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                    )}
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function PlaybookTabContent({ section, tabLabel }: PlaybookTabContentProps) {
  if (!section || (!section.content.intro && (!section.content.blocks || section.content.blocks.length === 0))) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Info className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {tabLabel}
        </h3>
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
        <ContentBlock key={block.id} block={block} />
      ))}
    </div>
  );
}
