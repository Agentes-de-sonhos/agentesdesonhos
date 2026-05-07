import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { TripData, ConnectionStop } from "@/types/travelRequirements";
import { cn } from "@/lib/utils";

interface Props {
  data: TripData;
  onChange: (data: TripData) => void;
}

export function TripStep({ data, onChange }: Props) {
  const set = <K extends keyof TripData>(k: K, v: TripData[K]) => onChange({ ...data, [k]: v });

  const addConnection = () => {
    const next: ConnectionStop = { country: "", airport: "", duration: "" };
    set("connections", [...data.connections, next]);
  };
  const updateConnection = (i: number, patch: Partial<ConnectionStop>) => {
    const next = data.connections.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    set("connections", next);
  };
  const removeConnection = (i: number) => {
    set("connections", data.connections.filter((_, idx) => idx !== i));
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>País de destino *</Label>
            <Input value={data.destination_country} onChange={(e) => set("destination_country", e.target.value)} placeholder="Ex: Estados Unidos" />
          </div>
          <div className="space-y-2">
            <Label>Cidade de destino *</Label>
            <Input value={data.destination_city} onChange={(e) => set("destination_city", e.target.value)} placeholder="Ex: Nova York" />
          </div>
          <div className="space-y-2">
            <Label>Data de ida *</Label>
            <Input type="date" value={data.departure_date} onChange={(e) => set("departure_date", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Data de retorno</Label>
            <Input type="date" value={data.return_date} onChange={(e) => set("return_date", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Companhia aérea</Label>
            <Input value={data.airline} onChange={(e) => set("airline", e.target.value)} placeholder="Ex: LATAM" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de viagem *</Label>
            <Select value={data.trip_type} onValueChange={(v) => set("trip_type", v as TripData["trip_type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="turismo">Turismo</SelectItem>
                <SelectItem value="negocios">Negócios</SelectItem>
                <SelectItem value="estudo">Estudo</SelectItem>
                <SelectItem value="transito">Trânsito</SelectItem>
                <SelectItem value="intercambio">Intercâmbio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-border/50 mt-4">
          <Checkbox
            checked={data.has_international_connection}
            onCheckedChange={(v) => {
              const checked = !!v;
              onChange({
                ...data,
                has_international_connection: checked,
                connections: checked && data.connections.length === 0
                  ? [{ country: "", airport: "", duration: "" }]
                  : data.connections,
              });
            }}
          />
          <span className="text-sm font-medium">Possui conexão internacional</span>
        </label>

        {data.has_international_connection && (
          <div className="space-y-3">
            {data.connections.map((c, i) => (
              <ConnectionItem
                key={i}
                index={i}
                value={c}
                onChange={(patch) => updateConnection(i, patch)}
                onRemove={() => removeConnection(i)}
              />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addConnection} className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar conexão
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectionItem({
  index, value, onChange, onRemove,
}: {
  index: number;
  value: ConnectionStop;
  onChange: (patch: Partial<ConnectionStop>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const summary = value.country ? `${value.country}${value.airport ? ` • ${value.airport}` : ""}` : `Conexão ${index + 1}`;
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center bg-muted/30">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex-1 flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50">
          <span className="text-sm font-medium">{summary}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
        <button type="button" onClick={onRemove} className="px-3 py-2 text-muted-foreground hover:text-destructive" aria-label="Remover">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="grid sm:grid-cols-3 gap-3 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">País</Label>
            <Input value={value.country} onChange={(e) => onChange({ country: e.target.value })} placeholder="Ex: EUA" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Aeroporto</Label>
            <Input value={value.airport} onChange={(e) => onChange({ airport: e.target.value })} placeholder="Ex: MIA" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tempo de conexão</Label>
            <Input value={value.duration} onChange={(e) => onChange({ duration: e.target.value })} placeholder="Ex: 3h45" />
          </div>
        </div>
      )}
    </div>
  );
}