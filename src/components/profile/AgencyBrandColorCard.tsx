import { useEffect, useRef, useState } from "react";
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

interface Props {
  initialColor: string | null;
  agencyLogoUrl: string | null;
  onSaved?: (color: string | null) => void;
}

const PRESETS = [
  "#0284C7", "#2563EB", "#7C3AED", "#DB2777",
  "#E11D48", "#EA580C", "#CA8A04", "#16A34A",
  "#0D9488", "#0F172A", "#475569", "#A21CAF",
];

export function AgencyBrandColorCard({ initialColor, agencyLogoUrl, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [color, setColor] = useState<string>(normalizeHex(initialColor) || "#0284C7");
  const [savedColor, setSavedColor] = useState<string | null>(normalizeHex(initialColor));
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setColor(normalizeHex(initialColor) || "#0284C7");
    setSavedColor(normalizeHex(initialColor));
  }, [initialColor]);

  const dirty = (savedColor || "") !== (normalizeHex(color) || "");

  const handleSave = async () => {
    if (!user) return;
    const hex = normalizeHex(color);
    if (!hex) {
      toast({ title: "Cor inválida", description: "Use um HEX no formato #RRGGBB.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ agency_primary_color: hex } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      setSavedColor(hex);
      onSaved?.(hex);
      toast({ title: "Cor principal salva!", description: "Será aplicada nos links públicos da agência." });
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

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar cor
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
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !logoUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setLoading(true);
    let objectUrl: string | null = null;
    let cancelled = false;

    const drawImage = (src: string, withCrossOrigin: boolean) =>
      new Promise<void>((resolve, reject) => {
        const img = new Image();
        if (withCrossOrigin) img.crossOrigin = "anonymous";
        img.onload = () => {
          if (cancelled) return resolve();
          const maxW = 600;
          const scale = Math.min(1, maxW / img.width);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
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
        /* ignore */
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, logoUrl]);

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
              ref={canvasRef}
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