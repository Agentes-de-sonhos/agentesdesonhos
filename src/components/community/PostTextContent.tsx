import { useState } from "react";
import { MentionText } from "@/components/community/MentionText";
import { cn } from "@/lib/utils";

/**
 * Heurística de truncamento: mostra "mais" quando o texto provavelmente passa
 * de três linhas (por quantidade de caracteres ou de quebras de linha).
 */
export const POST_TEXT_CLAMP_CHARS = 220;
export const POST_TEXT_CLAMP_LINES = 3;

export function isPostTextClamped(text: string, clampLines: 2 | 3 = POST_TEXT_CLAMP_LINES): boolean {
  if (!text) return false;
  const lineBreaks = text.split("\n").length;
  const maxChars = clampLines === 2 ? 150 : POST_TEXT_CLAMP_CHARS;
  return text.length > maxChars || lineBreaks > clampLines;
}


interface PostTextContentProps {
  text: string;
  className?: string;
  /** Número de linhas antes do "mais" (3 no feed, 2 na galeria social). */
  clampLines?: 2 | 3;
}

/**
 * Texto da publicação limitado visualmente a 3 linhas (2 na galeria), com ação
 * "mais" que expande o conteúdo no próprio lugar (padrão LinkedIn/Facebook).
 */
export function PostTextContent({ text, className, clampLines = 3 }: PostTextContentProps) {
  const [expanded, setExpanded] = useState(false);
  const clampable = isPostTextClamped(text, clampLines);

  if (!text) return null;

  return (
    <div className="min-w-0" data-post-text>
      <MentionText
        text={text}
        className={cn(
          "text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed",
          clampable && !expanded && (clampLines === 2 ? "line-clamp-2" : "line-clamp-3"),
          className,
        )}
      />

      {clampable && !expanded && (
        <button
          type="button"
          data-post-text-more
          className="mt-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          aria-expanded={false}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded(true);
          }}
        >
          … mais
        </button>
      )}
      {clampable && expanded && (
        <button
          type="button"
          data-post-text-less
          className="mt-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          aria-expanded
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded(false);
          }}
        >
          menos
        </button>
      )}
    </div>
  );
}
