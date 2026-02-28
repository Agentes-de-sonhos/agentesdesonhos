import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, MapPin, Link2, ClipboardCheck, Upload, Loader2, FileText, FolderOpen, GripVertical, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { useAcademy, useAcademyAdmin, useTrailMaterials } from "@/hooks/useAcademy";
import { QuizManager } from "./QuizManager";
import { POPULAR_DESTINATIONS, TRAINING_CATEGORIES, MATERIAL_CATEGORIES, type LearningTrail, type Training } from "@/types/academy";
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

export function AdminAcademyManager() {
  const { trails, trainings, trailTrainings } = useAcademy();
  const { createTrail, updateTrail, deleteTrail, createTraining, updateTraining, deleteTraining, linkTrainingToTrail, unlinkTrainingFromTrail, saveTrailMaterial, updateTrailMaterial, reorderTrailMaterials, deleteTrailMaterial } = useAcademyAdmin();
  
  const [trailDialogOpen, setTrailDialogOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [uploadingOverviewPdf, setUploadingOverviewPdf] = useState(false);
  const [overviewPdfFile, setOverviewPdfFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  
  const [editingTrail, setEditingTrail] = useState<LearningTrail | null>(null);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'trail' | 'training' | 'material'; id: string } | null>(null);
  const [selectedTrailForLink, setSelectedTrailForLink] = useState<string>("");

  // Material upload state per category
  const [categoryUploading, setCategoryUploading] = useState<string | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingMaterialTitle, setEditingMaterialTitle] = useState("");
  const [draggedMaterialId, setDraggedMaterialId] = useState<string | null>(null);

  // Fetch materials for the currently editing trail
  const { data: trailMaterials = [] } = useTrailMaterials(editingTrail?.id);

  // Trail form state
  const [trailForm, setTrailForm] = useState({
    name: "",
    description: "",
    destination: "",
    image_url: "",
    overview_pdf_url: "",
    order_index: 0,
    is_active: true,
  });

  // Training form state
  const [trainingForm, setTrainingForm] = useState({
    title: "",
    description: "",
    category: "geral",
    training_type: "recorded" as "live" | "recorded",
    video_url: "",
    duration_minutes: 0,
    thumbnail_url: "",
    materials_url: "",
    instructor: "",
    scheduled_at: "",
    order_index: 0,
    is_active: true,
  });

  const handleOpenTrailDialog = (trail?: LearningTrail) => {
    if (trail) {
      setEditingTrail(trail);
      setTrailForm({
        name: trail.name,
        description: trail.description || "",
        destination: trail.destination,
        image_url: trail.image_url || "",
        overview_pdf_url: (trail as any).overview_pdf_url || "",
        order_index: trail.order_index,
        is_active: trail.is_active,
      });
    } else {
      setEditingTrail(null);
      setTrailForm({
        name: "",
        description: "",
        destination: "",
        image_url: "",
        overview_pdf_url: "",
        order_index: trails.length,
        is_active: true,
      });
    }
    setTrailDialogOpen(true);
  };

  const handleOpenTrainingDialog = (training?: Training) => {
    if (training) {
      setEditingTraining(training);
      setTrainingForm({
        title: training.title,
        description: training.description || "",
        category: training.category,
        training_type: training.training_type as "live" | "recorded",
        video_url: training.video_url || "",
        duration_minutes: training.duration_minutes,
        thumbnail_url: training.thumbnail_url || "",
        materials_url: training.materials_url || "",
        instructor: training.instructor || "",
        scheduled_at: training.scheduled_at || "",
        order_index: training.order_index,
        is_active: training.is_active,
      });
    } else {
      setEditingTraining(null);
      setTrainingForm({
        title: "",
        description: "",
        category: "geral",
        training_type: "recorded",
        video_url: "",
        duration_minutes: 0,
        thumbnail_url: "",
        materials_url: "",
        instructor: "",
        scheduled_at: "",
        order_index: trainings.length,
        is_active: true,
      });
    }
    setTrainingDialogOpen(true);
  };

  const sanitizeFileName = (name: string) => {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
  };

  const handleSaveTrail = async () => {
    setUploadingOverviewPdf(true);
    try {
      let overviewUrl = trailForm.overview_pdf_url;
      let imageUrl = trailForm.image_url;

      if (overviewPdfFile) {
        const sanitized = sanitizeFileName(overviewPdfFile.name);
        const path = `overview/${Date.now()}_${sanitized}`;
        const { error: uploadError } = await supabase.storage
          .from("academy-files")
          .upload(path, overviewPdfFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("academy-files")
          .getPublicUrl(path);
        overviewUrl = urlData.publicUrl;
      }

      if (coverImageFile) {
        const sanitized = sanitizeFileName(coverImageFile.name);
        const path = `covers/${Date.now()}_${sanitized}`;
        const { error: uploadError } = await supabase.storage
          .from("academy-files")
          .upload(path, coverImageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("academy-files")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const payload = { ...trailForm, overview_pdf_url: overviewUrl, image_url: imageUrl };
      if (editingTrail) {
        await updateTrail.mutateAsync({ id: editingTrail.id, ...payload });
      } else {
        await createTrail.mutateAsync(payload);
      }
      setTrailDialogOpen(false);
      setOverviewPdfFile(null);
      setCoverImageFile(null);
    } catch (err: any) {
      sonnerToast.error("Erro ao salvar trilha: " + err.message);
    } finally {
      setUploadingOverviewPdf(false);
    }
  };

  const handleSaveTraining = async () => {
    const data = {
      ...trainingForm,
      scheduled_at: trainingForm.scheduled_at || null,
    };
    if (editingTraining) {
      await updateTraining.mutateAsync({ id: editingTraining.id, ...data });
    } else {
      await createTraining.mutateAsync(data);
    }
    setTrainingDialogOpen(false);
  };

  const handleUploadCategoryMaterial = async (file: File, category: string, label: string) => {
    if (!editingTrail) return;
    setCategoryUploading(category);
    try {
      const sanitized = sanitizeFileName(file.name);
      const path = `trails/${editingTrail.id}/${Date.now()}_${sanitized}`;
      const { error: uploadError } = await supabase.storage
        .from("academy-files")
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("academy-files")
        .getPublicUrl(path);
      const fileUrl = urlData.publicUrl;
      await saveTrailMaterial.mutateAsync({
        trail_id: editingTrail.id,
        title: file.name.replace(/\.[^/.]+$/, ""),
        description: null,
        category,
        material_type: "pdf",
        file_url: fileUrl,
        is_premium: false,
        order_index: trailMaterials.filter(m => m.category === category).length,
      });
      sonnerToast.success(`${label} adicionado com sucesso!`);
    } catch (err: any) {
      sonnerToast.error("Erro ao enviar: " + err.message);
    } finally {
      setCategoryUploading(null);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === "trail") {
      await deleteTrail.mutateAsync(itemToDelete.id);
    } else if (itemToDelete.type === "material") {
      await deleteTrailMaterial.mutateAsync(itemToDelete.id);
    } else {
      await deleteTraining.mutateAsync(itemToDelete.id);
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const getCategoryLabel = (value: string) =>
    MATERIAL_CATEGORIES.find((c) => c.value === value)?.label || value;

  const handleSaveMaterialTitle = async (materialId: string) => {
    if (!editingMaterialTitle.trim()) return;
    await updateTrailMaterial.mutateAsync({ id: materialId, title: editingMaterialTitle.trim() });
    setEditingMaterialId(null);
    sonnerToast.success("Título atualizado!");
  };

  const handleDrop = async (targetId: string, category: string) => {
    if (!draggedMaterialId || draggedMaterialId === targetId) {
      setDraggedMaterialId(null);
      return;
    }
    const items = trailMaterials.filter(m => m.category === category);
    const draggedIdx = items.findIndex(m => m.id === draggedMaterialId);
    const targetIdx = items.findIndex(m => m.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    const reordered = [...items];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const updates = reordered.map((m, i) => ({ id: m.id, order_index: i }));
    await reorderTrailMaterials.mutateAsync(updates);
    setDraggedMaterialId(null);
    sonnerToast.success("Ordem atualizada!");
  };

  const handleLinkTraining = async (trainingId: string) => {
    if (!selectedTrailForLink) return;
    await linkTrainingToTrail.mutateAsync({
      trailId: selectedTrailForLink,
      trainingId,
    });
  };

  const handleUnlinkTraining = async (trailId: string, trainingId: string) => {
    await unlinkTrainingFromTrail.mutateAsync({ trailId, trainingId });
  };

  const getTrailTrainings = (trailId: string) => {
    return trailTrainings.filter((tt) => tt.trail_id === trailId);
  };
  const renderTrailFormFields = () => (
    <>
      <div>
        <Label>Nome da Trilha</Label>
        <Input
          value={trailForm.name}
          onChange={(e) => setTrailForm({ ...trailForm, name: e.target.value })}
          placeholder="Ex: Especialista em Orlando"
        />
      </div>
      <div>
        <Label>Destino</Label>
        <Select
          value={trailForm.destination}
          onValueChange={(v) => setTrailForm({ ...trailForm, destination: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o destino" />
          </SelectTrigger>
          <SelectContent>
            {POPULAR_DESTINATIONS.map((dest) => (
              <SelectItem key={dest} value={dest}>{dest}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea
          value={trailForm.description}
          onChange={(e) => setTrailForm({ ...trailForm, description: e.target.value })}
          placeholder="Descrição da trilha..."
        />
      </div>
      <div>
        <Label>Imagem de Capa</Label>
        <div className="mt-1">
          {trailForm.image_url && !coverImageFile && (
            <div className="flex items-center gap-2 mb-2">
              <img src={trailForm.image_url} alt="Capa atual" className="h-16 w-24 object-cover rounded border" />
              <span className="text-xs text-muted-foreground">Imagem atual</span>
            </div>
          )}
          {coverImageFile ? (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium flex-1 truncate">{coverImageFile.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setCoverImageFile(null)}>Remover</Button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clique para enviar imagem de capa</span>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) setCoverImageFile(file); }} className="sr-only" />
            </label>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={trailForm.is_active}
          onCheckedChange={(v) => setTrailForm({ ...trailForm, is_active: v })}
        />
        <Label>Trilha ativa</Label>
      </div>
      <Button onClick={handleSaveTrail} className="w-full" disabled={uploadingOverviewPdf}>
        {uploadingOverviewPdf && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {uploadingOverviewPdf ? "Enviando..." : "Salvar"}
      </Button>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Trails Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Trilhas de Aprendizado
          </CardTitle>
          <Button onClick={() => handleOpenTrailDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Trilha
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Treinamentos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trails.map((trail) => (
                <TableRow key={trail.id}>
                  <TableCell className="font-medium">{trail.name}</TableCell>
                  <TableCell>{trail.destination}</TableCell>
                  <TableCell>{getTrailTrainings(trail.id).length} treinamentos</TableCell>
                  <TableCell>
                    <Badge variant={trail.is_active ? "default" : "secondary"}>
                      {trail.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedTrailForLink(trail.id);
                          setLinkDialogOpen(true);
                        }}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenTrailDialog(trail)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setItemToDelete({ type: "trail", id: trail.id });
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Trainings Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Treinamentos</CardTitle>
          <Button onClick={() => handleOpenTrainingDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Treinamento
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainings.map((training) => (
                <TableRow key={training.id}>
                  <TableCell className="font-medium">{training.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{training.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={training.training_type === "live" ? "destructive" : "secondary"}>
                      {training.training_type === "live" ? "Ao vivo" : "Gravado"}
                    </Badge>
                  </TableCell>
                  <TableCell>{training.duration_minutes} min</TableCell>
                  <TableCell>
                    <Badge variant={training.is_active ? "default" : "secondary"}>
                      {training.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenTrainingDialog(training)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setItemToDelete({ type: "training", id: training.id });
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Trail Dialog */}
      <Dialog open={trailDialogOpen} onOpenChange={setTrailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{editingTrail ? "Editar Trilha" : "Nova Trilha"}</DialogTitle>
          </DialogHeader>
          {editingTrail ? (
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="dados" className="flex-1">Dados da Trilha</TabsTrigger>
                <TabsTrigger value="materiais" className="flex-1">
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Materiais (PDFs)
                </TabsTrigger>
              </TabsList>
              <TabsContent value="dados">
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                  {renderTrailFormFields()}
                </div>
              </TabsContent>
              <TabsContent value="materiais">
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                  {[
                    { category: "visao_geral", label: "PDF — Visão Geral", isOverview: true },
                    { category: "mapas_mentais", label: "Mapas Mentais" },
                    { category: "apresentacoes", label: "Apresentações" },
                    { category: "materiais_complementares", label: "Materiais Complementares" },
                  ].map(({ category, label, isOverview }) => {
                    const items = isOverview
                      ? (trailForm.overview_pdf_url ? [{ id: "__overview", title: "Visão Geral", file_url: trailForm.overview_pdf_url }] : [])
                      : trailMaterials.filter(m => m.category === category);
                    const isUploading = isOverview ? uploadingOverviewPdf : categoryUploading === category;

                    return (
                      <div key={category} className="border rounded-lg p-4 space-y-2 bg-muted/20">
                        <Label className="text-sm font-semibold">{label}</Label>
                        
                        {/* Existing files */}
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-2 p-2 border rounded bg-muted/30 ${draggedMaterialId === item.id ? 'opacity-50' : ''}`}
                            draggable={!isOverview && !editingMaterialId}
                            onDragStart={() => !isOverview && setDraggedMaterialId(item.id)}
                            onDragOver={(e) => { if (!isOverview) e.preventDefault(); }}
                            onDrop={() => !isOverview && handleDrop(item.id, category)}
                            onDragEnd={() => setDraggedMaterialId(null)}
                          >
                            {!isOverview && (
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                            )}
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            {editingMaterialId === item.id ? (
                              <div className="flex items-center gap-1 flex-1">
                                <Input
                                  value={editingMaterialTitle}
                                  onChange={(e) => setEditingMaterialTitle(e.target.value)}
                                  className="h-7 text-sm"
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMaterialTitle(item.id); if (e.key === 'Escape') setEditingMaterialId(null); }}
                                  autoFocus
                                />
                                <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => handleSaveMaterialTitle(item.id)}>
                                  <Check className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => setEditingMaterialId(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <a href={item.file_url!} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline truncate flex-1">
                                {item.title || "Arquivo"}
                              </a>
                            )}
                            {!isOverview && editingMaterialId !== item.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-1"
                                onClick={() => { setEditingMaterialId(item.id); setEditingMaterialTitle(item.title || ""); }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                if (isOverview) {
                                  setTrailForm({ ...trailForm, overview_pdf_url: "" });
                                  handleSaveTrail();
                                } else {
                                  setItemToDelete({ type: "material", id: item.id });
                                  setDeleteConfirmOpen(true);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}

                        {/* Upload area */}
                        <label className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Upload className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {isUploading ? "Enviando..." : `Clique para enviar ${label}`}
                          </span>
                          <input
                            type="file"
                            accept=".pdf"
                            disabled={!!isUploading}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              if (isOverview) {
                                setOverviewPdfFile(f);
                                // Trigger save immediately
                                setUploadingOverviewPdf(true);
                                try {
                                  const sanitized = sanitizeFileName(f.name);
                                  const path = `overview/${Date.now()}_${sanitized}`;
                                  const { error: uploadError } = await supabase.storage
                                    .from("academy-files")
                                    .upload(path, f);
                                  if (uploadError) throw uploadError;
                                  const { data: urlData } = supabase.storage
                                    .from("academy-files")
                                    .getPublicUrl(path);
                                  const newUrl = urlData.publicUrl;
                                  const payload = { ...trailForm, overview_pdf_url: newUrl, image_url: trailForm.image_url };
                                  if (editingTrail) {
                                    await updateTrail.mutateAsync({ id: editingTrail.id, ...payload });
                                  }
                                  setTrailForm(prev => ({ ...prev, overview_pdf_url: newUrl }));
                                  setOverviewPdfFile(null);
                                  sonnerToast.success("Visão Geral salva!");
                                } catch (err: any) {
                                  sonnerToast.error("Erro: " + err.message);
                                } finally {
                                  setUploadingOverviewPdf(false);
                                }
                              } else {
                                await handleUploadCategoryMaterial(f, category, label);
                              }
                              e.target.value = "";
                            }}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {renderTrailFormFields()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Training Dialog */}
      <Dialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTraining ? "Editar Treinamento" : "Novo Treinamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Título</Label>
              <Input
                value={trainingForm.title}
                onChange={(e) => setTrainingForm({ ...trainingForm, title: e.target.value })}
                placeholder="Título do treinamento"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={trainingForm.category}
                  onValueChange={(v) => setTrainingForm({ ...trainingForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={trainingForm.training_type}
                  onValueChange={(v) => setTrainingForm({ ...trainingForm, training_type: v as "live" | "recorded" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recorded">Gravado</SelectItem>
                    <SelectItem value="live">Ao vivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={trainingForm.description}
                onChange={(e) => setTrainingForm({ ...trainingForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>URL do Vídeo</Label>
              <Input
                value={trainingForm.video_url}
                onChange={(e) => setTrainingForm({ ...trainingForm, video_url: e.target.value })}
                placeholder="https://youtube.com/embed/..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duração (minutos)</Label>
                <Input
                  type="number"
                  value={trainingForm.duration_minutes}
                  onChange={(e) => setTrainingForm({ ...trainingForm, duration_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Instrutor</Label>
                <Input
                  value={trainingForm.instructor}
                  onChange={(e) => setTrainingForm({ ...trainingForm, instructor: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>URL de Material Complementar</Label>
              <Input
                value={trainingForm.materials_url}
                onChange={(e) => setTrainingForm({ ...trainingForm, materials_url: e.target.value })}
              />
            </div>
            {trainingForm.training_type === "live" && (
              <div>
                <Label>Data/Hora (ao vivo)</Label>
                <Input
                  type="datetime-local"
                  value={trainingForm.scheduled_at}
                  onChange={(e) => setTrainingForm({ ...trainingForm, scheduled_at: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={trainingForm.is_active}
                onCheckedChange={(v) => setTrainingForm({ ...trainingForm, is_active: v })}
              />
              <Label>Treinamento ativo</Label>
            </div>
            <Button onClick={handleSaveTraining} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Training to Trail Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Treinamentos à Trilha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione os treinamentos para adicionar à trilha:
            </p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {trainings.map((training) => {
                const isLinked = trailTrainings.some(
                  (tt) => tt.trail_id === selectedTrailForLink && tt.training_id === training.id
                );
                return (
                  <div key={training.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{training.title}</span>
                    {isLinked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnlinkTraining(selectedTrailForLink, training.id)}
                      >
                        Remover
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleLinkTraining(training.id)}>
                        Adicionar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz & Exam Manager */}
      <QuizManager />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
