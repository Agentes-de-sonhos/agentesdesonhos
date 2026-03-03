import { useState, useRef, useCallback, useEffect } from "react";
import {
  Heart,
  Download,
  ChevronLeft,
  ChevronRight,
  FolderDown,
  Loader2,
  Play,
  Volume2,
  VolumeX,
  Maximize2,
  Building2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import JSZip from "jszip";
import type { MaterialGallery, Material } from "@/types/materials";

interface SocialPostCardProps {
  gallery: MaterialGallery;
}

const getFileExtension = (url: string, materialType: string): string => {
  const urlMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (urlMatch) return urlMatch[1].toLowerCase();
  const typeExtensions: Record<string, string> = {
    Imagem: "jpg",
    PDF: "pdf",
    Lâmina: "pdf",
    Vídeo: "mp4",
  };
  return typeExtensions[materialType] || "file";
};

const sanitizeFilename = (title: string): string => {
  return title
    .replace(/[^a-zA-Z0-9áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s-]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100);
};

const isExternalVideo = (videoUrl: string): boolean => {
  return !!(
    videoUrl.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    ) || videoUrl.match(/vimeo\.com\/(\d+)/)
  );
};

const getEmbedUrl = (videoUrl: string): string => {
  const youtubeMatch = videoUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&mute=1&rel=0`;
  }
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1`;
  }
  return videoUrl;
};

