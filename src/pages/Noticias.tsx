import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Newspaper, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const allNews = [
  {
    id: "1",
    title: "Temporada de cruzeiros 2025: Brasil deve receber 2 milhões de turistas",
    source: "Panrotas",
    url: "https://panrotas.com.br",
    date: "Há 2 horas",
    category: "Cruzeiros",
    summary: "A temporada de cruzeiros 2024/2025 promete ser a maior da história do Brasil, com expectativa de movimentar bilhões na economia costeira.",
  },
  {
    id: "2",
    title: "Novos voos diretos para Europa a partir de São Paulo",
    source: "Mercado & Eventos",
    url: "https://mercadoeeventos.com.br",
    date: "Há 5 horas",
    category: "Aéreo",
    summary: "Companhias aéreas anunciam novas rotas conectando o Brasil a destinos europeus menos explorados.",
  },
  {
    id: "3",
    title: "Embratur lança campanha internacional para atrair turistas",
    source: "Ministério do Turismo",
    url: "https://gov.br/turismo",
    date: "Ontem",
    category: "Institucional",
    summary: "Nova estratégia de marketing digital visa posicionar o Brasil como destino sustentável e acessível.",
  },
  {
    id: "4",
    title: "Hotéis de luxo expandem operações no Nordeste",
    source: "Hotelier News",
    url: "https://hoteliernews.com.br",
    date: "2 dias atrás",
    category: "Hotelaria",
    summary: "Grandes redes hoteleiras anunciam novos empreendimentos em destinos como Jericoacoara e Porto de Galinhas.",
  },
  {
    id: "5",
    title: "Turismo de aventura cresce 40% no Brasil",
    source: "Folha Turismo",
    url: "https://folha.uol.com.br/turismo",
    date: "3 dias atrás",
    category: "Tendências",
    summary: "Modalidade atrai cada vez mais viajantes em busca de experiências autênticas e contato com a natureza.",
  },
];

export default function Noticias() {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary">
              <Newspaper className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Notícias
              </h1>
              <p className="text-muted-foreground">
                Fique por dentro das novidades do turismo
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {allNews.map((news) => (
            <a
              key={news.id}
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="group shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{news.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {news.source} • {news.date}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {news.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {news.summary}
                      </p>
                    </div>
                    <ExternalLink className="h-5 w-5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
