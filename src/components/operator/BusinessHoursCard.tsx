import { Clock } from "lucide-react";
import { OperatorInfoCard } from "./OperatorInfoCard";

interface BusinessHours {
  commercial?: string;
  after_hours?: string;
  emergency?: string;
}

interface BusinessHoursCardProps {
  hours: BusinessHours;
}

const sections = [
  { key: "commercial" as const, label: "Horário comercial", color: "bg-emerald-500" },
  { key: "after_hours" as const, label: "Plantão", color: "bg-amber-500" },
  { key: "emergency" as const, label: "Emergência", color: "bg-rose-500" },
];

export function BusinessHoursCard({ hours }: BusinessHoursCardProps) {
  const hasData = sections.some((s) => hours[s.key]);
  if (!hasData) return null;

  return (
    <OperatorInfoCard icon={Clock} title="Horários de Funcionamento" iconColor="text-sky-600">
      <div className="space-y-4">
        {sections.map(({ key, label, color }) =>
          hours[key] ? (
            <div key={key} className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 rounded-full ${color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{hours[key]}</p>
              </div>
            </div>
          ) : null
        )}
      </div>
    </OperatorInfoCard>
  );
}
