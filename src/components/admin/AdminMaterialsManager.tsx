import { useState, useMemo, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  FolderOpen,
  ArrowLeft,
  Image,
  Video,
  FileIcon,
  Pin,
  GraduationCap,
  GripVertical,
  CloudDownload,
  Upload,
} from "lucide-react";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
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

const MATERIAL_TYPES = ["Lâmina", "PDF", "Imagem", "Vídeo", "Reels"];

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "pdf" | "video" | "other";
}

interface MaterialForm {
  supplier_id: string;
  supplier_name: string;
  category: string;
  material_type: string;
  title: string;
  destination: string;
  caption: string;
  file_url: string;
  video_url: string;
  thumbnail_url: string;
  is_active: boolean;
  is_permanent: boolean;
  trail_id: string;
  canva_url: string;
  uploadedFiles: UploadedFile[];
}

const initialForm: MaterialForm = {
  supplier_id: "",
  supplier_name: "",
  category: "",
  material_type: "",
  title: "",
  destination: "",
  caption: "",
  file_url: "",
  video_url: "",
  thumbnail_url: "",
  is_active: true,
  is_permanent: false,
  trail_id: "",
  canva_url: "",
  uploadedFiles: [],
};

// Normalize title for grouping
function normalizeTitle(title: string): string {
  return title
    .trim()
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/\s*-\s*\d+\s*$/, '')
    .replace(/\s+\d+\s*$/, '')
    .trim()
    .toLowerCase();
}

function getDisplayTitle(title: string): string {
  return title
    .trim()
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/\s*-\s*\d+\s*$/, '')
    .replace(/\s+\d+\s*$/, '')
    .trim();
}

interface MaterialGalleryGroup {
  key: string;
  title: string;
  supplier_name: string | null;
  supplier_id: string | null;
  category: string;
  destination: string | null;
  is_permanent: boolean;
  trail_id: string | null;
  trail_name: string | null;
  materials: any[];
  thumbnail: string | null;
}

