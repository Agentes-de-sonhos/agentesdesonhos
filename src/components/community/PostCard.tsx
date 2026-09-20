import { useCallback, useState } from "react";
import { PostCommentsSection } from "./PostCommentsSection";
import { SharePostDialog } from "./SharePostDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart, MessageCircle, Trash2, MoreHorizontal, Pencil,
  FileText, Download, Share2, ShieldAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { postImages } from "./PostImageGallery";
import { PostMediaGrid } from "./PostMediaGrid";
import { PostLightbox } from "./PostLightbox";
import { ConnectButton } from "./ConnectButton";
import { ConnectMenuItem } from "./ConnectMenuItem";
import { HidePostButton } from "./HidePostButton";
import { ReportContentDialog } from "./ReportContentDialog";
import { PostFollowMenuItem } from "./PostFollowMenuItem";
import { PostTextContent } from "./PostTextContent";
import { PostPoll } from "./PostPoll";
import { DOC_EXT_LABEL, formatBytes } from "@/lib/communityMedia";
import type { CommunityPost, PostComment } from "@/types/community-members";
import { CommunityPostHeader } from "./CommunityPostHeader";


interface PostCardProps {
  post: CommunityPost;
  onLike: (postId: string, liked: boolean) => void;
  onDelete: (postId: string) => void;
  onEdit?: (post: CommunityPost) => void;
  onAddComment: (data: { postId: string; content: string; parentCommentId?: string | null }) => void;
  isAddingComment: boolean;
  fetchComments: (postId: string) => Promise<PostComment[]>;
  onDeleteComment: (commentId: string) => void;
  onToggleCommentLike?: (data: { commentId: string; liked: boolean }) => Promise<unknown>;
  onVotePoll?: (data: { postId: string; optionId: string }) => void;
}

export function PostCard({
  post, onLike, onDelete, onEdit, onAddComment, isAddingComment, fetchComments, onDeleteComment,
  onToggleCommentLike, onVotePoll,
}: PostCardProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const name = post.profile?.name || "Membro";
  const isOwner = user?.id === post.user_id;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR });
  const images = postImages(post);
  const videoUrl = (post as any).video_url as string | null | undefined;
  const documents = ((post as any).documents || []) as { name: string; url: string; size: number; mime: string }[];

  const handleToggleComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      try {
        const data = await fetchComments(post.id);
        setComments(data);
      } catch { /* ignore */ }
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  const refreshComments = useCallback(async () => {
    try {
      const data = await fetchComments(post.id);
      setComments(data);
    } catch { /* ignore */ }
  }, [fetchComments, post.id]);

  return (
    <Card className="-mx-4 rounded-none border-x-0 border-border/50 sm:mx-0 sm:rounded-lg sm:border-x">
      <CardContent className="space-y-3 px-3 pb-3 pt-4 sm:px-6">
        {/* Header */}
        <CommunityPostHeader
          post={post}
          timeLabel={timeAgo}
          controls={<>
          {!isOwner && <ConnectButton targetUserId={post.user_id} targetName={name} className="h-7" />}
          <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isOwner && <ConnectMenuItem targetUserId={post.user_id} targetName={name} />}
              <PostFollowMenuItem authorId={post.user_id} authorName={name} />
              {isOwner && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(post)}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar publicação
                </DropdownMenuItem>
              )}
              {!isOwner && (
                <DropdownMenuItem onClick={() => setReportOpen(true)}>
                  <ShieldAlert className="h-4 w-4 mr-2" /> Denunciar publicação
                </DropdownMenuItem>
              )}
              {(isOwner || isAdmin) && (
                <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir publicação
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <HidePostButton postId={post.id} authorId={post.user_id} currentUserId={user?.id} />
          </div>
          </>}
        />


        {/* Content */}
        {post.content && <PostTextContent text={post.content} />}

        {images.length > 0 && (
          <div className="-mx-4 overflow-hidden border-y border-border/40 sm:mx-0 sm:rounded-lg sm:border">
            <PostMediaGrid images={images} onOpenImage={setLightboxIndex} authorName={name} />
          </div>
        )}

        {videoUrl && (
          <div className="rounded-lg overflow-hidden border border-border/40 bg-black">
            <video src={videoUrl} controls preload="metadata" className="w-full max-h-[520px]" />
          </div>
        )}

        {documents.length > 0 && (
          <div className="space-y-1.5">
            {documents.map((d, i) => (
              <a
                key={i}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-md border border-border/50 bg-muted/20 hover:bg-muted/40 transition"
              >
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{d.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {DOC_EXT_LABEL[d.mime] || "Documento"} · {formatBytes(d.size)}
                  </p>
                </div>
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}

        <PostPoll post={post} onVote={onVotePoll} />

        {/* Legacy Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Member specialties */}
        {post.member?.specialties && post.member.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.member.specialties.slice(0, 3).map((s) => (
              <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                {s}
              </Badge>
            ))}
          </div>
        )}

        {/* Contadores sociais abaixo da mídia */}
        {(post.likes_count > 0 || post.comments_count > 0) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground" data-post-counters>
            {post.likes_count > 0 && (
              <span>{post.likes_count} {post.likes_count === 1 ? "curtida" : "curtidas"}</span>
            )}
            {post.comments_count > 0 && (
              <span>{post.comments_count} {post.comments_count === 1 ? "comentário" : "comentários"}</span>
            )}
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 text-xs ${post.user_liked ? "text-red-500" : "text-muted-foreground"}`}
            onClick={() => onLike(post.id, !!post.user_liked)}
          >
            <Heart className={`h-4 w-4 ${post.user_liked ? "fill-current" : ""}`} />
            Curtir
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={handleToggleComments}
          >
            <MessageCircle className="h-4 w-4" />
            Comentar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-4 w-4" />
            Enviar
          </Button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="space-y-3 pl-2">
            <PostCommentsSection
              postId={post.id}
              comments={comments}
              loading={loadingComments}
              isAddingComment={isAddingComment}
              currentUserId={user?.id}
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
            />
          </div>
        )}

        <SharePostDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          postId={post.id}
        />

        <ReportContentDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetKind="post"
          postId={post.id}
        />




        <PostLightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          authorName={name}
          social={{
            post,
            currentUserId: user?.id,
            isAdmin,
            onLike,
            onAddComment,
            isAddingComment,
            fetchComments,
            onDeleteComment,
            onToggleCommentLike,
          }}
        />
      </CardContent>
    </Card>
  );
}
