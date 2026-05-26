import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, X, Plus, Loader2, Star } from "lucide-react";
import { TRIP_PROFILE_LABELS } from "@/types/itinerary";
import type { Itinerary, ItineraryDay } from "@/types/itinerary";
import { useItineraryTemplates, type CreateTemplatePayload } from "@/hooks/useItineraryTemplates";
import { parseLocalDate } from "@/lib/dateParsing";

const STYLE_LABELS = {
  economico: "Econômico",
  moderado: "Moderado",
  luxo: "Premium / Luxo",
} as const;

const PROFILE_KEYS = Object.keys(TRIP_PROFILE_LABELS) as Array<keyof typeof TRIP_PROFILE_LABELS>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itinerary: Itinerary;
}

export function SaveAsTemplateDialog({ open, onOpenChange, itinerary }: Props) {
  const { createTemplate } = useItineraryTemplates();

  const suggested = useMemo(() => {
    const nights = Math.max(
      1,
      Math.round(
        (parseLocalDate(itinerary.endDate).getTime() - parseLocalDate(itinerary.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    const style =
      itinerary.budgetLevel === "luxo"
        ? "luxo"
        : itinerary.budgetLevel === "economico"
          ? "economico"
          : "moderado";
    const profile = (PROFILE_KEYS as string[]).includes(itinerary.tripType) ? itinerary.tripType : "casal";
    return { nights, style: style as keyof typeof STYLE_LABELS, profile };
  }, [itinerary]);

  const [name, setName] = useState(itinerary.destination ? `${itinerary.destination}` : "");
  const [nights, setNights] = useState<number>(suggested.nights);
  const [style, setStyle] = useState<keyof typeof STYLE_LABELS>(suggested.style);
  const [profile, setProfile] = useState<string>(suggested.profile);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const profileLabel = TRIP_PROFILE_LABELS[suggested.profile as keyof typeof TRIP_PROFILE_LABELS] ?? "Casal";
  const styleLabel = STYLE_LABELS[suggested.style];

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    // Flatten activities, stripping dates and client-specific data
    const activities: CreateTemplatePayload["activities"] = [];
    (itinerary.days ?? []).forEach((day) => {
      day.activities.forEach((act, idx) => {
        activities.push({
          day_number: day.dayNumber,
          period: act.period,
          order_index: act.orderIndex ?? idx,
          title: act.title,
          description: act.description,
          location: act.location,
          estimated_duration: act.estimatedDuration,
          estimated_cost: act.estimatedCost,
          photo_url: act.photoUrl ?? null,
          category: null,
          priority: "essencial",
        });
      });
    });

    await createTemplate.mutateAsync({
      name: name.trim(),
      destination: itinerary.destination,
      cover_image_url: itinerary.coverImageUrl ?? null,
      nights_count: nights,
      style,
      profile,
      tags,
      destination_intro_text: itinerary.destinationIntroText ?? null,
      destination_intro_images: itinerary.destinationIntroImages ?? [],
      source_itinerary_id: itinerary.id,
      activities,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary fill-primary" />
            Salvar como modelo
          </DialogTitle>
          <DialogDescription>
            Reutilize a estrutura deste roteiro para criar novos roteiros mais rapidamente.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-primary/5 px-3 py-2.5 flex items-start gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="text-muted-foreground">Detectamos: </span>
            <span className="font-medium">
              {styleLabel} • {profileLabel} • {suggested.nights} noites
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => {
              setNights(suggested.nights);
              setStyle(suggested.style);
              setProfile(suggested.profile);
            }}
          >
            Usar
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do modelo *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Europa Premium, Orlando Família..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Número de noites</Label>
              <Input
                type="number"
                min={1}
                value={nights}
                onChange={(e) => setNights(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estilo</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STYLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Perfil principal</Label>
            <Select value={profile} onValueChange={setProfile}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROFILE_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>{TRIP_PROFILE_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tags (opcional)</Label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tags.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                  {t}
                  <button onClick={() => setTags(tags.filter((_, j) => j !== i))} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="gastronomia, luxo, família..."
              />
              <Button type="button" size="icon" variant="outline" onClick={addTag}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim() || createTemplate.isPending}>
            {createTemplate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
            Salvar modelo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}