import { parseShipVideoUrl } from "@/lib/cruiseCabins";

/**
 * Vídeo do navio no link público.
 * Aceita apenas URLs válidas de YouTube/Vimeo; qualquer outro valor não renderiza nada.
 * Sem autoplay, responsivo (16:9) e com carregamento preguiçoso.
 */
export default function ShipVideoEmbed({ url, title }: { url?: string | null; title?: string }) {
  const video = parseShipVideoUrl(url);
  if (!video) return null;
  const label = title ? `Vídeo do navio ${title}` : "Vídeo do navio";
  return (
    <figure className="space-y-1.5">
      <div className="relative w-full overflow-hidden rounded-xl border border-border/40 bg-black/5 aspect-video">
        <iframe
          src={video.embedUrl}
          title={label}
          loading="lazy"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <figcaption className="text-[11px] text-muted-foreground">{label}</figcaption>
    </figure>
  );
}
