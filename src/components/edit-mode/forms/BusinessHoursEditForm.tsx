import { Input } from "@/components/ui/input";

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
      <label className="text-xs font-medium text-muted-foreground">Horário Comercial</label>
      <div>
        <label className="text-xs text-muted-foreground">Comercial</label>
        <Input value={data.commercial || ""} onChange={(e) => update("commercial", e.target.value)} className="mt-1 rounded-xl" placeholder="Ex: Seg a Sex, 9h às 18h" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Fora do Horário</label>
        <Input value={data.after_hours || ""} onChange={(e) => update("after_hours", e.target.value)} className="mt-1 rounded-xl" placeholder="Ex: WhatsApp (11) 99999-9999" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Emergencial</label>
        <Input value={data.emergency || ""} onChange={(e) => update("emergency", e.target.value)} className="mt-1 rounded-xl" placeholder="Ex: 0800-XXX-XXXX (24h)" />
      </div>
    </div>
  );
}
