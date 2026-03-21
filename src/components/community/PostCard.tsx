import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Heart, MessageCircle, Trash2, Pin, CheckCircle2, Send, Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import type { CommunityPost, PostComment } from "@/types/community-members";

interface PostCardProps {
  post: CommunityPost;
  onLike: (postId: string, liked: boolean) => void;
  onDelete: (postId: string) => void;
  onAddComment: (data: { postId: string; content: string }) => void;
  isAddingComment: boolean;
  fetchComments: (postId: string) => Promise<PostComment[]>;
  onDeleteComment: (commentId: string) => void;
}

export function PostCard({
  post, onLike, onDelete, onAddComment, isAddingComment, fetchComments, onDeleteComment,
}: PostCardProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const name = post.profile?.name || "Membro";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const isOwner = user?.id === post.user_id;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR });

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
            </div>
          </div>
          {(isOwner || isAdmin) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(post.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{post.content}</p>

        {/* Tags */}
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
                      <p className="text-xs text-muted-foreground">{c.content}</p>
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
      </CardContent>
    </Card>
  );
}
