import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  variant?: "primary" | "accent" | "default";
  onClick?: () => void;
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  variant = "default",
  onClick,
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start gap-3 rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-1",
        "shadow-card hover:shadow-card-hover",
        variant === "primary" && "gradient-primary text-primary-foreground",
        variant === "accent" && "gradient-accent text-accent-foreground",
        variant === "default" && "bg-card text-card-foreground hover:bg-secondary/50"
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
          variant === "primary" && "bg-primary-foreground/20",
          variant === "accent" && "bg-accent-foreground/20",
          variant === "default" && "bg-primary/10"
        )}
      >
        <Icon
          className={cn(
            "h-6 w-6",
            variant === "default" && "text-primary"
          )}
        />
      </div>
      <div>
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <p
          className={cn(
            "mt-1 text-sm",
            variant === "default" ? "text-muted-foreground" : "opacity-80"
          )}
        >
          {description}
        </p>
      </div>
    </button>
  );
}
