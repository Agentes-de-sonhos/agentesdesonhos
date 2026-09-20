import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { PostTextContent } from "./PostTextContent";
import { PostCommentsSection } from "./PostCommentsSection";
import { SharePostDialog } from "./SharePostDialog";
import type { CommunityPost, PostComment } from "@/types/community-members";

export interface PostGallerySocial {
  post: CommunityPost;
  currentUserId?: string | null;
  isAdmin: boolean;
  onLike: (postId: string, liked: boolean) => void;
  onAddComment: (data: { postId: string; content: string; parentCommentId?: string | null }) => void;
  isAddingComment: boolean;
  fetchComments: (postId: string) => Promise<PostComment[]>;
  onDeleteComment: (commentId: string) => void;
  onToggleCommentLike?: (data: { commentId: string; liked: boolean }) => Promise<unknown>;
}

/**
 * Painel social da galeria: autor, agência, texto (2 linhas + mais/menos),
 * curtidas, comentários e envio. Reutiliza os mesmos hooks/ações do card,
 * então contadores e comentários permanecem sincronizados com o feed.
 */
export function PostGallerySocialPanel({
  post,
  currentUserId,
  isAdmin,
  onLike,
  onAddComment,
  isAddingComment,
  fetchComments,
  onDeleteComment,
  onToggleCommentLike,
}: PostGallerySocial) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const name = post.profile?.name || "Membro";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const refreshComments = useCallback(async () => {
    try {
      setComments(await fetchComments(post.id));
    } catch { /* ignore */ }
  }, [fetchComments, post.id]);

  useEffect(() => {
    if (!showComments) return;
    setLoadingComments(true);
    refreshComments().finally(() => setLoadingComments(false));
  }, [showComments, refreshComments]);

  return (
    <div
      data-post-gallery-panel
      className="max-h-[45vh] shrink-0 overflow-y-auto rounded-t-2xl bg-background px-4 pt-3 lg:max-h-none lg:h-full lg:w-[380px] lg:rounded-none lg:border-l lg:border-border/40"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.profile?.avatar_url || ""} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {post.profile?.agency_name && (
            <p className="truncate text-xs text-muted-foreground">{post.profile.agency_name}</p>
          )}
        </div>
      </div>

      {post.content && (
        <div className="mt-3">
          <PostTextContent text={post.content} clampLines={2} />
        </div>
      )}

      {(post.likes_count > 0 || post.comments_count > 0) && (
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground" data-post-gallery-counters>
          {post.likes_count > 0 && (
            <span>{post.likes_count} {post.likes_count === 1 ? "curtida" : "curtidas"}</span>
          )}
          {post.comments_count > 0 && (
            <span>{post.comments_count} {post.comments_count === 1 ? "comentário" : "comentários"}</span>
          )}
        </div>
      )}

      <Separator className="my-2" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          data-post-gallery-like
          className={`gap-1.5 text-xs ${post.user_liked ? "text-red-500" : "text-muted-foreground"}`}
          onClick={() => onLike(post.id, !!post.user_liked)}
        >
          <Heart className={`h-4 w-4 ${post.user_liked ? "fill-current" : ""}`} />
          Curtir
        </Button>
        <Button
          variant="ghost"
          size="sm"
          data-post-gallery-comment
          className="gap-1.5 text-xs text-muted-foreground"
          onClick={() => setShowComments((v) => !v)}
        >
          <MessageCircle className="h-4 w-4" />
          Comentar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          data-post-gallery-share
          className="gap-1.5 text-xs text-muted-foreground"
          onClick={() => setShareOpen(true)}
        >
          <Share2 className="h-4 w-4" />
          Enviar
        </Button>
      </div>

      {showComments && (
        <div className="mt-2">
          <PostCommentsSection
            postId={post.id}
            comments={comments}
            loading={loadingComments}
            isAddingComment={isAddingComment}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
            onToggleCommentLike={
              onToggleCommentLike
                ? async (data) => {
                    await onToggleCommentLike(data);
                    await refreshComments();
                  }
                : undefined
            }
            onRefresh={refreshComments}
            autoFocus
          />
        </div>
      )}

      <SharePostDialog open={shareOpen} onOpenChange={setShareOpen} postId={post.id} />
    </div>
  );
}
