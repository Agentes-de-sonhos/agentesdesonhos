import { useState } from "react";
import { X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCommunityHiddenPosts } from "@/hooks/useCommunityHiddenPosts";

interface HidePostButtonProps {
  postId: string;
  authorId: string;
  currentUserId?: string | null;
  className?: string;
}

/**
 * X discreto para ocultar a publicação somente do feed deste usuário.
 * Separado do menu de três pontos e indisponível na própria publicação.
 */
export function HidePostButton({ postId, authorId, currentUserId, className }: HidePostButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { hidePost, isUpdating } = useCommunityHiddenPosts();

  if (!currentUserId || currentUserId === authorId) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Ocultar publicação"
        disabled={isUpdating}
        data-hide-post={postId}
        className={cn("h-7 w-7 text-muted-foreground", className)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setConfirmOpen(true);
        }}
      >
        <X className="h-4 w-4" />
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ocultar esta publicação?</AlertDialogTitle>
            <AlertDialogDescription>
              Ela sai apenas do seu feed e da sua busca. A publicação não é excluída e continua
              visível para as outras pessoas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                hidePost(postId);
                setConfirmOpen(false);
              }}
            >
              Ocultar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