export function SocialPostCard({ gallery }: SocialPostCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(() =>
    Math.floor(Math.random() * 800 + 200)
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const materials = gallery.materials;
  const current = materials[currentIndex];
  const isVideo = current.material_type === "Vídeo";
  const isImage = current.material_type === "Imagem";
  const url = current.video_url || current.file_url;

  const goTo = (idx: number) => {
    setCurrentIndex(
      ((idx % materials.length) + materials.length) % materials.length
    );
  };

  const handleLike = () => {
    setLiked((l) => !l);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  const formatLikes = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  // Swipe support
  const onTouchStart = (e: React.TouchEvent) =>
    setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(currentIndex + (diff > 0 ? 1 : -1));
    }
    setTouchStart(null);
  };

  const handleDownloadSingle = async () => {
    if (!url) return;
    if (isVideo && current.video_url && isExternalVideo(current.video_url)) {
      window.open(current.video_url, "_blank");
      toast.info("Vídeos externos abrem na plataforma original");
      return;
    }
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Falha");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${sanitizeFilename(current.title)}.${getFileExtension(url, current.material_type)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download iniciado!");
    } catch {
      toast.error("Erro ao baixar. Tente novamente.");
      if (url) window.open(url, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    const downloadable = materials.filter((m) => {
      const fileUrl = m.file_url || m.video_url;
      if (!fileUrl) return false;
      if (m.video_url && isExternalVideo(m.video_url)) return false;
      return true;
    });
    if (downloadable.length === 0) {
      toast.info("Nenhum arquivo disponível para download");
      return;
    }
    setIsDownloadingAll(true);
    const zip = new JSZip();
    try {
      toast.info(`Preparando ${downloadable.length} arquivos...`);
      const downloads = await Promise.allSettled(
        downloadable.map(async (material, index) => {
          const fileUrl = material.file_url || material.video_url;
          if (!fileUrl) return;
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error("Failed");
          const blob = await response.blob();
          const ext = getFileExtension(fileUrl, material.material_type);
          zip.file(
            `${String(index + 1).padStart(2, "0")}_${sanitizeFilename(material.title)}.${ext}`,
            blob
          );
        })
      );
      const ok = downloads.filter((d) => d.status === "fulfilled").length;
      if (ok === 0) throw new Error("Nenhum arquivo baixado");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const blobUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${sanitizeFilename(gallery.title)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success(`${ok} arquivos baixados!`);
    } catch {
      toast.error("Erro ao criar ZIP.");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Media renderer
  const renderMedia = () => {
    if (isVideo && current.video_url) {
      if (isExternalVideo(current.video_url)) {
        return (
          <iframe
            src={getEmbedUrl(current.video_url)}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={current.title}
          />
        );
      }
      return (
        <video
          src={current.video_url}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          controls={false}
        />
      );
    }
    if (isImage && current.file_url) {
      return (
        <img
          src={current.file_url}
          alt={current.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      );
    }
    if (current.thumbnail_url) {
      return (
        <img
          src={current.thumbnail_url}
          alt={current.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      );
    }
    return (
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
        <div className="text-muted-foreground/40 text-center">
          <Download className="h-12 w-12 mx-auto mb-2" />
          <p className="text-sm font-medium">{current.material_type}</p>
        </div>
      </div>
    );
  };

  // Fullscreen overlay
  const renderFullscreen = () => {
    if (!fullscreen) return null;
    return (
      <div
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
        onClick={() => setFullscreen(false)}
      >
        <button
          className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl z-10"
          onClick={() => setFullscreen(false)}
        >
          ✕
        </button>
        {isImage && current.file_url ? (
          <img
            src={current.file_url}
            alt={current.title}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        ) : isVideo && current.video_url ? (
          <div
            className="w-full max-w-4xl aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            {isExternalVideo(current.video_url) ? (
              <iframe
                src={getEmbedUrl(current.video_url)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={current.title}
              />
            ) : (
              <video
                src={current.video_url}
                className="w-full h-full"
                controls
                autoPlay
              />
            )}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {renderFullscreen()}
      <article className="bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden max-w-[540px] w-full mx-auto transition-shadow hover:shadow-xl">
        {/* Header - supplier info */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
            {gallery.trade_suppliers?.name?.[0]?.toUpperCase() || "M"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">
              {gallery.trade_suppliers?.name || "Material de Divulgação"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {gallery.category}
              {gallery.destination ? ` • ${gallery.destination}` : ""}
            </p>
          </div>
          {materials.length > 1 && (
            <Badge
              variant="secondary"
              className="text-xs shrink-0 font-medium"
            >
              {materials.length} arquivos
            </Badge>
          )}
        </div>

        {/* Media carousel - 4:5 aspect ratio */}
        <div
          ref={containerRef}
          className="relative w-full bg-black"
          style={{ aspectRatio: "4 / 5" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {renderMedia()}

          {/* Navigation arrows */}
          {materials.length > 1 && (
            <>
              <button
                onClick={() => goTo(currentIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => goTo(currentIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Counter badge */}
          {materials.length > 1 && (
            <div className="absolute top-3 right-3 z-10">
              <span className="bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm font-medium">
                {currentIndex + 1}/{materials.length}
              </span>
            </div>
          )}

          {/* Fullscreen button */}
          <button
            onClick={() => setFullscreen(true)}
            className="absolute bottom-3 right-3 z-10 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-all"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {/* Video indicator */}
          {isVideo && (
            <div className="absolute bottom-3 left-3 z-10">
              <span className="bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                <Play className="h-3 w-3 fill-white" /> Vídeo
              </span>
            </div>
          )}
        </div>

        {/* Dot indicators */}
        {materials.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-2.5">
            {materials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`rounded-full transition-all duration-200 ${
                  idx === currentIndex
                    ? "w-2 h-2 bg-primary"
                    : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between px-4 py-1.5">
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 group"
          >
            <Heart
              className={`h-6 w-6 transition-all duration-200 ${
                liked
                  ? "fill-red-500 text-red-500 scale-110"
                  : "text-foreground group-hover:text-red-400"
              }`}
            />
          </button>

          <div className="flex items-center gap-1">
            {gallery.isCanvaTemplate && gallery.canva_url ? (
              <Button
                variant="default"
                size="sm"
                className="gap-1.5"
                onClick={() => window.open(gallery.canva_url!, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                Editar no Canva
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-foreground hover:text-primary"
                  onClick={handleDownloadSingle}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                </Button>
                {materials.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-foreground hover:text-primary"
                    onClick={handleDownloadAll}
                    disabled={isDownloadingAll}
                  >
                    {isDownloadingAll ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <FolderDown className="h-5 w-5" />
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Like count */}
        <div className="px-4 pb-1">
          <p className="text-sm font-semibold text-foreground">
            {formatLikes(likeCount)} curtidas
          </p>
        </div>

        {/* Caption - hidden for Canva templates */}
        <div className="px-4 pb-4">
          {gallery.isCanvaTemplate ? (
            <p className="text-sm text-foreground">
              <span className="font-semibold">
                {gallery.trade_suppliers?.name || "Divulgação"}
              </span>{" "}
              {gallery.title}
              {gallery.destination && (
                <span className="text-muted-foreground"> 📍 {gallery.destination}</span>
              )}
            </p>
          ) : (() => {
            const caption = gallery.materials.find((m: any) => m.caption)?.caption || "";
            if (!caption) {
              return (
                <p className="text-sm text-foreground">
                  <span className="font-semibold">
                    {gallery.trade_suppliers?.name || "Divulgação"}
                  </span>{" "}
                  {gallery.title}
                  {gallery.destination && (
                    <span className="text-muted-foreground"> 📍 {gallery.destination}</span>
                  )}
                </p>
              );
            }
            const lines = caption.split("\n");
            const isLong = lines.length > 3 || caption.length > 150;
            const displayText = !captionExpanded && isLong
              ? lines.slice(0, 3).join("\n").substring(0, 150)
              : caption;
            return (
              <div className="space-y-1">
                <div className="flex items-start gap-1.5">
                  <p className="text-sm text-foreground flex-1 whitespace-pre-line">
                    <span className="font-semibold">
                      {gallery.trade_suppliers?.name || "Divulgação"}
                    </span>{" "}
                    {displayText}
                    {!captionExpanded && isLong && (
                      <button
                        onClick={() => setCaptionExpanded(true)}
                        className="text-muted-foreground hover:text-foreground ml-1 text-sm"
                      >
                        ... mais
                      </button>
                    )}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(caption);
                      setCopied(true);
                      toast.success("Legenda copiada!");
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Copiar legenda"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {captionExpanded && isLong && (
                  <button
                    onClick={() => setCaptionExpanded(false)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    menos
                  </button>
                )}
                {gallery.destination && (
                  <p className="text-xs text-muted-foreground">
                    📍 {gallery.destination}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </article>
    </>
  );
}
