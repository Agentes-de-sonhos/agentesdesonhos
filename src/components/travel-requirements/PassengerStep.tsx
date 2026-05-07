import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import type { PassengerData } from "@/types/travelRequirements";

interface Props {
  data: PassengerData;
  onChange: (data: PassengerData) => void;
}

export function PassengerStep({ data, onChange }: Props) {
  const set = <K extends keyof PassengerData>(k: K, v: PassengerData[K]) =>
    onChange({ ...data, [k]: v });

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do passageiro *</Label>
            <Input value={data.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-2">
            <Label>Data de nascimento *</Label>
            <Input type="date" value={data.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nacionalidade *</Label>
            <Input value={data.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="Ex: Brasileira" />
          </div>
          <div className="space-y-2">
            <Label>País de residência *</Label>
            <Input value={data.country_of_residence} onChange={(e) => set("country_of_residence", e.target.value)} placeholder="Ex: Brasil" />
          </div>
          <div className="space-y-2">
            <Label>País emissor do passaporte</Label>
            <Input value={data.passport_issuer} onChange={(e) => set("passport_issuer", e.target.value)} placeholder="Ex: Brasil" />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={data.is_minor} onCheckedChange={(v) => set("is_minor", !!v)} />
            <span className="text-sm">Menor de idade</span>
          </label>
          {data.is_minor && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={data.unaccompanied_minor} onCheckedChange={(v) => set("unaccompanied_minor", !!v)} />
              <span className="text-sm">Menor desacompanhado</span>
            </label>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={data.has_passport} onCheckedChange={(v) => set("has_passport", !!v)} />
            <span className="text-sm">Possui passaporte</span>
          </label>
        </div>

        {data.has_passport && (
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
            <div className="space-y-2">
              <Label>Número do passaporte</Label>
              <Input value={data.passport_number || ""} onChange={(e) => set("passport_number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Validade do passaporte</Label>
              <Input type="date" value={data.passport_expiry || ""} onChange={(e) => set("passport_expiry", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Vistos já emitidos (opcional)</Label>
              <Input value={data.existing_visas || ""} onChange={(e) => set("existing_visas", e.target.value)} placeholder="Ex: B1/B2 EUA, Schengen" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}