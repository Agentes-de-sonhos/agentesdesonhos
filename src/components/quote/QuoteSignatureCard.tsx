import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UserCircle2 } from "lucide-react";
import { SignatureSelector } from "@/components/signatures/SignatureSelector";
import { useCommercialSignatures } from "@/hooks/useCommercialSignatures";
import { buildSnapshot } from "@/lib/commercialSignature";
import { isSystemSignatureId } from "@/lib/effectiveSignature";
import type { SignatureSnapshot } from "@/types/signature";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdvancedSettingsSection } from "@/components/quote/AdvancedSettingsSection";

interface Props {
  /** Document table: quotes | trips | itineraries */
  table?: "quotes" | "trips" | "itineraries";
  docId: string;
  initialSnapshot: SignatureSnapshot | null | undefined;
  onSaved?: () => void;
  /** When true, omits the outer Card wrapper (useful inside another card/accordion) */
  unwrapped?: boolean;
  /** When true, omits the internal title/icon/header (useful when the parent already shows it) */
  hideHeader?: boolean;
  /** When true, renders all signatures inline (no popover) */
  inlineSelector?: boolean;
  /** Hides the auxiliary reset-to-default action while keeping the default card selectable. */
  hideUseDefaultAction?: boolean;
  /** Optional shared accordion shell used by the advanced quote settings. */
  collapsible?: { open: boolean; onToggle: () => void };
}

/** Reusable signature card for any document editor */
export function DocumentSignatureCard({ table = "quotes", docId, initialSnapshot, onSaved, unwrapped = false, hideHeader = false, inlineSelector = false, hideUseDefaultAction = false, collapsible }: Props) {
  const { effectiveSignature, systemSignature } = useCommercialSignatures();
  const [snap, setSnap] = useState<SignatureSnapshot | null>(initialSnapshot ?? null);
  const [saving, setSaving] = useState(false);
  const [initFilled, setInitFilled] = useState(false);
  const [synced, setSynced] = useState(false);

  // Auto-apply the effective agency signature on first load if nothing set yet
  useEffect(() => {
    if (initFilled) return;
    if (!initialSnapshot && effectiveSignature) {
      const s = buildSnapshot(effectiveSignature);
      setSnap(s);
      persist(s);
      setInitFilled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSignature, initialSnapshot]);

  // Keep the automatic (registration) signature fresh: if this document points to
  // the system signature, refresh its snapshot when the holder data changed.
  useEffect(() => {
    if (synced) return;
    if (!snap?.id || !isSystemSignatureId(snap.id) || !systemSignature) return;
    const next = buildSnapshot(systemSignature);
    if (!next) return;
    const changed = JSON.stringify({ ...next, updated_at: null }) !== JSON.stringify({ ...snap, updated_at: null });
    if (changed) {
      setSnap(next);
      persist(next);
    }
    setSynced(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemSignature, snap?.id]);

  const persist = async (next: SignatureSnapshot | null) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from(table as any)
        .update({ signature_snapshot: next as any } as any)
        .eq("id", docId);
      if (error) throw error;
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar assinatura");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (next: SignatureSnapshot | null) => {
    setSnap(next);
    persist(next);
  };

  const inner = (
    <div className="space-y-3">
      {!hideHeader && (
        <div className="w-fit">
          <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-rose-500" />
            Escolha uma assinatura
          </h2>
          <div className="mt-2 h-1 w-full rounded-full bg-rose-500" />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Define quem aparece como responsável neste documento (nome, foto, WhatsApp e e-mail). {saving && "Salvando..."}
      </p>
      <SignatureSelector
        value={snap}
        onChange={handleChange}
        inline={inlineSelector}
        hideUseDefaultAction={hideUseDefaultAction}
      />
    </div>
  );

  if (collapsible) {
    const effectiveSnapshot = snap ?? buildSnapshot(effectiveSignature);
    const signatureSummary = effectiveSnapshot?.name
      ? `${effectiveSnapshot.name}${effectiveSnapshot.title ? ` · ${effectiveSnapshot.title}` : ""}`
      : "Assinatura não configurada";

    return (
      <AdvancedSettingsSection
        testId="quote-signature-card"
        title="Escolha uma assinatura"
        icon={<UserCircle2 className="h-4 w-4 text-rose-500" />}
        accentClass="bg-rose-500"
        summary={<span className="block truncate" title={signatureSummary}>{signatureSummary}</span>}
        open={collapsible.open}
        onToggle={collapsible.onToggle}
      >
        {inner}
      </AdvancedSettingsSection>
    );
  }

  if (unwrapped) return inner;

  return (
    <Card className="shadow-card">
      <CardContent className="px-5 sm:px-6 py-5">
        {inner}
      </CardContent>
    </Card>
  );
}

/** Convenience wrapper used in GerarOrcamento.tsx */
export function QuoteSignatureCard({ quote, onSaved }: { quote: any; onSaved?: () => void }) {
  return (
    <DocumentSignatureCard
      table="quotes"
      docId={quote.id}
      initialSnapshot={(quote as any).signature_snapshot ?? null}
      onSaved={onSaved}
    />
  );
}