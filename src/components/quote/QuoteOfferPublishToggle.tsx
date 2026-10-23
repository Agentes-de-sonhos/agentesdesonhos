import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOffersEnabled } from "@/hooks/useOffers";
import { OfferChannelPicker } from "@/components/offers/OfferChannelPicker";
import { toast } from "sonner";

/**
 * Controle individual do orçamento, com frase positiva.
 * Desmarcado grava `offer_opt_out = true`, que prevalece sobre a agência.
 * Quando a oferta do orçamento já existe, permite escolher as páginas do site.
 * Só aparece para agências com o módulo Ofertas liberado.
 */
export function QuoteOfferPublishToggle({ quoteId, optOut }: { quoteId?: string; optOut?: boolean | null }) {
  const { enabled } = useOffersEnabled();
  const qc = useQueryClient();
  const [checked, setChecked] = useState(!optOut);
  const [saving, setSaving] = useState(false);
  useEffect(() => setChecked(!optOut), [optOut]);

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

  if (!enabled || !quoteId) return null;

  const onChange = async (value: boolean) => {
    setChecked(value);
    setSaving(true);
    const { error } = await supabase.from("quotes").update({ offer_opt_out: !value } as any).eq("id", quoteId);
    setSaving(false);
    if (error) {
      setChecked(!value);
      toast.error("Não foi possível salvar a preferência de oferta.");
    }
  };

  const onChannels = async (channels: string[]) => {
    if (!offer) return;
    setSaving(true);
    const { error } = await (supabase as any).from("offers").update({ display_channels: channels }).eq("id", offer.id);
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar onde a oferta aparece.");
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
            Quando o orçamento estiver publicado, ele poderá virar uma oferta no site da agência. Dados do cliente nunca são exibidos.
          </p>
        </div>
        <Switch id="quote-offer-publish" checked={checked} disabled={saving} onCheckedChange={onChange} />
      </div>
      {checked && (
        <div className="space-y-1.5 border-t border-border/60 pt-3">
          <p className="text-xs font-medium">Onde exibir no site</p>
          {offer ? (
            <OfferChannelPicker value={offer.display_channels?.length ? offer.display_channels : ["ofertas"]} onChange={onChannels} disabled={saving} />
          ) : (
            <p className="text-xs text-muted-foreground">Disponível assim que a oferta deste orçamento for criada em Meus Projetos › Ofertas.</p>
          )}
        </div>
      )}
    </div>
  );
}
