import { useEffect, useRef, useState } from "react";
import { DollarSign, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { PopupRichTextEditor } from "@/components/admin/PopupRichTextEditor";
import {
  PRICING_SECTION_PLACEHOLDER,
  PRICING_SECTION_TITLE,
  isPricingContentEmpty,
} from "@/lib/pricingSection";

interface PricingSectionCardProps {
  enabled: boolean;
  content: string;
  onToggle: (enabled: boolean) => Promise<void> | void;
  onSave: (content: string) => Promise<void> | void;
}

/**
 * Editor card for the optional "Valores e Condições" section shown at the
 * end of a roteiro. Content is only rendered publicly when the switch is
 * on AND the sanitized HTML is not empty.
 */
export function PricingSectionCard({ enabled, content, onToggle, onSave }: PricingSectionCardProps) {
  const [localContent, setLocalContent] = useState(content || "");
  const [saving, setSaving] = useState(false);
  const [togglePending, setTogglePending] = useState(false);
  const lastPersistedRef = useRef(content || "");

  useEffect(() => {
    setLocalContent(content || "");
    lastPersistedRef.current = content || "";
  }, [content]);

  const isDirty = localContent !== lastPersistedRef.current;
  const isEmpty = isPricingContentEmpty(localContent);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localContent);
      lastPersistedRef.current = localContent;
      toast.success("Seção comercial atualizada!");
    } catch {
      toast.error("Não foi possível salvar a seção.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setTogglePending(true);
    try {
      await onToggle(checked);
    } finally {
      setTogglePending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <DollarSign className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{PRICING_SECTION_TITLE}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                Seção opcional exibida ao final do roteiro. Use para valores, condições de pagamento, validade da proposta e observações.
              </p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-2">
                {togglePending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                <Switch checked={enabled} onCheckedChange={handleToggle} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="max-w-[240px]">Adicionar orçamento ao roteiro. Quando desligada, a seção fica oculta no link público e no PDF.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      {enabled && (
        <CardContent className="space-y-3">
          <PopupRichTextEditor content={localContent} onChange={setLocalContent} />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Salvar
            </Button>
            {isEmpty ? (
              <p className="text-xs text-muted-foreground italic">
                {PRICING_SECTION_PLACEHOLDER}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aparecerá após o último dia do roteiro.
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}