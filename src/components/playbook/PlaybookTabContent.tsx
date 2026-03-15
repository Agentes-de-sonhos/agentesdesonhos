import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Info, Hotel, UtensilsCrossed, Car, Ship, Shield, Compass, MapPin, Plane, ArrowRight } from "lucide-react";
import type { PlaybookSection } from "@/types/playbook";
import { BlockRenderer } from "./BlockRenderer";
import { PlaybookInlineEditor } from "./PlaybookInlineEditor";
import { PlaybookPdfSection } from "./PlaybookPdfSection";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

/* ── Tab → Travel Advisor mapping ── */
const TAB_ADVISOR_MAP: Record<string, { icon: typeof Hotel; label: string; categoryLabel: string; description: string; advisorTab: string }> = {
  hospedagem: {
    icon: Hotel,
    label: "Hotéis recomendados",
    categoryLabel: "Hotéis",
    description: "Consulte rapidamente uma curadoria de hotéis recomendados para seus clientes, organizada para facilitar suas vendas.",
    advisorTab: "hotel",
  },
  gastronomia: {
    icon: UtensilsCrossed,
    label: "Restaurantes recomendados",
    categoryLabel: "Restaurantes",
    description: "Descubra os melhores restaurantes para indicar aos seus clientes, com curadoria feita por especialistas.",
    advisorTab: "dining",
  },
  logistica_terrestre: {
    icon: Car,
    label: "Locadoras e transporte",
    categoryLabel: "Transporte",
    description: "Veja opções de locadoras e transporte terrestre recomendadas para o destino.",
    advisorTab: "experiences",
  },
  logistica_aerea: {
    icon: Plane,
    label: "Voos e companhias aéreas",
    categoryLabel: "Aéreo",
    description: "Consulte informações sobre companhias aéreas e rotas recomendadas para este destino.",
    advisorTab: "experiences",
  },
  atracoes: {
    icon: Compass,
    label: "Atrações recomendadas",
    categoryLabel: "Atrações",
    description: "Explore uma curadoria de atrações e pontos turísticos recomendados para indicar aos seus clientes.",
    advisorTab: "attractions",
  },
};

interface PlaybookTabContentProps {
  section: PlaybookSection | undefined;
  tabLabel: string;
  tabKey?: string;
  destinationName?: string;
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

/* ── Travel Advisor CTA Card ── */
function TravelAdvisorCTA({ tabKey, destinationName }: { tabKey: string; destinationName: string }) {
  const navigate = useNavigate();
  const mapping = TAB_ADVISOR_MAP[tabKey];
  if (!mapping) return null;

  const Icon = mapping.icon;

  return (
    <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent shadow-sm h-full flex flex-col">
      <CardContent className="pt-6 pb-5 flex flex-col flex-1 gap-4">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <h4 className="text-sm font-bold text-foreground leading-snug">
            {mapping.label} em {destinationName}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {mapping.description}
          </p>
        </div>
        <Button
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => navigate(`/dream-advisor?tab=${mapping.advisorTab}`)}
        >
          Ver {mapping.categoryLabel} no Travel Advisor
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function PlaybookTabContent({ section, tabLabel, tabKey, destinationName, onSaveSection }: PlaybookTabContentProps) {
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

  const hasAdvisorCTA = tabKey && destinationName && TAB_ADVISOR_MAP[tabKey];

  if (!section || (!hasTextContent && !pdfUrl)) {
    if (onSaveSection) {
      return (
        <div className="space-y-4">
          <div className={hasAdvisorCTA ? "grid grid-cols-1 lg:grid-cols-2 gap-5" : ""}>
            <PlaybookInlineEditor
              content=""
              onSave={handleSaveIntro}
              placeholder={`Clique em "Editar" para adicionar conteúdo à aba ${tabLabel}.`}
            />
            {hasAdvisorCTA && (
              <TravelAdvisorCTA tabKey={tabKey!} destinationName={destinationName!} />
            )}
          </div>
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

      {/* Two-column layout: Intro + Travel Advisor CTA */}
      <div className={hasAdvisorCTA ? "grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch" : ""}>
        {/* Left column: Intro content */}
        <div>
          {onSaveSection ? (
            <Card className="rounded-2xl border-border/40 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10 h-full">
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
              <Card className="rounded-2xl border-border/40 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10 h-full">
                <CardContent className="pt-5 pb-4">
                  <div
                    className="prose prose-sm max-w-none text-foreground/80 leading-relaxed
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
        </div>

        {/* Right column: Travel Advisor CTA */}
        {hasAdvisorCTA && (
          <TravelAdvisorCTA tabKey={tabKey!} destinationName={destinationName!} />
        )}
      </div>

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
