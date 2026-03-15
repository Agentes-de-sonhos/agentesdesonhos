import { useState, useRef } from "react";
import { useGlobalPopups, GlobalPopup, GlobalPopupInsert } from "@/hooks/useGlobalPopups";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Eye, EyeOff, Upload, ExternalLink, Loader2 } from "lucide-react";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PopupFormData {
  title: string;
  description: string;
  image_url: string;
  button_text: string;
  button_link: string;
  has_button: boolean;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

const initialFormData: PopupFormData = {
  title: "",
  description: "",
  image_url: "",
  button_text: "",
  button_link: "",
  has_button: false,
  is_active: false,
  start_date: "",
  end_date: "",
};

export function AdminPopupsManager() {
  const { user } = useAuth();
  const { popups, isLoading, createPopup, updatePopup, deletePopup, toggleActive } = useGlobalPopups();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<GlobalPopup | null>(null);
  const [formData, setFormData] = useState<PopupFormData>(initialFormData);
  const [isUploading, setIsUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPopup, setPreviewPopup] = useState<GlobalPopup | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDialog = (popup?: GlobalPopup) => {
    if (popup) {
      setEditingPopup(popup);
      setFormData({
        title: popup.title,
        description: popup.description || "",
        image_url: popup.image_url || "",
        button_text: popup.button_text || "",
        button_link: popup.button_link || "",
        has_button: popup.has_button,
        is_active: popup.is_active,
        start_date: popup.start_date ? popup.start_date.split("T")[0] : "",
        end_date: popup.end_date ? popup.end_date.split("T")[0] : "",
      });
    } else {
      setEditingPopup(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPopup(null);
    setFormData(initialFormData);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `popups/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("popup-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("popup-images")
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, image_url: publicUrl }));
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const popupData: GlobalPopupInsert = {
      title: formData.title,
      description: formData.description || null,
      image_url: formData.image_url || null,
      button_text: formData.has_button ? formData.button_text || null : null,
      button_link: formData.has_button ? formData.button_link || null : null,
      has_button: formData.has_button,
      is_active: formData.is_active,
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      created_by: user?.id || null,
    };

    if (editingPopup) {
      await updatePopup.mutateAsync({ id: editingPopup.id, ...popupData });
    } else {
      await createPopup.mutateAsync(popupData);
    }

    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    await deletePopup.mutateAsync(id);
  };

  const handlePreview = (popup: GlobalPopup) => {
    setPreviewPopup(popup);
    setPreviewOpen(true);
  };

  const getStatusBadge = (popup: GlobalPopup) => {
    if (!popup.is_active) {
      return <Badge variant="secondary">Inativo</Badge>;
    }

    const now = new Date();
    const start = popup.start_date ? new Date(popup.start_date) : null;
    const end = popup.end_date ? new Date(popup.end_date) : null;

    if (start && start > now) {
      return <Badge variant="outline" className="border-amber-500 text-amber-500">Agendado</Badge>;
    }

    if (end && end < now) {
      return <Badge variant="secondary">Expirado</Badge>;
    }

    return <Badge className="bg-green-500">Ativo</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Comunicados & Pop-ups</CardTitle>
            <CardDescription>
              Gerencie pop-ups de comunicação exibidos para todos os usuários
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pop-up
          </Button>
        </CardHeader>
        <CardContent>
          {popups && popups.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Botão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {popups.map((popup) => (
                    <TableRow key={popup.id}>
                      <TableCell className="font-medium">{popup.title}</TableCell>
                      <TableCell>{getStatusBadge(popup)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {popup.start_date || popup.end_date ? (
                          <>
                            {popup.start_date && format(new Date(popup.start_date), "dd/MM/yy", { locale: ptBR })}
                            {popup.start_date && popup.end_date && " - "}
                            {popup.end_date && format(new Date(popup.end_date), "dd/MM/yy", { locale: ptBR })}
                          </>
                        ) : (
                          <span className="text-muted-foreground/50">Sem período</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {popup.has_button ? (
                          <Badge variant="outline">{popup.button_text}</Badge>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePreview(popup)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive.mutate({ id: popup.id, is_active: !popup.is_active })}
                          >
                            {popup.is_active ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(popup)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(popup.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum pop-up criado ainda.</p>
              <p className="text-sm">Clique em "Novo Pop-up" para criar o primeiro comunicado.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPopup ? "Editar Pop-up" : "Novo Pop-up"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Imagem / Banner</Label>
              <div className="flex items-start gap-4">
                {formData.image_url ? (
                  <div className="relative w-48 h-32 rounded-lg overflow-hidden border">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-48 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                  >
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Upload imagem</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Nova aula ao vivo disponível!"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Texto descritivo do comunicado..."
                rows={4}
              />
            </div>

            {/* Button Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Botão de Ação</Label>
                <p className="text-sm text-muted-foreground">
                  Adicionar botão clicável ao pop-up
                </p>
              </div>
              <Switch
                checked={formData.has_button}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, has_button: checked }))}
              />
            </div>

            {/* Button Fields */}
            {formData.has_button && (
              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="button_text">Texto do Botão</Label>
                  <Input
                    id="button_text"
                    value={formData.button_text}
                    onChange={(e) => setFormData((prev) => ({ ...prev, button_text: e.target.value }))}
                    placeholder="Ex: Assistir Agora"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="button_link">Link de Destino</Label>
                  <Input
                    id="button_link"
                    value={formData.button_link}
                    onChange={(e) => setFormData((prev) => ({ ...prev, button_link: e.target.value }))}
                    placeholder="Ex: /academy ou https://..."
                  />
                </div>
              </div>
            )}

            {/* Period */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data Início (opcional)</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Data Fim (opcional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
              <div className="space-y-0.5">
                <Label>Ativar Pop-up</Label>
                <p className="text-sm text-muted-foreground">
                  Pop-up será exibido para todos os usuários
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createPopup.isPending || updatePopup.isPending}
              >
                {(createPopup.isPending || updatePopup.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingPopup ? "Salvar Alterações" : "Criar Pop-up"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {previewPopup && (
            <div className="relative">
              {previewPopup.image_url && (
                <div className="w-full aspect-video">
                  <img
                    src={previewPopup.image_url}
                    alt={previewPopup.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-semibold">{previewPopup.title}</h3>
                {previewPopup.description && (
                  <p className="text-muted-foreground">{previewPopup.description}</p>
                )}
                {previewPopup.has_button && previewPopup.button_text && (
                  <Button className="w-full" size="lg">
                    {previewPopup.button_text}
                    {previewPopup.button_link && <ExternalLink className="h-4 w-4 ml-2" />}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
