import { Award } from "lucide-react";
import { OperatorInfoCard } from "./OperatorInfoCard";

interface CompetitiveAdvantagesCardProps {
  advantages: string;
}

export function CompetitiveAdvantagesCard({ advantages }: CompetitiveAdvantagesCardProps) {
  const items = advantages
    .split("\n")
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 7);

  if (items.length === 0) return null;

  return (
    <OperatorInfoCard icon={Award} title="Diferenciais Competitivos" iconColor="text-amber-600">
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </OperatorInfoCard>
  );
}
