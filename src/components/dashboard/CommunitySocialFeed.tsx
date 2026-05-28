import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Heart,
  ImageIcon,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useCommunityFeed } from "@/hooks/useCommunityFeed";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CommunityPost, PostComment } from "@/types/community-members";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

export function CommunitySocialFeed() {
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
    fetchComments,
    addComment,
    isAddingComment,
    deleteComment,
  } = useCommunityFeed();

  const [collapsed, setCollapsed] = useState(true);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(8);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Profile of current user for composer avatar
  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-feed", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const lastViewedKey = user ? `community_feed_last_viewed_${user.id}` : null;
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(() => {
    if (typeof window === "undefined" || !user) return null;
    return localStorage.getItem(`community_feed_last_viewed_${user.id}`);
  });

  const markAsViewed = () => {
    if (!lastViewedKey) return;
    const now = new Date().toISOString();
    localStorage.setItem(lastViewedKey, now);
    setLastViewedAt(now);
  };

  useEffect(() => {
    if (!collapsed) markAsViewed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    const threshold = lastViewedAt ? new Date(lastViewedAt).getTime() : 0;
    return posts.filter(
      (p: CommunityPost) =>
        p.user_id !== user.id && new Date(p.created_at).getTime() > threshold
    ).length;
  }, [posts, lastViewedAt, user]);

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error("A imagem precisa ter até 5 MB.");
      return;
    }
    setImageFile(f);
  };

  const handlePublish = async () => {
    if (!user) return;
    const trimmed = content.trim();
    if (!trimmed && !imageFile) {
      toast.error("Escreva algo ou anexe uma imagem para publicar.");
      return;
    }
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        setUploading(true);
        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("community-feed")
          .upload(path, imageFile, { contentType: imageFile.type });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("community-feed").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
      createPost(
        { content: trimmed, tags: [], imageUrl },
        {
          onSuccess: () => {
            setContent("");
            setImageFile(null);
            toast.success("Publicação compartilhada com a comunidade!");
          },
          onError: () => toast.error("Não foi possível publicar. Tente novamente."),
        }
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const focusComposer = () => {
    composerRef.current?.focus();
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const toggleCommentsOpen = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleShare = async (post: CommunityPost) => {
    const shareData = {
      title: "Comunidade Agentes de Sonhos",
      text: post.content?.slice(0, 140) || "Veja esta publicação da comunidade",
      url: window.location.origin + "/dashboard",
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Link copiado!");
      }
    } catch {
      /* user cancelled */
    }
  };

  const visiblePosts = posts.slice(0, visibleCount);

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2 flex-wrap">
              <Users className="h-5 w-5 text-[hsl(var(--section-community))]" />
              Comunidade
              {unreadCount > 0 && collapsed && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-white shadow-[0_4px_14px_-2px_rgba(168,85,247,0.55)] ring-1 ring-white/20 bg-[linear-gradient(110deg,#7c3aed_0%,#d946ef_55%,#ec4899_100%)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  {unreadCount} {unreadCount === 1 ? "nova publicação" : "novas publicações"}
                </span>
              )}
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-community))]" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mt-1 text-muted-foreground hover:text-foreground transition-transform flex-shrink-0"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expandir seção" : "Recolher seção"}
            aria-expanded={!collapsed}
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
          </Button>
        </div>

        <div className="rounded-xl bg-[hsl(var(--section-community))]/5 border border-[hsl(var(--section-community))]/15 px-3 py-2 space-y-0.5 w-full">
          <p className="text-sm font-semibold text-foreground leading-tight">💬 Conecte-se com outros agentes</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Compartilhe dúvidas, novidades, indicações, experiências e oportunidades com a comunidade.
          </p>
        </div>

        {!collapsed && (
          <>
            {/* Composer */}
            <div className="rounded-2xl bg-card border border-border/60 p-3 sm:p-4 space-y-3">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={myProfile?.avatar_url || undefined} alt={myProfile?.name || "Você"} />
                  <AvatarFallback className="bg-[hsl(var(--section-community))]/15 text-[hsl(var(--section-community))]">
                    {initials(myProfile?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Textarea
                    ref={composerRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="O que você quer compartilhar com a comunidade?"
                    className="resize-none min-h-[72px] bg-background border-border/60 focus-visible:ring-[hsl(var(--section-community))]/40"
                    maxLength={5000}
                  />
                </div>
              </div>
              {imagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-border/60 max-w-md">
                  <img src={imagePreview} alt="Pré-visualização" className="w-full max-h-72 object-cover" />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 rounded-full"
                    onClick={() => setImageFile(null)}
                    aria-label="Remover imagem"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-[hsl(var(--section-community))]"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || isCreating}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Adicionar foto
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePickImage}
                />
                <Button
                  size="sm"
                  className="bg-[hsl(var(--section-community))] hover:bg-[hsl(var(--section-community))]/90 text-white"
                  onClick={handlePublish}
                  disabled={uploading || isCreating || (!content.trim() && !imageFile)}
                >
                  {(uploading || isCreating) ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Publicar
                </Button>
              </div>
            </div>

            {/* Feed */}
            {loadingPosts ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando publicações...
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl bg-card border border-dashed border-[hsl(var(--section-community))]/30 px-6 py-10 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-[hsl(var(--section-community))]/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-[hsl(var(--section-community))]" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Seja o primeiro a movimentar a comunidade</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Compartilhe uma dúvida, indicação, novidade ou experiência com outros profissionais de viagem.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-[hsl(var(--section-community))] hover:bg-[hsl(var(--section-community))]/90 text-white"
                  onClick={focusComposer}
                >
                  Criar publicação
                </Button>
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
                    onShare={() => handleShare(post)}
                    onDelete={() => {
                      if (confirm("Excluir esta publicação?")) deletePost(post.id);
                    }}
                    commentsOpen={expandedComments.has(post.id)}
                    onToggleComments={() => toggleCommentsOpen(post.id)}
                    fetchComments={fetchComments}
                    addComment={addComment}
                    deleteComment={deleteComment}
                    isAddingComment={isAddingComment}
                  />
                ))}
                {posts.length > visibleCount && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleCount((c) => c + 8)}
                      className="text-[hsl(var(--section-community))]"
                    >
                      Carregar mais publicações
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface PostCardProps {
  post: CommunityPost;
  currentUserId?: string;
  isAdmin: boolean;
  onLike: () => void;
  onShare: () => void;
  onDelete: () => void;
  commentsOpen: boolean;
  onToggleComments: () => void;
  fetchComments: (postId: string) => Promise<PostComment[]>;
  addComment: (vars: { postId: string; content: string }) => void;
  deleteComment: (commentId: string) => void;
  isAddingComment: boolean;
}

function PostCard({
  post,
  currentUserId,
  isAdmin,
  onLike,
  onShare,
  onDelete,
  commentsOpen,
  onToggleComments,
  fetchComments,
  addComment,
  deleteComment,
  isAddingComment,
}: PostCardProps) {
  const isAuthor = currentUserId === post.user_id;
  const canDelete = isAuthor || isAdmin;

  const { data: comments = [], isLoading: loadingComments } = useQuery({
    queryKey: ["community-feed-comments", post.id, post.comments_count],
    queryFn: () => fetchComments(post.id),
    enabled: commentsOpen,
    staleTime: 30 * 1000,
  });

  const [commentText, setCommentText] = useState("");

  const handleAddComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    addComment({ postId: post.id, content: trimmed });
    setCommentText("");
  };

  return (
    <article className="rounded-2xl bg-card border border-border/60 overflow-hidden">
      <header className="flex items-start gap-3 p-4 pb-2">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={post.profile?.avatar_url || undefined} alt={post.profile?.name || "Autor"} />
          <AvatarFallback className="bg-[hsl(var(--section-community))]/15 text-[hsl(var(--section-community))]">
            {initials(post.profile?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">
              {post.profile?.name || "Membro da comunidade"}
            </span>
            {post.profile?.agency_name && (
              <span className="text-xs text-muted-foreground truncate">· {post.profile.agency_name}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(post.created_at)}</p>
        </div>
        {canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Excluir publicação
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>
        </div>
      )}

      {post.image_url && (
        <div className="bg-muted/30">
          <img
            src={post.image_url}
            alt={`Imagem da publicação de ${post.profile?.name || "membro"}`}
            className="w-full max-h-[480px] object-cover"
            loading="lazy"
          />
        </div>
      )}

      {(post.likes_count > 0 || post.comments_count > 0) && (
        <div className="px-4 pt-3 flex items-center gap-3 text-xs text-muted-foreground">
          {post.likes_count > 0 && (
            <span>{post.likes_count} {post.likes_count === 1 ? "curtida" : "curtidas"}</span>
          )}
          {post.comments_count > 0 && (
            <button
              type="button"
              onClick={onToggleComments}
              className="hover:underline"
            >
              {post.comments_count} {post.comments_count === 1 ? "comentário" : "comentários"}
            </button>
          )}
        </div>
      )}

      <div className="px-2 sm:px-4 py-1 mt-2 border-t border-border/40 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLike}
          className={`flex-1 gap-2 ${post.user_liked ? "text-[hsl(var(--section-community))]" : "text-muted-foreground"}`}
        >
          <Heart className={`h-4 w-4 ${post.user_liked ? "fill-current" : ""}`} />
          <span className="text-xs sm:text-sm">Curtir</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleComments}
          className="flex-1 gap-2 text-muted-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs sm:text-sm">Comentar</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onShare}
          className="flex-1 gap-2 text-muted-foreground"
        >
          <Share2 className="h-4 w-4" />
          <span className="text-xs sm:text-sm">Compartilhar</span>
        </Button>
      </div>

      {commentsOpen && (
        <div className="px-4 pb-4 pt-2 space-y-3 bg-muted/20 border-t border-border/40">
          {loadingComments ? (
            <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Carregando comentários...
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Seja o primeiro a comentar.</p>
          ) : (
            <ul className="space-y-3 pt-2">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2.5">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={c.profile?.avatar_url || undefined} alt={c.profile?.name || "Autor"} />
                    <AvatarFallback className="text-[10px] bg-[hsl(var(--section-community))]/15 text-[hsl(var(--section-community))]">
                      {initials(c.profile?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="rounded-2xl bg-background border border-border/50 px-3 py-2">
                      <p className="text-xs font-semibold text-foreground">
                        {c.profile?.name || "Membro"}
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5">
                        {c.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-2">
                      <span className="text-[11px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                      {(currentUserId === c.user_id || isAdmin) && (
                        <button
                          onClick={() => {
                            if (confirm("Excluir comentário?")) deleteComment(c.id);
                          }}
                          className="text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 pt-1">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva um comentário..."
              className="resize-none min-h-[40px] max-h-32 text-sm bg-background"
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleAddComment}
              disabled={!commentText.trim() || isAddingComment}
              className="bg-[hsl(var(--section-community))] hover:bg-[hsl(var(--section-community))]/90 text-white flex-shrink-0"
            >
              {isAddingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}