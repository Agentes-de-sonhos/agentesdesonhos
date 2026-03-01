import type { LucideIcon } from "lucide-react";

interface TabIntroBlockProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function TabIntroBlock({ icon: Icon, title, description }: TabIntroBlockProps) {
  return (
    <div className="rounded-xl border border-primary/10 bg-primary/[0.03] px-5 py-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{description}</p>
        </div>
      </div>
    </div>
  );
}
