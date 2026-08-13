import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared media overlay primitive.
 *
 * Extracted from the Roteiros module (`ActivityPhotoEditor` in
 * `src/components/itinerary/ActivityMediaActions.tsx`), which was the original
 * implementation of the "icons over the image" pattern. It is now reused by the
 * quote destination gallery (`DestinationIntroEditor`) so both modules share the
 * exact same visual/interaction contract:
 *  - always visible on touch, hover-reveal on >= sm
 *  - keyboard focusable (focus-within keeps the overlay visible)
 */
export function MediaOverlayActions({
  children,
  className,
  align = "end",
}: {
  children: ReactNode;
  className?: string;
  align?: "center" | "end";
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-end gap-1 p-1.5",
        align === "center" ? "justify-center" : "justify-end",
        "bg-gradient-to-t from-black/55 via-black/10 to-transparent",
        "opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MediaOverlayButton({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-md bg-background/90 shadow-sm",
        "hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        destructive ? "text-destructive" : "text-foreground",
      )}
    >
      {children}
    </button>
  );
}
