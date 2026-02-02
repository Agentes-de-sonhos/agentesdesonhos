import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "Operadoras de turismo",
  "Consolidadoras",
  "Companhias aéreas",
  "Hospedagem",
  "Locadoras de veículos",
  "Cruzeiros",
  "Seguros viagem",
  "Parques e atrações",
  "Receptivos",
  "Guias",
];

const MATERIAL_TYPES = ["Lâmina", "PDF", "Imagem", "Vídeo"];

interface MaterialForm {
  supplier_id: string;
  category: string;
  material_type: string;
  title: string;
  destination: string;
  file_url: string;
  video_url: string;
  thumbnail_url: string;
  is_active: boolean;
}

const initialForm: MaterialForm = {
  supplier_id: "",
  category: "",
  material_type: "",
  title: "",
  destination: "",
  file_url: "",
  video_url: "",
  thumbnail_url: "",
  is_active: true,
};

export function AdminMaterialsManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialForm>(initialForm);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materials, isLoading } = useQuery({
    queryKey: ["admin-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select(`
          *,
          trade_suppliers (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ["trade-suppliers-for-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_suppliers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: MaterialForm) => {
      const payload = {
        ...data,
        supplier_id: data.supplier_id || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("materials")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("materials").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({
        title: "Sucesso",
        description: editingId ? "Material atualizado" : "Material criado",
      });
      handleClose();
    },
    onError: (error) => {
      console.error("Error saving material:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o material",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({
        title: "Sucesso",
        description: "Material excluído",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o material",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("materials")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("materials")
        .getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, file_url: publicUrl }));
      toast({
        title: "Sucesso",
        description: "Arquivo enviado com sucesso",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o arquivo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (material: any) => {
    setEditingId(material.id);
    setForm({
      supplier_id: material.supplier_id || "",
      category: material.category,
      material_type: material.material_type,
      title: material.title,
      destination: material.destination || "",
      file_url: material.file_url || "",
      video_url: material.video_url || "",
      thumbnail_url: material.thumbnail_url || "",
      is_active: material.is_active,
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
              <FileText className="h-5 w-5" />
              Gerenciar Materiais
            </CardTitle>
            <CardDescription>
              Adicione e gerencie materiais de divulgação
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setForm(initialForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Material" : "Novo Material"}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do material
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Input
                    value={form.destination}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, destination: e.target.value }))
                    }
                    placeholder="Ex: Paris, Maldivas, Caribe..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Select
                      value={form.supplier_id}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, supplier_id: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers?.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <Select
                      value={form.category}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Material *</Label>
                  <Select
                    value={form.material_type}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, material_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.material_type === "Vídeo" ? (
                  <div className="space-y-2">
                    <Label>Link do Vídeo</Label>
                    <Input
                      value={form.video_url}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, video_url: e.target.value }))
                      }
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Arquivo</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.file_url}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, file_url: e.target.value }))
                        }
                        placeholder="URL do arquivo"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        onClick={() =>
                          document.getElementById("file-upload")?.click()
                        }
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                      />
                    </div>
                  </div>
                )}
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : materials && materials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Título
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Fornecedor
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Tipo
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
                {materials.map((material) => (
                  <tr key={material.id} className="border-b last:border-0">
                    <td className="py-3 px-4 font-medium">{material.title}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {material.trade_suppliers?.name || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary">{material.material_type}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Switch
                        checked={material.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({
                            id: material.id,
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
                          onClick={() => handleEdit(material)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(material.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum material cadastrado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
