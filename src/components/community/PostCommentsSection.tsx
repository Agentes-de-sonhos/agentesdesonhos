import { useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, Loader2, MessageCircle, MoreHorizontal, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MentionTextarea } from "./MentionTextarea";
import { MentionText } from "./MentionText";
import type { PostComment } from "@/types/community-members";

interface PostCommentsSectionProps {
  postId: string;
  comments: PostComment[];
  loading: boolean;
  isAddingComment: boolean;
  currentUserId?: string | null;
  isAdmin: boolean;
  onAddComment: (data: { postId: string; content: string; parentCommentId?: string | null }) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleCommentLike?: (data: { commentId: string; liked: boolean }) => Promise<unknown>;
  /** Recarrega a lista após comentar/responder. */
  onRefresh?: () => void;
  autoFocus?: boolean;
}

interface LikeOverride {
  liked: boolean;
  count: number;
}

/**
 * Lista de comentários com curtidas, respostas em um nível e marcações @.
 * Usada tanto no feed da Comunidade quanto no feed do painel.
 */
export function PostCommentsSection({
  postId,
  comments,
  loading,
  isAddingComment,
  currentUserId,
  isAdmin,
  onAddComment,
  onDeleteComment,
  onToggleCommentLike,
  onRefresh,
  autoFocus,
}: PostCommentsSectionProps) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [likeOverrides, setLikeOverrides] = useState<Record<string, LikeOverride>>({});
  const [pendingLike, setPendingLike] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const visible = useMemo(
    () => comments.filter((c) => !deleted.includes(c.id)),
    [comments, deleted],
  );

  /** Agrupa respostas sob o comentário raiz, sem aninhamento infinito. */
  const threads = useMemo(() => {
    const roots = visible.filter((c) => !c.parent_comment_id);
    return roots.map((root) => ({
      root,
      replies: visible.filter((c) => c.parent_comment_id === root.id),
    }));
  }, [visible]);

  const submit = (content: string, parentCommentId: string | null) => {
    const clean = content.trim();
    if (!clean) return;
    onAddComment({ postId, content: clean, parentCommentId });
    if (parentCommentId) {
      setReplyText("");
      setReplyTo(null);
    } else {
      setText("");
    }
    setTimeout(() => onRefresh?.(), 500);
  };

  const toggleLike = async (comment: PostComment) => {
    if (!onToggleCommentLike || pendingLike === comment.id) return;
    const current = likeOverrides[comment.id] ?? {
      liked: !!comment.user_liked,
      count: comment.likes_count ?? 0,
    };
    const next: LikeOverride = {
      liked: !current.liked,
      count: Math.max(0, current.count + (current.liked ? -1 : 1)),
    };
    setLikeOverrides((prev) => ({ ...prev, [comment.id]: next }));
    setPendingLike(comment.id);
    try {
      await onToggleCommentLike({ commentId: comment.id, liked: current.liked });
    } catch {
      setLikeOverrides((prev) => ({ ...prev, [comment.id]: current }));
    } finally {
      setPendingLike(null);
    }
  };

  const renderComment = (comment: PostComment, isReply: boolean) => {
    const cName = comment.profile?.name || "Membro";
    const cInitials = cName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const override = likeOverrides[comment.id];
    const liked = override ? override.liked : !!comment.user_liked;
    const likes = override ? override.count : comment.likes_count ?? 0;
    const canDelete = comment.user_id === currentUserId || isAdmin;

    return (
      <div key={comment.id} className={`flex gap-2 ${isReply ? "ml-8" : ""}`} data-community-comment>
        <Avatar className={isReply ? "h-6 w-6" : "h-7 w-7"}>
          <AvatarImage src={comment.profile?.avatar_url || ""} />
          <AvatarFallback className="bg-muted text-[10px]">{cInitials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-foreground">{cName}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {[comment.profile?.agency_name, formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              {canDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground"
                      aria-label="Ações do comentário"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        onDeleteComment(comment.id);
                        setDeleted((prev) => [...prev, comment.id]);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir comentário
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <MentionText
              text={comment.content}
              className="text-xs text-muted-foreground whitespace-pre-line break-words"
            />
          </div>
          <div className="mt-1 flex items-center gap-1">
            {onToggleCommentLike && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 gap-1 px-2 text-[11px] ${liked ? "text-red-500" : "text-muted-foreground"}`}
                onClick={() => toggleLike(comment)}
                aria-pressed={liked}
                aria-label={liked ? "Descurtir comentário" : "Curtir comentário"}
              >
                <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
                {likes > 0 ? likes : "Curtir"}
              </Button>
            )}
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
                onClick={() => {
                  setReplyTo((prev) => (prev?.id === comment.id ? null : comment));
                  setReplyText("");
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" /> Responder
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando comentários...</p>
      ) : threads.length === 0 ? (
        <p className="text-xs text-muted-foreground">Seja o primeiro a comentar.</p>
      ) : (
        threads.map(({ root, replies }) => (
          <div key={root.id} className="space-y-2">
            {renderComment(root, false)}
            {replies.map((reply) => renderComment(reply, true))}
            {replyTo?.id === root.id && (
              <div className="ml-8 space-y-1.5">
                <p className="text-[11px] text-muted-foreground">
                  Respondendo a {root.profile?.name || "Membro"}
                </p>
                <div className="flex gap-2">
                  <MentionTextarea
                    value={replyText}
                    onChange={setReplyText}
                    rows={2}
                    autoFocus
                    placeholder="Escreva uma resposta... use @ para marcar conexões"
                    aria-label="Resposta ao comentário"
                    className="min-h-[38px] text-sm"
                    onSubmitShortcut={() => submit(replyText, root.id)}
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => submit(replyText, root.id)}
                    disabled={!replyText.trim() || isAddingComment}
                    aria-label="Enviar resposta"
                  >
                    {isAddingComment ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      <div className="flex gap-2">
        <MentionTextarea
          ref={inputRef}
          value={text}
          onChange={setText}
          rows={2}
          autoFocus={autoFocus}
          placeholder="Adicionar comentário... use @ para marcar conexões"
          aria-label="Adicionar comentário"
          className="min-h-[38px] text-sm"
          onSubmitShortcut={() => submit(text, null)}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => submit(text, null)}
          disabled={!text.trim() || isAddingComment}
          aria-label="Enviar comentário"
        >
          {isAddingComment ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
