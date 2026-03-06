import { useState } from "react";
import { PlusCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubmitRecommendation } from "@/hooks/useHotelRecommendations";
import { CATEGORY_OPTIONS, PROPERTY_TYPE_OPTIONS } from "@/hooks/useHotels";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestHotelDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState({
    name: "",
    destination: "",
    country: "",
    region: "",
    neighborhood: "",
    category: "",
    star_rating: "",
    property_type: "Hotel",
    reason: "",
  });
  const submit = useSubmitRecommendation();

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.destination.trim() || !form.reason.trim()) {
      toast.error("Preencha ao menos o nome, destino e motivo.");
      return;
    }
    const hotelData: Record<string, any> = {
      name: form.name.trim(),
      destination: form.destination.trim(),
      country: form.country.trim() || null,
      region: form.region.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
      category: form.category || null,
      star_rating: form.star_rating ? Number(form.star_rating) : null,
      property_type: form.property_type || "Hotel",
    };
    submit.mutate(
      { type: "suggest_new", reason: form.reason.trim(), hotelData },
      {
        onSuccess: () => {
          toast.success("Sugestão de hotel enviada para aprovação do administrador.");
          setForm({ name: "", destination: "", country: "", region: "", neighborhood: "", category: "", star_rating: "", property_type: "Hotel", reason: "" });
          onOpenChange(false);
        },
        onError: () => toast.error("Erro ao enviar sugestão."),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Sugerir novo hotel
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do hotel que deseja adicionar. Sua sugestão será analisada pelo administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome do hotel *</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Ex: Hotel Example" />
            </div>
            <div className="space-y-1.5">
              <Label>Destino *</Label>
              <Input value={form.destination} onChange={(e) => update("destination", e.target.value)} placeholder="Ex: New York" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>País</Label>
              <Input value={form.country} onChange={(e) => update("country", e.target.value)} placeholder="Ex: EUA" />
            </div>
            <div className="space-y-1.5">
              <Label>Região</Label>
              <Input value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="Ex: Manhattan" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bairro / Área</Label>
              <Input value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Estrelas</Label>
              <Select value={form.star_rating} onValueChange={(v) => update("star_rating", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((s) => <SelectItem key={s} value={String(s)}>{s} ⭐</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de propriedade</Label>
              <Select value={form.property_type} onValueChange={(v) => update("property_type", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Por que você recomenda este hotel? *</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              placeholder="Compartilhe sua experiência e motivos para adicionar este hotel..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submit.isPending}>
            {submit.isPending ? "Enviando..." : "Enviar sugestão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
