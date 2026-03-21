import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { CommunityPost, PostComment } from "@/types/community-members";

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
        .from("profiles")
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

      return data.map((post: any) => ({
        ...post,
        profile: profiles?.find((p: any) => p.user_id === post.user_id),
        member: members?.find((m: any) => m.user_id === post.user_id),
        user_liked: userLikes.includes(post.id),
      })) as CommunityPost[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const createPost = useMutation({
    mutationFn: async ({ content, tags }: { content: string; tags: string[] }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        content,
        tags,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
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
      .from("profiles")
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

  return {
    posts,
    loadingPosts,
    createPost: createPost.mutate,
    isCreating: createPost.isPending,
    toggleLike: toggleLike.mutate,
    deletePost: deletePost.mutate,
    fetchComments,
    addComment: addComment.mutate,
    isAddingComment: addComment.isPending,
    deleteComment: deleteComment.mutate,
  };
}
