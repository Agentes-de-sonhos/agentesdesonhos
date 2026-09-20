import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { CommunityPost, PostComment, PostDocument, PostPoll } from "@/types/community-members";
import { buildCommunityFeedPage, mergeUniqueCommunityPages } from "@/lib/communityFeedPagination";
import { mutedAuthorIds } from "@/hooks/useCommunityNetwork";
import { extractMentionUserIds } from "@/lib/communityMentions";
import {
  DEFAULT_COMMUNITY_VISIBILITY,
  type CommunityVisibility,
} from "@/lib/communityVisibility";

/**
 * Persiste as marcações @ do conteúdo. O banco valida autoria, conexão aceita e
 * limite por conteúdo; menções inválidas são simplesmente ignoradas e nunca
 * impedem a publicação ou o comentário.
 */
export async function persistMentions({
  postId,
  commentId,
  content,
  authorId,
}: {
  postId: string | null;
  commentId: string | null;
  content: string;
  authorId: string;
}): Promise<number> {
  const ids = extractMentionUserIds(content).filter((id) => id !== authorId);
  if (ids.length === 0 || (!postId && !commentId)) return 0;
  const rows = ids.map((mentionedUserId) => ({
    post_id: postId,
    comment_id: commentId,
    author_id: authorId,
    mentioned_user_id: mentionedUserId,
  }));
  const { error } = await (supabase as any).from("community_mentions").insert(rows);
  if (error) return 0;
  return rows.length;
}

interface CommunityFeedOptions {
  pageSize?: number;
  /** Permite usar apenas as mutations (ex.: compositor da barra mobile) sem buscar o feed. */
  enabled?: boolean;
}

const LEGACY_FEED_LIMIT = 1000;

