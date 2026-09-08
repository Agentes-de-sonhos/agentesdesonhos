import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_PUBLIC_LOCALE,
  normalizePublicLocale,
  type PublicLocale,
} from "@/i18n/publicMaterials/locale";

const OPTIONS: { value: PublicLocale; label: string }[] = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "it-IT", label: "Italiano" },
];

interface Props {
  initialLocale?: string | null;
  onSaved?: (locale: PublicLocale) => void;
}

/**
 * Configuração por agência do idioma dos MATERIAIS PÚBLICOS enviados ao cliente.
 * A área interna da plataforma continua em português.
 */
export function PublicContentLocaleCard({ initialLocale, onSaved }: Props) {
  const { toast } = useToast();
  const [locale, setLocale] = useState<PublicLocale>(
    normalizePublicLocale(initialLocale ?? DEFAULT_PUBLIC_LOCALE)
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada");

      const { error } = await (supabase.from("profiles") as any)
        .update({ public_content_locale: locale })
        .eq("user_id", userId);
      if (error) throw error;

      onSaved?.(locale);
      toast({ title: "Idioma dos materiais atualizado" });
    } catch {
      toast({
        title: "Não foi possível salvar o idioma",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          Idioma dos materiais do cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Define o idioma dos links públicos e documentos enviados aos seus clientes.. A área
          interna da plataforma continuará em português.
        </p>

        <div className="space-y-2">
          <Label htmlFor="public-content-locale">Idioma</Label>
          <Select
            value={locale}
            onValueChange={(value) => setLocale(normalizePublicLocale(value))}
          >
            <SelectTrigger id="public-content-locale" aria-label="Idioma dos materiais do cliente">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar idioma
        </Button>
      </CardContent>
    </Card>
  );
}
