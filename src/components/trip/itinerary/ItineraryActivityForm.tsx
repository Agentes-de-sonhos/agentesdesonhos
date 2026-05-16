import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, X, Loader2, Link2, Paperclip, MapPin, Search, Sparkles } from "lucide-react";
import type { TripService, TripServiceType } from "@/types/trip";
import type { ItineraryActivity } from "@/hooks/useItineraryActivities";
import { useResolvedVoucherUrl } from "@/lib/itineraryAssetUrl";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import type { PlaceDetails, PlacePrediction } from "@/hooks/usePlacesAutocomplete";

function ExistingPhoto({ path }: { path: string }) {
  const url = useResolvedVoucherUrl(path);
  if (!url) return <div className="w-16 h-16 rounded border bg-muted animate-pulse" />;
  return <img src={url} alt="" className="w-16 h-16 rounded object-cover border" />;
}

const SERVICE_ICONS: Record<TripServiceType, string> = {
  flight: "✈️", hotel: "🏨", car_rental: "🚗", transfer: "🚐",
  attraction: "🎫", insurance: "🛡️", cruise: "🚢", train: "🚂", other: "📋",
};

const SERVICE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagem Aérea", hotel: "Hospedagem", car_rental: "Locação de Veículo",
  transfer: "Transfer", attraction: "Ingressos/Atrações", insurance: "Seguro Viagem",
  cruise: "Cruzeiro", train: "Trem", other: "Outros",
};

