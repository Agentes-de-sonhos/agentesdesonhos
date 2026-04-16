import { Textarea } from "@/components/ui/textarea";

interface BusinessHours {
  commercial?: string;
  after_hours?: string;
  emergency?: string;
}

interface BusinessHoursEditFormProps {
  data: BusinessHours;
  onChange: (data: BusinessHours) => void;
}

export function BusinessHoursEditForm({ data, onChange }: BusinessHoursEditFormProps) {
  const update = (key: keyof BusinessHours, value: string) =>
    onChange({ ...data, [key]: value || undefined });

  return (
    <div className="p-4 space-y-3">
      <label className="text-xs font-medium text-muted-foreground">Horários de Funcionamento</label>
      <div>
        <label className="text-xs text-muted-foreground">Horário comercial</label>
        <Textarea value={data.commercial || ""} onChange={(e) => update("commercial", e.target.value)} className="mt-1 rounded-xl min-h-[60px]" placeholder="Ex: Segunda a sexta: 09h às 19h30&#10;Sábado: 09h às 13h" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Plantão</label>
        <Textarea value={data.after_hours || ""} onChange={(e) => update("after_hours", e.target.value)} className="mt-1 rounded-xl min-h-[60px]" placeholder="Ex: Segunda a sexta: 18h30 às 22h&#10;Sábado: 13h às 22h" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Emergência</label>
        <Textarea value={data.emergency || ""} onChange={(e) => update("emergency", e.target.value)} className="mt-1 rounded-xl min-h-[60px]" placeholder="Ex: Atendimento ao passageiro em viagem: 24h" />
      </div>
    </div>
  );
}
