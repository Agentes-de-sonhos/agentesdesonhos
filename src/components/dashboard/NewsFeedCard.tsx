import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  date: string;
  category: string;
}

interface NewsFeedCardProps {
  title?: string;
  news: NewsItem[];
}

export function NewsFeedCard({ title, news }: NewsFeedCardProps) {
  return (
    <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-300">
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-lg p-3 transition-all duration-200 hover:bg-secondary/50"
          >
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {item.title}
              </h4>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {item.category}
                </Badge>
                <span className="text-xs text-muted-foreground">{item.source}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{item.date}</span>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
