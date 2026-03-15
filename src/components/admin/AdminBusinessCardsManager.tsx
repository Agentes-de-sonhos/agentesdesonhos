import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink, Copy, Eye } from "lucide-react";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import type { BusinessCard, CardButton, SocialLinks } from "@/hooks/useBusinessCard";

const PUBLIC_DOMAIN = "https://contato.tur.br";

const COVER_OPTIONS = [
  "/images/card-covers/cover-1.png",
  "/images/card-covers/cover-2.png",
  "/images/card-covers/cover-3.png",
  "/images/card-covers/cover-4.png",
  "/images/card-covers/cover-5.png",
  "/images/card-covers/cover-6.png",
  "/images/card-covers/cover-7.png",
];

const emptyForm = {
  slug: "",
  name: "",
  title: "",
  agency_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  primary_color: "#0284c7",
  secondary_color: "#f97316",
  cover_url: "",
  is_active: true,
};

export function AdminBusinessCardsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["admin-business-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").trim();
      if (!slug || slug.length < 3) throw new Error("Slug deve ter pelo menos 3 caracteres.");
      if (!form.name) throw new Error("Nome é obrigatório.");

      const payload = {
        slug,
        name: form.name,
        title: form.title || null,
        agency_name: form.agency_name || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        website: form.website || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        cover_url: form.cover_url || null,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("business_cards")
          .update({ ...payload, updated_at: new Date().toISOString() } as any)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_cards")
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business-cards"] });
      toast.success(editingId ? "Cartão atualizado!" : "Cartão criado!");
      closeDialog();
    },
    onError: (err: any) => {
      if (err?.message?.includes("duplicate") || err?.message?.includes("unique")) {
        toast.error("Esse slug já está em uso.");
      } else {
        toast.error(err.message || "Erro ao salvar.");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business-cards"] });
      toast.success("Cartão excluído!");
    },
    onError: () => toast.error("Erro ao excluir."),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("business_cards")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business-cards"] });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (card: any) => {
    setEditingId(card.id);
    setForm({
      slug: card.slug || "",
      name: card.name || "",
      title: card.title || "",
      agency_name: card.agency_name || "",
      phone: card.phone || "",
      whatsapp: card.whatsapp || "",
      email: card.email || "",
      website: card.website || "",
      primary_color: card.primary_color || "#0284c7",
      secondary_color: card.secondary_color || "#f97316",
      cover_url: card.cover_url || "",
      is_active: card.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${PUBLIC_DOMAIN}/${slug}`);
    toast.success("Link copiado!");
  };

  const filtered = cards.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.slug?.toLowerCase().includes(search.toLowerCase()) ||
      c.agency_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle>Cartões de Visita ({cards.length})</CardTitle>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Cartão
          </Button>
        </div>
        <Input
          placeholder="Buscar por nome, slug ou agência..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2 max-w-sm"
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Agência</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">{card.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{card.slug}</code>
                    </TableCell>
                    <TableCell>{card.agency_name || "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={card.is_active ?? true}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: card.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => copyLink(card.slug)} title="Copiar link">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Visualizar">
                          <a href={`/${card.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(card)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(card.id)} title="Excluir cartão" description="Tem certeza que deseja excluir permanentemente este cartão?">
                          <Button variant="ghost" size="icon" title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </ConfirmDeleteDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum cartão encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Slug (URL)</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">contato.tur.br/</span>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                      placeholder="nome-agencia"
                    />
                  </div>
                </div>
                <div>
                  <Label>Nome *</Label>
                  <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Cargo / Título</Label>
                  <Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>Agência</Label>
                  <Input className="mt-1" value={form.agency_name} onChange={(e) => setForm({ ...form, agency_name: e.target.value })} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input className="mt-1" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input className="mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Site</Label>
                  <Input className="mt-1" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </div>
              </div>

              {/* Colors */}
              <div className="flex gap-6 flex-wrap">
                <div>
                  <Label>Cor principal</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="h-10 w-10 rounded cursor-pointer border-0" />
                    <span className="text-xs text-muted-foreground">{form.primary_color}</span>
                  </div>
                </div>
                <div>
                  <Label>Cor secundária</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="h-10 w-10 rounded cursor-pointer border-0" />
                    <span className="text-xs text-muted-foreground">{form.secondary_color}</span>
                  </div>
                </div>
              </div>

              {/* Cover selection */}
              <div>
                <Label>Imagem de capa</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {COVER_OPTIONS.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setForm({ ...form, cover_url: url })}
                      className={`rounded-lg overflow-hidden border-2 transition-all ${
                        form.cover_url === url ? "border-primary ring-2 ring-primary" : "border-border"
                      }`}
                    >
                      <img src={url} alt="Capa" className="w-full h-16 object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Cartão ativo</Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : editingId ? "Salvar" : "Criar Cartão"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
