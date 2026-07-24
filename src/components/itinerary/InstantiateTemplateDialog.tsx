import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Loader2, CalendarDays, AlertTriangle } from "lucide-react";
import { ClientSelector } from "@/components/shared/ClientSelector";
import { TRIP_PROFILE_LABELS } from "@/types/itinerary";
import { useItineraryTemplates, type ItineraryTemplate } from "@/hooks/useItineraryTemplates";
import { toast } from "sonner";

const STYLE_LABELS = {
  economico: "Econômico",
  conforto: "Conforto",
  luxo: "Premium / Luxo",
} as const;
const PACE_LABELS = { leve: "Leve", moderado: "Moderado", intenso: "Intenso" } as const;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: ItineraryTemplate;
}

export function InstantiateTemplateDialog({ open, onOpenChange, template }: Props) {
  const navigate = useNavigate();
  const { instantiateFromTemplate } = useItineraryTemplates();
  const today = new Date();
  const defaultEnd = new Date();
  defaultEnd.setDate(today.getDate() + (template.nights_count || 7));

  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [startStr, setStartStr] = useState(today.toISOString().slice(0, 10));
  const [endStr, setEndStr] = useState(defaultEnd.toISOString().slice(0, 10));
  const [travelers, setTravelers] = useState(2);
  const normalizeStyle = (s: string) => (s === "moderado" ? "conforto" : s);
  const [style, setStyle] = useState<string>(normalizeStyle(template.style));
  const [profile, setProfile] = useState<string>(template.profile);

  useEffect(() => {
    if (open) {
      setStyle(normalizeStyle(template.style));
      setProfile(template.profile);
    }
  }, [open, template]);

  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  const nightsNew = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const mismatch = nightsNew !== template.nights_count;

  const handleCreate = async () => {
    if (!client) {
      toast.error("Selecione o cliente");
      return;
    }
    if (end <= start) {
      toast.error("Datas inválidas");
      return;
    }
    try {
      const res = await instantiateFromTemplate.mutateAsync({
        templateId: template.id,
        clientId: client.id,
        clientName: client.name,
        startDate: start,
        endDate: end,
        travelersCount: travelers,
        tripType: profile,
        budgetLevel: style,
      });
      toast.success("Roteiro criado a partir do modelo!");
      onOpenChange(false);
      navigate(`/ferramentas-ia/criar-roteiro/${res.itineraryId}`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar roteiro");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Criar roteiro a partir do modelo
          </DialogTitle>
          <DialogDescription>{template.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <ClientSelector value={client} onChange={setClient} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Início</Label>
              <Input type="date" value={startStr} onChange={(e) => setStartStr(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Volta</Label>
              <Input type="date" value={endStr} onChange={(e) => setEndStr(e.target.value)} />
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {nightsNew} noites • modelo original: {template.nights_count} noites
          </div>

          {mismatch && (
            <div className="rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 flex items-start gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                As atividades serão remapeadas proporcionalmente. Você poderá ajustar e usar a IA para refinar no editor.
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Viajantes</Label>
              <Input type="number" min={1} value={travelers}
                onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
            <div className="space-y-1.5">
              <Label>Estilo</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STYLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select value={profile} onValueChange={setProfile}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIP_PROFILE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!client || instantiateFromTemplate.isPending}>
            {instantiateFromTemplate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Criar roteiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}