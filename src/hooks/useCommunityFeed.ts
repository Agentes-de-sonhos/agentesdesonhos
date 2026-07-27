import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { CommunityPost, PostComment, PostDocument, PostPoll } from "@/types/community-members";

export function useCommunityFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["community-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) return [] as CommunityPost[];

      const userIds = [...new Set(data.map((p: any) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, agency_name")
        .in("user_id", userIds);
      const { data: members } = await supabase
        .from("community_members")
        .select("user_id, specialties, status")
        .in("user_id", userIds);

      let userLikes: string[] = [];
      if (user?.id) {
        const postIds = data.map((p: any) => p.id);
        const { data: likes } = await supabase
          .from("community_post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);
        userLikes = (likes || []).map((l: any) => l.post_id);
      }

      const pollPostIds = data.filter((p: any) => p.poll).map((p: any) => p.id);
      let pollVotes: any[] = [];
      if (pollPostIds.length > 0) {
        const { data: votes } = await (supabase as any)
          .from("community_post_poll_votes")
          .select("post_id, option_id, user_id")
          .in("post_id", pollPostIds);
        pollVotes = votes || [];
      }

      return data.map((post: any) => ({
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
    },
    staleTime: 2 * 60 * 1000,
  });

  const createPost = useMutation({
    mutationFn: async ({
      content,
      tags = [],
      imageUrl = null,
      imageUrls = null,
      videoUrl = null,
      documents = null,
      poll = null,
    }: {
      content: string;
      tags?: string[];
      imageUrl?: string | null;
      imageUrls?: string[] | null;
      videoUrl?: string | null;
      documents?: PostDocument[] | null;
      poll?: PostPoll | null;
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
      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        content,
        tags,
        image_url: imageUrl ?? (imageUrls?.[0] ?? null),
        image_urls: imageUrls ?? (imageUrl ? [imageUrl] : []),
        video_url: videoUrl,
        documents: documents ?? [],
        poll: cleanPoll,
      } as any);
      if (error) throw error;
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

  // Comments
  const fetchComments = async (postId: string): Promise<PostComment[]> => {
    const { data, error } = await supabase
      .from("community_post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return [];
    const userIds = [...new Set(data.map((c: any) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles_public")
      .select("user_id, name, avatar_url")
      .in("user_id", userIds);
    return data.map((c: any) => ({
      ...c,
      profile: profiles?.find((p: any) => p.user_id === c.user_id),
    }));
  };

  const addComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase.from("community_post_comments").insert({
        post_id: postId,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
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
    loadingPosts,
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
    votePoll: votePoll.mutate,
    isVoting: votePoll.isPending,
  };
}
