import { ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewsLikeButtonProps {
  noticiaId: string;
  count: number;
  liked: boolean;
  onToggle: (id: string) => void;
  size?: "sm" | "md";
}

export function NewsLikeButton({ noticiaId, count, liked, onToggle, size = "sm" }: NewsLikeButtonProps) {
  const isMd = size === "md";
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`${isMd ? "h-8 w-auto px-2 gap-1.5" : "h-7 w-auto px-1.5 gap-1"} bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm rounded-full`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(noticiaId);
      }}
    >
      <ThumbsUp
        className={`${isMd ? "h-4 w-4" : "h-3.5 w-3.5"} transition-colors ${
          liked ? "text-primary fill-primary" : "text-muted-foreground"
        }`}
      />
      {count > 0 && (
        <span className={`${isMd ? "text-xs" : "text-[11px]"} font-semibold tabular-nums ${liked ? "text-primary" : "text-muted-foreground"}`}>
          {count}
        </span>
      )}
    </Button>
  );
}
