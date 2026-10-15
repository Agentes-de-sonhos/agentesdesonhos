import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, Plane, MapPin, Wrench, UserRound, MessageCircle, RotateCcw, Loader2, LayoutGrid } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { WALLET_MODULES, fetchTripAgencyWalletDefaults, resolveWalletSettings, sanitizeWalletOverrides, type AgencyWalletSettings, type WalletModuleOverrides } from "@/lib/walletSettings";
import { toast } from "sonner";

export const WALLET_MODULE_ICONS: Record<keyof AgencyWalletSettings, typeof CalendarIcon> = {
  show_calendar: CalendarIcon,
  show_next_service: Plane,
  show_next_activity: MapPin,
  show_support_tools: Wrench,
  show_signature: UserRound,
  show_whatsapp: MessageCircle,
};

/** Módulos da carteira pública ajustados somente para esta carteira (autosave). */
export function TripWalletModulesCard({ tripId, initialOverrides, onSaved }: { tripId: string; initialOverrides: unknown; onSaved?: () => void }) {
  // Padrão da agência dona da viagem (mesma resolução usada na carteira pública), nunca a conta conectada.
  const { data: agency, isLoading: loading } = useQuery({
    queryKey: ["trip-agency-wallet-defaults", tripId],
    queryFn: () => fetchTripAgencyWalletDefaults(tripId),
    staleTime: 5 * 60 * 1000,
  });
  const [overrides, setOverrides] = useState<WalletModuleOverrides>(() => sanitizeWalletOverrides(initialOverrides));
  const [saving, setSaving] = useState<string | null>(null);
  const latest = useRef(overrides);
  const pending = useRef(0);
  // Só ressincroniza com o servidor quando não há gravação em andamento (não perde cliques rápidos).
  useEffect(() => { if (pending.current === 0) { const o = sanitizeWalletOverrides(initialOverrides); latest.current = o; setOverrides(o); } }, [tripId, JSON.stringify(initialOverrides ?? null)]);

  const effective = resolveWalletSettings(agency ?? null, overrides);
  const customized = Object.keys(overrides).length > 0;

  const persist = async (next: WalletModuleOverrides, key: string) => {
    const prev = latest.current;
    latest.current = next;
    setOverrides(next);
    setSaving(key);
    pending.current += 1;
    const { error } = await supabase.from("trips").update({ wallet_modules: Object.keys(next).length ? next : null } as never).eq("id", tripId);
    pending.current -= 1;
    setSaving(null);
    if (error) { if (latest.current === next) { latest.current = prev; setOverrides(prev); } toast.error("Não foi possível salvar o módulo. Tente novamente."); return; }
    onSaved?.();
  };

  return <section className="space-y-3" aria-labelledby="trip-wallet-modules-title">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 id="trip-wallet-modules-title" className="flex items-center gap-2 text-sm font-semibold"><LayoutGrid className="h-4 w-4 text-primary" />Módulos da Carteira Digital</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Estas opções valem somente para esta carteira. Módulos não alterados seguem o padrão da agência.</p>
      </div>
      {customized && <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" disabled={!!saving} onClick={() => void persist({}, "reset")}><RotateCcw className="h-3.5 w-3.5" />Usar padrão da agência</Button>}
    </div>
    <div className="space-y-2">
      {WALLET_MODULES.map(({ key, label, description }) => {
        const Icon = WALLET_MODULE_ICONS[key];
        const own = key in overrides;
        return <label key={key} htmlFor={`trip-module-${key}`} className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent/40">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">{own ? "Personalizado nesta carteira" : "Padrão da agência"}</span>
          </span>
          {saving === key ? <Loader2 className="mt-1 h-4 w-4 animate-spin text-muted-foreground" /> : null}
          <Switch id={`trip-module-${key}`} aria-label={label} checked={effective[key]} disabled={loading || !!saving}
            onCheckedChange={(checked) => void persist({ ...latest.current, [key]: checked }, key)} />
        </label>;
      })}
    </div>
    <p className="text-xs text-muted-foreground">Navegação rápida, serviços da viagem e Baixar PDF são sempre exibidos.</p>
  </section>;
}
