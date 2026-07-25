import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MediaManagerModal } from "@/components/media/MediaManagerModal";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { Image as ImageIcon, Loader2, Plus, Pencil, Trash2, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";

interface DashboardBanner {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  button_text: string | null;
  button_link: string | null;
  is_active: boolean;
  order_index: number;
}

function isValidLink(url: string): boolean {
  if (!url) return true; // opcional
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) return true; // rota interna
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const emptyForm: Omit<DashboardBanner, "id" | "order_index"> = {
  title: "",
  description: "",
  image_url: "",
  button_text: "",
  button_link: "",
  is_active: true,
};

export function AdminDashboardBannersManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<DashboardBanner | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [mediaOpen, setMediaOpen] = useState(false);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-dashboard-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_banners")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as DashboardBanner[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-dashboard-banners"] });
    qc.invalidateQueries({ queryKey: ["dashboard-banners"] });
  };

  const upsert = useMutation({
    mutationFn: async () => {
      const title = form.title.trim();
      if (!title) throw new Error("Título obrigatório");
      if (form.button_link && !isValidLink(form.button_link)) {
        throw new Error("Link inválido. Use http(s)://… ou uma rota interna começando com /");
      }
      const payload = {
        title,
        description: form.description?.trim() || null,
        image_url: form.image_url?.trim() || null,
        button_text: form.button_text?.trim() || null,
        button_link: form.button_link?.trim() || null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase
          .from("dashboard_banners")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const nextOrder = (banners.at(-1)?.order_index ?? -1) + 1;
        const { error } = await supabase
          .from("dashboard_banners")
          .insert({ ...payload, order_index: nextOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: editing ? "Banner atualizado" : "Banner criado" });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async (b: DashboardBanner) => {
      const { error } = await supabase
        .from("dashboard_banners")
        .update({ is_active: !b.is_active, updated_at: new Date().toISOString() })
        .eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dashboard_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Banner removido" });
    },
  });

  const move = useMutation({
    mutationFn: async ({ index, dir }: { index: number; dir: -1 | 1 }) => {
      const target = index + dir;
      if (target < 0 || target >= banners.length) return;
      const a = banners[index];
      const b = banners[target];
      const { error: e1 } = await supabase
        .from("dashboard_banners")
        .update({ order_index: b.order_index })
        .eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("dashboard_banners")
        .update({ order_index: a.order_index })
        .eq("id", b.id);
      if (e2) throw e2;
    },
    onSuccess: invalidate,
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (b: DashboardBanner) => {
    setEditing(b);
    setForm({
      title: b.title,
      description: b.description ?? "",
      image_url: b.image_url ?? "",
      button_text: b.button_text ?? "",
      button_link: b.button_link ?? "",
      is_active: b.is_active,
    });
    setOpen(true);
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Banners do Dashboard
          </CardTitle>
          <CardDescription>
            Carrossel exibido no topo da página inicial. Imagem recomendada: 1920×480px.
          </CardDescription>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo banner
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : banners.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum banner cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {banners.map((b, idx) => (
              <div
                key={b.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border bg-muted/30"
              >
                <div className="w-full sm:w-48 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 opacity-30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{b.title}</p>
                    {!b.is_active && (
                      <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded">
                        Inativo
                      </span>
                    )}
                  </div>
                  {b.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.description}</p>
                  )}
                  {b.button_link && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate">{b.button_link}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => move.mutate({ index: idx, dir: -1 })}
                    disabled={idx === 0}
                    title="Mover para cima"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => move.mutate({ index: idx, dir: 1 })}
                    disabled={idx === banners.length - 1}
                    title="Mover para baixo"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2 px-2">
                    <Switch
                      checked={b.is_active}
                      onCheckedChange={() => toggleActive.mutate(b)}
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDeleteDialog
                    onConfirm={() => remove.mutate(b.id)}
                    title="Remover banner"
                    description="Tem certeza? Esta ação não pode ser desfeita."
                  >
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </ConfirmDeleteDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar banner" : "Novo banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Imagem</Label>
              <div className="flex items-start gap-3">
                <div className="w-40 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 border">
                  {form.image_url ? (
                    <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6 opacity-30" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setMediaOpen(true)}>
                    Escolher imagem
                  </Button>
                  {form.image_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, image_url: "" })}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Título do banner"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Texto do botão</Label>
                <Input
                  value={form.button_text ?? ""}
                  onChange={(e) => setForm({ ...form, button_text: e.target.value })}
                  placeholder="Ex.: Saiba mais"
                />
              </div>
              <div className="space-y-2">
                <Label>Link (opcional)</Label>
                <Input
                  value={form.button_link ?? ""}
                  onChange={(e) => setForm({ ...form, button_link: e.target.value })}
                  placeholder="https://... ou /rota-interna"
                />
              </div>
            </div>
            {form.button_link && !isValidLink(form.button_link) && (
              <p className="text-xs text-destructive">
                Link inválido. Use http(s)://… ou uma rota interna começando com /
              </p>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Ativo</p>
                <p className="text-xs text-muted-foreground">Exibir este banner no dashboard</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MediaManagerModal
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        accept="image"
        onSelect={(url) => {
          setForm((f) => ({ ...f, image_url: url }));
          setMediaOpen(false);
        }}
      />
    </Card>
  );
}