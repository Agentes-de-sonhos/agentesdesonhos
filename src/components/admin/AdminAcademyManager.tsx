import { useState, useRef } from "react";
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
import { Plus, Pencil, Trash2, MapPin, Upload, Loader2, FileText, FolderOpen, GripVertical, Check, X, Video, Users, GraduationCap, ClipboardCheck, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { useAcademy, useAcademyAdmin, useTrailMaterials, useTrailSpeakers } from "@/hooks/useAcademy";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrailTrainingsManager } from "./TrailTrainingsManager";
import { TrailLinkedMaterialsManager } from "./TrailLinkedMaterialsManager";
import { TrailExamManager } from "./TrailExamManager";
import { MATERIAL_CATEGORIES, type LearningTrail } from "@/types/academy";
import { usePlaybook } from "@/hooks/usePlaybook";
import { ImageGalleryPicker } from "./ImageGalleryPicker";
import { ImageCropDialog } from "./ImageCropDialog";
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
  const { trails } = useAcademy();
  const { destinations: playbookDestinations } = usePlaybook();
  const { createTrail, updateTrail, deleteTrail, saveTrailMaterial, updateTrailMaterial, reorderTrailMaterials, deleteTrailMaterial, saveTrailSpeaker, updateTrailSpeaker, deleteTrailSpeaker } = useAcademyAdmin();
  const queryClient = useQueryClient();

  const { data: academyDestinations = [] } = useQuery({
    queryKey: ['academy-destinations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_destinations')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []).map((d: any) => d.name as string);
    },
  });

  const [newDestinationName, setNewDestinationName] = useState('');
  const [creatingDestination, setCreatingDestination] = useState(false);

  const handleCreateDestination = async () => {
    const name = newDestinationName.trim();
    if (!name) return;
    setCreatingDestination(true);
    try {
      const { error } = await supabase.from('academy_destinations').insert({ name });
      if (error) {
        if (error.code === '23505') {
          sonnerToast.error('Esse destino já existe');
        } else {
          sonnerToast.error('Erro ao criar destino');
        }
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['academy-destinations'] });
      setTrailForm(prev => ({ ...prev, destination: name }));
      setNewDestinationName('');
      sonnerToast.success('Destino criado!');
    } finally {
      setCreatingDestination(false);
    }
  };

  const [trailDialogOpen, setTrailDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [uploadingOverviewPdf, setUploadingOverviewPdf] = useState(false);
  const [overviewPdfFile, setOverviewPdfFile] = useState<File | null>(null);
  const [certificateTemplateFile, setCertificateTemplateFile] = useState<File | null>(null);
  const [coverImageBlob, setCoverImageBlob] = useState<Blob | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [bannerImageBlob, setBannerImageBlob] = useState<Blob | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"cover" | "banner" | null>(null);
  const [cropAspect, setCropAspect] = useState(16 / 9);
  
  const [editingTrail, setEditingTrail] = useState<LearningTrail | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'trail' | 'material' | 'speaker'; id: string } | null>(null);

  // Material upload state per category
  const [categoryUploading, setCategoryUploading] = useState<string | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingMaterialTitle, setEditingMaterialTitle] = useState("");
  const [draggedMaterialId, setDraggedMaterialId] = useState<string | null>(null);
  const [videoForm, setVideoForm] = useState({ title: "", description: "", url: "" });
  const [speakerForm, setSpeakerForm] = useState({ full_name: "", photo_url: "", linkedin_url: "", whatsapp_number: "", email: "", bio: "" });
  const [speakerPhotoFile, setSpeakerPhotoFile] = useState<File | null>(null);
  const [uploadingSpeakerPhoto, setUploadingSpeakerPhoto] = useState(false);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [thumbnailTargetMaterialId, setThumbnailTargetMaterialId] = useState<string | null>(null);

  // Fetch materials and speakers for the currently editing trail
  const { data: trailMaterials = [] } = useTrailMaterials(editingTrail?.id ?? null);
  const { data: trailSpeakers = [] } = useTrailSpeakers(editingTrail?.id ?? null);

  // Trail form state
  const [trailForm, setTrailForm] = useState({
    name: "",
    description: "",
    destination: "",
    image_url: "",
    banner_url: "",
    overview_pdf_url: "",
    certificate_template_url: "",
    playbook_destination_id: "" as string,
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
        banner_url: (trail as any).banner_url || "",
        overview_pdf_url: (trail as any).overview_pdf_url || "",
        certificate_template_url: trail.certificate_template_url || "",
        playbook_destination_id: (trail as any).playbook_destination_id || "",
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
        banner_url: "",
        overview_pdf_url: "",
        certificate_template_url: "",
        playbook_destination_id: "",
        order_index: trails.length,
        is_active: true,
      });
    }
    setTrailDialogOpen(true);
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
      let bannerUrl = trailForm.banner_url;
      let certTemplateUrl = trailForm.certificate_template_url;

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

      if (coverImageBlob) {
        const path = `covers/${Date.now()}_cover.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("academy-files")
          .upload(path, coverImageBlob, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("academy-files")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      if (bannerImageBlob) {
        const path = `banners/${Date.now()}_banner.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("academy-files")
          .upload(path, bannerImageBlob, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("academy-files")
          .getPublicUrl(path);
        bannerUrl = urlData.publicUrl;
      }

      if (certificateTemplateFile) {
        const sanitized = sanitizeFileName(certificateTemplateFile.name);
        const path = `certificate-templates/${Date.now()}_${sanitized}`;
        const { error: uploadError } = await supabase.storage
          .from("academy-files")
          .upload(path, certificateTemplateFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("academy-files")
          .getPublicUrl(path);
        certTemplateUrl = urlData.publicUrl;
      }

      const payload = { ...trailForm, overview_pdf_url: overviewUrl, image_url: imageUrl, banner_url: bannerUrl, certificate_template_url: certTemplateUrl, playbook_destination_id: trailForm.playbook_destination_id || null };
      if (editingTrail) {
        await updateTrail.mutateAsync({ id: editingTrail.id, ...payload });
      } else {
        await createTrail.mutateAsync(payload);
      }
      setTrailDialogOpen(false);
      setOverviewPdfFile(null);
      setCoverImageBlob(null);
      setCoverImagePreview(null);
      setBannerImageBlob(null);
      setBannerImagePreview(null);
      setCertificateTemplateFile(null);
    } catch (err: any) {
      sonnerToast.error("Erro ao salvar trilha: " + err.message);
    } finally {
      setUploadingOverviewPdf(false);
    }
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
    } else if (itemToDelete.type === "speaker") {
      await deleteTrailSpeaker.mutateAsync(itemToDelete.id);
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleSaveSpeaker = async () => {
    if (!editingTrail || !speakerForm.full_name.trim()) {
      sonnerToast.error("Preencha pelo menos o nome do palestrante.");
      return;
    }
    setUploadingSpeakerPhoto(true);
    try {
      let photoUrl = speakerForm.photo_url || null;
      if (speakerPhotoFile) {
        const sanitized = sanitizeFileName(speakerPhotoFile.name);
        const path = `speakers/${Date.now()}_${sanitized}`;
        const { error: uploadError } = await supabase.storage
          .from("academy-files")
          .upload(path, speakerPhotoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("academy-files")
          .getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
      if (editingSpeakerId) {
        await updateTrailSpeaker.mutateAsync({
          id: editingSpeakerId,
          full_name: speakerForm.full_name.trim(),
          photo_url: photoUrl,
          linkedin_url: speakerForm.linkedin_url.trim() || null,
          whatsapp_number: speakerForm.whatsapp_number.trim() || null,
          email: speakerForm.email.trim() || null,
          bio: speakerForm.bio.trim() || null,
        });
        setEditingSpeakerId(null);
      } else {
        await saveTrailSpeaker.mutateAsync({
          trail_id: editingTrail.id,
          full_name: speakerForm.full_name.trim(),
          photo_url: photoUrl,
          linkedin_url: speakerForm.linkedin_url.trim() || null,
          whatsapp_number: speakerForm.whatsapp_number.trim() || null,
          email: speakerForm.email.trim() || null,
          bio: speakerForm.bio.trim() || null,
          order_index: trailSpeakers.length,
        });
      }
      setSpeakerForm({ full_name: "", photo_url: "", linkedin_url: "", whatsapp_number: "", email: "", bio: "" });
      setSpeakerPhotoFile(null);
    } catch (err: any) {
      sonnerToast.error("Erro ao salvar palestrante: " + err.message);
    } finally {
      setUploadingSpeakerPhoto(false);
    }
  };

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

  const handleSaveVideoMaterial = async () => {
    if (!editingTrail || !videoForm.title.trim() || !videoForm.url.trim()) {
      sonnerToast.error("Preencha o título e a URL do vídeo.");
      return;
    }
    setCategoryUploading("videos");
    try {
      await saveTrailMaterial.mutateAsync({
        trail_id: editingTrail.id,
        title: videoForm.title.trim(),
        description: videoForm.description.trim() || null,
        category: "videos",
        material_type: "link",
        file_url: videoForm.url.trim(),
        is_premium: false,
        order_index: trailMaterials.filter(m => m.category === "videos").length,
      });
      setVideoForm({ title: "", description: "", url: "" });
      sonnerToast.success("Vídeo adicionado com sucesso!");
    } catch (err: any) {
      sonnerToast.error("Erro ao salvar vídeo: " + err.message);
    } finally {
      setCategoryUploading(null);
    }
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
          {trailForm.image_url && !coverImageBlob && (
            <div className="flex items-center gap-2 mb-2">
              <img src={trailForm.image_url} alt="Capa atual" className="h-16 w-24 object-cover rounded border" />
              <span className="text-xs text-muted-foreground">Imagem atual</span>
            </div>
          )}
          {coverImagePreview ? (
            <div className="space-y-2">
              <img src={coverImagePreview} alt="Capa recortada" className="h-24 w-36 object-cover rounded border" />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setCoverImageBlob(null); setCoverImagePreview(null); }}>Remover</Button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clique para enviar imagem de capa</span>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => { setCropSrc(reader.result as string); setCropTarget("cover"); setCropAspect(3 / 2); };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }
              }} className="sr-only" />
            </label>
          )}
        </div>
      </div>
      <div>
        <Label>Banner da Trilha (imagem de destaque interna)</Label>
        <p className="text-xs text-muted-foreground mb-1">Imagem panorâmica exibida no topo ao abrir a trilha (recomendado: 1920×512px)</p>
        <div className="mt-1">
          {trailForm.banner_url && !bannerImageBlob && (
            <div className="flex items-center gap-2 mb-2">
              <img src={trailForm.banner_url} alt="Banner atual" className="h-16 w-40 object-cover rounded border" />
              <span className="text-xs text-muted-foreground">Banner atual</span>
            </div>
          )}
          {bannerImagePreview ? (
            <div className="space-y-2">
              <img src={bannerImagePreview} alt="Banner recortado" className="h-16 w-40 object-cover rounded border" />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setBannerImageBlob(null); setBannerImagePreview(null); }}>Remover</Button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clique para enviar banner da trilha</span>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => { setCropSrc(reader.result as string); setCropTarget("banner"); setCropAspect(1920 / 512); };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }
              }} className="sr-only" />
            </label>
          )}
        </div>
        <Select
          value={trailForm.playbook_destination_id}
          onValueChange={(v) => setTrailForm({ ...trailForm, playbook_destination_id: v === "none" ? "" : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Nenhum playbook vinculado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum</SelectItem>
            {playbookDestinations.map((pd) => (
              <SelectItem key={pd.id} value={pd.id}>{pd.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">Selecione o playbook de destino que será exibido na aba Playbook desta trilha.</p>
      </div>
      <div>
        <Label>Modelo de Certificado (imagem PNG/JPG)</Label>
        <p className="text-xs text-muted-foreground mb-1">Template base usado para gerar os certificados desta trilha. O nome, data e ID serão inseridos automaticamente.</p>
        <div className="mt-1">
          {trailForm.certificate_template_url && !certificateTemplateFile && (
            <div className="flex items-center gap-2 mb-2">
              <img src={trailForm.certificate_template_url} alt="Template atual" className="h-16 w-28 object-cover rounded border" />
              <span className="text-xs text-muted-foreground">Template atual</span>
              <Button variant="ghost" size="sm" onClick={() => setTrailForm({ ...trailForm, certificate_template_url: "" })}>Remover</Button>
            </div>
          )}
          {certificateTemplateFile ? (
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm">{certificateTemplateFile.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setCertificateTemplateFile(null)}>Remover</Button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <GraduationCap className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clique para enviar o modelo de certificado</span>
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setCertificateTemplateFile(file);
                  e.target.value = "";
                }
              }} className="sr-only" />
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
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trails.map((trail) => (
                <TableRow key={trail.id}>
                  <TableCell className="font-medium">{trail.name}</TableCell>
                  <TableCell>{trail.destination}</TableCell>
                  <TableCell>
                    <Badge variant={trail.is_active ? "default" : "secondary"}>
                      {trail.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
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

      {/* Trail Dialog */}
      <Dialog open={trailDialogOpen} onOpenChange={setTrailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{editingTrail ? "Editar Trilha" : "Nova Trilha"}</DialogTitle>
          </DialogHeader>
          {editingTrail ? (
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="w-full flex-wrap">
                <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
                <TabsTrigger value="treinamentos" className="flex-1">
                  <ClipboardCheck className="h-4 w-4 mr-1" />
                  Treinamentos
                </TabsTrigger>
                <TabsTrigger value="materiais" className="flex-1">
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Materiais
                </TabsTrigger>
                <TabsTrigger value="prova" className="flex-1">
                  <GraduationCap className="h-4 w-4 mr-1" />
                  Prova Final
                </TabsTrigger>
                <TabsTrigger value="palestrantes" className="flex-1">
                  <Users className="h-4 w-4 mr-1" />
                  Palestrantes
                </TabsTrigger>
                <TabsTrigger value="divulgacao" className="flex-1">
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Divulgação
                </TabsTrigger>
              </TabsList>
              <TabsContent value="dados">
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                  {renderTrailFormFields()}
                </div>
              </TabsContent>
              <TabsContent value="treinamentos">
                <TrailTrainingsManager trailId={editingTrail.id} />
              </TabsContent>
              <TabsContent value="materiais">
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                  {[
                    { category: "visao_geral", label: "PDF — Visão Geral", isOverview: true },
                    { category: "mapas_mentais", label: "Mapas Mentais" },
                    { category: "apresentacoes", label: "Apresentações" },
                    { category: "videos", label: "Vídeos", isVideoCategory: true },
                    { category: "materiais_complementares", label: "Materiais Complementares" },
                  ].map(({ category, label, isOverview, isVideoCategory }) => {
                    const items = isOverview
                      ? (trailForm.overview_pdf_url ? [{ id: "__overview", title: "Visão Geral", file_url: trailForm.overview_pdf_url }] : [])
                      : trailMaterials.filter(m => m.category === category);
                    const isUploading = isOverview ? uploadingOverviewPdf : categoryUploading === category;

                    return (
                      <div key={category} className="border rounded-lg p-4 space-y-2 bg-muted/20">
                        <Label className="text-sm font-semibold">{label}</Label>
                        
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
                            {(item as any).thumbnail_url ? (
                              <img src={(item as any).thumbnail_url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                            ) : isVideoCategory ? <Video className="h-4 w-4 text-primary shrink-0" /> : <FileText className="h-4 w-4 text-primary shrink-0" />}
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
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-1"
                                  title="Definir imagem de capa"
                                  onClick={() => {
                                    setThumbnailTargetMaterialId(item.id);
                                    setThumbnailPickerOpen(true);
                                  }}
                                >
                                  <ImageIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-1"
                                  onClick={() => { setEditingMaterialId(item.id); setEditingMaterialTitle(item.title || ""); }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </>
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

                        {isVideoCategory ? (
                          <div className="space-y-2 pt-2 border-t">
                            <Input placeholder="Título do vídeo" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} className="h-8 text-sm" />
                            <Input placeholder="Descrição (opcional)" value={videoForm.description} onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })} className="h-8 text-sm" />
                            <Input placeholder="URL do vídeo (Google Drive, etc.)" value={videoForm.url} onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })} className="h-8 text-sm" />
                            <Button size="sm" className="w-full" disabled={categoryUploading === "videos"} onClick={handleSaveVideoMaterial}>
                              {categoryUploading === "videos" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                              Adicionar Vídeo
                            </Button>
                          </div>
                        ) : (
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
                        )}
                      </div>
                    );
                  })}
                  <ImageGalleryPicker
                    open={thumbnailPickerOpen}
                    onOpenChange={setThumbnailPickerOpen}
                    onSelect={async (url) => {
                      if (thumbnailTargetMaterialId) {
                        try {
                          await updateTrailMaterial.mutateAsync({ id: thumbnailTargetMaterialId, thumbnail_url: url } as any);
                          sonnerToast.success("Capa atualizada!");
                        } catch (err: any) {
                          sonnerToast.error("Erro: " + err.message);
                        }
                        setThumbnailTargetMaterialId(null);
                      }
                    }}
                  />
                </div>
              </TabsContent>
              <TabsContent value="prova">
                <TrailExamManager trailId={editingTrail.id} />
              </TabsContent>
              <TabsContent value="palestrantes">
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                  {trailSpeakers.map((speaker) => (
                    <div key={speaker.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                      {speaker.photo_url ? (
                        <img src={speaker.photo_url} alt={speaker.full_name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {speaker.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{speaker.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[speaker.email, speaker.whatsapp_number].filter(Boolean).join(" · ") || "Sem contato"}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => {
                        setEditingSpeakerId(speaker.id);
                        setSpeakerForm({
                          full_name: speaker.full_name,
                          photo_url: speaker.photo_url || "",
                          linkedin_url: speaker.linkedin_url || "",
                          whatsapp_number: speaker.whatsapp_number || "",
                          email: speaker.email || "",
                          bio: speaker.bio || "",
                        });
                        setSpeakerPhotoFile(null);
                      }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => {
                        setItemToDelete({ type: "speaker", id: speaker.id });
                        setDeleteConfirmOpen(true);
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">{editingSpeakerId ? "Editar Palestrante" : "Adicionar Palestrante"}</Label>
                      {editingSpeakerId && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                          setEditingSpeakerId(null);
                          setSpeakerForm({ full_name: "", photo_url: "", linkedin_url: "", whatsapp_number: "", email: "", bio: "" });
                          setSpeakerPhotoFile(null);
                        }}>
                          Cancelar edição
                        </Button>
                      )}
                    </div>
                    <Input placeholder="Nome completo *" value={speakerForm.full_name} onChange={(e) => setSpeakerForm({ ...speakerForm, full_name: e.target.value })} className="h-8 text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="E-mail" value={speakerForm.email} onChange={(e) => setSpeakerForm({ ...speakerForm, email: e.target.value })} className="h-8 text-sm" />
                      <Input placeholder="WhatsApp (ex: 5511999999999)" value={speakerForm.whatsapp_number} onChange={(e) => setSpeakerForm({ ...speakerForm, whatsapp_number: e.target.value })} className="h-8 text-sm" />
                    </div>
                    <Input placeholder="URL do LinkedIn" value={speakerForm.linkedin_url} onChange={(e) => setSpeakerForm({ ...speakerForm, linkedin_url: e.target.value })} className="h-8 text-sm" />
                    <Textarea placeholder="Bio / descrição curta" value={speakerForm.bio} onChange={(e) => setSpeakerForm({ ...speakerForm, bio: e.target.value })} className="text-sm min-h-[60px]" />
                    {speakerPhotoFile ? (
                      <div className="flex items-center gap-3 p-2 border rounded bg-muted/30">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm truncate flex-1">{speakerPhotoFile.name}</span>
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => setSpeakerPhotoFile(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Foto do palestrante (opcional)</span>
                        <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSpeakerPhotoFile(f); }} className="sr-only" />
                      </label>
                    )}
                    <Button size="sm" className="w-full" disabled={uploadingSpeakerPhoto} onClick={handleSaveSpeaker}>
                      {uploadingSpeakerPhoto ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : editingSpeakerId ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      {editingSpeakerId ? "Salvar Alterações" : "Adicionar Palestrante"}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="divulgacao">
                <TrailLinkedMaterialsManager trailId={editingTrail.id} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {renderTrailFormFields()}
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      <ImageCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc || ""}
        aspect={cropAspect}
        title={cropTarget === "cover" ? "Posicionar capa da trilha" : "Posicionar banner da trilha"}
        onClose={() => { setCropSrc(null); setCropTarget(null); }}
        onConfirm={(blob) => {
          const url = URL.createObjectURL(blob);
          if (cropTarget === "cover") {
            setCoverImageBlob(blob);
            setCoverImagePreview(url);
          } else {
            setBannerImageBlob(blob);
            setBannerImagePreview(url);
          }
          setCropSrc(null);
          setCropTarget(null);
        }}
      />
    </div>
  );
}
