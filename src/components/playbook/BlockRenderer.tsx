import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Lightbulb,
  AlertTriangle,
  Target,
  CheckSquare,
  Star,
  ChevronDown,
  Info,
  Download,
  ExternalLink,
  Play,
  FileText,
  Zap,
} from "lucide-react";
import type { PlaybookBlock } from "@/types/playbook";
import { cn } from "@/lib/utils";

/* ── Block style config for styled blocks ── */
const blockConfig: Record<string, { icon: typeof Lightbulb; color: string; label: string; border: string; bg: string }> = {
  tip: { icon: Lightbulb, color: "text-amber-600", label: "Dica Insider", border: "border-l-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  alert: { icon: AlertTriangle, color: "text-red-600", label: "Atenção", border: "border-l-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
  strategy: { icon: Target, color: "text-primary", label: "Estratégia", border: "border-l-primary", bg: "bg-sky-50 dark:bg-sky-950/30" },
  checklist: { icon: CheckSquare, color: "text-emerald-600", label: "Checklist", border: "border-l-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  highlight: { icon: Star, color: "text-violet-600", label: "Destaque", border: "border-l-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
  insight: { icon: Zap, color: "text-violet-600", label: "Insight", border: "border-l-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
  text: { icon: Info, color: "text-muted-foreground", label: "Informação", border: "border-l-border", bg: "bg-card" },
};

/* ── Normalize video URL to embed format ── */
function getEmbedUrl(url: string): string {
  if (!url) return "";
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

/* ── Rich Text Block ── */
function RichTextBlock({ block }: { block: PlaybookBlock }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-5 pb-4">
        {block.title && <h4 className="font-semibold text-foreground mb-3 text-lg">{block.title}</h4>}
        <div
          className="playbook-content max-w-none text-foreground/85"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      </CardContent>
    </Card>
  );
}

/* ── Text Block ── */
function TextBlock({ block }: { block: PlaybookBlock }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-5 pb-4">
        {block.title && <h4 className="font-semibold text-foreground mb-2">{block.title}</h4>}
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{block.content}</div>
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

/* ── Styled Block (tip, alert, strategy, etc.) ── */
function StyledBlock({ block }: { block: PlaybookBlock }) {
  const [open, setOpen] = useState(false);
  const config = blockConfig[block.type] || blockConfig.text;
  const Icon = config.icon;

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
              {block.title && <p className="font-semibold text-foreground text-sm">{block.title}</p>}
            </div>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{block.content}</p>
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

/* ── Image Block ── */
function ImageBlock({ block }: { block: PlaybookBlock }) {
  return (
    <div className={cn("space-y-2", block.alignment === 'center' && "text-center", block.alignment === 'right' && "text-right")}>
      {block.title && <h4 className="font-semibold text-foreground text-sm">{block.title}</h4>}
      {block.image_url && (
        <img
          src={block.image_url}
          alt={block.title || "Imagem"}
          className="rounded-xl max-w-full h-auto shadow-sm inline-block"
          loading="lazy"
        />
      )}
      {block.content && <p className="text-xs text-muted-foreground">{block.content}</p>}
    </div>
  );
}

/* ── Image Gallery Block ── */
function ImageGalleryBlock({ block }: { block: PlaybookBlock }) {
  return (
    <div className="space-y-3">
      {block.title && <h4 className="font-semibold text-foreground">{block.title}</h4>}
      {block.content && <p className="text-sm text-muted-foreground">{block.content}</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {(block.image_urls || []).map((url, i) => (
          <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden shadow-sm border">
            <img src={url} alt={`Imagem ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Video Block ── */
function VideoBlock({ block }: { block: PlaybookBlock }) {
  const embedUrl = getEmbedUrl(block.video_url || "");

  return (
    <div className="space-y-2">
      {block.title && <h4 className="font-semibold text-foreground">{block.title}</h4>}
      {embedUrl ? (
        <div className="aspect-video rounded-xl overflow-hidden shadow-sm border">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={block.title || "Vídeo"}
          />
        </div>
      ) : (
        <div className="aspect-video rounded-xl bg-muted flex items-center justify-center">
          <Play className="h-10 w-10 text-muted-foreground/40" />
        </div>
      )}
      {block.content && <p className="text-sm text-muted-foreground">{block.content}</p>}
    </div>
  );
}

/* ── File Download Block ── */
function FileDownloadBlock({ block }: { block: PlaybookBlock }) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="py-4 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/10 shrink-0">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{block.title || block.file_name || "Arquivo"}</p>
          {block.content && <p className="text-xs text-muted-foreground mt-0.5">{block.content}</p>}
        </div>
        {block.file_url && (
          <Button size="sm" variant="outline" className="gap-2 shrink-0" asChild>
            <a href={block.file_url} target="_blank" rel="noopener noreferrer" download>
              <Download className="h-4 w-4" />
              Baixar
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Separator Block ── */
function SeparatorBlock() {
  return <hr className="border-t border-border my-2" />;
}

/* ── Custom Button Block ── */
function CustomButtonBlock({ block }: { block: PlaybookBlock }) {
  return (
    <div className={cn("py-2", block.alignment === 'center' && "text-center", block.alignment === 'right' && "text-right")}>
      {block.button_url ? (
        <Button asChild className="gap-2">
          <a href={block.button_url} target="_blank" rel="noopener noreferrer">
            {block.button_text || "Clique aqui"}
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      ) : (
        <Button disabled>{block.button_text || "Botão"}</Button>
      )}
    </div>
  );
}

/* ── Table Block ── */
function TableBlock({ block }: { block: PlaybookBlock }) {
  const headers = block.table_headers || [];
  const rows = block.table_rows || [];

  return (
    <div className="space-y-2">
      {block.title && <h4 className="font-semibold text-foreground text-sm">{block.title}</h4>}
      <div className="overflow-x-auto rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          {headers.length > 0 && (
            <thead>
              <tr className="bg-muted/50 border-b">
                {headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-3 text-foreground/80">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Accordion Block ── */
function AccordionBlock({ block }: { block: PlaybookBlock }) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {block.title && <h4 className="font-semibold text-foreground">{block.title}</h4>}
      <div className="space-y-2">
        {(block.accordion_items || []).map((item) => {
          const isOpen = openItems.has(item.id);
          return (
            <div key={item.id} className="rounded-xl border overflow-hidden shadow-sm">
              <button
                onClick={() => toggle(item.id)}
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                <span className="font-medium text-sm text-foreground">{item.title}</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm text-foreground/80 leading-relaxed whitespace-pre-line border-t">
                  <div className="pt-3">{item.content}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Export ── */
export function BlockRenderer({ block }: { block: PlaybookBlock }) {
  switch (block.type) {
    case 'rich_text':
      return <RichTextBlock block={block} />;
    case 'text':
      return <TextBlock block={block} />;
    case 'image':
      return <ImageBlock block={block} />;
    case 'image_gallery':
      return <ImageGalleryBlock block={block} />;
    case 'video':
      return <VideoBlock block={block} />;
    case 'file_download':
      return <FileDownloadBlock block={block} />;
    case 'separator':
      return <SeparatorBlock />;
    case 'custom_button':
      return <CustomButtonBlock block={block} />;
    case 'table':
      return <TableBlock block={block} />;
    case 'accordion':
      return <AccordionBlock block={block} />;
    case 'tip':
    case 'alert':
    case 'strategy':
    case 'checklist':
    case 'highlight':
      return <StyledBlock block={block} />;
    default:
      return <TextBlock block={block} />;
  }
}
