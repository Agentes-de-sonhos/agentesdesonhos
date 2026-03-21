 import { cn } from "@/lib/utils";

 type SectionColor = 
   | "news" 
   | "trade" 
   | "reminders" 
   | "financial" 
   | "map" 
   | "ai" 
   | "events" 
   | "flights"
   | "tools"
   | "community";

 interface SectionHeaderProps {
   title: string;
   color: SectionColor;
   className?: string;
 }

 const colorStyles: Record<SectionColor, string> = {
   news: "bg-[hsl(var(--section-news))]",
   trade: "bg-[hsl(var(--section-trade))]",
   reminders: "bg-[hsl(var(--section-reminders))]",
   financial: "bg-[hsl(var(--section-financial))]",
   map: "bg-[hsl(var(--section-map))]",
   ai: "bg-[hsl(var(--section-ai))]",
   events: "bg-[hsl(var(--section-events))]",
   flights: "bg-[hsl(var(--section-flights))]",
   tools: "bg-[hsl(var(--section-tools))]",
   community: "bg-[hsl(var(--section-community))]",
 };

 const iconColorStyles: Record<SectionColor, string> = {
   news: "text-[hsl(var(--section-news))]",
   trade: "text-[hsl(var(--section-trade))]",
   reminders: "text-[hsl(var(--section-reminders))]",
   financial: "text-[hsl(var(--section-financial))]",
   map: "text-[hsl(var(--section-map))]",
   ai: "text-[hsl(var(--section-ai))]",
   events: "text-[hsl(var(--section-events))]",
   flights: "text-[hsl(var(--section-flights))]",
   tools: "text-[hsl(var(--section-tools))]",
   community: "text-[hsl(var(--section-community))]",
 };

  export function SectionHeader({ title, color, className }: SectionHeaderProps) {
    return (
      <div className={cn("mb-4 w-fit", className)}>
        <h2 className="font-display text-base sm:text-lg font-semibold text-foreground">
          {title}
        </h2>
        <div 
          className={cn(
            "mt-2 h-1 w-full rounded-full",
            colorStyles[color]
          )}
        />
      </div>
    );
  }

 export { colorStyles, iconColorStyles, type SectionColor };