import { useCallback, useRef, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { CreatePostForm, type ComposerDraftState } from "./CreatePostForm";
import { PostVisibilitySelector } from "./PostVisibilitySelector";
import {
  DEFAULT_COMMUNITY_VISIBILITY,
  type CommunityVisibility,
} from "@/lib/communityVisibility";

interface PostComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Parameters<typeof CreatePostForm>[0]["onSubmit"] extends (d: infer D) => void ? D : never) => void;
  isCreating: boolean;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
}

/**
 * Compositor de publicação: tela inteira no mobile e modal confortável no
 * desktop/tablet. Reutiliza integralmente o CreatePostForm (upload, progresso,
 * erros, enquete e documentos) e apenas adiciona cabeçalho, público e avisos.
 */
export function PostComposerDialog({
  open,
  onOpenChange,
  onSubmit,
  isCreating,
  authorName,
  authorAvatarUrl,
}: PostComposerDialogProps) {
  const [visibility, setVisibility] = useState<CommunityVisibility>(DEFAULT_COMMUNITY_VISIBILITY);
  const [draft, setDraft] = useState<ComposerDraftState>({
    isDirty: false,
    canSubmit: false,
    isBusy: false,
  });
  const [confirmClose, setConfirmClose] = useState(false);
  const submitRef = useRef<(() => void) | null>(null);
  const [formKey, setFormKey] = useState(0);

  const initials = (authorName || "Você")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const closeNow = useCallback(() => {
    setConfirmClose(false);
    setDraft({ isDirty: false, canSubmit: false, isBusy: false });
    setVisibility(DEFAULT_COMMUNITY_VISIBILITY);
    setFormKey((key) => key + 1);
    onOpenChange(false);
  }, [onOpenChange]);

  const requestClose = useCallback(() => {
    if (draft.isBusy) return;
    if (draft.isDirty) {
      setConfirmClose(true);
      return;
    }
    closeNow();
  }, [closeNow, draft.isBusy, draft.isDirty]);

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent
          hideClose
          className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-xl sm:rounded-xl"
          data-post-composer
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={requestClose}
              aria-label="Fechar compositor"
            >
              <X className="h-4.5 w-4.5" />
            </Button>
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={authorAvatarUrl || ""} />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-sm font-semibold">Criar publicação</DialogTitle>
              <div className="mt-1">
                <PostVisibilitySelector
                  value={visibility}
                  onChange={setVisibility}
                  disabled={draft.isBusy}
                />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 gap-1.5"
              disabled={!draft.canSubmit}
              onClick={() => submitRef.current?.()}
            >
              {draft.isBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Publicar
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            <CreatePostForm
              key={formKey}
              variant="plain"
              autoFocusText
              hidePublishButton
              visibility={visibility}
              submitRef={submitRef}
              onDraftStateChange={setDraft}
              isCreating={isCreating}
              onSubmit={(data) => {
                onSubmit(data as never);
                closeNow();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar publicação?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem conteúdo que ainda não foi publicado. Se sair agora, ele será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar escrevendo</AlertDialogCancel>
            <AlertDialogAction onClick={closeNow}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
