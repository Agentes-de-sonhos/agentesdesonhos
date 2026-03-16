import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { BENEFIT_CATEGORIES, BENEFIT_DESTINATIONS } from "@/types/benefits";

interface BenefitForm {
  company_name: string;
  category: string;
  title: string;
  short_description: string;
  full_description: string;
  destination: string;
  official_link: string;
  requirements: string;
  how_to_claim: string;
  tags: string;
}

const emptyForm: BenefitForm = {
  company_name: "",
  category: "",
  title: "",
  short_description: "",
  full_description: "",
  destination: "",
  official_link: "",
  requirements: "",
  how_to_claim: "",
  tags: "",
};

export function AdminBenefitsManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BenefitForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: benefits = [], isLoading } = useQuery({
    queryKey: ["admin-benefits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benefits")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Não autenticado");
      const payload = {
        company_name: form.company_name.trim(),
        category: form.category,
        title: form.title.trim(),
        short_description: form.short_description.trim() || null,
        full_description: form.full_description.trim() || null,
        destination: form.destination || null,
        official_link: form.official_link.trim() || null,
        requirements: form.requirements.trim() || null,
        how_to_claim: form.how_to_claim.trim() || null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (!payload.company_name || !payload.title || !payload.category) {
        throw new Error("Preencha os campos obrigatórios");
      }
      if (editingId) {
        const { error } = await supabase.from("benefits").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("benefits").insert({ ...payload, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Benefício atualizado!" : "Benefício criado!");
      queryClient.invalidateQueries({ queryKey: ["admin-benefits"] });
      queryClient.invalidateQueries({ queryKey: ["benefits"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("benefits").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-benefits"] });
      queryClient.invalidateQueries({ queryKey: ["benefits"] });
    },
  });

  const deleteBenefit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("benefits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Benefício excluído");
      queryClient.invalidateQueries({ queryKey: ["admin-benefits"] });
      queryClient.invalidateQueries({ queryKey: ["benefits"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(b: any) {
    setEditingId(b.id);
    setForm({
      company_name: b.company_name || "",
      category: b.category || "",
      title: b.title || "",
      short_description: b.short_description || "",
      full_description: b.full_description || "",
      destination: b.destination || "",
      official_link: b.official_link || "",
      requirements: b.requirements || "",
      how_to_claim: b.how_to_claim || "",
      tags: (b.tags || []).join(", "),
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  const filtered = benefits.filter(
    (b) =>
      b.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.title?.toLowerCase().includes(search.toLowerCase())
  );

  const catLabel = (val: string) => BENEFIT_CATEGORIES.find((c) => c.value === val)?.label || val;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Benefícios e Descontos</CardTitle>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Benefício
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Buscar por empresa ou título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhum benefício encontrado.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between border rounded-lg p-4 gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{b.title}</span>
                    <Badge variant="secondary" className="text-xs">{catLabel(b.category)}</Badge>
                    {b.destination && <Badge variant="outline" className="text-xs">{b.destination}</Badge>}
                    {!b.is_active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{b.company_name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={b.is_active}
                    onCheckedChange={(checked) => toggleActive.mutate({ id: b.id, is_active: checked })}
                  />
                  {b.official_link && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={b.official_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDeleteDialog onConfirm={() => deleteBenefit.mutate(b.id)}>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </ConfirmDeleteDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Benefício" : "Novo Benefício"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Nome da empresa" />
              </div>
              <div className="space-y-2">
                <Label>Título do Benefício *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: 50% off no ingresso" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {BENEFIT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destino</Label>
                <Select value={form.destination} onValueChange={(v) => setForm({ ...form, destination: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {BENEFIT_DESTINATIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição curta</Label>
              <Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} placeholder="Resumo breve do benefício" />
            </div>

            <div className="space-y-2">
              <Label>Descrição completa</Label>
              <Textarea value={form.full_description} onChange={(e) => setForm({ ...form, full_description: e.target.value })} placeholder="Detalhes completos do benefício" rows={4} />
            </div>

            <div className="space-y-2">
              <Label>Requisitos</Label>
              <Textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="Ex: Possuir cadastur ativo" rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Como solicitar</Label>
              <Textarea value={form.how_to_claim} onChange={(e) => setForm({ ...form, how_to_claim: e.target.value })} placeholder="Passo a passo para solicitar" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link oficial</Label>
                <Input value={form.official_link} onChange={(e) => setForm({ ...form, official_link: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Tags (separadas por vírgula)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="cortesia, desconto, agente" />
              </div>
            </div>

            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending} className="w-full">
              {upsert.isPending ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Benefício"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </Card>
  );
}
