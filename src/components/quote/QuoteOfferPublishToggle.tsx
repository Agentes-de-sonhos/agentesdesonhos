import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOffersEnabled } from "@/hooks/useOffers";
import { toast } from "sonner";

/**
 * Controle individual do orçamento, com frase positiva.
 * Desmarcado grava `offer_opt_out = true`, que prevalece sobre a agência.
 * Só aparece para agências com o módulo Ofertas liberado.
 */
export function QuoteOfferPublishToggle({ quoteId, optOut }: { quoteId?: string; optOut?: boolean | null }) {
  const { enabled } = useOffersEnabled();
  const [checked, setChecked] = useState(!optOut);
  const [saving, setSaving] = useState(false);
  useEffect(() => setChecked(!optOut), [optOut]);

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

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card p-4">
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
  );
}
