import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCommunityConnectionProfiles } from "@/hooks/useCommunityConnectionProfiles";

export const MAX_SHARE_RECIPIENTS = 10;

interface SharePostDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Envia a publicação para conexões aceitas usando o chat interno existente.
 * A validação real (conexão aceita e acesso à publicação) ocorre no banco.
 */
export function SharePostDialog({ postId, open, onOpenChange }: SharePostDialogProps) {
  const queryClient = useQueryClient();
  const { connectionProfiles, isLoading } = useCommunityConnectionProfiles();
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const value = term.trim().toLowerCase();
    if (!value) return connectionProfiles;
    return connectionProfiles.filter(
      (person) =>
        person.name.toLowerCase().includes(value) ||
        (person.agency_name ?? "").toLowerCase().includes(value),
    );
  }, [connectionProfiles, term]);

  const toggle = (userId: string) => {
    setSelected((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      if (prev.length >= MAX_SHARE_RECIPIENTS) {
        toast.error(`Envie para no máximo ${MAX_SHARE_RECIPIENTS} conexões por vez.`);
        return prev;
      }
      return [...prev, userId];
    });
  };

  const share = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("share_community_post", {
        _post_id: postId,
        _recipient_ids: selected,
        _note: null,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: (sent) => {
      queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
      toast.success(
        sent === 1 ? "Publicação enviada para 1 conexão." : `Publicação enviada para ${sent} conexões.`,
      );
      setSelected([]);
      setTerm("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Não foi possível enviar a publicação.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !share.isPending && onOpenChange(next)}>
      <DialogContent className="max-w-md" data-share-post-dialog>
        <DialogHeader>
          <DialogTitle>Enviar publicação</DialogTitle>
          <DialogDescription>
            Escolha até {MAX_SHARE_RECIPIENTS} conexões. O envio usa o chat da Comunidade.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Pesquisar conexões"
          aria-label="Pesquisar conexões"
        />

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando conexões...</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma conexão encontrada.
            </p>
          ) : (
            filtered.map((person) => (
              <label
                key={person.user_id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
              >
                <Checkbox
                  checked={selected.includes(person.user_id)}
                  onCheckedChange={() => toggle(person.user_id)}
                  aria-label={`Enviar para ${person.name}`}
                />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={person.avatar_url || ""} />
                  <AvatarFallback className="text-xs">
                    {person.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{person.name}</span>
                  {person.agency_name && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {person.agency_name}
                    </span>
                  )}
                </span>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={share.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => share.mutate()}
            disabled={selected.length === 0 || share.isPending}
            className="gap-2"
          >
            {share.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar{selected.length > 0 ? ` (${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
