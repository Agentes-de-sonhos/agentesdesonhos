import { useMemo } from "react";
import { BarChart3, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { CommunityPost } from "@/types/community-members";

interface PostPollProps {
  post: CommunityPost;
  onVote?: (data: { postId: string; optionId: string }) => void;
  isVoting?: boolean;
}

/**
 * Shared poll renderer used by both the full Community feed card and the
 * Dashboard preview card, so a saved poll always shows in every view.
 */
export function PostPoll({ post, onVote, isVoting = false }: PostPollProps) {
  const { user } = useAuth();
  const poll = (post as any).poll as
    | { question: string; options: { id: string; text: string }[] }
    | null
    | undefined;
  const pollVotes = ((post as any).poll_votes || []) as { option_id: string }[];
  const userVote = (post as any).user_poll_option as string | null | undefined;

  const tallies = useMemo(() => {
    const counts: Record<string, number> = {};
    pollVotes.forEach((v) => {
      counts[v.option_id] = (counts[v.option_id] || 0) + 1;
    });
    return counts;
  }, [pollVotes]);
  const total = pollVotes.length;

  if (!poll || !poll.question || !poll.options?.length) return null;
  const hasVoted = !!userVote;

  return (
    <div
      className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2 min-w-0"
      role="group"
      aria-label={`Enquete: ${poll.question}`}
    >
      <div className="flex items-start gap-1.5 text-xs font-semibold text-foreground">
        <BarChart3 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <span className="min-w-0 break-words">{poll.question}</span>
        {isVoting && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
      </div>
      <div className="space-y-1.5">
        {poll.options.map((o) => {
          const count = tallies[o.id] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isMine = userVote === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={hasVoted || !onVote || !user || isVoting}
              aria-pressed={isMine}
              onClick={() => onVote?.({ postId: post.id, optionId: o.id })}
              className="relative w-full text-left rounded-md border border-border/60 px-2.5 py-1.5 text-xs hover:border-primary/40 disabled:cursor-default overflow-hidden"
            >
              {hasVoted && (
                <span
                  className={`absolute inset-y-0 left-0 ${isMine ? "bg-primary/20" : "bg-muted"}`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 min-w-0 break-words">
                  {isMine && <Check className="h-3 w-3 text-primary shrink-0" />}
                  {o.text}
                </span>
                {hasVoted && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {pct}% · {count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground" aria-live="polite">
        {total} {total === 1 ? "voto" : "votos"}
        {hasVoted ? " · você já votou" : " · toque em uma opção para votar"}
      </p>
    </div>
  );
}