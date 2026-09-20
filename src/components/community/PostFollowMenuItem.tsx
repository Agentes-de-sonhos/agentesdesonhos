import { UserMinus, UserPlus } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useCommunityNetwork } from "@/hooks/useCommunityNetwork";

interface PostFollowMenuItemProps {
  authorId: string;
  authorName?: string | null;
}

/**
 * Item de menu compartilhado (feed do dashboard e página completa) para seguir
 * ou parar de seguir o autor sem desfazer a conexão.
 */
export function PostFollowMenuItem({ authorId, authorName }: PostFollowMenuItemProps) {
  const { currentUserId, isFollowing, setFollowing, isUpdatingFollow } = useCommunityNetwork();

  if (!currentUserId || currentUserId === authorId) return null;

  const following = isFollowing(authorId);
  const name = authorName?.trim() || "este autor";

  return (
    <DropdownMenuItem
      disabled={isUpdatingFollow}
      data-post-follow-toggle={following ? "unfollow" : "follow"}
      onSelect={(event) => {
        event.preventDefault();
        setFollowing({ authorId, following: !following });
      }}
    >
      {following ? (
        <>
          <UserMinus className="mr-2 h-4 w-4" /> Parar de seguir {name}
        </>
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" /> Seguir {name}
        </>
      )}
    </DropdownMenuItem>
  );
}
