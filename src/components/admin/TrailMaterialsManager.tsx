import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Upload, FileText, FolderOpen, Loader2, Image as ImageIcon, X } from "lucide-react";
import { useAcademy, useAcademyAdmin, useTrailMaterials } from "@/hooks/useAcademy";
import { MATERIAL_CATEGORIES } from "@/types/academy";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageGalleryPicker } from "./ImageGalleryPicker";

export function TrailMaterialsManager() {
  const { trails } = useAcademy();
  const { saveTrailMaterial, deleteTrailMaterial } = useAcademyAdmin();
  const [selectedTrailId, setSelectedTrailId] = useState<string>("");
  const { data: materials = [] } = useTrailMaterials(selectedTrailId || undefined);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "mapas_mentais",
    material_type: "pdf" as "pdf" | "video" | "audio" | "image" | "link",
    thumbnail_url: "" as string,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const sanitizeFileName = (name: string) => {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
  };

  const handleUpload = async () => {
    if (!selectedTrailId || !form.title) {
      toast.error("Preencha o título e selecione uma trilha.");
      return;
    }

    setUploading(true);
    let fileUrl: string | null = null;

    try {
      if (selectedFile) {
        const sanitized = sanitizeFileName(selectedFile.name);
        const path = `trails/${selectedTrailId}/${Date.now()}_${sanitized}`;
        const { error: uploadError } = await supabase.storage
          .from("academy-files")
          .upload(path, selectedFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("academy-files")
          .getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }

      await saveTrailMaterial.mutateAsync({
        trail_id: selectedTrailId,
        title: form.title,
        description: form.description || null,
        category: form.category,
        material_type: form.material_type,
        file_url: fileUrl,
        thumbnail_url: form.thumbnail_url || null,
        is_premium: false,
        order_index: materials.length,
      });

      setDialogOpen(false);
      setSelectedFile(null);
      setForm({ title: "", description: "", category: "mapas_mentais", material_type: "pdf", thumbnail_url: "" });
    } catch (err: any) {
      toast.error("Erro ao salvar material: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!materialToDelete) return;
    await deleteTrailMaterial.mutateAsync(materialToDelete);
    setDeleteConfirmOpen(false);
    setMaterialToDelete(null);
  };

  const getCategoryLabel = (value: string) =>
    MATERIAL_CATEGORIES.find((c) => c.value === value)?.label || value;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Materiais das Trilhas (PDFs, Mapas Mentais, Apresentações)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label>Selecione a Trilha</Label>
            <Select value={selectedTrailId} onValueChange={setSelectedTrailId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma trilha..." />
              </SelectTrigger>
              <SelectContent>
                {trails.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTrailId && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Material
            </Button>
          )}
        </div>

        {selectedTrailId && materials.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Capa</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead className="w-[60px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    {m.thumbnail_url ? (
                      <img src={m.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{m.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryLabel(m.category)}</Badge>
                  </TableCell>
                  <TableCell>{m.material_type}</TableCell>
                  <TableCell>
                    {m.file_url ? (
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                        Ver arquivo
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setMaterialToDelete(m.id);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {selectedTrailId && materials.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum material cadastrado para esta trilha. Clique em "Adicionar Material" acima.
          </p>
        )}

        {!selectedTrailId && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Selecione uma trilha acima para gerenciar seus materiais (Mapas Mentais, Apresentações, PDFs etc).
          </p>
        )}
      </CardContent>

      {/* Add Material Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Material à Trilha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Mapa Mental — Hotelaria Orlando"
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Breve descrição..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Arquivo</Label>
                <Select value={form.material_type} onValueChange={(v) => setForm({ ...form, material_type: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Thumbnail / Cover Image */}
            <div>
              <Label>Imagem de Capa</Label>
              <div className="mt-1">
                {form.thumbnail_url ? (
                  <div className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30">
                    <img src={form.thumbnail_url} alt="Capa" className="w-16 h-16 rounded object-cover" />
                    <span className="text-sm text-muted-foreground flex-1 truncate">Imagem selecionada</span>
                    <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, thumbnail_url: "" })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center gap-2"
                    onClick={() => setGalleryOpen(true)}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Selecionar imagem de capa
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label>Arquivo (PDF, imagem, etc.)</Label>
              <div className="mt-1">
                {selectedFile ? (
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium flex-1 truncate">{selectedFile.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>Remover</Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique para selecionar um arquivo</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setSelectedFile(file);
                      }}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>
            <Button onClick={handleUpload} className="w-full" disabled={uploading}>
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {uploading ? "Enviando..." : "Salvar Material"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Gallery Picker */}
      <ImageGalleryPicker
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onSelect={(url) => setForm({ ...form, thumbnail_url: url })}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir material</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
