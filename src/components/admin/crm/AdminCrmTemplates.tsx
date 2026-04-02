import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlaybookRichTextEditor } from "../PlaybookRichTextEditor";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { ConfirmDeleteDialog } from "../ConfirmDeleteDialog";

interface CrmTemplate {
  id: string;
  nome_template: string;
  assunto: string;
  mensagem: string;
  created_at: string;
}

export function AdminCrmTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrmTemplate | null>(null);
  const [form, setForm] = useState({ nome_template: "", assunto: "", mensagem: "" });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["crm-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmTemplate[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase
          .from("crm_email_templates")
          .update({ nome_template: form.nome_template, assunto: form.assunto, mensagem: form.mensagem })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_email_templates").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-templates"] });
      toast({ title: editing ? "Template atualizado!" : "Template criado!" });
      setOpen(false);
      setEditing(null);
      setForm({ nome_template: "", assunto: "", mensagem: "" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-templates"] });
      toast({ title: "Template excluído!" });
    },
  });

  const openEdit = (tpl: CrmTemplate) => {
    setEditing(tpl);
    setForm({ nome_template: tpl.nome_template, assunto: tpl.assunto, mensagem: tpl.mensagem });
    setOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ nome_template: "", assunto: "", mensagem: "" });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Templates de Email</CardTitle>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Prévia</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow key={tpl.id}>
                  <TableCell className="font-medium">{tpl.nome_template}</TableCell>
                  <TableCell>{tpl.assunto}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{tpl.mensagem.slice(0, 80)}...</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(tpl)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(tpl.id)}>
                        <Button size="icon" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmDeleteDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum template criado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Template *</Label>
              <Input value={form.nome_template} onChange={(e) => setForm({ ...form, nome_template: e.target.value })} />
            </div>
            <div>
              <Label>Assunto *</Label>
              <Input value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} />
            </div>
            <div>
              <Label>Mensagem *</Label>
              <p className="text-xs text-muted-foreground mb-1">Use {"{{nome}}"} para personalizar com o nome do contato</p>
              <PlaybookRichTextEditor content={form.mensagem} onChange={(html) => setForm({ ...form, mensagem: html })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nome_template || !form.assunto || !form.mensagem || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
