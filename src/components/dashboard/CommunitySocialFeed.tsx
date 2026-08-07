import { LinkifiedText } from "@/components/community/LinkifiedText";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { DashboardSectionHeader } from "./DashboardSectionHeader";
import {
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useCommunityFeed } from "@/hooks/useCommunityFeed";
import { useCommunityUnread, unreadLabel } from "@/hooks/useCommunityUnread";
import { useQuery } from "@tanstack/react-query";
import type { CommunityPost, PostComment } from "@/types/community-members";
import { EditPostDialog } from "@/components/community/EditPostDialog";
import { PostImageGallery, postImages } from "@/components/community/PostImageGallery";
import { PostPoll } from "@/components/community/PostPoll";
import { CreatePostForm } from "@/components/community/CreatePostForm";
import { Button } from "@/components/ui/button";

function timeAgo(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
  } catch {
    return "";
  }
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function toTitleCase(name?: string | null) {
  if (!name) return "";
  const lower = name.toLowerCase();
  // Preserve accents; capitalize first letter of each whitespace-separated token
  return lower.replace(/(^|\s|['-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

interface CommunitySocialFeedProps {
  defaultExpanded?: boolean;
}

const PREVIEW_LIMIT = 1;

export function CommunitySocialFeed(_props: CommunitySocialFeedProps = {}) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === "admin";
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
    votePoll,
    isVoting,
  } = useCommunityFeed();

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const { newCount } = useCommunityUnread();

  const visiblePosts = posts.slice(0, PREVIEW_LIMIT);

  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <CardContent className="pt-5 pb-5 space-y-3 min-w-0">
        {/* Header */}
        <DashboardSectionHeader
          icon={Users}
          title="Comunidade"
          description="Compartilhe experiências e oportunidades com outros agentes de viagens."
          iconClassName="text-[hsl(var(--section-community))]"
          accentClassName="bg-[hsl(var(--section-community))]"
          cta={{
            to: "/comunidade",
            label: "Ver toda a comunidade",
            shortLabel: "Ver tudo",
            tabTitle: "Comunidade",
            className: "text-[hsl(var(--section-community))]",
          }}
        />

        {/* Coluna central (padrão LinkedIn) */}
        <div className="mx-auto w-full max-w-[780px] min-w-0 space-y-3">
        {/* Composer */}
        <CreatePostForm onSubmit={createPost} isCreating={isCreating} collapsible />

        {/* Feed preview */}
        {loadingPosts ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando publicações...
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl bg-card border border-dashed border-[hsl(var(--section-community))]/30 px-6 py-8 text-center space-y-2">
            <div className="mx-auto h-10 w-10 rounded-full bg-[hsl(var(--section-community))]/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-[hsl(var(--section-community))]" />
            </div>
            <p className="text-sm text-muted-foreground">
              Ainda não há publicações. Seja o primeiro a compartilhar algo com a comunidade.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visiblePosts.map((post: CommunityPost) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                isAdmin={isAdmin}
                onLike={() =>
                  toggleLike({ postId: post.id, liked: !!post.user_liked })
                }
                onDelete={() => {
                  if (confirm("Excluir esta publicação?")) deletePost(post.id);
                }}
                onEdit={() => setEditingPost(post)}
                fetchComments={fetchComments}
                onOpenImage={(url) => setLightboxUrl(url)}
                onVotePoll={votePoll}
                isVoting={isVoting}
                newCount={newCount}
              />
            ))}
          </div>
        )}
        </div>

        {/* Lightbox */}
        <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
          <DialogContent className="max-w-5xl p-0 bg-transparent border-0 shadow-none">
            {lightboxUrl && (
              <img
                src={lightboxUrl}
                alt="Imagem da publicação"
                className="w-full max-h-[85vh] object-contain rounded-lg bg-black/60"
              />
            )}
          </DialogContent>
        </Dialog>

        <EditPostDialog
          post={editingPost}
          open={!!editingPost}
          onOpenChange={(o) => !o && setEditingPost(null)}
          onSave={updatePost}
          isSaving={isUpdating}
        />
      </CardContent>
    </Card>
  );
}

interface PostCardProps {
  post: CommunityPost;
  currentUserId?: string;
  isAdmin: boolean;
  onLike: () => void;
  onDelete: () => void;
  onEdit: () => void;
  fetchComments: (postId: string) => Promise<PostComment[]>;
  onOpenImage: (url: string) => void;
  onVotePoll?: (data: { postId: string; optionId: string }) => void;
  isVoting?: boolean;
  newCount?: number;
}

