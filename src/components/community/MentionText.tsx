import { useNavigate } from "react-router-dom";
import { LinkifiedText } from "@/components/community/LinkifiedText";
import { parseMentionSegments } from "@/lib/communityMentions";

interface MentionTextProps {
  text: string;
  className?: string;
}

/**
 * Exibe texto de publicações/comentários destacando as marcações @ e abrindo o
 * perfil público da pessoa marcada. Marcações históricas continuam visíveis
 * mesmo se a conexão for removida depois, sem expor dados privados.
 */
export function MentionText({ text, className }: MentionTextProps) {
  const navigate = useNavigate();
  const segments = parseMentionSegments(text);

  return (
    <span className={className} data-mention-text>
      {segments.map((segment, index) =>
        segment.type === "mention" ? (
          <button
            key={`${segment.userId}-${index}`}
            type="button"
            className="font-semibold text-primary hover:underline"
            aria-label={`Abrir perfil de ${segment.name}`}
            data-mention-link={segment.userId}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              navigate(`/comunidade/agente/${segment.userId}`);
            }}
          >
            @{segment.name}
          </button>
        ) : (
          <LinkifiedText key={`text-${index}`} text={segment.text} />
        ),
      )}
    </span>
  );
}
