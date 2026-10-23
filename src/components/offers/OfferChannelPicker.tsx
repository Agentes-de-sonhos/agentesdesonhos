import { Checkbox } from "@/components/ui/checkbox";
import { OFFER_CHANNELS } from "@/lib/offers";

/** Escolha das páginas do site onde a oferta aparece (pelo menos uma). */
export function OfferChannelPicker({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  const toggle = (id: string, on: boolean) => {
    const next = on ? [...new Set([...value, id])] : value.filter((c) => c !== id);
    if (next.length) onChange(next);
  };
  return (
    <div className="flex flex-wrap gap-4">
      {OFFER_CHANNELS.map((c) => (
        <label key={c.id} className="flex items-center gap-2 text-sm">
          <Checkbox checked={value.includes(c.id)} disabled={disabled} onCheckedChange={(v) => toggle(c.id, v === true)} />
          {c.label}
        </label>
      ))}
    </div>
  );
}
