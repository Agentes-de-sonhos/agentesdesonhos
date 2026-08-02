import { LinkifiedText } from "@/components/community/LinkifiedText";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Heart, MessageCircle, Trash2, Pin, CheckCircle2, Send, Loader2, MoreHorizontal, Pencil,
  FileText, Download,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { PostImageGallery, postImages } from "./PostImageGallery";
import { PostPoll } from "./PostPoll";
import { DOC_EXT_LABEL, formatBytes } from "@/lib/communityMedia";
import type { CommunityPost, PostComment } from "@/types/community-members";

interface PostCardProps {
  post: CommunityPost;
  onLike: (postId: string, liked: boolean) => void;
  onDelete: (postId: string) => void;
  onEdit?: (post: CommunityPost) => void;
  onAddComment: (data: { postId: string; content: string }) => void;
  isAddingComment: boolean;
  fetchComments: (postId: string) => Promise<PostComment[]>;
  onDeleteComment: (commentId: string) => void;
  onVotePoll?: (data: { postId: string; optionId: string }) => void;
}

export function PostCard({
  post, onLike, onDelete, onEdit, onAddComment, isAddingComment, fetchComments, onDeleteComment, onVotePoll,
}: PostCardProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const name = post.profile?.name || "Membro";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const isOwner = user?.id === post.user_id;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR });
  const images = postImages(post);
  const wasEdited = !!(post as any).edited_at;
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

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    onAddComment({ postId: post.id, content: commentText.trim() });
    setCommentText("");
    setTimeout(async () => {
      const data = await fetchComments(post.id);
      setComments(data);
    }, 500);
  };

  return (
    <Card className="border-border/50">
      <CardContent className="pt-4 pb-3 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-foreground">{name}</span>
              {post.member?.status === "verified" && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              )}
              {post.is_pinned && (
                <Pin className="h-3.5 w-3.5 text-amber-500" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {post.profile?.agency_name && <span>{post.profile.agency_name}</span>}
              <span>·</span>
              <span>{timeAgo}</span>
              {wasEdited && <span className="italic">· Editado</span>}
            </div>
          </div>
          {(isOwner || isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwner && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(post)}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar publicação
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir publicação
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        {post.content && (
          <LinkifiedText
            text={post.content}
            className="text-sm text-foreground whitespace-pre-line leading-relaxed break-words"
          />
        )}

        {images.length > 0 && (
          <div className="rounded-lg overflow-hidden border border-border/40">
            <PostImageGallery images={images} onOpenImage={setLightboxUrl} authorName={name} />
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
            {post.likes_count > 0 && post.likes_count}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={handleToggleComments}
          >
            <MessageCircle className="h-4 w-4" />
            {post.comments_count > 0 && post.comments_count}
          </Button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="space-y-3 pl-2">
            {loadingComments ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : (
              comments.map((c) => {
                const cName = c.profile?.name || "Membro";
                const cInitials = cName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={c.profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-muted text-[10px]">{cInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{cName}</span>
                        {(c.user_id === user?.id || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              onDeleteComment(c.id);
                              setComments((prev) => prev.filter((x) => x.id !== c.id));
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <LinkifiedText
                        text={c.content}
                        className="text-xs text-muted-foreground whitespace-pre-line break-words"
                      />
                    </div>
                  </div>
                );
              })
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Escreva um comentário..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="text-sm h-8"
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleAddComment}
                disabled={!commentText.trim() || isAddingComment}
              >
                {isAddingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}

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
      </CardContent>
    </Card>
  );
}