export function useCommunityFeed({ pageSize = LEGACY_FEED_LIMIT, enabled = true }: CommunityFeedOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Autores que o usuário deixou de seguir: filtrados no servidor, preservando paginação.
  const mutedQuery = useQuery({
    queryKey: ["community-muted-authors", user?.id ?? null],
    enabled: enabled && !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_muted_authors")
        .select("author_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as { author_id: string }[];
    },
  });
  const mutedIds = mutedAuthorIds(mutedQuery.data);
  const mutedReady = !user?.id || !mutedQuery.isLoading;

  const postsQuery = useInfiniteQuery({
    queryKey: ["community-feed", pageSize, mutedIds.join(",")],
    enabled: enabled && mutedReady,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("community_posts")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(pageParam, pageParam + pageSize);
      if (mutedIds.length > 0) {
        query = query.not("user_id", "in", `(${mutedIds.join(",")})`);
      }
      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return buildCommunityFeedPage([], pageSize, pageParam);

      const pageRows = data.slice(0, pageSize);

      const userIds = [...new Set(pageRows.map((p: any) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, agency_name")
        .in("user_id", userIds);
      const { data: members } = await supabase
        .from("community_members_public")
        .select("user_id, specialties, status")
        .in("user_id", userIds);

      let userLikes: string[] = [];
      if (user?.id) {
        const postIds = pageRows.map((p: any) => p.id);
        const { data: likes } = await supabase
          .from("community_post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);
        userLikes = (likes || []).map((l: any) => l.post_id);
      }

      const pollPostIds = pageRows.filter((p: any) => p.poll).map((p: any) => p.id);
      let pollVotes: any[] = [];
      if (pollPostIds.length > 0) {
        const { data: votes } = await (supabase as any)
          .from("community_post_poll_votes")
          .select("post_id, option_id, user_id")
          .in("post_id", pollPostIds);
        pollVotes = votes || [];
      }

      const enriched = pageRows.map((post: any) => ({
        ...post,
        profile: profiles?.find((p: any) => p.user_id === post.user_id),
        member: members?.find((m: any) => m.user_id === post.user_id),
        user_liked: userLikes.includes(post.id),
        poll_votes: pollVotes.filter((v: any) => v.post_id === post.id),
        user_poll_option:
          user?.id
            ? pollVotes.find((v: any) => v.post_id === post.id && v.user_id === user.id)?.option_id ?? null
            : null,
      })) as CommunityPost[];

      return buildCommunityFeedPage(
        [...enriched, ...(data.length > pageSize ? [data[pageSize] as unknown as CommunityPost] : [])],
        pageSize,
        pageParam,
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 2 * 60 * 1000,
  });

  const posts = mergeUniqueCommunityPages(postsQuery.data?.pages ?? []);

  const createPost = useMutation({
    mutationFn: async ({
      content,
      tags = [],
      imageUrl = null,
      imageUrls = null,
      videoUrl = null,
      documents = null,
      poll = null,
      visibility = DEFAULT_COMMUNITY_VISIBILITY,
    }: {
      content: string;
      tags?: string[];
      imageUrl?: string | null;
      imageUrls?: string[] | null;
      videoUrl?: string | null;
      documents?: PostDocument[] | null;
      poll?: PostPoll | null;
      visibility?: CommunityVisibility;
    }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const cleanPoll =
        poll && poll.question.trim() && poll.options.filter((o) => o.text.trim()).length >= 2
          ? {
              question: poll.question.trim(),
              options: poll.options
                .filter((o) => o.text.trim())
                .map((o) => ({ id: o.id, text: o.text.trim() })),
            }
          : null;
      const { data, error } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          content,
          tags,
          image_url: imageUrl ?? (imageUrls?.[0] ?? null),
          image_urls: imageUrls ?? (imageUrl ? [imageUrl] : []),
          video_url: videoUrl,
          documents: documents ?? [],
          poll: cleanPoll,
          visibility,
        } as any)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      // Marcações @ (somente conexões aceitas, validado por RLS/banco).
      await persistMentions({ postId: (data as any)?.id ?? null, commentId: null, content, authorId: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível publicar.");
    },
  });

  const updatePost = useMutation({
    mutationFn: async ({
      postId,
      content,
      imageUrls,
      videoUrl,
      documents,
      poll,
    }: {
      postId: string;
      content: string;
      imageUrls: string[];
      videoUrl?: string | null;
      documents?: PostDocument[];
      poll?: PostPoll | null;
    }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const patch: Record<string, any> = {
        content,
        image_url: imageUrls[0] ?? null,
        image_urls: imageUrls,
        edited_at: new Date().toISOString(),
      };
      // Only touch video/documents/poll when caller explicitly provides them,
      // so text-only edits never wipe existing attachments or the poll.
      if (videoUrl !== undefined) patch.video_url = videoUrl;
      if (documents !== undefined) patch.documents = documents;
      if (poll !== undefined) patch.poll = poll;
      const { error } = await supabase
        .from("community_posts")
        .update(patch as any)
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Publicação atualizada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível atualizar a publicação.");
    },
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (!user?.id) throw new Error("Não autenticado");
      if (liked) {
        await supabase
          .from("community_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase.from("community_post_likes").insert({
          post_id: postId,
          user_id: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("community_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post removido");
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });

  // Comments: uma consulta por lista (perfis e curtidas em lote, sem consulta por comentário)
  const fetchComments = async (postId: string): Promise<PostComment[]> => {
    const { data, error } = await supabase
      .from("community_post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return [];
    const userIds = [...new Set(data.map((c: any) => c.user_id))];
    const commentIds = data.map((c: any) => c.id);
    const [{ data: profiles }, { data: likes }] = await Promise.all([
      supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, agency_name")
        .in("user_id", userIds),
      user?.id
        ? (supabase as any)
            .from("community_comment_likes")
            .select("comment_id")
            .eq("user_id", user.id)
            .in("comment_id", commentIds)
        : Promise.resolve({ data: [] as { comment_id: string }[] }),
    ]);
    const likedIds = new Set(((likes ?? []) as { comment_id: string }[]).map((l) => l.comment_id));
    return data.map((c: any) => ({
      ...c,
      likes_count: c.likes_count ?? 0,
      user_liked: likedIds.has(c.id),
      profile: profiles?.find((p: any) => p.user_id === c.user_id),
    }));
  };

  const addComment = useMutation({
    mutationFn: async ({
      postId,
      content,
      parentCommentId = null,
    }: {
      postId: string;
      content: string;
      parentCommentId?: string | null;
    }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("community_post_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
          parent_comment_id: parentCommentId,
        } as any)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      await persistMentions({
        postId: null,
        commentId: (data as any)?.id ?? null,
        content,
        authorId: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível comentar.");
    },
  });

  const toggleCommentLike = useMutation({
    mutationFn: async ({ commentId, liked }: { commentId: string; liked: boolean }) => {
      if (!user?.id) throw new Error("Não autenticado");
      if (liked) {
        const { error } = await (supabase as any)
          .from("community_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        if (error) throw error;
        return;
      }
      const { error } = await (supabase as any)
        .from("community_comment_likes")
        .insert({ comment_id: commentId, user_id: user.id });
      if (error) throw error;
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível atualizar a curtida.");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("community_post_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });

  const votePoll = useMutation({
    mutationFn: async ({ postId, optionId }: { postId: string; optionId: string }) => {
      if (!user?.id) throw new Error("Não autenticado");
      // Upsert allows a user to switch their own vote while keeping a single
      // row per (post_id, user_id) enforced by the unique constraint at the DB level.
      const { error } = await (supabase as any)
        .from("community_post_poll_votes")
        .upsert(
          { post_id: postId, user_id: user.id, option_id: optionId },
          { onConflict: "post_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível registrar seu voto.");
    },
  });

  return {
    posts,
    loadingPosts: postsQuery.isLoading,
    postsError: postsQuery.error,
    isPostsError: postsQuery.isError,
    refetchPosts: postsQuery.refetch,
    fetchNextPage: postsQuery.fetchNextPage,
    hasNextPage: postsQuery.hasNextPage,
    isFetchingNextPage: postsQuery.isFetchingNextPage,
    isFetchNextPageError: postsQuery.isFetchNextPageError,
    createPost: createPost.mutate,
    isCreating: createPost.isPending,
    toggleLike: toggleLike.mutate,
    deletePost: deletePost.mutate,
    updatePost: updatePost.mutateAsync,
    isUpdating: updatePost.isPending,
    fetchComments,
    addComment: addComment.mutate,
    isAddingComment: addComment.isPending,
    deleteComment: deleteComment.mutate,
    toggleCommentLike: toggleCommentLike.mutateAsync,
    isTogglingCommentLike: toggleCommentLike.isPending,
    votePoll: votePoll.mutate,
    isVoting: votePoll.isPending,
  };
}
