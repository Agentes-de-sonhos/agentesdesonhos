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
import { useShowcase, type ShowcaseItem } from "@/hooks/useShowcase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Plus, Trash2, ExternalLink, GripVertical, Image as ImageIcon,
  Upload, Link2, MessageCircle, Loader2, Store, Copy, Eye
} from "lucide-react";

const SUGGESTED_CATEGORIES = ["Cruzeiros", "Bloqueios Aéreos", "Pacotes", "Temporadas", "Promoções", "Geral"];
const SUGGESTED_SUBCATEGORIES = ["Réveillon", "MSC", "Costa Cruzeiros", "Férias de Julho", "Disney", "Europa"];

export default function MinhaVitrine() {
  const { user } = useAuth();
  const {
    showcase, items, availableMaterials, loadingShowcase,
    createShowcase, addItem, updateItem, removeItem, reorderItems, uploadImage,
  } = useShowcase();

  const [slug, setSlug] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ShowcaseItem | null>(null);
  const [addTab, setAddTab] = useState("materials");
  
  // Add form state
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [category, setCategory] = useState("Geral");
  const [customCategory, setCustomCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [actionType, setActionType] = useState("whatsapp");
  const [actionUrl, setActionUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const publicUrl = showcase ? `${window.location.origin}/${showcase.slug}` : "";

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
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato não suportado. Use JPG, PNG, WEBP, GIF ou BMP.");
      return;
    }
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setSelectedMaterialId(null);
  };

  const resetForm = () => {
    setSelectedMaterialId(null);
    setUploadFile(null);
    setUploadPreview(null);
    setCategory("Geral");
    setCustomCategory("");
    setSubcategory("");
    setActionType("whatsapp");
    setActionUrl("");
    setExpiresAt("");
  };

  const handleAddItem = async () => {
    if (!selectedMaterialId && !uploadFile) {
      toast.error("Selecione uma lâmina ou faça upload de uma imagem");
      return;
    }
    setIsSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (uploadFile) {
        imageUrl = await uploadImage(uploadFile);
      }
      const finalCategory = category === "__custom" ? customCategory : category;
      await addItem.mutateAsync({
        material_id: selectedMaterialId || undefined,
        image_url: imageUrl,
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

  const getItemImageUrl = (item: ShowcaseItem): string | null => {
    if (item.image_url) return item.image_url;
    if (item.materials?.file_url) return item.materials.file_url;
    if (item.materials?.thumbnail_url) return item.materials.thumbnail_url;
    return null;
  };

  if (loadingShowcase) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </DashboardLayout>
    );
  }

  // Setup screen if no showcase exists
  if (!showcase) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-12">
          <Card>
            <CardHeader className="text-center">
              <Store className="h-12 w-12 mx-auto text-primary mb-2" />
              <CardTitle className="text-xl">Criar Vitrine da Agência</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Sua vitrine será acessível publicamente em uma URL personalizada.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Slug da vitrine (URL)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{window.location.origin}/</span>
                  <Input
                    placeholder="minha-agencia"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use letras minúsculas, números e hífens. Ex: viagens-dos-sonhos
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleCreateShowcase}
                disabled={createShowcase.isPending}
              >
                {createShowcase.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Store className="h-4 w-4 mr-2" />}
                Criar Vitrine
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Minha Vitrine" subtitle="Gerencie suas ofertas na vitrine pública">
      {/* URL + Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 flex-1 min-w-0">
          <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate">{publicUrl}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado!"); }}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`/${showcase.slug}`} target="_blank" rel="noopener noreferrer">
            <Eye className="h-4 w-4 mr-1" /> Visualizar
          </a>
        </Button>
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
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                  {availableMaterials.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedMaterialId(m.id); setUploadFile(null); setUploadPreview(null); }}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-[4/5] ${selectedMaterialId === m.id ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"}`}
                    >
                      <img
                        src={m.thumbnail_url || m.file_url || "/placeholder.svg"}
                        alt={m.title}
                        className="w-full h-full object-cover"
                      />
                      {!m.is_permanent && <Badge variant="secondary" className="absolute top-1 right-1 text-[10px] px-1 py-0">7d</Badge>}
                    </button>
                  ))}
                  {availableMaterials.length === 0 && (
                    <p className="col-span-full text-center text-sm text-muted-foreground py-8">Nenhuma lâmina disponível</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadPreview ? (
                    <img src={uploadPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                  ) : (
                    <>
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Clique para selecionar ou arraste uma imagem</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                <div>
                  <Label>Validade (opcional)</Label>
                  <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">Deixe em branco para manter ativa até remover manualmente</p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Common fields */}
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
                  {category === "__custom" && (
                    <Input placeholder="Nome da categoria" value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="mt-2" />
                  )}
                </div>
                <div>
                  <Label>Subcategoria (opcional)</Label>
                  <Input
                    placeholder="Ex: MSC, Disney..."
                    value={subcategory}
                    onChange={e => setSubcategory(e.target.value)}
                    className="mt-1"
                    list="subcategory-suggestions"
                  />
                  <datalist id="subcategory-suggestions">
                    {SUGGESTED_SUBCATEGORIES.map(s => <option key={s} value={s} />)}
                  </datalist>
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
                {actionType === "link" && (
                  <Input placeholder="https://..." value={actionUrl} onChange={e => setActionUrl(e.target.value)} className="mt-2" />
                )}
              </div>
              <Button className="w-full" onClick={handleAddItem} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Adicionar à Vitrine
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Sua vitrine está vazia</p>
            <p className="text-sm text-muted-foreground mt-1">Adicione lâminas dos materiais de divulgação ou faça upload de imagens</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => {
            const imgUrl = getItemImageUrl(item);
            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(index, "up")} disabled={index === 0}>
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(index, "down")} disabled={index === items.length - 1}>
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </Button>
                  </div>
                  <div className="h-16 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {imgUrl ? (
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      {item.subcategory && <Badge variant="secondary" className="text-xs">{item.subcategory}</Badge>}
                      <Badge variant={item.action_type === "whatsapp" ? "default" : "secondary"} className="text-xs">
                        {item.action_type === "whatsapp" ? "WhatsApp" : "Link"}
                      </Badge>
                    </div>
                    {item.materials?.title && <p className="text-xs text-muted-foreground mt-1 truncate">{item.materials.title}</p>}
                    {item.expires_at && <p className="text-xs text-muted-foreground">Expira: {new Date(item.expires_at).toLocaleDateString("pt-BR")}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem.mutate(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={open => { if (!open) { setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Lâmina</DialogTitle>
          </DialogHeader>
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
                {category === "__custom" && (
                  <Input placeholder="Nome da categoria" value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="mt-2" />
                )}
              </div>
              <div>
                <Label>Subcategoria</Label>
                <Input value={subcategory} onChange={e => setSubcategory(e.target.value)} className="mt-1" list="subcategory-suggestions-edit" />
                <datalist id="subcategory-suggestions-edit">
                  {SUGGESTED_SUBCATEGORIES.map(s => <option key={s} value={s} />)}
                </datalist>
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
              {actionType === "link" && (
                <Input placeholder="https://..." value={actionUrl} onChange={e => setActionUrl(e.target.value)} className="mt-2" />
              )}
            </div>
            <div>
              <Label>Validade (opcional)</Label>
              <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="mt-1" />
            </div>
            <Button className="w-full" onClick={handleUpdateItem} disabled={updateItem.isPending}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
