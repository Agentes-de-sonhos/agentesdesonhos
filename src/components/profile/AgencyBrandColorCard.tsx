import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Palette, Pipette, Loader2, Save, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { normalizeHex, rgbToHex } from "@/lib/agencyColor";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { deriveSecondaryColor } from "@/lib/brandTheme";

interface Props {
  initialColor: string | null;
  /** Segundo acento real da marca (foco/borda ativa e ações secundárias). */
  initialSecondaryColor?: string | null;
  initialSecondaryAuto?: boolean | null;
  /** Tom muito claro (fundos, superfícies, miolo de intervalos). */
  initialTertiaryColor?: string | null;
  /** Gerar o tom claro automaticamente a partir da cor principal. */
  initialTertiaryAuto?: boolean | null;
  agencyLogoUrl: string | null;
  onSaved?: (
    color: string | null,
    secondary?: string | null,
    auto?: boolean,
    tertiary?: string | null,
    tertiaryAuto?: boolean,
  ) => void;
}

const PRESETS = [
  "#0284C7", "#2563EB", "#7C3AED", "#DB2777",
  "#E11D48", "#EA580C", "#CA8A04", "#16A34A",
  "#0D9488", "#0F172A", "#475569", "#A21CAF",
];

export function AgencyBrandColorCard({
  initialColor,
  initialSecondaryColor = null,
  initialSecondaryAuto = true,
  initialTertiaryColor = null,
  initialTertiaryAuto = true,
  agencyLogoUrl,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [color, setColor] = useState<string>(normalizeHex(initialColor) || "#0284C7");
  const [savedColor, setSavedColor] = useState<string | null>(normalizeHex(initialColor));

  // Secundária: acento real da marca. Em cadastros antigos o campo guardava o
  // tom claro automático, então ali a secundária efetiva acompanha a principal.
  const legacySecondary = initialSecondaryAuto !== false && !initialTertiaryColor;
  const [secondary, setSecondary] = useState<string>(
    (legacySecondary ? null : normalizeHex(initialSecondaryColor)) ||
      normalizeHex(initialColor) ||
      "#0284C7",
  );
  const [savedSecondary, setSavedSecondary] = useState<string | null>(
    legacySecondary ? null : normalizeHex(initialSecondaryColor),
  );

  // Terciária: tom muito claro, com automação própria.
  const [tertAuto, setTertAuto] = useState<boolean>(initialTertiaryAuto !== false);
  const [tertiary, setTertiary] = useState<string>(
    normalizeHex(initialTertiaryColor) ||
      normalizeHex(legacySecondary ? initialSecondaryColor : null) ||
      deriveSecondaryColor(initialColor),
  );
  const [savedTertiary, setSavedTertiary] = useState<string | null>(normalizeHex(initialTertiaryColor));
  const [savedTertAuto, setSavedTertAuto] = useState<boolean>(initialTertiaryAuto !== false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setColor(normalizeHex(initialColor) || "#0284C7");
    setSavedColor(normalizeHex(initialColor));
  }, [initialColor]);

  useEffect(() => {
    const legacy = initialSecondaryAuto !== false && !initialTertiaryColor;
    setSecondary(
      (legacy ? null : normalizeHex(initialSecondaryColor)) || normalizeHex(initialColor) || "#0284C7",
    );
    setSavedSecondary(legacy ? null : normalizeHex(initialSecondaryColor));
    setTertiary(
      normalizeHex(initialTertiaryColor) ||
        normalizeHex(legacy ? initialSecondaryColor : null) ||
        deriveSecondaryColor(initialColor),
    );
    setSavedTertiary(normalizeHex(initialTertiaryColor));
    setTertAuto(initialTertiaryAuto !== false);
    setSavedTertAuto(initialTertiaryAuto !== false);
  }, [initialSecondaryColor, initialSecondaryAuto, initialTertiaryColor, initialTertiaryAuto, initialColor]);

  // No modo automático a terciária acompanha a principal (mistura com branco).
  useEffect(() => {
    if (tertAuto) setTertiary(deriveSecondaryColor(color));
  }, [tertAuto, color]);

  const effectiveSecondary = normalizeHex(secondary) || normalizeHex(color) || "#0284C7";
  const effectiveTertiary = tertAuto
    ? deriveSecondaryColor(color)
    : normalizeHex(tertiary) || deriveSecondaryColor(color);
  const dirty =
    (savedColor || "") !== (normalizeHex(color) || "") ||
    (savedSecondary || "") !== effectiveSecondary ||
    savedTertAuto !== tertAuto ||
    (savedTertiary || "") !== effectiveTertiary;

  const handleSave = async () => {
    if (!user) return;
    const hex = normalizeHex(color);
    if (!hex) {
      toast({ title: "Cor inválida", description: "Use um HEX no formato #RRGGBB.", variant: "destructive" });
      return;
    }
    if (!normalizeHex(secondary) || !normalizeHex(effectiveTertiary)) {
      toast({
        title: "Cor inválida",
        description: "Verifique os HEX da secundária e da terciária.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          agency_primary_color: hex,
          // A secundária passa a ser um acento real e explícito.
          agency_secondary_color: effectiveSecondary,
          agency_secondary_auto: false,
          agency_tertiary_color: effectiveTertiary,
          agency_tertiary_auto: tertAuto,
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      setSavedColor(hex);
      setSavedSecondary(effectiveSecondary);
      setSavedTertiary(effectiveTertiary);
      setSavedTertAuto(tertAuto);
      onSaved?.(hex, effectiveSecondary, false, effectiveTertiary, tertAuto);
      // Reflete a mudança imediatamente em todas as telas e links públicos.
      queryClient.invalidateQueries({ queryKey: ["agency-admin-portal"] });
      queryClient.invalidateQueries({ queryKey: ["agency-domain"] });
      queryClient.invalidateQueries({ queryKey: ["agency-admin-profile"] });
      toast({ title: "Identidade visual salva!", description: "Aplicada no painel, no site e em todos os links públicos." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar cor", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };


  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          Identidade Visual
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Defina a cor principal da sua agência. Ela será aplicada na Carteira Digital Pública e,
          em breve, nos demais links públicos da plataforma.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Preview */}
        <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
          <div
            className="h-16 w-16 rounded-xl border shadow-inner"
            style={{ backgroundColor: color }}
            aria-label="Prévia da cor principal"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Cor principal atual</p>
            <p className="font-mono text-lg font-semibold tracking-tight">{color}</p>
            <div className="mt-2 flex gap-1.5">
              <span className="inline-block h-2 w-10 rounded-full" style={{ backgroundColor: color }} />
              <span className="inline-block h-2 w-6 rounded-full" style={{ backgroundColor: color, opacity: 0.5 }} />
              <span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: color, opacity: 0.25 }} />
            </div>
          </div>
        </div>

        {/* Color input + HEX */}
        <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label className="text-xs">Seletor</Label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              className="h-10 w-16 cursor-pointer rounded-md border border-input bg-background p-1"
              aria-label="Escolher cor"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">HEX</Label>
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              onBlur={() => {
                const n = normalizeHex(color);
                if (n) setColor(n);
              }}
              placeholder="#0284C7"
              className="font-mono"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPickerOpen(true)}
            disabled={!agencyLogoUrl}
            title={agencyLogoUrl ? "Capturar cor da logo" : "Envie a logo da agência primeiro"}
          >
            <Pipette className="mr-2 h-4 w-4" />
            Extrair do logo
          </Button>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <Label className="text-xs">Sugestões</Label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((c) => {
              const active = normalizeHex(color) === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`relative h-8 w-8 rounded-full border-2 transition ${
                    active ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Selecionar cor ${c}`}
                >
                  {active && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secundária — acento real da marca */}
        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <div className="min-w-0">
            <Label className="text-sm font-medium">Cor secundária</Label>
            <p className="text-xs text-muted-foreground">
              Segundo acento da marca: ações secundárias e foco/borda ativa de campos,
              checkboxes e controles.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
            <div className="space-y-2">
              <Label className="text-xs">Seletor</Label>
              <input
                type="color"
                value={effectiveSecondary}
                onChange={(e) => setSecondary(e.target.value.toUpperCase())}
                className="h-10 w-16 cursor-pointer rounded-md border border-input bg-background p-1"
                aria-label="Escolher cor secundária"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">HEX secundário</Label>
              <Input
                value={secondary}
                onChange={(e) => setSecondary(e.target.value.toUpperCase())}
                onBlur={() => {
                  const n = normalizeHex(secondary);
                  if (n) setSecondary(n);
                }}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* Terciária — tom muito claro */}
        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Label className="text-sm font-medium">Gerar tom claro automaticamente</Label>
              <p className="text-xs text-muted-foreground">
                A cor terciária é usada em fundos suaves, superfícies, cards selecionados e no
                preenchimento dos dias entre início e fim nos calendários.
              </p>
            </div>
            <Switch checked={tertAuto} onCheckedChange={setTertAuto} aria-label="Gerar tom claro automaticamente" />
          </div>

          <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
            <div className="space-y-2">
              <Label className="text-xs">Terciária</Label>
              <input
                type="color"
                value={effectiveTertiary}
                disabled={tertAuto}
                onChange={(e) => setTertiary(e.target.value.toUpperCase())}
                className="h-10 w-16 cursor-pointer rounded-md border border-input bg-background p-1 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Escolher cor terciária"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">HEX terciário</Label>
              <Input
                value={effectiveTertiary}
                disabled={tertAuto}
                onChange={(e) => setTertiary(e.target.value.toUpperCase())}
                onBlur={() => {
                  const n = normalizeHex(tertiary);
                  if (n) setTertiary(n);
                }}
                className="font-mono"
              />
            </div>
          </div>

          {/* Prévia da paleta completa */}
          <div className="flex items-center gap-2">
            <span className="h-8 flex-1 rounded-md border" style={{ backgroundColor: color }} />
            <span className="h-8 flex-1 rounded-md border" style={{ backgroundColor: effectiveSecondary }} />
            <span className="h-8 flex-1 rounded-md border" style={{ backgroundColor: effectiveTertiary }} />
          </div>
        </div>


        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar identidade visual
          </Button>
        </div>
      </CardContent>

      <LogoEyedropperDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        logoUrl={agencyLogoUrl}
        onPick={(hex) => {
          setColor(hex);
          setPickerOpen(false);
        }}
      />
    </Card>
  );
}

function LogoEyedropperDialog({
  open,
  onOpenChange,
  logoUrl,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  logoUrl: string | null;
  onPick: (hex: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    setCanvasEl(node);
  }, []);

  useEffect(() => {
    if (!open || !logoUrl || !canvasEl) return;
    const canvas = canvasEl;
    setLoading(true);
    setLoadError(null);
    setHoverColor(null);
    canvas.width = 0;
    canvas.height = 0;
    let objectUrl: string | null = null;
    let cancelled = false;

    const drawImage = (src: string, withCrossOrigin: boolean) =>
      new Promise<void>((resolve, reject) => {
        const img = new Image();
        if (withCrossOrigin) img.crossOrigin = "anonymous";
        img.onload = () => {
          if (cancelled) return resolve();
          const naturalWidth = img.naturalWidth || img.width;
          const naturalHeight = img.naturalHeight || img.height;
          if (!naturalWidth || !naturalHeight) return reject(new Error("empty image"));
          const maxW = 600;
          const scale = Math.min(1, maxW / naturalWidth);
          canvas.width = Math.max(1, Math.round(naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(naturalHeight * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("no ctx"));
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve();
        };
        img.onerror = () => reject(new Error("img load failed"));
        img.src = src;
      });

    (async () => {
      // Strategy 1: fetch as blob (works whenever the host returns CORS headers
      // for the request — which Supabase Storage does — and produces a tainted-free
      // same-origin blob URL we can safely sample with getImageData).
      try {
        const res = await fetch(logoUrl, { mode: "cors", cache: "no-store" });
        if (!res.ok) throw new Error(`http ${res.status}`);
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        await drawImage(objectUrl, false);
        if (!cancelled) setLoading(false);
        return;
      } catch {
        // fall through
      }
      // Strategy 2: direct image load with crossOrigin=anonymous.
      try {
        await drawImage(logoUrl, true);
        if (!cancelled) setLoading(false);
        return;
      } catch {
        // fall through
      }
      // Strategy 3: last-resort, load without CORS. Image will render but
      // getImageData will throw — we surface that as a friendly hover state.
      try {
        await drawImage(logoUrl, false);
      } catch {
        if (!cancelled) setLoadError("Não foi possível carregar o logotipo. Reenvie a imagem em PNG, JPG ou WebP e tente novamente.");
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, logoUrl, canvasEl]);

  const readColor = (e: React.MouseEvent<HTMLCanvasElement>): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * canvas.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    try {
      const data = ctx.getImageData(x, y, 1, 1).data;
      if (data[3] === 0) return null;
      return rgbToHex(data[0], data[1], data[2]);
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Extrair cor do logotipo</DialogTitle>
          <DialogDescription>
            Clique em qualquer ponto do logo para capturar a cor. A cor selecionada será usada como
            cor principal da agência.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative flex items-center justify-center rounded-lg border bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] p-4 min-h-[260px]">
            {loading && <Loader2 className="absolute h-6 w-6 animate-spin text-muted-foreground" />}
            <canvas
              ref={handleCanvasRef}
              className="max-w-full max-h-[400px] cursor-crosshair"
              onMouseMove={(e) => {
                const c = readColor(e);
                if (c) setHoverColor(c);
              }}
              onClick={(e) => {
                const c = readColor(e);
                if (c) onPick(c);
              }}
            />
            {loadError && !loading && (
              <p className="px-6 text-center text-sm text-muted-foreground">{loadError}</p>
            )}
          </div>
          {hoverColor && (
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <div className="h-10 w-10 rounded-md border" style={{ backgroundColor: hoverColor }} />
              <div>
                <p className="text-xs text-muted-foreground">Cor sob o cursor</p>
                <p className="font-mono text-sm font-semibold">{hoverColor}</p>
              </div>
              <Button className="ml-auto" size="sm" onClick={() => onPick(hoverColor)}>
                Usar esta cor
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}