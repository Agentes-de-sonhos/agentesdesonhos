import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOffersEnabled } from "@/hooks/useOffers";
import { OfferChannelPicker } from "@/components/offers/OfferChannelPicker";
import { toast } from "sonner";

/**
 * Novos orçamentos começam desligados; ofertas existentes preservam a publicação.
 * Ligar grava `offer_publish_opt_in = true` e `offer_opt_out = false`.
 * As páginas do site são escolhidas aqui mesmo (`offer_display_channels`)
 * e copiadas para a oferta quando ela for criada; se já existir, também é atualizada.
 */
export function QuoteOfferPublishToggle({
  quoteId,
  optIn,
  optOut,
  channels,
}: {
  quoteId?: string;
  optIn?: boolean | null;
  optOut?: boolean | null;
  channels?: string[] | null;
}) {
  const { enabled } = useOffersEnabled();
  const qc = useQueryClient();
  const [checked, setChecked] = useState(!!optIn && !optOut);
  const [selected, setSelected] = useState<string[]>(channels?.length ? channels : ["ofertas"]);
  const [saving, setSaving] = useState(false);

  const { data: offer } = useQuery({
    queryKey: ["quote-offer-channels", quoteId],
    enabled: enabled && !!quoteId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("offers")
        .select("id, display_channels")
        .eq("source_quote_id", quoteId)
        .maybeSingle();
      return (data as { id: string; display_channels: string[] } | null) ?? null;
    },
  });

  const initial = !optOut && (!!optIn || !!offer);
  useEffect(() => setChecked(initial), [initial, quoteId]);
  const effectiveChannels = offer?.display_channels ?? channels;
  useEffect(() => setSelected(effectiveChannels?.length ? effectiveChannels : ["ofertas"]), [effectiveChannels, quoteId]);

  if (!enabled || !quoteId) return null;

  const onChange = async (value: boolean) => {
    setChecked(value);
    setSaving(true);
    const { error } = await supabase
      .from("quotes")
      .update({ offer_publish_opt_in: value, offer_opt_out: !value } as any)
      .eq("id", quoteId);
    setSaving(false);
    if (error) {
      setChecked(!value);
      toast.error("Não foi possível salvar a preferência de oferta.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["quote", quoteId] });
  };

  const onChannels = async (next: string[]) => {
    const prev = selected;
    setSelected(next);
    setSaving(true);
    const { error } = await supabase.from("quotes").update({ offer_display_channels: next } as any).eq("id", quoteId);
    let offerError = null;
    if (!error && offer) {
      ({ error: offerError } = await (supabase as any).from("offers").update({ display_channels: next }).eq("id", offer.id));
    }
    setSaving(false);
    if (error || offerError) {
      setSelected(prev);
      return toast.error("Não foi possível salvar onde a oferta aparece.");
    }
    qc.invalidateQueries({ queryKey: ["quote-offer-channels", quoteId] });
    qc.invalidateQueries({ queryKey: ["offers"] });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="quote-offer-publish" className="text-sm font-medium">
            Publicar como oferta no site
          </Label>
          <p className="text-xs text-muted-foreground">
            Desligado por padrão. Ligue só nos orçamentos que devem virar oferta no site. Dados do cliente nunca são exibidos.
          </p>
        </div>
        <Switch id="quote-offer-publish" checked={checked} disabled={saving} onCheckedChange={onChange} />
      </div>
      {checked && (
        <div className="space-y-1.5 border-t border-border/60 pt-3">
          <p className="text-xs font-medium">Onde exibir no site</p>
          <OfferChannelPicker value={selected} onChange={onChannels} disabled={saving} />
        </div>
      )}
    </div>
  );
}
