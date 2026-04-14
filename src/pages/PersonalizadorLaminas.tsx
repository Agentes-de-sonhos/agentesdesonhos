import { useState, useRef, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Download,
  Image as ImageIcon,
  Type,
  Grid3X3,
  Loader2,
  X,
  Sun,
  Moon,
  Paintbrush,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchAgentProfile } from "@/hooks/useAgentProfile";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

type LogoSize = "small" | "medium" | "large";
type TextColor = "auto" | "light" | "dark";

const LOGO_SIZES: Record<LogoSize, { label: string; factor: number }> = {
  small: { label: "Pequeno", factor: 0.10 },
  medium: { label: "Médio", factor: 0.16 },
  large: { label: "Grande", factor: 0.22 },
};

const GRID_COLS = 3;
const GRID_ROWS = 3;

function PersonalizadorLaminasContent() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // State
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [baseImageNatural, setBaseImageNatural] = useState<{ w: number; h: number } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [gridPos, setGridPos] = useState<number>(8); // bottom-right default
  const [logoSize, setLogoSize] = useState<LogoSize>("medium");
  const [textColor, setTextColor] = useState<TextColor>("auto");
  const [rendering, setRendering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  // Pre-fill from profile
  useEffect(() => {
    if (!user) return;
    fetchAgentProfile(user.id, supabase).then((p) => {
      if (p) {
        setAgencyName(p.agency_name || "");
        setPhone(p.phone || "");
        if (p.agency_logo_url) setLogoUrl(p.agency_logo_url);
      }
    });
  }, [user]);

  // Fetch materials for gallery
  const { data: galleryImages, isLoading: galleryLoading } = useQuery({
    queryKey: ["materials-gallery-picker"],
    enabled: showGallery,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("materials" as any)
        .select("id, title, file_url")
        .eq("is_active", true)
        .eq("file_type", "image")
        .order("created_at", { ascending: false })
        .limit(60)) as { data: { id: string; title: string; file_url: string }[] | null; error: any };
      if (error) throw error;
      return data;
    },
  });

  // Load base image dimensions
  useEffect(() => {
    if (!baseImage) { setBaseImageNatural(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBaseImageNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = baseImage;
  }, [baseImage]);

  const handleBaseUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem válida."); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 15MB)."); return; }
    setUploading(true);
    const url = URL.createObjectURL(file);
    setBaseImage(url);
    setUploading(false);
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem válida."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Logo muito grande (máx. 5MB)."); return; }
    setUploadingLogo(true);
    try {
      // Upload to storage for reuse
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logos/${user?.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      toast.success("Logo salvo para reutilização!");
    } catch (e: any) {
      // Fallback to local blob
      setLogoUrl(URL.createObjectURL(file));
      toast.info("Logo carregado localmente.");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Determine text color based on grid position luminance
  const getTextFillColor = useCallback((): string => {
    if (textColor === "light") return "#FFFFFF";
    if (textColor === "dark") return "#1a1a2e";
    // Auto: sample the canvas area where text will go
    return "#FFFFFF"; // default for auto, refined in render
  }, [textColor]);

  const sampleBrightness = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): number => {
    const imageData = ctx.getImageData(Math.max(0, x), Math.max(0, y), Math.min(w, 100), Math.min(h, 50));
    const d = imageData.data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) {
      sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    return sum / (d.length / 4);
  };

  const renderAndDownload = async () => {
    if (!baseImage || !baseImageNatural) { toast.error("Selecione uma imagem base."); return; }
    setRendering(true);

    try {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const W = baseImageNatural.w;
      const H = baseImageNatural.h;
      canvas.width = W;
      canvas.height = H;

      // Draw base image
      const baseImg = await loadImage(baseImage);
      ctx.drawImage(baseImg, 0, 0, W, H);

      // Grid cell
      const col = gridPos % GRID_COLS;
      const row = Math.floor(gridPos / GRID_COLS);
      const cellW = W / GRID_COLS;
      const cellH = H / GRID_ROWS;
      const cellX = col * cellW;
      const cellY = row * cellH;
      const padding = Math.min(cellW, cellH) * 0.08;

      // Auto text color
      const brightness = sampleBrightness(ctx, cellX, cellY, cellW, cellH);
      const fillColor = textColor === "light" ? "#FFFFFF"
        : textColor === "dark" ? "#1a1a2e"
        : brightness > 128 ? "#1a1a2e" : "#FFFFFF";
      const shadowColor = brightness > 128 ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.6)";

      // Determine content height and layout
      let currentY = cellY + padding;
      const contentX = col === 2 ? cellX + cellW - padding : col === 1 ? cellX + cellW / 2 : cellX + padding;
      const textAlign: CanvasTextAlign = col === 2 ? "right" : col === 1 ? "center" : "left";

      // Draw logo
      if (logoUrl) {
        try {
          const logoImg = await loadImage(logoUrl);
          const sizeFactor = LOGO_SIZES[logoSize].factor;
          const maxLogoW = W * sizeFactor;
          const scale = maxLogoW / logoImg.naturalWidth;
          const lw = logoImg.naturalWidth * scale;
          const lh = logoImg.naturalHeight * scale;
          let lx = contentX;
          if (textAlign === "right") lx = contentX - lw;
          else if (textAlign === "center") lx = contentX - lw / 2;

          // Vertical alignment for bottom row
          if (row === 2) {
            currentY = cellY + cellH - padding - lh - (agencyName || phone ? 50 * (H / 1000) : 0);
          }

          ctx.drawImage(logoImg, lx, currentY, lw, lh);
          currentY += lh + padding * 0.5;
        } catch {
          // Logo load failed, skip
        }
      }

      // Draw text
      const hasText = agencyName || phone;
      if (hasText) {
        const fontSize = Math.max(14, Math.round(H * 0.022));
        ctx.font = `600 ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
        ctx.textAlign = textAlign;
        ctx.textBaseline = "top";

        // Shadow for legibility
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = fillColor;

        if (row === 2 && !logoUrl) {
          currentY = cellY + cellH - padding - fontSize * (agencyName && phone ? 2.8 : 1.4);
        }

        if (agencyName) {
          ctx.fillText(agencyName, contentX, currentY);
          currentY += fontSize * 1.4;
        }
        if (phone) {
          ctx.font = `400 ${Math.round(fontSize * 0.9)}px 'Inter', 'Segoe UI', sans-serif`;
          ctx.fillText(phone, contentX, currentY);
        }
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }

      // Download
      canvas.toBlob((blob) => {
        if (!blob) { toast.error("Erro ao gerar imagem."); setRendering(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lamina-personalizada-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Imagem baixada com sucesso!");
        setRendering(false);
      }, "image/png");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
      setRendering(false);
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-primary/20">
            <Paintbrush className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Personalizador de Lâminas
            </h1>
            <p className="text-sm text-muted-foreground">
              Adicione seu logo e contato em lâminas de divulgação
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Preview Area */}
          <Card className="border-0 shadow-card overflow-hidden">
            <CardContent className="p-4">
              <div ref={previewRef} className="relative rounded-xl overflow-hidden bg-muted/50 min-h-[300px] flex items-center justify-center">
                {baseImage ? (
                  <>
                    <img
                      src={baseImage}
                      alt="Lâmina selecionada"
                      className="w-full h-auto block"
                      crossOrigin="anonymous"
                    />
                    {/* Grid overlay */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                      {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setGridPos(i)}
                          className={`border border-white/20 transition-all duration-150 hover:bg-white/15 ${
                            gridPos === i
                              ? "bg-primary/25 ring-2 ring-primary/60"
                              : ""
                          }`}
                          title={`Posição ${i + 1}`}
                        />
                      ))}
                    </div>
                    {/* Position indicator */}
                    <div
                      className="absolute pointer-events-none flex flex-col gap-1 max-w-[33%] p-2"
                      style={{
                        left: `${(gridPos % 3) * 33.33}%`,
                        top: `${Math.floor(gridPos / 3) * 33.33}%`,
                        textAlign: gridPos % 3 === 2 ? "right" : gridPos % 3 === 1 ? "center" : "left",
                        alignItems: gridPos % 3 === 2 ? "flex-end" : gridPos % 3 === 1 ? "center" : "flex-start",
                      }}
                    >
                      {logoUrl && (
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className={`object-contain ${
                            logoSize === "small" ? "h-6 sm:h-8" : logoSize === "medium" ? "h-8 sm:h-12" : "h-12 sm:h-16"
                          }`}
                          style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }}
                        />
                      )}
                      {(agencyName || phone) && (
                        <div className={`text-[10px] sm:text-xs font-semibold leading-tight ${
                          textColor === "dark" ? "text-foreground" : "text-white"
                        }`}
                          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
                        >
                          {agencyName && <div>{agencyName}</div>}
                          {phone && <div className="font-normal opacity-90">{phone}</div>}
                        </div>
                      )}
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={() => setBaseImage(null)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                    <ImageIcon className="h-16 w-16 opacity-30" />
                    <p className="text-sm">Selecione ou envie uma imagem para começar</p>
                    <div className="flex gap-2">
                      <label>
                        <Button variant="outline" size="sm" asChild disabled={uploading}>
                          <span className="cursor-pointer">
                            <Upload className="h-4 w-4 mr-1.5" />
                            Upload
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleBaseUpload(f);
                          }}
                        />
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGallery(!showGallery)}
                      >
                        <Grid3X3 className="h-4 w-4 mr-1.5" />
                        Galeria
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Gallery selector */}
              {showGallery && (
                <div className="mt-4 border rounded-xl p-3 bg-background">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-foreground">Lâminas disponíveis</p>
                    <Button variant="ghost" size="sm" onClick={() => setShowGallery(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {galleryLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !galleryImages?.length ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Nenhuma lâmina encontrada na galeria.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[250px] overflow-y-auto">
                      {galleryImages.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { setBaseImage(m.file_url); setShowGallery(false); }}
                          className="aspect-[4/5] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary/50 transition-all"
                        >
                          <img src={m.file_url} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {baseImage && (
                <div className="flex gap-2 mt-3">
                  <label className="flex-1">
                    <Button variant="outline" size="sm" className="w-full" asChild disabled={uploading}>
                      <span className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-1.5" />
                        Trocar imagem
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleBaseUpload(f);
                      }}
                    />
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowGallery(!showGallery)}
                  >
                    <Grid3X3 className="h-4 w-4 mr-1.5" />
                    Galeria
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Controls Panel */}
          <div className="space-y-4">
            {/* Logo */}
            <Card className="border-0 shadow-card">
              <CardContent className="pt-5 pb-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  Logotipo
                </h3>
                {logoUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden">
                      <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <Badge variant="secondary" className="w-fit text-xs">Logo ativo</Badge>
                      <div className="flex gap-1.5">
                        <label>
                          <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                            <span className="cursor-pointer text-xs">Trocar</span>
                          </Button>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleLogoUpload(f);
                            }}
                          />
                        </label>
                        <Button variant="ghost" size="sm" onClick={() => setLogoUrl(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label>
                    <Button variant="outline" size="sm" className="w-full" asChild disabled={uploadingLogo}>
                      <span className="cursor-pointer">
                        {uploadingLogo ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                        Enviar logotipo
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoUpload(f);
                      }}
                    />
                  </label>
                )}

                {/* Logo size */}
                {logoUrl && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Tamanho do logo</Label>
                    <Select value={logoSize} onValueChange={(v) => setLogoSize(v as LogoSize)}>
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LOGO_SIZES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Text Fields */}
            <Card className="border-0 shadow-card">
              <CardContent className="pt-5 pb-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Type className="h-4 w-4 text-primary" />
                  Texto
                </h3>
                <div>
                  <Label className="text-xs text-muted-foreground">Nome da agência</Label>
                  <Input
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Minha Agência de Viagens"
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Telefone / WhatsApp</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="mt-1 h-9"
                  />
                </div>

                {/* Text color */}
                <div>
                  <Label className="text-xs text-muted-foreground">Cor do texto</Label>
                  <div className="flex gap-1.5 mt-1.5">
                    {([
                      { value: "auto", label: "Auto", icon: Paintbrush },
                      { value: "light", label: "Claro", icon: Sun },
                      { value: "dark", label: "Escuro", icon: Moon },
                    ] as const).map((opt) => (
                      <Button
                        key={opt.value}
                        variant={textColor === opt.value ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={() => setTextColor(opt.value)}
                      >
                        <opt.icon className="h-3.5 w-3.5 mr-1" />
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Position */}
            <Card className="border-0 shadow-card">
              <CardContent className="pt-5 pb-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-primary" />
                  Posição
                </h3>
                <p className="text-xs text-muted-foreground">
                  Clique na grade da imagem ou selecione aqui
                </p>
                <div className="grid grid-cols-3 gap-1.5 w-full max-w-[180px]">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setGridPos(i)}
                      className={`aspect-square rounded-md border-2 transition-all text-xs font-medium ${
                        gridPos === i
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Download */}
            <Button
              onClick={renderAndDownload}
              disabled={!baseImage || rendering}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {rendering ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Download className="h-5 w-5 mr-2" />
              )}
              Baixar Imagem
            </Button>
          </div>
        </div>

        {/* Hidden canvas for rendering */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </DashboardLayout>
  );
}