export function AdminMaterialsManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialForm>(initialForm);
  const [openGalleryKey, setOpenGalleryKey] = useState<string | null>(null);
  const [openDriveFolder, setOpenDriveFolder] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materials, isLoading } = useQuery({
    queryKey: ["admin-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select(`
          *,
          tour_operators (
            id,
            name
          ),
          learning_trails (
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
        .from("tour_operators")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: trails } = useQuery({
    queryKey: ["learning-trails-for-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_trails")
        .select("id, name, destination")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Group materials into galleries
  const galleries = useMemo<MaterialGalleryGroup[]>(() => {
    if (!materials) return [];
    const map = new Map<string, any[]>();
    materials.forEach((m) => {
      // Drive-imported materials: group by batch_id (one card per folder)
      // Manual materials: group by normalized title + supplier + destination
      const key = m.batch_id
        ? `batch:${m.batch_id}`
        : `manual:${normalizeTitle(m.title)}|${m.supplier_id || 'none'}|${(m.destination || '').trim().toLowerCase()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries()).map(([key, mats]) => {
      const first = mats[0];
      let thumb: string | null = null;
      for (const m of mats) {
        if (m.thumbnail_url) { thumb = m.thumbnail_url; break; }
        if (m.material_type === "Imagem" && m.file_url) { thumb = m.file_url; break; }
      }
      return {
        key,
        title: getDisplayTitle(first.title),
        supplier_name: first.tour_operators?.name || null,
        supplier_id: first.supplier_id || null,
        category: first.category,
        destination: first.destination || null,
        is_permanent: mats.some((m: any) => m.is_permanent),
        trail_id: first.trail_id || null,
        trail_name: first.learning_trails?.name || null,
        materials: [...mats].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
        thumbnail: thumb,
      };
    }).sort((a, b) => {
      const aDate = Math.max(...a.materials.map((m: any) => new Date(m.created_at).getTime()));
      const bDate = Math.max(...b.materials.map((m: any) => new Date(m.created_at).getTime()));
      return bDate - aDate;
    });
  }, [materials]);

  const openGallery = useMemo(() => {
    if (!openGalleryKey) return null;
    return galleries.find(g => g.key === openGalleryKey) || null;
  }, [openGalleryKey, galleries]);

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
        is_permanent: data.is_permanent,
        caption: data.caption || null,
        trail_id: data.trail_id || null,
        canva_url: data.canva_url || null,
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
      toast({ title: "Sucesso", description: "Material atualizado" });
      handleClose();
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível salvar o material", variant: "destructive" });
    },
  });

  // Mutation for creating multiple materials (new gallery)
  const saveMultipleMutation = useMutation({
    mutationFn: async (data: MaterialForm) => {
      const basePayload = {
        supplier_id: data.supplier_id || null,
        category: data.category,
        destination: data.destination || null,
        is_active: data.is_active,
        is_permanent: data.is_permanent,
        caption: data.caption || null,
        trail_id: data.trail_id || null,
        canva_url: data.canva_url || null,
      };

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

      if (data.material_type === "Reels") {
        if (data.uploadedFiles.length === 0) throw new Error("Nenhum vídeo enviado");
        const file = data.uploadedFiles[0];
        const { error } = await supabase.from("materials").insert({
          ...basePayload,
          material_type: "Reels",
          title: data.title,
          video_url: file.url,
          file_url: null,
          thumbnail_url: null,
        });
        if (error) throw error;
        return 1;
      }

      if (data.uploadedFiles.length === 0) {
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

      const materialsToInsert = data.uploadedFiles.map((file, index) => {
        let materialType = data.material_type;
        if (!materialType || materialType === "") {
          materialType = file.type === "pdf" ? "PDF" : "Imagem";
        }
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
      toast({ title: "Sucesso", description: `${count} material${count! > 1 ? "is" : ""} criado${count! > 1 ? "s" : ""}` });
      handleClose();
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível salvar os materiais", variant: "destructive" });
    },
  });

  // Add files to existing gallery
  const addToGalleryMutation = useMutation({
    mutationFn: async ({ gallery, files }: { gallery: MaterialGalleryGroup; files: UploadedFile[] }) => {
      const first = gallery.materials[0];
      const newMaterials = files.map((file, index) => ({
        supplier_id: first.supplier_id || null,
        category: first.category,
        destination: first.destination || null,
        is_active: first.is_active,
        is_permanent: first.is_permanent,
        material_type: file.type === "pdf" ? "PDF" : "Imagem",
        title: `${gallery.title} (${gallery.materials.length + index + 1})`,
        file_url: file.url,
        video_url: null,
        thumbnail_url: null,
      }));
      const { error } = await supabase.from("materials").insert(newMaterials);
      if (error) throw error;
      return newMaterials.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({ title: "Sucesso", description: `${count} arquivo${count > 1 ? "s" : ""} adicionado${count > 1 ? "s" : ""}` });
      setAddFilesOpen(false);
      setAddFiles([]);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível adicionar arquivos", variant: "destructive" });
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
      toast({ title: "Sucesso", description: "Material excluído" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir o material", variant: "destructive" });
    },
  });

  const deleteGalleryMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("materials").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setOpenGalleryKey(null);
      toast({ title: "Sucesso", description: "Galeria excluída" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir a galeria", variant: "destructive" });
    },
  });

  const togglePermanentMutation = useMutation({
    mutationFn: async ({ ids, is_permanent }: { ids: string[]; is_permanent: boolean }) => {
      const { error } = await supabase
        .from("materials")
        .update({ is_permanent })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
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

  const [addFilesOpen, setAddFilesOpen] = useState(false);
  const [addFiles, setAddFiles] = useState<UploadedFile[]>([]);

  // Drag-and-drop reorder state
  const dragItemRef = useRef<number | null>(null);
  const dragOverItemRef = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const reorderMutation = useMutation({
    mutationFn: async (orderedMaterials: { id: string; order_index: number }[]) => {
      const updates = orderedMaterials.map(({ id, order_index }) =>
        supabase.from("materials").update({ order_index }).eq("id", id)
      );
      const results = await Promise.all(updates);
      const hasError = results.some(r => r.error);
      if (hasError) throw new Error("Failed to reorder");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível reordenar", variant: "destructive" });
    },
  });

  const handleDragStart = (index: number) => {
    dragItemRef.current = index;
    setDragIdx(index);
  };

  const handleDragEnter = (index: number) => {
    dragOverItemRef.current = index;
  };

  const handleDragEnd = () => {
    if (!openGallery || dragItemRef.current === null || dragOverItemRef.current === null || dragItemRef.current === dragOverItemRef.current) {
      setDragIdx(null);
      return;
    }
    const items = [...openGallery.materials];
    const dragItem = items[dragItemRef.current];
    items.splice(dragItemRef.current, 1);
    items.splice(dragOverItemRef.current, 0, dragItem);

    const ordered = items.map((m, i) => ({ id: m.id, order_index: i }));
    reorderMutation.mutate(ordered);

    dragItemRef.current = null;
    dragOverItemRef.current = null;
    setDragIdx(null);
  };

  const handleEdit = (material: any) => {
    setEditingId(material.id);
    setForm({
      supplier_id: material.supplier_id || "",
      supplier_name: material.tour_operators?.name || "",
      category: material.category,
      material_type: material.material_type,
      title: material.title,
      destination: material.destination || "",
      caption: material.caption || "",
      file_url: material.file_url || "",
      video_url: material.video_url || "",
      thumbnail_url: material.thumbnail_url || "",
      is_active: material.is_active,
      is_permanent: material.is_permanent ?? false,
      trail_id: material.trail_id || "",
      canva_url: material.canva_url || "",
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Imagem": return <Image className="h-4 w-4" />;
      case "Vídeo": return <Video className="h-4 w-4" />;
      default: return <FileIcon className="h-4 w-4" />;
    }
  };

  // Mutation to update all materials in a gallery at once
  const updateGalleryMutation = useMutation({
    mutationFn: async ({ ids, payload }: { ids: string[]; payload: Record<string, any> }) => {
      const { error } = await supabase
        .from("materials")
        .update(payload)
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({ title: "Sucesso", description: "Galeria atualizada" });
      setEditGalleryOpen(false);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar a galeria", variant: "destructive" });
    },
  });

  const [editGalleryOpen, setEditGalleryOpen] = useState(false);
  const [galleryForm, setGalleryForm] = useState({
    title: "",
    destination: "",
    caption: "",
    category: "",
    supplier_id: "",
    supplier_name: "",
    is_permanent: false,
    trail_id: "",
    canva_url: "",
  });

  const handleEditGallery = () => {
    if (!openGallery) return;
    const first = openGallery.materials[0];
    setGalleryForm({
      title: openGallery.title,
      destination: openGallery.destination || "",
      caption: first.caption || "",
      category: openGallery.category,
      supplier_id: openGallery.supplier_id || "",
      supplier_name: openGallery.supplier_name || "",
      is_permanent: openGallery.is_permanent,
      trail_id: openGallery.trail_id || "",
      canva_url: first.canva_url || "",
    });
    setEditGalleryOpen(true);
  };

  const handleSaveGallery = () => {
    if (!openGallery) return;
    const ids = openGallery.materials.map((m: any) => m.id);
    // Re-title each material with sequential numbering
    const updates = ids.map((id: string, index: number) => {
      const title = ids.length > 1
        ? `${galleryForm.title} (${index + 1})`
        : galleryForm.title;
      return supabase
        .from("materials")
        .update({
          title,
          destination: galleryForm.destination || null,
          caption: galleryForm.caption || null,
          category: galleryForm.category,
          supplier_id: galleryForm.supplier_id || null,
           is_permanent: galleryForm.is_permanent,
          trail_id: galleryForm.trail_id || null,
          canva_url: galleryForm.canva_url || null,
        })
        .eq("id", id);
    });
    Promise.all(updates).then((results) => {
      const hasError = results.some(r => r.error);
      if (hasError) {
        toast({ title: "Erro", description: "Não foi possível atualizar alguns materiais", variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
        queryClient.invalidateQueries({ queryKey: ["materials"] });
        toast({ title: "Sucesso", description: "Galeria atualizada" });
      }
      setEditGalleryOpen(false);
    });
  };

  // --- Render gallery detail view ---
  if (openGallery) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setOpenGalleryKey(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                {openGallery.title}
                {openGallery.is_permanent && <Pin className="h-4 w-4 text-primary" />}
              </CardTitle>
              <CardDescription>
                {openGallery.supplier_name || "Sem fornecedor"} • {openGallery.category} • {openGallery.materials.length} arquivo{openGallery.materials.length > 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleEditGallery}>
                <Pencil className="h-4 w-4 mr-1" /> Editar Galeria
              </Button>
              <Button size="sm" onClick={() => setAddFilesOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (confirm("Excluir toda a galeria?")) {
                    deleteGalleryMutation.mutate(openGallery.materials.map((m: any) => m.id));
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Edit gallery dialog */}
          <Dialog open={editGalleryOpen} onOpenChange={setEditGalleryOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Galeria</DialogTitle>
                <DialogDescription>Altere os dados da galeria. As mudanças serão aplicadas a todos os arquivos.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título da Galeria *</Label>
                  <Input value={galleryForm.title} onChange={(e) => setGalleryForm(prev => ({ ...prev, title: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Input value={galleryForm.destination} onChange={(e) => setGalleryForm(prev => ({ ...prev, destination: e.target.value }))} placeholder="Ex: Paris, Maldivas..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <SupplierCombobox
                      suppliers={suppliers || []}
                      value={galleryForm.supplier_id}
                      onChange={(supplierId, supplierName) => setGalleryForm(prev => ({ ...prev, supplier_id: supplierId, supplier_name: supplierName }))}
                      category={galleryForm.category}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <Select value={galleryForm.category} onValueChange={(value) => setGalleryForm(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Legenda (opcional)</Label>
                  <Textarea
                    value={galleryForm.caption}
                    onChange={(e) => setGalleryForm(prev => ({ ...prev, caption: e.target.value }))}
                    placeholder="Texto da legenda que aparecerá no feed social..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trilha exclusiva (opcional)</Label>
                  <Select value={galleryForm.trail_id} onValueChange={(value) => setGalleryForm(prev => ({ ...prev, trail_id: value === "__none__" ? "" : value }))}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma (aparece na página geral)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma (aparece na página geral)</SelectItem>
                      {(trails || []).map((trail) => (<SelectItem key={trail.id} value={trail.id}>{trail.name} — {trail.destination}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Se vinculado a uma trilha, este material aparecerá apenas nela.</p>
                </div>
                <div className="space-y-2">
                  <Label>Link do Canva (opcional)</Label>
                  <Input
                    value={galleryForm.canva_url}
                    onChange={(e) => setGalleryForm(prev => ({ ...prev, canva_url: e.target.value }))}
                    placeholder="https://www.canva.com/design/..."
                  />
                  <p className="text-xs text-muted-foreground">Se preenchido, o material será tratado como modelo editável no Canva (sem download, sem copiar legenda).</p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={galleryForm.is_permanent} onCheckedChange={(checked) => setGalleryForm(prev => ({ ...prev, is_permanent: !!checked }))} />
                  <Label className="cursor-pointer">Manter permanentemente (não excluir após 7 dias)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditGalleryOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveGallery}>Salvar Galeria</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add files dialog */}
          <Dialog open={addFilesOpen} onOpenChange={setAddFilesOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Arquivos</DialogTitle>
                <DialogDescription>Adicione mais arquivos a esta galeria</DialogDescription>
              </DialogHeader>
              <MultiFileUpload
                files={addFiles}
                onFilesChange={setAddFiles}
                disabled={addToGalleryMutation.isPending}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddFilesOpen(false); setAddFiles([]); }}>Cancelar</Button>
                <Button
                  disabled={addFiles.length === 0 || addToGalleryMutation.isPending}
                  onClick={() => addToGalleryMutation.mutate({ gallery: openGallery, files: addFiles })}
                >
                  {addToGalleryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Adicionar ({addFiles.length})
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Grid of files - drag to reorder */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {openGallery.materials.map((material: any, index: number) => (
              <div
                key={material.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`group relative rounded-lg border bg-card overflow-hidden cursor-grab active:cursor-grabbing transition-opacity ${
                  dragIdx === index ? "opacity-50" : ""
                }`}
              >
                {/* Drag handle indicator */}
                <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/60 rounded p-0.5">
                    <GripVertical className="h-4 w-4 text-white" />
                  </div>
                </div>
                {/* Order badge */}
                <div className="absolute top-1 right-1 z-10">
                  <Badge className="bg-black/60 text-white border-0 text-[10px] h-5 min-w-5 justify-center">
                    {index + 1}
                  </Badge>
                </div>
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {material.material_type === "Imagem" && material.file_url ? (
                    <img src={material.file_url} alt={material.title} className="w-full h-full object-cover" />
                  ) : material.material_type === "Reels" && material.video_url ? (
                    <video src={material.video_url} className="w-full h-full object-cover" muted playsInline />
                  ) : material.thumbnail_url ? (
                    <img src={material.thumbnail_url} alt={material.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      {getTypeIcon(material.material_type)}
                      <span className="text-xs">{material.material_type}</span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs truncate font-medium">{material.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <Badge variant="secondary" className="text-[10px] h-5">{material.material_type}</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(material)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(material.id)} title="Excluir arquivo" description="Tem certeza que deseja excluir permanentemente este arquivo?">
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </ConfirmDeleteDialog>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>

        {/* Edit single material dialog (reused) */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Arquivo</DialogTitle>
              <DialogDescription>Atualize as informações deste arquivo individual</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Material *</Label>
                <Select value={form.material_type} onValueChange={(value) => setForm((prev) => ({ ...prev, material_type: value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {form.material_type === "Vídeo" ? (
                <div className="space-y-2">
                  <Label>Link do Vídeo</Label>
                  <Input value={form.video_url} onChange={(e) => setForm((prev) => ({ ...prev, video_url: e.target.value }))} placeholder="https://youtube.com/..." />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>URL do Arquivo</Label>
                  <Input value={form.file_url} onChange={(e) => setForm((prev) => ({ ...prev, file_url: e.target.value }))} />
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Split galleries by source
  const manualGalleries = galleries.filter(g => g.materials.every((m: any) => !m.batch_id));
  const driveGalleries = galleries.filter(g => g.materials.some((m: any) => !!m.batch_id));

  // Group Drive galleries by operator/supplier
  const driveOperatorFolders = useMemo(() => {
    const map = new Map<string, { name: string; galleries: MaterialGalleryGroup[]; thumbnail: string | null; totalFiles: number }>();
    driveGalleries.forEach((g) => {
      const key = g.supplier_id || '__no_supplier__';
      const name = g.supplier_name || 'Sem operadora';
      if (!map.has(key)) {
        map.set(key, { name, galleries: [], thumbnail: null, totalFiles: 0 });
      }
      const folder = map.get(key)!;
      folder.galleries.push(g);
      folder.totalFiles += g.materials.length;
      if (!folder.thumbnail && g.thumbnail) {
        folder.thumbnail = g.thumbnail;
      }
    });
    return Array.from(map.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [driveGalleries]);

  // Currently selected operator folder's galleries
  const activeDriveFolderGalleries = useMemo(() => {
    if (!openDriveFolder) return [];
    const folder = driveOperatorFolders.find(f => f.key === openDriveFolder);
    return folder?.galleries || [];
  }, [openDriveFolder, driveOperatorFolders]);

  const activeDriveFolderName = useMemo(() => {
    if (!openDriveFolder) return '';
    return driveOperatorFolders.find(f => f.key === openDriveFolder)?.name || '';
  }, [openDriveFolder, driveOperatorFolders]);

  const renderGalleryGrid = (items: MaterialGalleryGroup[]) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum material nesta aba</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((gallery) => (
          <button
            key={gallery.key}
            className="group text-left rounded-lg border bg-card overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => setOpenGalleryKey(gallery.key)}
          >
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
              {gallery.thumbnail ? (
                <img src={gallery.thumbnail} alt={gallery.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <FolderOpen className="h-10 w-10 text-muted-foreground" />
              )}
              {gallery.is_permanent && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <Pin className="h-3 w-3" />
                </div>
              )}
              {gallery.trail_name && (
                <div className="absolute top-2 left-2 bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  <span className="truncate max-w-[80px]">{gallery.trail_name}</span>
                </div>
              )}
              <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium">
                {gallery.materials.length}
              </div>
            </div>
            <div className="p-2">
              <p className="text-sm font-medium truncate">{gallery.title}</p>
              <p className="text-xs text-muted-foreground truncate">{gallery.supplier_name || gallery.category}</p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderDriveOperatorFolders = () => {
    if (driveOperatorFolders.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <CloudDownload className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum material sincronizado do Google Drive</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {driveOperatorFolders.map((folder) => (
          <button
            key={folder.key}
            className="group text-left rounded-lg border bg-card overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => setOpenDriveFolder(folder.key)}
          >
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
              {folder.thumbnail ? (
                <img src={folder.thumbnail} alt={folder.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-sm font-semibold truncate">{folder.name}</p>
                <p className="text-white/80 text-xs">
                  {folder.galleries.length} galeria{folder.galleries.length > 1 ? 's' : ''} • {folder.totalFiles} arquivo{folder.totalFiles > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderDriveContent = () => {
    if (openDriveFolder) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setOpenDriveFolder(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h3 className="text-base font-semibold">{activeDriveFolderName}</h3>
              <p className="text-xs text-muted-foreground">{activeDriveFolderGalleries.length} galeria{activeDriveFolderGalleries.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          {renderGalleryGrid(activeDriveFolderGalleries)}
        </div>
      );
    }
    return renderDriveOperatorFolders();
  };

  // --- Render galleries list view ---
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
              Materiais organizados em galerias
            </CardDescription>
          </div>
          <Dialog open={isOpen && !editingId} onOpenChange={(open) => { if (!open) handleClose(); else { setForm(initialForm); setIsOpen(true); } }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Galeria
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Galeria</DialogTitle>
                <DialogDescription>Crie uma galeria com um ou mais arquivos</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título da Galeria *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Nome da galeria"
                    required
                  />
                  {form.uploadedFiles.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      Cada arquivo terá o título com numeração sequencial
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Input
                    value={form.destination}
                    onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))}
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
                        setForm((prev) => ({ ...prev, supplier_id: supplierId, supplier_name: supplierName }))
                      }
                      category={form.category}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Material *</Label>
                  <Select value={form.material_type} onValueChange={(value) => setForm((prev) => ({ ...prev, material_type: value }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {MATERIAL_TYPES.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                {form.material_type === "Vídeo" ? (
                  <div className="space-y-2">
                    <Label>Link do Vídeo</Label>
                    <Input value={form.video_url} onChange={(e) => setForm((prev) => ({ ...prev, video_url: e.target.value }))} placeholder="https://youtube.com/..." />
                  </div>
                ) : form.material_type === "Reels" ? (
                  <div className="space-y-2">
                    <Label>Vídeo do Reels</Label>
                    <MultiFileUpload
                      files={form.uploadedFiles}
                      onFilesChange={(files) => setForm((prev) => ({ ...prev, uploadedFiles: files }))}
                      disabled={isPending}
                      accept=".mp4,.mov,.webm"
                      acceptLabel="Vídeos verticais (MP4, MOV, WebM)"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Arquivos</Label>
                    <MultiFileUpload
                      files={form.uploadedFiles}
                      onFilesChange={(files) => setForm((prev) => ({ ...prev, uploadedFiles: files }))}
                      disabled={isPending}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Legenda (opcional)</Label>
                  <Textarea
                    value={form.caption}
                    onChange={(e) => setForm((prev) => ({ ...prev, caption: e.target.value }))}
                    placeholder="Texto da legenda que aparecerá no feed social..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trilha exclusiva (opcional)</Label>
                  <Select value={form.trail_id || "__none__"} onValueChange={(value) => setForm((prev) => ({ ...prev, trail_id: value === "__none__" ? "" : value }))}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma (aparece na página geral)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma (aparece na página geral)</SelectItem>
                      {(trails || []).map((trail) => (<SelectItem key={trail.id} value={trail.id}>{trail.name} — {trail.destination}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Se vinculado a uma trilha, este material aparecerá apenas nela e não na página de materiais.</p>
                </div>
                <div className="space-y-2">
                  <Label>Link do Canva (opcional)</Label>
                  <Input
                    value={form.canva_url}
                    onChange={(e) => setForm((prev) => ({ ...prev, canva_url: e.target.value }))}
                    placeholder="https://www.canva.com/design/..."
                  />
                  <p className="text-xs text-muted-foreground">Se preenchido, será um modelo editável no Canva (sem download).</p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.is_permanent}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_permanent: !!checked }))}
                  />
                  <Label className="cursor-pointer">Manter permanentemente (não excluir após 7 dias)</Label>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar{form.uploadedFiles.length > 1 ? ` (${form.uploadedFiles.length})` : ""}
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
        ) : (
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="manual" className="gap-2">
                <Upload className="h-4 w-4" />
                Minhas Galerias ({manualGalleries.length})
              </TabsTrigger>
              <TabsTrigger value="drive" className="gap-2">
                <CloudDownload className="h-4 w-4" />
                Google Drive ({driveGalleries.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="manual">
              {renderGalleryGrid(manualGalleries)}
            </TabsContent>
            <TabsContent value="drive">
              {renderGalleryGrid(driveGalleries)}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
