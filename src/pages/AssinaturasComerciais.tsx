import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Copy, Trash2, Star, UserCircle2, Loader2 } from "lucide-react";
import { useCommercialSignatures } from "@/hooks/useCommercialSignatures";
import { SignatureFormDialog } from "@/components/signatures/SignatureFormDialog";
import type { CommercialSignature } from "@/types/signature";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AssinaturasComerciais() {
  const { signatures, isLoading, create, update, remove, setDefault, duplicate } = useCommercialSignatures();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CommercialSignature | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommercialSignature | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);

  const openCreate = () => { setEditing(null); setEditOpen(true); };
  const openEdit = (s: CommercialSignature) => { setEditing(s); setEditOpen(true); };

  const handleSubmit = async (payload: Partial<CommercialSignature>) => {
    if (editing) await update.mutateAsync({ id: editing.id, patch: payload });
    else await create.mutateAsync(payload);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setCheckingUsage(true);
    try {
      // Check usage across documents
      const [q, t, i] = await Promise.all([
        supabase.from("quotes").select("id", { count: "exact", head: true }).filter("signature_snapshot->>id", "eq", deleteTarget.id),
        supabase.from("trips").select("id", { count: "exact", head: true }).filter("signature_snapshot->>id", "eq", deleteTarget.id),
        supabase.from("itineraries").select("id", { count: "exact", head: true }).filter("signature_snapshot->>id", "eq", deleteTarget.id),
      ]);
      const used = (q.count || 0) + (t.count || 0) + (i.count || 0);
      if (used > 0) {
        toast.error(`Esta assinatura está vinculada a ${used} documento(s). Inative-a em vez de excluir.`);
        await update.mutateAsync({ id: deleteTarget.id, patch: { is_active: false } });
        setDeleteTarget(null);
        return;
      }
      await remove.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setCheckingUsage(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-5xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Assinaturas Comerciais</h1>
            <p className="text-muted-foreground mt-1">
              Crie identidades comerciais (consultores, vendedores ou atendentes) para usar em Orçamentos, Carteira Digital e Roteiros.
            </p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Nova assinatura</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : signatures.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <UserCircle2 className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma assinatura cadastrada ainda.</p>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Criar primeira assinatura</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {signatures.map((s) => (
              <Card key={s.id} className={!s.is_active ? "opacity-60" : ""}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.name} className="h-14 w-14 rounded-full object-cover" />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xl font-bold">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{s.name}</p>
                      {s.title && <p className="text-xs text-muted-foreground truncate">{s.title}</p>}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.is_default && <Badge variant="default" className="text-[10px]"><Star className="h-2.5 w-2.5 mr-0.5" />Padrão</Badge>}
                        {!s.is_active && <Badge variant="secondary" className="text-[10px]">Inativa</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {s.whatsapp && <p>WhatsApp: {s.whatsapp}</p>}
                    {s.email && <p className="truncate">E-mail: {s.email}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => duplicate.mutate(s.id)}><Copy className="h-3.5 w-3.5" /></Button>
                    {!s.is_default && s.is_active && (
                      <Button size="sm" variant="outline" onClick={() => setDefault.mutate(s.id)} title="Definir como padrão">
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => update.mutate({ id: s.id, patch: { is_active: !s.is_active } })}>
                      {s.is_active ? "Inativar" : "Ativar"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <SignatureFormDialog open={editOpen} onOpenChange={setEditOpen} initial={editing} onSubmit={handleSubmit} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Se esta assinatura estiver vinculada a documentos existentes, ela será inativada em vez de excluída para preservar o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={checkingUsage}>
              {checkingUsage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}