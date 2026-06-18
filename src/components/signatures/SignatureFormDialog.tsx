import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { CommercialSignature } from "@/types/signature";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: CommercialSignature | null;
  onSubmit: (payload: Partial<CommercialSignature>) => Promise<unknown> | void;
}

const empty = {
  name: "",
  title: "",
  phone: "",
  whatsapp: "",
  email: "",
  photo_url: "",
  custom_message: "",
  display_order: 0,
  is_active: true,
  is_default: false,
};

export function SignatureFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...empty, ...initial } : empty);
    }
  }, [open, initial]);

  const handleUpload = async (file: File) => {
    if (!user?.id) return;
    try {
      setUploading(true);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/signatures/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media-files").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("media-files").getPublicUrl(path);
      setForm((f: any) => ({ ...f, photo_url: data.publicUrl }));
      toast.success("Foto enviada");
    } catch (e: any) {
      toast.error(e?.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.error("Informe o nome");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        title: form.title?.trim() || null,
        phone: form.phone?.trim() || null,
        whatsapp: form.whatsapp?.trim() || null,
        email: form.email?.trim() || null,
        photo_url: form.photo_url?.trim() || null,
        custom_message: form.custom_message?.trim() || null,
        display_order: Number(form.display_order) || 0,
        is_active: !!form.is_active,
        is_default: !!form.is_default,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar assinatura" : "Nova assinatura"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-muted overflow-hidden flex items-center justify-center text-muted-foreground text-2xl font-bold shrink-0">
              {form.photo_url ? <img src={form.photo_url} alt="Foto" className="h-full w-full object-cover" /> : (form.name?.charAt(0) || "?").toUpperCase()}
            </div>
            <div className="flex-1 space-y-2">
              <Label>Foto</Label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="URL da foto"
                  value={form.photo_url || ""}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                />
                <label className="cursor-pointer inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-muted shrink-0">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="sig-name">Nome *</Label>
              <Input id="sig-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="sig-title">Cargo</Label>
              <Input id="sig-title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Consultora de Viagens" />
            </div>
            <div>
              <Label htmlFor="sig-whatsapp">WhatsApp</Label>
              <Input id="sig-whatsapp" value={form.whatsapp || ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label htmlFor="sig-phone">Telefone</Label>
              <Input id="sig-phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="sig-email">E-mail</Label>
              <Input id="sig-email" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="sig-msg">Mensagem personalizada</Label>
              <Textarea id="sig-msg" rows={3} value={form.custom_message || ""} onChange={(e) => setForm({ ...form, custom_message: e.target.value })} placeholder="Estou à disposição para ajudar..." />
            </div>
            <div>
              <Label htmlFor="sig-order">Ordem</Label>
              <Input id="sig-order" type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label className="text-sm">Ativa</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
                <Label className="text-sm">Padrão</Label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}