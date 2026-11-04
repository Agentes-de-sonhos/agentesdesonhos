import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOffers, type OfferRow } from "@/hooks/useOffers";
import { OfferChannelPicker } from "@/components/offers/OfferChannelPicker";
import { CAMPAIGN_CATEGORY_OPTIONS, isValidOfferCtaUrl } from "@/lib/imageOffers";

/** Cadastro rápido de oferta por imagem (flyer pronto) + link opcional. */
export function ImageOfferDialog({ open, onOpenChange, offer }: { open: boolean; onOpenChange: (v: boolean) => void; offer?: OfferRow | null }) {
  const { save } = useOffers(false);
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState("");
  const [cta, setCta] = useState("");
  const [cat, setCat] = useState("todos");
  const [channels, setChannels] = useState<string[]>(["novembro"]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(offer?.title ?? "");
    setCover(offer?.cover_url ?? "");
    setCta(offer?.cta_url ?? "");
    setCat(offer?.campaign_category ?? "todos");
    setChannels(offer?.display_channels?.length ? offer.display_channels : ["novembro"]);
  }, [open, offer]);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Envie um arquivo de imagem.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Imagem muito grande (máximo 8 MB).");
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Faça login novamente.");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${auth.user.id}/offers/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("quote-images").upload(path, file, { contentType: file.type });
      if (error) throw new Error("Não foi possível enviar a imagem.");
      setCover(supabase.storage.from("quote-images").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!cover) return toast.error("Envie a imagem da oferta.");
    if (!title.trim()) return toast.error("Informe um nome para a oferta.");
    const link = cta.trim();
    if (link && !isValidOfferCtaUrl(link)) return toast.error("O link precisa começar com https://");
    const values: Partial<OfferRow> = {
      title: title.trim(),
      cover_url: cover,
      cta_url: link || null,
      campaign_category: cat === "todos" ? null : cat,
      display_channels: channels,
      image_only: true,
    };
    if (!offer) Object.assign(values, { origin: "manual", status: "draft", price_mode: "on_request", category: "Pacotes" });
    try {
      await save.mutateAsync({ id: offer?.id, values });
      toast.success(offer ? "Oferta atualizada." : "Oferta salva como rascunho. Publique quando quiser.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{offer ? "Editar oferta por imagem" : "Nova oferta por imagem"}</DialogTitle>
          <DialogDescription>Envie a arte pronta. Com link, o cliente escolhe entre comprar online ou falar no WhatsApp; sem link, vai direto para o WhatsApp.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Imagem da oferta</Label>
            {cover && <img src={cover} alt="" className="w-full rounded-lg border border-border object-contain" />}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground hover:bg-muted/50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {cover ? "Trocar imagem" : "Escolher imagem"}
              <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Nome da oferta (aparece na mensagem do WhatsApp)</Label>
            <Input value={title} maxLength={160} placeholder="Ex.: Punta Cana All Inclusive" onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Link de compra online (opcional)</Label>
            <Input value={cta} placeholder="https://…" onChange={(e) => setCta(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de viagem (filtro da página)</Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os filtros</SelectItem>
                {CAMPAIGN_CATEGORY_OPTIONS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Onde exibir no site</Label>
            <OfferChannelPicker value={channels} onChange={setChannels} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={save.isPending || uploading}>{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
