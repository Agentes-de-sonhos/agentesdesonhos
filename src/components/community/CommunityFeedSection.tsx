import { useEffect, useRef, useState } from "react";
import { useCommunityFeed } from "@/hooks/useCommunityFeed";
import { CreatePostForm } from "./CreatePostForm";
import { PostCard } from "./PostCard";
import { EditPostDialog } from "./EditPostDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Calendar, Building, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { InPersonEvent } from "@/types/community";
import type { CommunityPost } from "@/types/community-members";

interface CommunityFeedSectionProps {
  events?: InPersonEvent[];
}

export function CommunityFeedSection({ events = [] }: CommunityFeedSectionProps) {
  const {
    posts,
    loadingPosts,
    createPost,
    isCreating,
    toggleLike,
    deletePost,
    updatePost,
    isUpdating,
    fetchComments,
    addComment,
    isAddingComment,
    deleteComment,
    votePoll,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    isPostsError,
    refetchPosts,
  } = useCommunityFeed({ pageSize: 10 });

  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "500px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Build feed items: posts interspersed with content blocks
  const feedItems: { type: string; data: any; key: string }[] = [];

  posts.forEach((post, i) => {
    feedItems.push({ type: "post", data: post, key: post.id });

    // After 5th post on first page, inject upcoming events
    if (i === 4 && events.length > 0) {
      const upcoming = events.filter((e) => new Date(e.event_date) >= new Date()).slice(0, 2);
      if (upcoming.length > 0) {
        feedItems.push({ type: "events", data: upcoming, key: "events-block" });
      }
    }
  });

  // If few posts on first page, still show upcoming events block
  if (posts.length <= 4 && events.length > 0) {
    const upcoming = events.filter((e) => new Date(e.event_date) >= new Date()).slice(0, 2);
    if (upcoming.length > 0 && !feedItems.find((f) => f.key === "events-block")) {
      feedItems.push({ type: "events", data: upcoming, key: "events-block" });
    }
  }

  return (
    <div className="space-y-4">
      <CreatePostForm onSubmit={createPost} isCreating={isCreating} />

      {loadingPosts ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : isPostsError ? (
        <div className="rounded-lg border border-destructive/30 px-5 py-8 text-center" role="alert">
          <p className="text-sm text-muted-foreground">Não foi possível carregar as publicações.</p>
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => void refetchPosts()}>
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      ) : feedItems.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum post ainda</p>
          <p className="text-sm">Seja o primeiro a compartilhar algo!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedItems.map((item) => {
            if (item.type === "post") {
              return (
                <PostCard
                  key={item.key}
                  post={item.data}
                  onLike={(postId, liked) => toggleLike({ postId, liked })}
                  onDelete={deletePost}
                  onEdit={setEditingPost}
                  onAddComment={addComment}
                  isAddingComment={isAddingComment}
                  fetchComments={fetchComments}
                  onDeleteComment={deleteComment}
                  onVotePoll={votePoll}
                />
              );
            }

            if (item.type === "events") {
              return (
                <Card key={item.key} className="border-primary/20 bg-primary/[0.02]">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Próximos Encontros</span>
                    </div>
                    <div className="space-y-2.5">
                      {(item.data as InPersonEvent[]).map((event) => (
                        <div key={event.id} className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{event.theme}</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(event.event_date), "dd MMM", { locale: ptBR })}
                              <span>·</span>
                              <span>{event.city}</span>
                            </div>
                          </div>
                          {event.registration_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 shrink-0"
                              onClick={() => window.open(event.registration_url!, "_blank")}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return null;
          })}
        </div>
      )}
      {!loadingPosts && !isPostsError && posts.length > 0 && (
        <div className="flex min-h-9 items-center justify-center" aria-live="polite">
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />
          {isFetchingNextPage ? (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando mais publicações...
            </span>
          ) : isFetchNextPageError ? (
            <Button variant="outline" size="sm" onClick={() => void fetchNextPage()}>Tentar carregar mais</Button>
          ) : hasNextPage ? (
            <Button variant="ghost" size="sm" onClick={() => void fetchNextPage()}>Carregar mais</Button>
          ) : (
            <p className="text-xs text-muted-foreground">Você chegou ao fim das publicações.</p>
          )}
        </div>
      )}
      <EditPostDialog
        post={editingPost}
        open={!!editingPost}
        onOpenChange={(o) => !o && setEditingPost(null)}
        onSave={updatePost}
        isSaving={isUpdating}
      />
    </div>
  );
}
