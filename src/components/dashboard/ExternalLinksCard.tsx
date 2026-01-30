import { ExternalLink, LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExternalLink {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
  description: string;
}

interface ExternalLinksCardProps {
  title: string;
  links: ExternalLink[];
}

export function ExternalLinksCard({ title, links }: ExternalLinksCardProps) {
  return (
    <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3 transition-all duration-200 hover:border-primary/30 hover:bg-secondary/60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-200 group-hover:scale-110">
                <link.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground truncate">
                  {link.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {link.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
