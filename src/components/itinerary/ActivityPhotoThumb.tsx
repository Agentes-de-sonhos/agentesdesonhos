import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { useActivityPhoto } from "@/hooks/useActivityPhoto";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  location?: string | null;
  destination?: string;
  className?: string;
}

/**
 * Small thumbnail of a representative photo for an activity.
 * Falls back to a subtle placeholder when no photo is available.
 */
export function ActivityPhotoThumb({ title, location, destination, className }: Props) {
  const { data, loading } = useActivityPhoto({ query: title, location, destination });
  const [errored, setErrored] = useState(false);

  const url = !errored ? data?.thumb_url ?? data?.photo_url ?? null : null;

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-md border bg-muted/50",
        "h-16 w-16 sm:h-20 sm:w-20",
        className
      )}
    >
      {url ? (
        <img
          src={url}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          {loading ? (
            <div className="h-full w-full animate-pulse bg-muted" />
          ) : (
            <ImageIcon className="h-5 w-5 opacity-40" />
          )}
        </div>
      )}
    </div>
  );
}
