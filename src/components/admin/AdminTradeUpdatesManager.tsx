import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TradeUpdate {
  id: string;
  title: string;
  description: string;
  type: "novo" | "atualização" | "destaque";
  is_active: boolean;
  created_at: string;
}

export function AdminTradeUpdatesManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TradeUpdate | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "novo" as "novo" | "atualização" | "destaque",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: updates, isLoading } = useQuery({
    queryKey: ["admin-trade-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_updates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TradeUpdate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("trade_updates").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-trade-updates"] });
      queryClient.invalidateQueries({ queryKey: ["trade-updates"] });
      toast({ title: "Novidade criada com sucesso!" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TradeUpdate> }) => {
      const { error } = await supabase.from("trade_updates").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-trade-updates"] });
      queryClient.invalidateQueries({ queryKey: ["trade-updates"] });
      toast({ title: "Novidade atualizada!" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trade_updates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-trade-updates"] });
      queryClient.invalidateQueries({ queryKey: ["trade-updates"] });
      toast({ title: "Novidade removida!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ title: "", description: "", type: "novo" });
    setEditingItem(null);
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item: TradeUpdate) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      type: item.type,
    });
    setIsOpen(true);
  };

  const toggleActive = (item: TradeUpdate) => {
    updateMutation.mutate({ id: item.id, data: { is_active: !item.is_active } });
  };

  const typeLabels = {
    novo: "Novo",
    atualização: "Atualização",
    destaque: "Destaque",
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Novidades do Trade
        </CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { resetForm(); setIsOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova Novidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Novidade" : "Nova Novidade"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "novo" | "atualização" | "destaque") => 
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="atualização">Atualização</SelectItem>
                    <SelectItem value="destaque">Destaque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? "Salvar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : updates?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma novidade cadastrada</p>
        ) : (
          <div className="space-y-3">
            {updates?.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{typeLabels[item.type]}</Badge>
                    <Badge variant={item.is_active ? "default" : "outline"}>
                      {item.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(item)}>
                    {item.is_active ? "🟢" : "⚪"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(item.id)}>
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
    </Card>
  );
}
