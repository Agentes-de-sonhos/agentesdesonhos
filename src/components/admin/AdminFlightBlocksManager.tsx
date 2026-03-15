import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Plane,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { FlightBlocksImporter } from "./FlightBlocksImporter";

interface BlockForm {
  operator: string;
  airline: string;
  destination: string;
  start_date: string;
  end_date: string;
  notes: string;
  is_active: boolean;
}

const initialForm: BlockForm = {
  operator: "",
  airline: "",
  destination: "",
  start_date: "",
  end_date: "",
  notes: "",
  is_active: true,
};

export function AdminFlightBlocksManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlockForm>(initialForm);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: blocks, isLoading } = useQuery({
    queryKey: ["admin-flight-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_blocks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: BlockForm) => {
      if (editingId) {
        const { error } = await supabase
          .from("flight_blocks")
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("flight_blocks").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flight-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["flight-blocks"] });
      toast({
        title: "Sucesso",
        description: editingId ? "Bloqueio atualizado" : "Bloqueio criado",
      });
      handleClose();
    },
    onError: (error) => {
      console.error("Error saving block:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o bloqueio",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flight_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flight-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["flight-blocks"] });
      toast({
        title: "Sucesso",
        description: "Bloqueio excluído",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o bloqueio",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("flight_blocks")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flight-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["flight-blocks"] });
    },
  });

  const handleEdit = (block: any) => {
    setEditingId(block.id);
    setForm({
      operator: block.operator,
      airline: block.airline,
      destination: block.destination,
      start_date: block.start_date,
      end_date: block.end_date,
      notes: block.notes || "",
      is_active: block.is_active,
    });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Gerenciar Bloqueios Aéreos
            </CardTitle>
            <CardDescription>
              Adicione e gerencie bloqueios de passagens aéreas
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <FlightBlocksImporter />
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setForm(initialForm)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Bloqueio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Bloqueio" : "Novo Bloqueio"}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do bloqueio aéreo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Operadora *</Label>
                    <Input
                      value={form.operator}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, operator: e.target.value }))
                      }
                      placeholder="Ex: CVC"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Companhia Aérea *</Label>
                    <Input
                      value={form.airline}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, airline: e.target.value }))
                      }
                      placeholder="Ex: LATAM"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Destino *</Label>
                  <Input
                    value={form.destination}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, destination: e.target.value }))
                    }
                    placeholder="Ex: Lisboa"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início *</Label>
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, start_date: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim *</Label>
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, end_date: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Informações adicionais..."
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingId ? "Salvar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : blocks && blocks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Destino
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Operadora
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Cia. Aérea
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Período
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <tr key={block.id} className="border-b last:border-0">
                    <td className="py-3 px-4 font-medium">{block.destination}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {block.operator}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {block.airline}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">
                        {format(new Date(block.start_date), "dd/MM")} -{" "}
                        {format(new Date(block.end_date), "dd/MM/yy")}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Switch
                        checked={block.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({
                            id: block.id,
                            is_active: checked,
                          })
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(block)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(block.id)}>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </ConfirmDeleteDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum bloqueio cadastrado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
