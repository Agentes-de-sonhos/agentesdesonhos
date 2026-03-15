import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GraduationCap, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Mentorship } from "@/types/mentorship";

const emptyForm = {
  name: "",
  mentor_name: "",
  mentor_photo_url: "",
  specialty: "",
  short_description: "",
  full_description: "",
  target_audience: "",
  objectives: "",
  is_active: true,
  order_index: 0,
};

export function AdminMentorshipsManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Mentorship | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-mentorships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorships")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Mentorship[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        ...data,
        mentor_photo_url: data.mentor_photo_url || null,
        short_description: data.short_description || null,
        full_description: data.full_description || null,
        target_audience: data.target_audience || null,
        objectives: data.objectives || null,
      };
      if (editingItem) {
        const { error } = await supabase
          .from("mentorships")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mentorships").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mentorships"] });
      queryClient.invalidateQueries({ queryKey: ["mentorships"] });
      toast({ title: editingItem ? "Atualizado com sucesso" : "Criado com sucesso" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mentorships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mentorships"] });
      queryClient.invalidateQueries({ queryKey: ["mentorships"] });
      toast({ title: "Excluído com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingItem(null);
    setIsOpen(false);
  };

  const openEdit = (item: Mentorship) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      mentor_name: item.mentor_name,
      mentor_photo_url: item.mentor_photo_url || "",
      specialty: item.specialty,
      short_description: item.short_description || "",
      full_description: item.full_description || "",
      target_audience: item.target_audience || "",
      objectives: item.objectives || "",
      is_active: item.is_active,
      order_index: item.order_index,
    });
    setIsOpen(true);
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Gerenciar Cursos e Mentorias
            </CardTitle>
            <CardDescription>
              Crie e gerencie os cursos e mentorias disponíveis na plataforma
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Curso/Mentoria
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum curso ou mentoria cadastrado ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.order_index}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.mentor_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.specialty}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "outline"}>
                      {item.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Dialog de criação/edição */}
        <Dialog open={isOpen} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Curso/Mentoria" : "Novo Curso/Mentoria"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados abaixo para {editingItem ? "atualizar" : "criar"} um curso ou mentoria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Mentoria Nobre"
                />
              </div>

              <div className="space-y-2">
                <Label>Nome do Mentor *</Label>
                <Input
                  value={form.mentor_name}
                  onChange={(e) => setForm({ ...form, mentor_name: e.target.value })}
                  placeholder="Ex: Fernando Nobre"
                />
              </div>

              <div className="space-y-2">
                <Label>Foto do Mentor (URL)</Label>
                <Input
                  value={form.mentor_photo_url}
                  onChange={(e) => setForm({ ...form, mentor_photo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Especialidade *</Label>
                <Input
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="Ex: Vendas de Luxo"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição curta</Label>
                <Textarea
                  value={form.short_description}
                  onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                  placeholder="Breve resumo..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição completa</Label>
                <Textarea
                  value={form.full_description}
                  onChange={(e) => setForm({ ...form, full_description: e.target.value })}
                  placeholder="Descrição detalhada..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Público-alvo</Label>
                <Input
                  value={form.target_audience}
                  onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                  placeholder="Ex: Agentes iniciantes"
                />
              </div>

              <div className="space-y-2">
                <Label>Objetivos</Label>
                <Textarea
                  value={form.objectives}
                  onChange={(e) => setForm({ ...form, objectives: e.target.value })}
                  placeholder="Objetivos do curso/mentoria..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Ordem de exibição</Label>
                <Input
                  type="number"
                  value={form.order_index}
                  onChange={(e) => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label>Ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.name || !form.mentor_name || !form.specialty || saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
