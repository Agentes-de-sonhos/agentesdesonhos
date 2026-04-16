import { Award } from "lucide-react";
import { OperatorInfoCard } from "./OperatorInfoCard";
import { RichTextWithLinks } from "./RichTextWithLinks";

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
      <RichTextWithLinks text={items.join("\n")} asBullets bulletColor="bg-amber-500" />
    </OperatorInfoCard>
  );
}