interface Props {
  tripServices: TripService[];
  onSubmit: (data: {
    title: string;
    description?: string;
    start_time?: string;
    location?: string;
    notes?: string;
    linked_service_id?: string | null;
    photo_urls?: string[];
    document_urls?: string[];
    maps_url?: string | null;
  }, files?: File[], docFiles?: File[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  defaultValues?: Partial<ItineraryActivity>;
}

function getServiceLabel(service: TripService): string {
  const data = service.service_data as any;
  switch (service.service_type) {
    case "flight": return `${data.origin_city || ""} → ${data.destination_city || ""}`;
    case "hotel": return data.hotel_name || "Hotel";
    case "transfer": return `${data.origin_location || ""} → ${data.destination_location || ""}`;
    case "car_rental": return data.rental_company || "Locação";
    case "attraction": return data.name || "Atração";
    case "insurance": return data.provider || "Seguro";
    case "cruise": return data.ship_name || "Cruzeiro";
    case "train": return `${data.origin_city || ""} → ${data.destination_city || ""}`;
    default: return data.service_name || "Serviço";
  }
}

export function ItineraryActivityForm({ tripServices, onSubmit, onCancel, isLoading, defaultValues }: Props) {
  const [title, setTitle] = useState(defaultValues?.title || "");
  const [description, setDescription] = useState(defaultValues?.description || "");
  const [startTime, setStartTime] = useState(defaultValues?.start_time || "");
  const [location, setLocation] = useState(defaultValues?.location || "");
  const [notes, setNotes] = useState(defaultValues?.notes || "");
  const [mapsUrl, setMapsUrl] = useState(defaultValues?.maps_url || "");
  const [linkedServiceId, setLinkedServiceId] = useState<string | null>(defaultValues?.linked_service_id || null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedDocFiles, setSelectedDocFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(defaultValues?.photo_urls || []);
  const [existingDocs] = useState<string[]>(defaultValues?.document_urls || []);
  const [placeQuery, setPlaceQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const buildDescription = (pred: PlacePrediction, d?: PlaceDetails): string => {
    const raw = (d as any)?.raw_data || {};
    const types: string[] = raw.types || pred.types || [];
    const editorial: string | null = raw.editorial_summary || null;
    if (editorial) return editorial;

    const TYPE_LABELS: Record<string, string> = {
      restaurant: "Restaurante",
      cafe: "Café",
      bar: "Bar",
      bakery: "Padaria",
      lodging: "Hospedagem",
      tourist_attraction: "Atração turística",
      museum: "Museu",
      art_gallery: "Galeria de arte",
      park: "Parque",
      church: "Igreja",
      shopping_mall: "Shopping",
      store: "Loja",
      night_club: "Casa noturna",
      amusement_park: "Parque de diversões",
      zoo: "Zoológico",
      aquarium: "Aquário",
      stadium: "Estádio",
      spa: "Spa",
    };
    const friendly = types.map((t) => TYPE_LABELS[t]).filter(Boolean)[0] || "Ponto de interesse";
    const parts: string[] = [`${friendly} em ${pred.secondary || d?.address || ""}`.trim()];
    if (raw.rating) {
      parts.push(`Avaliação ${raw.rating}/5${raw.user_ratings_total ? ` (${raw.user_ratings_total} avaliações)` : ""}.`);
    }
    return parts.filter(Boolean).join(". ").replace(/\.\.+/g, ".");
  };

  const priceLevelToText = (lvl: number | null | undefined): string => {
    if (lvl == null) return "";
    return ["Gratuito", "Econômico ($)", "Moderado ($$)", "Caro ($$$)", "Premium ($$$$)"][lvl] || "";
  };

  const handlePlaceSelect = (pred: PlacePrediction, details?: PlaceDetails) => {
    // Only fill empty fields to avoid overwriting user edits
    if (!title.trim()) setTitle(pred.name);
    if (!location.trim()) setLocation(details?.address || pred.secondary || pred.name);
    if (!description.trim()) setDescription(buildDescription(pred, details));
    const raw: any = (details as any)?.raw_data || {};
    if (!mapsUrl.trim()) {
      setMapsUrl(raw.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pred.name + " " + (pred.secondary || ""))}&query_place_id=${pred.place_id}`);
    }
    if (!notes.trim()) {
      const price = priceLevelToText(raw.price_level);
      if (price) setNotes(`Faixa de preço: ${price}`);
    }
    if (details?.photo_url && existingPhotos.length === 0) {
      setExistingPhotos([details.photo_url]);
    }
    setPlaceQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      start_time: startTime || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      linked_service_id: linkedServiceId,
      photo_urls: existingPhotos,
      document_urls: existingDocs,
      maps_url: mapsUrl.trim() || null,
    }, selectedFiles, selectedDocFiles);
  };

  const getDocFileName = (url: string) => {
    try {
      const parts = url.split("/");
      const fullName = decodeURIComponent(parts[parts.length - 1]);
      // Remove timestamp prefix
      return fullName.replace(/^\d+_/, "");
    } catch {
      return "documento";
    }
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp)$/i.test(url);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Google Places search */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5 text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Buscar local no Google Places (opcional)
        </Label>
        <PlacesAutocomplete
          value={placeQuery}
          onChange={setPlaceQuery}
          onPlaceSelect={handlePlaceSelect}
          placeType="general"
          placeholder="Ex: Jardim Japonês Buenos Aires, MASP, Cristo Redentor..."
          className="h-9 bg-background"
        />
        <p className="text-[10px] text-muted-foreground">
          Selecione um local para preencher automaticamente título, descrição, endereço e foto. Tudo permanece editável.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <div>
          <Label className="text-xs">Título *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Chegada ao aeroporto" className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Horário</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 w-28" />
        </div>
      </div>

      <div>
        <Label className="text-xs">Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes da atividade..." rows={2} />
      </div>

      <div>
        <Label className="text-xs">Local</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Nome ou endereço do local" className="h-9" />
      </div>

      {/* Google Maps URL */}
      <div>
        <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Localização (Google Maps)</Label>
        <Input
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
          placeholder="Cole o link do Google Maps ou digite o endereço"
          className="h-9"
        />
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Cole um link do Google Maps (ex: https://maps.google.com/...) ou digite o endereço completo
        </p>
      </div>

      <div>
        <Label className="text-xs">Observações</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dicas ou observações" className="h-9" />
      </div>

      {/* Link service */}
      {tripServices.length > 0 && (
        <div>
          <Label className="text-xs flex items-center gap-1"><Link2 className="h-3 w-3" /> Vincular Serviço</Label>
          <Select value={linkedServiceId || "none"} onValueChange={(v) => setLinkedServiceId(v === "none" ? null : v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Nenhum serviço vinculado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {tripServices.map((svc) => (
                <SelectItem key={svc.id} value={svc.id}>
                  {SERVICE_ICONS[svc.service_type]} {SERVICE_LABELS[svc.service_type]} — {getServiceLabel(svc)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Photos */}
      <div>
        <Label className="text-xs flex items-center gap-1"><Camera className="h-3 w-3" /> Fotos</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {existingPhotos.map((url, i) => (
            <ExistingPhoto key={i} path={url} />
          ))}
          {selectedFiles.map((f, i) => (
            <div key={i} className="relative w-16 h-16">
              <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 rounded object-cover border" />
              <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-16 h-16 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors">
            <Camera className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
      </div>

      {/* Documents / Vouchers */}
      <div>
        <Label className="text-xs flex items-center gap-1"><Paperclip className="h-3 w-3" /> Documentos / Vouchers</Label>
        <div className="flex flex-col gap-1.5 mt-1">
          {existingDocs.map((url, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
              {isImageUrl(url) ? "🖼️" : "📄"} 
              <span className="truncate flex-1">{getDocFileName(url)}</span>
            </div>
          ))}
          {selectedDocFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
              {f.type.startsWith("image/") ? "🖼️" : "📄"} 
              <span className="truncate flex-1">{f.name}</span>
              <button type="button" onClick={() => setSelectedDocFiles(prev => prev.filter((_, j) => j !== i))}
                className="text-destructive hover:text-destructive/80">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-1.5 h-7 text-xs" onClick={() => docRef.current?.click()}>
          <Paperclip className="mr-1 h-3 w-3" /> Anexar arquivo
        </Button>
        <input ref={docRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
            if (validFiles.length < files.length) {
              alert("Alguns arquivos excedem o limite de 10MB e foram ignorados.");
            }
            setSelectedDocFiles(prev => [...prev, ...validFiles]);
            if (docRef.current) docRef.current.value = "";
          }} />
        <p className="text-[10px] text-muted-foreground mt-0.5">PDF, JPG ou PNG • Máx. 10MB por arquivo</p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" disabled={isLoading || !title.trim()}>
          {isLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
          {defaultValues ? "Salvar" : "Adicionar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}
