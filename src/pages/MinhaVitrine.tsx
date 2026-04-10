import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useShowcase, type ShowcaseItem, FEATURED_LABELS, MAX_FEATURED, getFeaturedLabel } from "@/hooks/useShowcase";
import { useVitrineCategories } from "@/hooks/useVitrineCategories";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Plus, Trash2, ExternalLink, Image as ImageIcon,
  Upload, MessageCircle, Loader2, Store, Copy, Eye, Star, ChevronUp, ChevronDown,
  Settings, Share2, Zap, Check
} from "lucide-react";

const SUGGESTED_SUBCATEGORIES = ["Réveillon", "MSC", "Costa Cruzeiros", "Férias de Julho", "Disney", "Europa"];

export default function MinhaVitrine() {
  const { user } = useAuth();
  const {
    showcase, items, availableMaterials, allSuppliers, loadingShowcase,
    createShowcase, updateShowcase, addItem, updateItem, removeItem, reorderItems, uploadImage, uploadMultipleImages,
  } = useShowcase();
  const { categoryNames: SUGGESTED_CATEGORIES } = useVitrineCategories();

  const [slug, setSlug] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ShowcaseItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addTab, setAddTab] = useState("materials");

  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [category, setCategory] = useState("Geral");
  const [customCategory, setCustomCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [actionType, setActionType] = useState("whatsapp");
  const [actionUrl, setActionUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [tagline, setTagline] = useState(showcase?.tagline || "");
  const [showcaseMode, setShowcaseMode] = useState(showcase?.showcase_mode || "manual");
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>(showcase?.auto_supplier_ids || []);
  const [maxAutoItems, setMaxAutoItems] = useState(showcase?.max_auto_items || 20);
  const [autoCategories, setAutoCategories] = useState<string[]>(showcase?.auto_categories || []);
  const [ogTitle, setOgTitle] = useState(showcase?.og_title || "");
  const [ogDescription, setOgDescription] = useState(showcase?.og_description || "");

  const PUBLIC_DOMAIN = "https://vitrine.tur.br";
  const publicUrl = showcase ? `${PUBLIC_DOMAIN}/${showcase.slug}` : "";
  const featuredCount = items.filter(i => i.is_featured).length;

  const handleCreateShowcase = () => {
    const sanitized = slug.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!sanitized || sanitized.length < 3) {
      toast.error("O slug deve ter pelo menos 3 caracteres");
      return;
    }
    createShowcase.mutate(sanitized);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
    const validExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];
    const validFiles = files.filter(file => {
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      return validTypes.includes(file.type) && validExtensions.includes(fileExtension);
    });
    if (validFiles.length < files.length) {
      toast.error("Alguns arquivos foram ignorados. Use JPG, PNG, WEBP, GIF ou BMP.");
    }
    if (validFiles.length === 0) return;
    setUploadFiles(prev => [...prev, ...validFiles]);
    setUploadPreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
    setSelectedMaterialIds([]);
  };

  const resetForm = () => {
    setSelectedMaterialIds([]);
    setUploadFiles([]);
    setUploadPreviews([]);
    setCategory("Geral");
    setCustomCategory("");
    setSubcategory("");
    setActionType("whatsapp");
    setActionUrl("");
    setExpiresAt("");
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
    setUploadPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = async () => {
    if (selectedMaterialIds.length === 0 && uploadFiles.length === 0) {
      toast.error("Selecione lâminas ou faça upload de imagens");
      return;
    }
    setIsSubmitting(true);
    try {
      let imageUrl: string | undefined;
      let galleryUrls: string[] | undefined;
      let materialId: string | undefined;

      if (uploadFiles.length === 1) {
        imageUrl = await uploadImage(uploadFiles[0]);
      } else if (uploadFiles.length > 1) {
        galleryUrls = await uploadMultipleImages(uploadFiles);
        imageUrl = galleryUrls[0];
      }

      if (selectedMaterialIds.length > 0) {
        const selectedMats = selectedMaterialIds
          .map(id => availableMaterials.find(m => m.id === id))
          .filter(Boolean);
        const matUrls = selectedMats.map(m => m!.file_url || m!.thumbnail_url).filter(Boolean) as string[];
        if (selectedMaterialIds.length === 1) {
          materialId = selectedMaterialIds[0];
          imageUrl = matUrls[0];
        } else {
          galleryUrls = matUrls;
          imageUrl = matUrls[0];
          materialId = selectedMaterialIds[0];
        }
      }

      const finalCategory = category === "__custom" ? customCategory : category;
      await addItem.mutateAsync({
        material_id: materialId,
        image_url: imageUrl,
        gallery_urls: galleryUrls,
        category: finalCategory || "Geral",
        subcategory: subcategory || undefined,
        action_type: actionType,
        action_url: actionType === "link" ? actionUrl : undefined,
        expires_at: expiresAt || undefined,
      });
      resetForm();
      setAddDialogOpen(false);
    } catch {
      // error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editItem) return;
    const finalCategory = category === "__custom" ? customCategory : category;
    await updateItem.mutateAsync({
      id: editItem.id,
      category: finalCategory || editItem.category,
      subcategory: subcategory || null,
      action_type: actionType,
      action_url: actionType === "link" ? actionUrl : null,
      expires_at: expiresAt || null,
    });
    toast.success("Lâmina atualizada");
    setEditItem(null);
    resetForm();
  };

  const openEditDialog = (item: ShowcaseItem) => {
    setEditItem(item);
    setCategory(SUGGESTED_CATEGORIES.includes(item.category) ? item.category : "__custom");
    setCustomCategory(SUGGESTED_CATEGORIES.includes(item.category) ? "" : item.category);
    setSubcategory(item.subcategory || "");
    setActionType(item.action_type);
    setActionUrl(item.action_url || "");
    setExpiresAt(item.expires_at ? item.expires_at.split("T")[0] : "");
  };

  const moveItem = async (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newItems.length) return;
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]];
    await reorderItems.mutateAsync(newItems.map(i => i.id));
  };

  const toggleFeatured = async (item: ShowcaseItem, labelValue?: string) => {
    if (item.is_featured) {
      await updateItem.mutateAsync({ id: item.id, is_featured: false, featured_label: null, featured_order: 0 });
      toast.success("Destaque removido");
    } else {
      if (featuredCount >= MAX_FEATURED) {
        toast.error(`Limite de ${MAX_FEATURED} destaques atingido.`);
        return;
      }
      const maxFeaturedOrder = Math.max(0, ...items.filter(i => i.is_featured).map(i => i.featured_order)) + 1;
      await updateItem.mutateAsync({
        id: item.id, is_featured: true, featured_label: labelValue || "oferta_especial", featured_order: maxFeaturedOrder,
      });
      toast.success("Oferta destacada!");
    }
  };

  const changeFeaturedLabel = async (item: ShowcaseItem, labelValue: string) => {
    await updateItem.mutateAsync({ id: item.id, featured_label: labelValue });
  };

  const getItemImageUrl = (item: ShowcaseItem): string | null => {
    if (item.image_url) return item.image_url;
    if (item.materials?.file_url) return item.materials.file_url;
    if (item.materials?.thumbnail_url) return item.materials.thumbnail_url;
    return null;
  };

  const handleSaveSettings = async () => {
    await updateShowcase.mutateAsync({
      tagline: tagline || null,
      showcase_mode: showcaseMode,
      auto_supplier_ids: selectedSupplierIds,
      max_auto_items: maxAutoItems,
      auto_categories: autoCategories,
    } as any);
    toast.success("Configurações salvas!");
    setSettingsOpen(false);
  };

  const openSettingsDialog = () => {
    setTagline(showcase?.tagline || "");
    setShowcaseMode(showcase?.showcase_mode || "manual");
    setSelectedSupplierIds(showcase?.auto_supplier_ids || []);
    setMaxAutoItems(showcase?.max_auto_items || 20);
    setAutoCategories(showcase?.auto_categories || []);
    setSettingsOpen(true);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Confira nossa vitrine de ofertas: ${publicUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (loadingShowcase) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </DashboardLayout>
    );
  }

  if (!showcase) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto space-y-6 p-4">
          <div className="text-center space-y-2">
            <Store className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Criar Vitrine de Ofertas</h1>
            <p className="text-muted-foreground">Crie sua vitrine de ofertas profissional.</p>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>URL da sua vitrine</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">vitrine.tur.br/</span>
                  <Input placeholder="minha-agencia" value={slug} onChange={e => setSlug(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Use letras minúsculas, números e hífens.</p>
              </div>
              <Button className="w-full" onClick={handleCreateShowcase} disabled={createShowcase.isPending}>
                {createShowcase.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Store className="h-4 w-4 mr-2" />}
                Criar Vitrine
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const featuredItems = items.filter(i => i.is_featured).sort((a, b) => a.featured_order - b.featured_order);
  const regularItems = items.filter(i => !i.is_featured);

  const renderItemRow = (item: ShowcaseItem, index: number) => {
    const imgUrl = getItemImageUrl(item);
    const label = getFeaturedLabel(item.featured_label);

    return (
      <Card key={item.id} className={`overflow-hidden ${item.is_featured ? "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
        <div className="flex items-center gap-3 p-3">
          <div className="flex flex-col gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(items.indexOf(item), "up")} disabled={items.indexOf(item) === 0}>
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(items.indexOf(item), "down")} disabled={items.indexOf(item) === items.length - 1}>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
          <div className="h-16 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0 relative">
            {imgUrl ? (
              <img src={imgUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
            )}
            {item.gallery_urls && item.gallery_urls.length > 1 && (
              <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] px-1 py-0.5 font-bold rounded-tl">
                {item.gallery_urls.length} fotos
              </span>
            )}
            {item.is_featured && label && (
              <span className="absolute top-0 left-0 bg-amber-500 text-white text-[8px] px-1 py-0.5 font-bold rounded-br">
                {label.emoji}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.is_featured && label && (
                <Badge className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-400/50 px-1.5 py-0">
                  {label.emoji} {label.text}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.category}</Badge>
              {item.subcategory && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.subcategory}</Badge>}
            </div>
            {item.materials?.title && <p className="text-xs text-muted-foreground mt-1 truncate">{item.materials.title}</p>}
            {item.expires_at && <p className="text-[10px] text-muted-foreground">Expira: {new Date(item.expires_at).toLocaleDateString("pt-BR")}</p>}
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            {item.is_featured ? (
              <div className="flex items-center gap-1">
                <Select value={item.featured_label || "oferta_especial"} onValueChange={v => changeFeaturedLabel(item, v)}>
                  <SelectTrigger className="h-7 text-[10px] w-24 px-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FEATURED_LABELS.map(l => (
                      <SelectItem key={l.value} value={l.value} className="text-xs">{l.emoji} {l.text}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500" onClick={() => toggleFeatured(item)}>
                  <Star className="h-3.5 w-3.5 fill-current" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-500" onClick={() => toggleFeatured(item)}>
                <Star className="h-3.5 w-3.5" />
              </Button>
            )}
            <div className="flex gap-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(item)}>
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem.mutate(item.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" /> Minha Vitrine de Ofertas
            </h1>
            <p className="text-sm text-muted-foreground">Gerencie a sua vitrine de ofertas profissional.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado!"); }}>
              <Copy className="h-4 w-4 mr-1" /> Copiar link
            </Button>
            <Button variant="outline" size="sm" onClick={shareWhatsApp}>
              <Share2 className="h-4 w-4 mr-1" /> WhatsApp
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/${showcase.slug}/ofertas`} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-1" /> Visualizar
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={openSettingsDialog}>
              <Settings className="h-4 w-4 mr-1" /> Configurações
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 flex items-center gap-2 flex-wrap">
          <ExternalLink className="h-4 w-4" />
          <span className="font-medium">{publicUrl}</span>
          {showcase.showcase_mode !== "manual" && (
            <Badge variant="secondary" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {showcase.showcase_mode === "auto" ? "Automática" : "Combinada"}
            </Badge>
          )}
        </div>

        {/* Add button */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Lâmina
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Lâmina à Vitrine</DialogTitle>
            </DialogHeader>
            <Tabs value={addTab} onValueChange={setAddTab}>
              <TabsList className="w-full">
                <TabsTrigger value="materials" className="flex-1"><ImageIcon className="h-4 w-4 mr-1" /> Materiais</TabsTrigger>
                <TabsTrigger value="upload" className="flex-1"><Upload className="h-4 w-4 mr-1" /> Upload</TabsTrigger>
              </TabsList>
              <TabsContent value="materials" className="space-y-4">
                {selectedMaterialIds.length > 0 && (
                  <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                    <span className="text-sm font-medium text-foreground">
                      {selectedMaterialIds.length} {selectedMaterialIds.length === 1 ? "lâmina selecionada" : "lâminas selecionadas"}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedMaterialIds([])}>Limpar seleção</Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Clique para selecionar. Selecione várias para criar um carrossel.</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                  {availableMaterials.map(m => {
                    const isSelected = selectedMaterialIds.includes(m.id);
                    const selectionIndex = selectedMaterialIds.indexOf(m.id);
                    return (
                      <button key={m.id} onClick={() => {
                        setSelectedMaterialIds(prev =>
                          isSelected ? prev.filter(id => id !== m.id) : [...prev, m.id]
                        );
                        setUploadFiles([]); setUploadPreviews([]);
                      }}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-[4/5] ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"}`}>
                        <img src={m.thumbnail_url || m.file_url || "/placeholder.svg"} alt={m.title} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute top-1 left-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                            {selectionIndex + 1}
                          </div>
                        )}
                        {!m.is_permanent && <Badge variant="secondary" className="absolute top-1 right-1 text-[10px] px-1 py-0">7d</Badge>}
                      </button>
                    );
                  })}
                  {availableMaterials.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground py-8">Nenhuma lâmina disponível</p>}
                </div>
              </TabsContent>
              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  {uploadPreviews.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {uploadPreviews.map((preview, i) => (
                          <div key={i} className="relative aspect-[4/5] rounded-lg overflow-hidden group/thumb">
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={(e) => { e.stopPropagation(); removeUploadFile(i); }}
                              className="absolute top-1 right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs opacity-0 group-hover/thumb:opacity-100 transition-opacity">×</button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{uploadPreviews.length} {uploadPreviews.length === 1 ? "imagem selecionada" : "imagens selecionadas"} • Clique para adicionar mais</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Clique para selecionar imagens</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — selecione várias para criar um carrossel</p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" multiple className="hidden" onChange={handleFileChange} />
                </div>
                <div>
                  <Label>Validade (opcional)</Label>
                  <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="mt-1" />
                </div>
              </TabsContent>
            </Tabs>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUGGESTED_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      <SelectItem value="__custom">Outra...</SelectItem>
                    </SelectContent>
                  </Select>
                  {category === "__custom" && <Input placeholder="Nome da categoria" value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="mt-2" />}
                </div>
                <div>
                  <Label>Subcategoria (opcional)</Label>
                  <Select value={subcategory || "__none"} onValueChange={v => setSubcategory(v === "__none" ? "" : v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Nenhuma</SelectItem>
                      {SUGGESTED_SUBCATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Ação ao clicar</Label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp"><span className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</span></SelectItem>
                    <SelectItem value="link"><span className="flex items-center gap-2"><ExternalLink className="h-3.5 w-3.5" /> Link personalizado</span></SelectItem>
                  </SelectContent>
                </Select>
                {actionType === "link" && <Input placeholder="https://..." value={actionUrl} onChange={e => setActionUrl(e.target.value)} className="mt-2" />}
              </div>
              <Button className="w-full" onClick={handleAddItem} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Adicionar à Vitrine
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Items List */}
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Sua vitrine está vazia</p>
              <p className="text-sm text-muted-foreground mt-1">Adicione lâminas dos materiais ou faça upload de imagens</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {featuredItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Destaques ({featuredItems.length}/{MAX_FEATURED})</h3>
                </div>
                <div className="space-y-2">
                  {featuredItems.map((item, i) => renderItemRow(item, i))}
                </div>
              </div>
            )}
            {regularItems.length > 0 && (
              <div>
                {featuredItems.length > 0 && <h3 className="text-sm font-medium text-muted-foreground mb-2">Demais ofertas</h3>}
                <div className="space-y-2">
                  {regularItems.map((item, i) => renderItemRow(item, i))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editItem} onOpenChange={open => { if (!open) { setEditItem(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Lâmina</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUGGESTED_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      <SelectItem value="__custom">Outra...</SelectItem>
                    </SelectContent>
                  </Select>
                  {category === "__custom" && <Input placeholder="Nome da categoria" value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="mt-2" />}
                </div>
                <div>
                  <Label>Subcategoria</Label>
                  <Input value={subcategory} onChange={e => setSubcategory(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Ação</Label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="link">Link personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {actionType === "link" && <Input placeholder="https://..." value={actionUrl} onChange={e => setActionUrl(e.target.value)} className="mt-2" />}
              </div>
              <div>
                <Label>Validade (opcional)</Label>
                <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="mt-1" />
              </div>
              <Button className="w-full" onClick={handleUpdateItem} disabled={updateItem.isPending}>Salvar Alterações</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Configurações da Vitrine</DialogTitle></DialogHeader>
            <div className="space-y-6">
              {/* Tagline */}
              <div>
                <Label>Mensagem da vitrine (opcional)</Label>
                <Textarea
                  placeholder="Ex: Ofertas selecionadas pela nossa equipe"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground mt-1">Exibida abaixo do logo na vitrine pública.</p>
              </div>

              {/* Mode */}
              <div className="space-y-3">
                <Label>Modo da Vitrine</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: "manual", label: "Manual", desc: "Você escolhe e adiciona cada oferta manualmente." },
                    { value: "auto", label: "Automática", desc: "Ofertas das operadoras selecionadas aparecem automaticamente." },
                    { value: "combinado", label: "Combinada", desc: "Suas ofertas fixas no topo + ofertas automáticas das operadoras." },
                  ].map(mode => (
                    <button
                      key={mode.value}
                      onClick={() => setShowcaseMode(mode.value)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                        showcaseMode === mode.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        showcaseMode === mode.value ? "border-primary bg-primary" : "border-muted-foreground/40"
                      }`}>
                        {showcaseMode === mode.value && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          {mode.value !== "manual" && <Zap className="h-3.5 w-3.5 text-amber-500" />}
                          {mode.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{mode.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto settings */}
              {(showcaseMode === "auto" || showcaseMode === "combinado") && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label>Operadoras para vitrine automática</Label>
                    <p className="text-xs text-muted-foreground mb-2">Selecione as operadoras cujas ofertas aparecerão automaticamente.</p>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {allSuppliers.map(s => {
                        const isSelected = selectedSupplierIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelectedSupplierIds(prev =>
                              isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id]
                            )}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-colors ${
                              isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                            }`}
                          >
                            {s.logo_url ? (
                              <img src={s.logo_url} alt="" className="h-6 w-6 rounded object-contain" />
                            ) : (
                              <div className="h-6 w-6 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{s.name[0]}</div>
                            )}
                            <span className="truncate flex-1">{s.name}</span>
                            {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    {selectedSupplierIds.length > 0 && (
                      <p className="text-xs text-primary mt-1">{selectedSupplierIds.length} operadora(s) selecionada(s)</p>
                    )}
                  </div>

                  <div>
                    <Label>Categorias desejadas (opcional)</Label>
                    <p className="text-xs text-muted-foreground mb-2">Deixe vazio para exibir todas.</p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_CATEGORIES.map(c => {
                        const isSelected = autoCategories.includes(c);
                        return (
                          <button
                            key={c}
                            onClick={() => setAutoCategories(prev =>
                              isSelected ? prev.filter(x => x !== c) : [...prev, c]
                            )}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label>Máximo de ofertas automáticas</Label>
                    <Input
                      type="number"
                      min={5}
                      max={50}
                      value={maxAutoItems}
                      onChange={e => setMaxAutoItems(Number(e.target.value) || 20)}
                      className="mt-1 w-24"
                    />
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={handleSaveSettings} disabled={updateShowcase.isPending}>
                {updateShowcase.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Configurações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
