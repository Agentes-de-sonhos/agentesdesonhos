import { ShieldCheck } from "lucide-react";
import { OperatorInfoCard } from "./OperatorInfoCard";

interface CertificationsCardProps {
  certifications: string;
}

export function CertificationsCard({ certifications }: CertificationsCardProps) {
  const items = certifications
    .split("\n")
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  if (items.length === 0) return null;

  return (
    <OperatorInfoCard icon={ShieldCheck} title="Certificações" iconColor="text-emerald-600">
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
          >
            <ShieldCheck className="h-3 w-3" />
            {item}
          </span>
        ))}
      </div>
    </OperatorInfoCard>
  );
}
