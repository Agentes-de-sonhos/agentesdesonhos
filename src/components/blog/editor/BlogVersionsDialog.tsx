import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatInZone, type BlogSnapshot } from "@/lib/blog/blogUtils";

const sb = supabase as any;

export function BlogVersionsDialog({
  open,
  onOpenChange,
  postId,
  beforeRestore,
  onRestored,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postId: string;
  beforeRestore: () => Promise<boolean>;
  onRestored: () => Promise<void>;
}) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["blog-revisions", postId, open],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await sb
        .from("site_blog_post_revisions")
        .select("id, reason, created_at, snapshot")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as { id: string; reason: string; created_at: string; snapshot: BlogSnapshot }[];
    },
  });

  const restore = async (id: string) => {
    if (!(await beforeRestore())) return;
    const { data: res, error } = await sb.rpc("blog_restore_revision", { p_revision_id: id });
    if (error || res?.error) return toast.error("Não foi possível restaurar esta versão.");
    toast.success("Versão restaurada no rascunho. Nada foi publicado.");
    await onRestored();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de versões</DialogTitle>
          <DialogDescription>Restaurar substitui o rascunho atual. A versão publicada não muda até você publicar.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">As versões aparecem conforme você edita (uma a cada 10 minutos de edição) e a cada publicação.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.snapshot?.title || "Sem título"}</p>
                  <p className="text-xs text-muted-foreground">{formatInZone(r.created_at)} · {r.reason === "publicação" ? "Publicada" : "Salvamento automático"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => restore(r.id)}>Restaurar</Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
