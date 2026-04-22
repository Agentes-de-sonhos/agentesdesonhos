import { useState, useRef, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Download,
  Image as ImageIcon,
  Type,
  Grid3X3,
  Loader2,
  X,
  Sun,
  Paintbrush,
  Eye,
  EyeOff,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchAgentProfile } from "@/hooks/useAgentProfile";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";

type ElementId = "logo" | "agencyName" | "phone";
type TextAlign = "left" | "center" | "right";

// Posições e tamanhos são salvos em fração da lâmina (0..1) — independente de tela.
interface LayoutItem {
  x: number; // 0..1 (canto superior-esquerdo)
  y: number; // 0..1
  w: number; // 0..1 (largura relativa)
  h: number; // 0..1 (altura relativa)
  visible: boolean;
  align?: TextAlign; // alinhamento interno do texto (apenas para textos)
}

interface Layout {
  logo: LayoutItem;
  agencyName: LayoutItem;
  phone: LayoutItem;
}

const DEFAULT_LAYOUT: Layout = {
  // Padrão: logo no topo-esquerda e nome/telefone logo abaixo do logo
  logo:        { x: 0.04, y: 0.04, w: 0.18, h: 0.10, visible: true },
  agencyName:  { x: 0.04, y: 0.16, w: 0.40, h: 0.05, visible: true, align: "left" },
  phone:       { x: 0.04, y: 0.22, w: 0.40, h: 0.04, visible: true, align: "left" },
};

const STORAGE_KEY = "lamina-customizer-layout-v3";

