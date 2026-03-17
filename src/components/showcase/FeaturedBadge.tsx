import { getFeaturedLabel } from "@/hooks/useShowcase";

export function FeaturedBadge({ label }: { label: string | null }) {
  const info = getFeaturedLabel(label);
  if (!info) return null;
  return (
    <span className="absolute top-3 left-3 z-10 bg-amber-500/90 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 tracking-wide">
      <span className="text-sm">{info.emoji}</span> {info.text}
    </span>
  );
}
