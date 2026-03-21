import { useCommunityFeed } from "@/hooks/useCommunityFeed";
import { CreatePostForm } from "./CreatePostForm";
import { PostCard } from "./PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";

export function CommunityFeedSection() {
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

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <CreatePostForm onSubmit={createPost} isCreating={isCreating} />

      {loadingPosts ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum post ainda</p>
          <p className="text-sm">Seja o primeiro a compartilhar algo!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={(postId, liked) => toggleLike({ postId, liked })}
              onDelete={deletePost}
              onAddComment={addComment}
              isAddingComment={isAddingComment}
              fetchComments={fetchComments}
              onDeleteComment={deleteComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
