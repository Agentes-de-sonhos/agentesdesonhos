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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SupplierCombobox } from "./SupplierCombobox";
import { MultiFileUpload } from "./MultiFileUpload";

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

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "pdf" | "other";
}

interface MaterialForm {
  supplier_id: string;
  supplier_name: string;
  category: string;
  material_type: string;
  title: string;
  destination: string;
  file_url: string;
  video_url: string;
  thumbnail_url: string;
  is_active: boolean;
  uploadedFiles: UploadedFile[];
}

const initialForm: MaterialForm = {
  supplier_id: "",
  supplier_name: "",
  category: "",
  material_type: "",
  title: "",
  destination: "",
  file_url: "",
  video_url: "",
  thumbnail_url: "",
  is_active: true,
  uploadedFiles: [],
};

export function AdminMaterialsManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialForm>(initialForm);
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
      return data || [];
    },
  });

  // Mutation for saving single material (edit mode)
  const saveSingleMutation = useMutation({
    mutationFn: async (data: MaterialForm) => {
      const payload = {
        supplier_id: data.supplier_id || null,
        category: data.category,
        material_type: data.material_type,
        title: data.title,
        destination: data.destination || null,
        file_url: data.file_url || null,
        video_url: data.video_url || null,
        thumbnail_url: data.thumbnail_url || null,
        is_active: data.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("materials")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({
        title: "Sucesso",
        description: "Material atualizado",
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

  // Mutation for creating multiple materials (new mode with multiple files)
  const saveMultipleMutation = useMutation({
    mutationFn: async (data: MaterialForm) => {
      const basePayload = {
        supplier_id: data.supplier_id || null,
        category: data.category,
        destination: data.destination || null,
        is_active: data.is_active,
      };

      // For video type
      if (data.material_type === "Vídeo") {
        const { error } = await supabase.from("materials").insert({
          ...basePayload,
          material_type: "Vídeo",
          title: data.title,
          video_url: data.video_url,
          file_url: null,
          thumbnail_url: data.thumbnail_url || null,
        });
        if (error) throw error;
        return 1;
      }

      // For files
      if (data.uploadedFiles.length === 0) {
        // Single URL input (legacy)
        const { error } = await supabase.from("materials").insert({
          ...basePayload,
          material_type: data.material_type,
          title: data.title,
          file_url: data.file_url,
          video_url: null,
          thumbnail_url: null,
        });
        if (error) throw error;
        return 1;
      }

      // Multiple files - create one material per file
      const materialsToInsert = data.uploadedFiles.map((file, index) => {
        // Determine material type based on file
        let materialType = data.material_type;
        if (!materialType || materialType === "") {
          materialType = file.type === "pdf" ? "PDF" : "Imagem";
        }

        // Generate title for each file
        const title = data.uploadedFiles.length > 1
          ? `${data.title} (${index + 1})`
          : data.title;

        return {
          ...basePayload,
          material_type: materialType,
          title,
          file_url: file.url,
          video_url: null,
          thumbnail_url: null,
        };
      });

      const { error } = await supabase.from("materials").insert(materialsToInsert);
      if (error) throw error;
      return materialsToInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({
        title: "Sucesso",
        description: `${count} material${count > 1 ? "is" : ""} criado${count > 1 ? "s" : ""}`,
      });
      handleClose();
    },
    onError: (error) => {
      console.error("Error saving materials:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os materiais",
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

  const handleEdit = (material: any) => {
    setEditingId(material.id);
    setForm({
      supplier_id: material.supplier_id || "",
      supplier_name: material.trade_suppliers?.name || "",
      category: material.category,
      material_type: material.material_type,
      title: material.title,
      destination: material.destination || "",
      file_url: material.file_url || "",
      video_url: material.video_url || "",
      thumbnail_url: material.thumbnail_url || "",
      is_active: material.is_active,
      uploadedFiles: [],
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
    
    if (editingId) {
      saveSingleMutation.mutate(form);
    } else {
      saveMultipleMutation.mutate(form);
    }
  };

  const isPending = saveSingleMutation.isPending || saveMultipleMutation.isPending;

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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Material" : "Novo Material"}
                </DialogTitle>
                <DialogDescription>
                  {editingId 
                    ? "Atualize as informações do material" 
                    : "Preencha as informações e faça upload de um ou mais arquivos"}
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
                    placeholder="Nome do material"
                    required
                  />
                  {!editingId && form.uploadedFiles.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      Cada arquivo terá o título com numeração sequencial
                    </p>
                  )}
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
                    <SupplierCombobox
                      suppliers={suppliers || []}
                      value={form.supplier_id}
                      onChange={(supplierId, supplierName) =>
                        setForm((prev) => ({
                          ...prev,
                          supplier_id: supplierId,
                          supplier_name: supplierName,
                        }))
                      }
                      category={form.category}
                    />
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
                ) : editingId ? (
                  // Edit mode - single file URL
                  <div className="space-y-2">
                    <Label>URL do Arquivo</Label>
                    <Input
                      value={form.file_url}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, file_url: e.target.value }))
                      }
                      placeholder="URL do arquivo"
                    />
                  </div>
                ) : (
                  // Create mode - multiple file upload
                  <div className="space-y-2">
                    <Label>Arquivos</Label>
                    <MultiFileUpload
                      files={form.uploadedFiles}
                      onFilesChange={(files) =>
                        setForm((prev) => ({ ...prev, uploadedFiles: files }))
                      }
                      disabled={isPending}
                    />
                  </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingId ? "Salvar" : `Criar${form.uploadedFiles.length > 1 ? ` (${form.uploadedFiles.length})` : ""}`}
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