const SNAP_THRESHOLD = 0.012; // 1.2% da lâmina
const SNAP_LINES = [0, 0.25, 0.5, 0.75, 1];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function loadStoredLayout(): Layout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return {
      logo: { ...DEFAULT_LAYOUT.logo, ...parsed.logo },
      agencyName: { ...DEFAULT_LAYOUT.agencyName, ...parsed.agencyName },
      phone: { ...DEFAULT_LAYOUT.phone, ...parsed.phone },
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function PersonalizadorLaminasContent() {
  const { user } = useAuth();
  const stageRef = useRef<HTMLDivElement>(null);

  // Conteúdo
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [baseImageNatural, setBaseImageNatural] = useState<{ w: number; h: number } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoNatural, setLogoNatural] = useState<{ w: number; h: number } | null>(null);
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  // "auto" = contraste automático, ou um HEX (ex: "#ff0000")
  const [textColor, setTextColor] = useState<string>("auto");

  // Layout livre
  const [layout, setLayout] = useState<Layout>(loadStoredLayout);
  const [selected, setSelected] = useState<ElementId | null>(null);
  const [activeGuides, setActiveGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  // UI / loading
  const [rendering, setRendering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [isExportingCapture, setIsExportingCapture] = useState(false);

  // Persistência local
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch { /* noop */ }
  }, [layout]);

  useEffect(() => {
    if (!stageRef.current) return;
    const updateSize = () => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      setStageSize({ w: rect.width, h: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stageRef.current);
    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [baseImage]);

  // Pré-preenche dados do perfil
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

  // Galeria de materiais
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

  // Carrega dimensões da imagem base
  useEffect(() => {
    if (!baseImage) { setBaseImageNatural(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBaseImageNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = baseImage;
  }, [baseImage]);

  // Carrega dimensões do logo (para manter proporção)
  useEffect(() => {
    if (!logoUrl) { setLogoNatural(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLogoNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = logoUrl;
  }, [logoUrl]);

  const handleBaseUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem válida."); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 15MB)."); return; }
    setUploading(true);
    setBaseImage(URL.createObjectURL(file));
    setUploading(false);
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem válida."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Logo muito grande (máx. 5MB)."); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logos/${user?.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      toast.success("Logo salvo para reutilização!");
    } catch {
      setLogoUrl(URL.createObjectURL(file));
      toast.info("Logo carregado localmente.");
    } finally {
      setUploadingLogo(false);
    }
  };

  // -------- Drag & resize logic --------
  const dragRef = useRef<{
    id: ElementId;
    mode: "move" | "nw" | "ne" | "sw" | "se" | "e" | "w";
    startPx: { x: number; y: number };
    startItem: LayoutItem;
    stage: { w: number; h: number };
  } | null>(null);

  const updateItem = useCallback((id: ElementId, patch: Partial<LayoutItem>) => {
    setLayout((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const applySnap = (val: number, others: number[]): { val: number; line: number | null } => {
    let best = { val, line: null as number | null, dist: SNAP_THRESHOLD };
    for (const o of others) {
      const d = Math.abs(val - o);
      if (d < best.dist) best = { val: o, line: o, dist: d };
    }
    return { val: best.val, line: best.line };
  };

  const onPointerDownItem = (
    e: React.PointerEvent,
    id: ElementId,
    mode: "move" | "nw" | "ne" | "sw" | "se" | "e" | "w"
  ) => {
    e.stopPropagation();
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    setSelected(id);
    dragRef.current = {
      id,
      mode,
      startPx: { x: e.clientX, y: e.clientY },
      startItem: { ...layout[id] },
      stage: { w: rect.width, h: rect.height },
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startPx.x) / drag.stage.w;
    const dy = (e.clientY - drag.startPx.y) / drag.stage.h;
    const item = drag.startItem;
    let next: LayoutItem = { ...item };

    if (drag.mode === "move") {
      next.x = clamp(item.x + dx, 0, 1 - item.w);
      next.y = clamp(item.y + dy, 0, 1 - item.h);
      // Snap (left, center, right) e (top, middle, bottom)
      const cx = next.x + next.w / 2;
      const cy = next.y + next.h / 2;
      const sxLeft = applySnap(next.x, SNAP_LINES);
      const sxCenter = applySnap(cx, SNAP_LINES);
      const sxRight = applySnap(next.x + next.w, SNAP_LINES);
      const syTop = applySnap(next.y, SNAP_LINES);
      const syMid = applySnap(cy, SNAP_LINES);
      const syBot = applySnap(next.y + next.h, SNAP_LINES);

      const vGuides: number[] = [];
      const hGuides: number[] = [];
      if (sxCenter.line !== null) { next.x = sxCenter.val - next.w / 2; vGuides.push(sxCenter.line); }
      else if (sxLeft.line !== null) { next.x = sxLeft.val; vGuides.push(sxLeft.line); }
      else if (sxRight.line !== null) { next.x = sxRight.val - next.w; vGuides.push(sxRight.line); }
      if (syMid.line !== null) { next.y = syMid.val - next.h / 2; hGuides.push(syMid.line); }
      else if (syTop.line !== null) { next.y = syTop.val; hGuides.push(syTop.line); }
      else if (syBot.line !== null) { next.y = syBot.val - next.h; hGuides.push(syBot.line); }

      next.x = clamp(next.x, 0, 1 - next.w);
      next.y = clamp(next.y, 0, 1 - next.h);
      setActiveGuides({ v: vGuides, h: hGuides });
    } else {
      // Resize — proporção:
      //  - logo: mantém proporção real da imagem
      //  - texto: mantém proporção da própria caixa (ao usar cantos), para escalar como elemento gráfico
      const isCorner = drag.mode === "nw" || drag.mode === "ne" || drag.mode === "sw" || drag.mode === "se";
      const keepRatio = (drag.id === "logo" && logoNatural) || (drag.id !== "logo" && isCorner);
      const ratioPx = drag.id === "logo" && logoNatural
        ? (logoNatural!.w / logoNatural!.h) * (drag.stage.h / drag.stage.w)
        : keepRatio
          ? (item.w / item.h) // já está em fração da lâmina
          : null;

      let nx = item.x, ny = item.y, nw = item.w, nh = item.h;
      if (drag.mode === "se") { nw = item.w + dx; nh = item.h + dy; }
      if (drag.mode === "ne") { nw = item.w + dx; nh = item.h - dy; ny = item.y + dy; }
      if (drag.mode === "sw") { nw = item.w - dx; nh = item.h + dy; nx = item.x + dx; }
      if (drag.mode === "nw") { nw = item.w - dx; nh = item.h - dy; nx = item.x + dx; ny = item.y + dy; }
      if (drag.mode === "e")  { nw = item.w + dx; }
      if (drag.mode === "w")  { nw = item.w - dx; nx = item.x + dx; }

      // limites mínimos
      const minW = drag.id === "logo" ? 0.04 : 0.08;
      const minH = drag.id === "logo" ? 0.03 : 0.02;
      if (nw < minW) {
        if (drag.mode === "sw" || drag.mode === "nw" || drag.mode === "w") nx = item.x + (item.w - minW);
        nw = minW;
      }
      if (nh < minH) {
        if (drag.mode === "ne" || drag.mode === "nw") ny = item.y + (item.h - minH);
        nh = minH;
      }

      if (ratioPx) {
        // Ajusta altura para manter proporção do logo
        nh = nw / ratioPx;
        if (drag.mode === "ne" || drag.mode === "nw") {
          ny = item.y + item.h - nh;
        }
      }

      // Mantém dentro da lâmina
      if (nx < 0) { nw += nx; nx = 0; }
      if (ny < 0) { nh += ny; ny = 0; }
      if (nx + nw > 1) nw = 1 - nx;
      if (ny + nh > 1) nh = 1 - ny;

      next = { ...item, x: nx, y: ny, w: nw, h: nh };
      setActiveGuides({ v: [], h: [] });
    }

    updateItem(drag.id, next);
  };

  const onPointerUp = () => {
    dragRef.current = null;
    setActiveGuides({ v: [], h: [] });
  };

  // Atalhos: alinhar
  const alignSelected = (
    axis: "h" | "v",
    pos: "start" | "center" | "end"
  ) => {
    if (!selected) return;
    const it = layout[selected];
    let next = { ...it };
    if (axis === "h") {
      if (pos === "start") next.x = 0.04;
      if (pos === "center") next.x = 0.5 - it.w / 2;
      if (pos === "end") next.x = 1 - 0.04 - it.w;
    } else {
      if (pos === "start") next.y = 0.04;
      if (pos === "center") next.y = 0.5 - it.h / 2;
      if (pos === "end") next.y = 1 - 0.04 - it.h;
    }
    updateItem(selected, next);
  };

  const centerSelected = () => {
    if (!selected) return;
    const it = layout[selected];
    updateItem(selected, { x: 0.5 - it.w / 2, y: 0.5 - it.h / 2 });
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    setSelected(null);
    toast.success("Layout resetado.");
  };

  const renderAndDownload = async () => {
    if (!baseImage || !stageRef.current) { toast.error("Selecione uma imagem base."); return; }
    setRendering(true);
    setIsExportingCapture(true);
    try {
      try { await (document as any).fonts?.ready; } catch { /* noop */ }
      await new Promise((resolve) => setTimeout(resolve, 80));

      const stage = stageRef.current;
      const canvas = await html2canvas(stage, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `lamina-personalizada-${Date.now()}.png`;
      a.click();
      toast.success("Imagem baixada com sucesso!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setRendering(false);
      setIsExportingCapture(false);
    }
  };

  // -------- UI helpers --------
  const elementLabel: Record<ElementId, string> = {
    logo: "Logotipo",
    agencyName: "Nome da agência",
    phone: "Telefone / WhatsApp",
  };

  const renderElementBox = (id: ElementId, content: React.ReactNode) => {
    const item = layout[id];
    if (!item.visible) return null;
    const isSelected = selected === id && !isExportingCapture;
    const isText = id !== "logo";
    return (
      <div
        key={id}
        onPointerDown={(e) => onPointerDownItem(e, id, "move")}
        className={`absolute cursor-move select-none touch-none ${isSelected ? "ring-2 ring-primary z-20" : "z-10 hover:ring-2 hover:ring-primary/40"}`}
        style={{
          left: `${item.x * 100}%`,
          top: `${item.y * 100}%`,
          width: `${item.w * 100}%`,
          height: `${item.h * 100}%`,
        }}
      >
        {content}
        {isSelected && (
          <>
            {(["nw", "ne", "sw", "se"] as const).map((corner) => (
              <div
                key={corner}
                onPointerDown={(e) => onPointerDownItem(e, id, corner)}
                className="absolute h-3 w-3 rounded-sm bg-primary border-2 border-background z-30"
                style={{
                  cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                  top: corner.startsWith("n") ? -6 : "auto",
                  bottom: corner.startsWith("s") ? -6 : "auto",
                  left: corner.endsWith("w") ? -6 : "auto",
                  right: corner.endsWith("e") ? -6 : "auto",
                }}
              />
            ))}
          </>
        )}
        {isSelected && isText && (
          <>
            {(["w", "e"] as const).map((side) => (
              <div
                key={side}
                onPointerDown={(e) => onPointerDownItem(e, id, side)}
                className="absolute h-6 w-2 rounded-sm bg-primary border-2 border-background z-30"
                style={{
                  cursor: "ew-resize",
                  top: "50%",
                  transform: "translateY(-50%)",
                  left: side === "w" ? -5 : "auto",
                  right: side === "e" ? -5 : "auto",
                }}
              />
            ))}
          </>
        )}
      </div>
    );
  };

  const getPreviewTextMetrics = (item: LayoutItem, text: string) => {
    const boxWidth = Math.max(1, stageSize.w * item.w);
    const boxHeight = Math.max(1, stageSize.h * item.h);
    let fontSize = Math.max(8, Math.round(boxHeight * 0.85));

    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const safeFamily = "Inter, Segoe UI, Arial, sans-serif";
        ctx.font = `${fontSize}px ${safeFamily}`;
        const measured = ctx.measureText(text || " ").width;
        if (measured > boxWidth && measured > 0) {
          fontSize = Math.max(8, Math.floor((fontSize * boxWidth) / measured));
        }
      }
    }

    return { fontSize, boxWidth, boxHeight };
  };

  // Estilo dinâmico para texto em pixels reais, evitando distorções visuais e garantindo exportação fiel.
  const textStyle = (item: LayoutItem, text: string): React.CSSProperties => {
    const { fontSize } = getPreviewTextMetrics(item, text);
    return {
      color: textColor === "auto" ? "#FFFFFF" : textColor,
      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
      fontSize: `${fontSize}px`,
      lineHeight: 1,
      textAlign: item.align ?? "left",
      display: "flex",
      alignItems: "center",
      justifyContent: item.align === "center" ? "center" : item.align === "right" ? "flex-end" : "flex-start",
      width: "100%",
      height: "100%",
      whiteSpace: "nowrap",
      overflow: "hidden",
    };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
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
              Arraste e redimensione livremente o logotipo, nome e telefone na lâmina
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Preview Area */}
          <Card className="border-0 shadow-card overflow-hidden">
            <CardContent className="p-4">
              <div
                ref={stageRef}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onPointerDown={() => setSelected(null)}
                className="relative rounded-xl overflow-hidden bg-muted/50 min-h-[300px] flex items-center justify-center"
                data-export-stage="true"
              >
                {baseImage ? (
                  <>
                    <img
                      src={baseImage}
                      alt="Lâmina selecionada"
                      className="w-full h-auto block pointer-events-none"
                      crossOrigin="anonymous"
                      draggable={false}
                    />

                    {/* Guias de snap */}
                    {!isExportingCapture && activeGuides.v.map((g, i) => (
                      <div
                        key={`v-${i}`}
                        className="absolute top-0 bottom-0 w-px bg-primary/80 pointer-events-none z-30"
                        style={{ left: `${g * 100}%` }}
                      />
                    ))}
                    {!isExportingCapture && activeGuides.h.map((g, i) => (
                      <div
                        key={`h-${i}`}
                        className="absolute left-0 right-0 h-px bg-primary/80 pointer-events-none z-30"
                        style={{ top: `${g * 100}%` }}
                      />
                    ))}

                    {/* Logo */}
                    {logoUrl && renderElementBox("logo", (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        draggable={false}
                        className="w-full h-full object-contain pointer-events-none"
                        style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }}
                      />
                    ))}

                    {/* Nome agência */}
                    {agencyName && renderElementBox("agencyName", (
                      <div className="font-semibold" style={textStyle(layout.agencyName)}>
                        <span className="block w-full" style={{ textAlign: layout.agencyName.align ?? "left" }}>
                          {agencyName}
                        </span>
                      </div>
                    ))}

                    {/* Telefone */}
                    {phone && renderElementBox("phone", (
                      <div className="font-normal" style={textStyle(layout.phone)}>
                        <span className="block w-full" style={{ textAlign: layout.phone.align ?? "left" }}>
                          {phone}
                        </span>
                      </div>
                    ))}

                    {/* Remove button */}
                    {!isExportingCapture && <button
                      onClick={(e) => { e.stopPropagation(); setBaseImage(null); }}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors z-40"
                    >
                      <X className="h-4 w-4" />
                    </button>}
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

              {/* Toolbar de seleção */}
              {baseImage && selected && (
                <div className="mt-3 rounded-xl border bg-background p-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{elementLabel[selected]}</Badge>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => alignSelected("h", "start")} title="Alinhar à esquerda">
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => alignSelected("h", "center")} title="Centralizar horizontalmente">
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => alignSelected("h", "end")} title="Alinhar à direita">
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => alignSelected("v", "start")} title="Alinhar ao topo">
                      <AlignVerticalJustifyStart className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => alignSelected("v", "center")} title="Centralizar verticalmente">
                      <AlignVerticalJustifyCenter className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => alignSelected("v", "end")} title="Alinhar à base">
                      <AlignVerticalJustifyEnd className="h-4 w-4" />
                    </Button>
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={centerSelected}>
                    Centralizar
                  </Button>
                  {selected !== "logo" && (
                    <>
                      <Separator orientation="vertical" className="h-6" />
                      <span className="text-[11px] text-muted-foreground">Texto:</span>
                      <div className="flex gap-1">
                        {(["left", "center", "right"] as const).map((a) => {
                          const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                          const active = (layout[selected].align ?? "left") === a;
                          return (
                            <Button
                              key={a}
                              size="icon"
                              variant={active ? "default" : "ghost"}
                              className="h-8 w-8"
                              onClick={() => updateItem(selected, { align: a })}
                              title={`Alinhar texto à ${a === "left" ? "esquerda" : a === "center" ? "centro" : "direita"}`}
                            >
                              <Icon className="h-4 w-4" />
                            </Button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs gap-1"
                    onClick={() => updateItem(selected, { visible: false })}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Ocultar
                  </Button>
                </div>
              )}

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

              <p className="text-xs text-muted-foreground mt-3">
                Dica: clique em um elemento para selecioná-lo. Arraste para mover, use as alças nos cantos do logo para redimensionar.
              </p>
            </CardContent>
          </Card>

          {/* Controls Panel */}
          <div className="space-y-4">
            {/* Logo */}
            <Card className="border-0 shadow-card">
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Logotipo
                  </h3>
                  <button
                    onClick={() => updateItem("logo", { visible: !layout.logo.visible })}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    title={layout.logo.visible ? "Ocultar" : "Mostrar"}
                  >
                    {layout.logo.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {layout.logo.visible ? "Visível" : "Oculto"}
                  </button>
                </div>
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
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Nome da agência</Label>
                    <button
                      onClick={() => updateItem("agencyName", { visible: !layout.agencyName.visible })}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {layout.agencyName.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {layout.agencyName.visible ? "Visível" : "Oculto"}
                    </button>
                  </div>
                  <Input
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Minha Agência de Viagens"
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Telefone / WhatsApp</Label>
                    <button
                      onClick={() => updateItem("phone", { visible: !layout.phone.visible })}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {layout.phone.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {layout.phone.visible ? "Visível" : "Oculto"}
                    </button>
                  </div>
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
                  <div className="mt-1.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={textColor === "auto" ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-9"
                        onClick={() => setTextColor("auto")}
                      >
                        <Sun className="h-3.5 w-3.5 mr-1" />
                        Auto
                      </Button>
                      <div className="relative h-9 w-9 shrink-0">
                        <input
                          type="color"
                          value={textColor.startsWith("#") ? textColor : "#ffffff"}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="absolute inset-0 h-full w-full cursor-pointer rounded-md border border-input bg-transparent p-0"
                          title="Escolher cor"
                        />
                      </div>
                      <Input
                        value={textColor === "auto" ? "" : textColor}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          if (!v) { setTextColor("auto"); return; }
                          // Aceita HEX (#abc, #aabbcc) ou nomes CSS
                          if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) || /^[a-zA-Z]+$/.test(v)) {
                            setTextColor(v.startsWith("#") ? v.toLowerCase() : v);
                          } else {
                            setTextColor(v); // permite digitar parcial
                          }
                        }}
                        placeholder="#ffffff"
                        className="h-9 text-xs flex-1"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Use "Auto" para contraste inteligente ou escolha uma cor personalizada.
                    </p>
                  </div>
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

      </div>
    </DashboardLayout>
  );
}

export default function PersonalizadorLaminas() {
  return (
    <SubscriptionGuard feature="lamina_customizer">
      <PersonalizadorLaminasContent />
    </SubscriptionGuard>
  );
}