function PostCard({
  post,
  currentUserId,
  isAdmin,
  onLike,
  onDelete,
  onEdit,
  fetchComments,
  onOpenImage,
  onVotePoll,
  isVoting,
  newCount = 0,
}: PostCardProps) {
  const isAuthor = currentUserId === post.user_id;
  const canDelete = isAuthor || isAdmin;
  const canEdit = isAuthor;
  const images = postImages(post);
  const wasEdited = !!(post as any).edited_at;

  const { data: comments = [], isLoading: loadingComments } = useQuery({
    queryKey: ["community-feed-comments", post.id, post.comments_count],
    queryFn: () => fetchComments(post.id),
    enabled: post.comments_count > 0,
    staleTime: 30 * 1000,
  });

  const latestComment = comments.length > 0 ? comments[comments.length - 1] : null;

  return (
    <article className="rounded-2xl bg-card border border-border/60 overflow-hidden">
      <header className="flex items-start gap-3 px-4 pt-3 pb-2">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={post.profile?.avatar_url || undefined} alt={post.profile?.name || "Autor"} />
          <AvatarFallback className="bg-[hsl(var(--section-community))]/15 text-[hsl(var(--section-community))]">
            {initials(post.profile?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">
              {toTitleCase(post.profile?.name) || "Membro da comunidade"}
            </span>
            {post.profile?.agency_name && (
              <span className="text-xs text-muted-foreground truncate">· {post.profile.agency_name}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {timeAgo(post.created_at)}
            {wasEdited && (
              <span className="ml-1 italic text-muted-foreground/80">· Editado</span>
            )}
          </p>
        </div>
        {(canDelete || canEdit) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar publicação
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir publicação
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {post.content && (
        <div className="px-4 pb-2">
          <LinkifiedText
            text={post.content}
            className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed"
          />
        </div>
      )}

      {images.length > 0 && (
        <PostImageGallery
          images={images}
          onOpenImage={onOpenImage}
          authorName={post.profile?.name || undefined}
        />
      )}

      {(post as any).poll && (
        <div className="px-4 pt-2 min-w-0">
          <PostPoll post={post} onVote={onVotePoll} isVoting={isVoting} />
        </div>
      )}

      {(post.likes_count > 0 || post.comments_count > 0) && (
        <div className="px-4 pt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {post.likes_count > 0 && (
            <span>{post.likes_count} {post.likes_count === 1 ? "curtida" : "curtidas"}</span>
          )}
          {post.comments_count > 0 && (
            <Link to="/comunidade" className="hover:underline">
              {post.comments_count} {post.comments_count === 1 ? "comentário" : "comentários"}
            </Link>
          )}
        </div>
      )}

      <div className="px-2 sm:px-4 py-1 mt-2 border-t border-border/40 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLike}
          className={`flex-1 basis-1/2 gap-2 ${post.user_liked ? "text-[hsl(var(--section-community))]" : "text-muted-foreground"}`}
        >
          <Heart className={`h-4 w-4 ${post.user_liked ? "fill-current" : ""}`} />
          <span className="text-xs sm:text-sm">Curtir</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="flex-1 basis-1/2 gap-2 text-muted-foreground"
        >
          <Link to="/comunidade">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Comentar</span>
          </Link>
        </Button>
      </div>

      {(latestComment || loadingComments || newCount > 1) && (
        <div className="px-4 pb-3 pt-2 space-y-2 bg-muted/20 border-t border-border/40">
          {loadingComments && !latestComment ? (
            <div className="flex items-center py-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Carregando comentário...
            </div>
          ) : latestComment ? (
            <div className="flex gap-2.5 pt-1">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage
                  src={latestComment.profile?.avatar_url || undefined}
                  alt={latestComment.profile?.name || "Autor"}
                />
                <AvatarFallback className="text-[10px] bg-[hsl(var(--section-community))]/15 text-[hsl(var(--section-community))]">
                  {initials(latestComment.profile?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl bg-background border border-border/50 px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">
                    {toTitleCase(latestComment.profile?.name) || "Membro"}
                  </p>
                  <LinkifiedText
                    text={latestComment.content}
                    className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5 line-clamp-3"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 px-2 block">
                  {timeAgo(latestComment.created_at)}
                </span>
              </div>
            </div>
          ) : null}

          {newCount > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/comunidade"
                className="text-xs font-medium text-[hsl(var(--section-community))] hover:underline"
              >
                Ver mais
              </Link>
              <Link
                to="/comunidade"
                className="inline-flex items-center rounded-full bg-[hsl(var(--section-community))]/12 px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--section-community))] ring-1 ring-[hsl(var(--section-community))]/25"
              >
                {unreadLabel(newCount)}
              </Link>
            </div>
          )}
        </div>
      )}
    </article>
  );
}