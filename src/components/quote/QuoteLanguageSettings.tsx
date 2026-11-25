import { useState } from "react";
import { Languages } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdvancedSettingsSection } from "@/components/quote/AdvancedSettingsSection";

const AGENCY = "agency";
const OPTIONS = [
  { value: AGENCY, label: "Padrão da agência" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (United States)" },
  { value: "it-IT", label: "Italiano" },
];

interface Props {
  quote: { id: string; public_locale?: string | null };
  onUpdated?: () => void;
  open: boolean;
  onToggle: () => void;
}

/** Idioma do link público deste orçamento. Vazio = idioma configurado no perfil da agência. */
export function QuoteLanguageSettings({ quote, onUpdated, open, onToggle }: Props) {
  const { toast } = useToast();
  const [value, setValue] = useState<string>(quote.public_locale || AGENCY);

  const save = async (next: string) => {
    const previous = value;
    setValue(next);
    const { error } = await supabase
      .from("quotes")
      .update({ public_locale: next === AGENCY ? null : next } as any)
      .eq("id", quote.id);
    if (error) {
      setValue(previous);
      toast({ title: "Não foi possível salvar o idioma", variant: "destructive" });
      return;
    }
    toast({ title: "Idioma do orçamento atualizado" });
    onUpdated?.();
  };

  const label = OPTIONS.find((o) => o.value === value)?.label;

  return (
    <AdvancedSettingsSection
      testId="quote-language-settings"
      icon={<Languages className="h-4 w-4 text-primary" />}
      title="Idioma do orçamento"
      summary={label}
      accentClass="bg-sky-500"
      open={open}
      onToggle={onToggle}
    >
      <div className="space-y-2">
        <Label>Idioma que o cliente vê no link</Label>
        <Select value={value} onValueChange={save}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Traduz os textos fixos do orçamento. O que você digitou (nomes, descrições, observações) não é traduzido.
        </p>
      </div>
    </AdvancedSettingsSection>
  );
}
