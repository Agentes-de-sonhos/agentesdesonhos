import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

/**
 * Cadastro de fornecedor PARTICULAR da agência atual.
 * Grava em tour_operators com owner_agency_id = agência (master) e
 * is_published/is_public_visible = false — nunca aparece no Mapa do Turismo
 * nem para outra agência (garantido também por RLS).
 */
export function SupplierCreateDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { agencyOwnerId } = useAgencyOwnerId();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", category: "", contacts: "", website: "", notes: "" });

  const reset = () => setForm({ name: "", category: "", contacts: "", website: "", notes: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!agencyOwnerId) throw new Error("Agência não identificada.");
      const { data, error } = await (supabase.from("tour_operators") as any)
        .insert({
          name: form.name.trim(),
          category: form.category.trim() || null,
          commercial_contacts: form.contacts.trim() || null,
          website: form.website.trim() || null,
          short_description: form.notes.trim() || null,
          owner_agency_id: agencyOwnerId,
          is_published: false,
          is_public_visible: false,
          is_active: true,
          source: "agency_private",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Fornecedor cadastrado para a sua agência");
      void qc.invalidateQueries({ queryKey: ["my_suppliers"] });
      void qc.invalidateQueries({ queryKey: ["agency-supplier-terms"] });
      void qc.invalidateQueries({ queryKey: ["tour_operators"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível cadastrar o fornecedor"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar novo fornecedor</DialogTitle>
          <DialogDescription>
            Fornecedor particular da sua agência. Não é publicado no Mapa do Turismo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Receptivo Local" />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: Receptivo, Hotel, Seguro" />
          </div>
          <div className="space-y-1.5">
            <Label>Contato comercial</Label>
            <Input value={form.contacts} onChange={(e) => setForm({ ...form, contacts: e.target.value })} placeholder="E-mail ou telefone" />
          </div>
          <div className="space-y-1.5">
            <Label>Site</Label>
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => create.mutate()} disabled={!form.name.trim() || create.isPending || !user}>
            {create.isPending ? "Cadastrando..." : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
