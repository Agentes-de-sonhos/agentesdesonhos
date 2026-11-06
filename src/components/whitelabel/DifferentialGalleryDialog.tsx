import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: { src: string; alt: string }[];
}

export function DifferentialGalleryDialog({ open, onOpenChange, title, items }: Props) {
  const [index, setIndex] = useState(0);
  const total = items.length;
  const go = (d: number) => setIndex((i) => (i + d + total) % total);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!total) return null;
  const item = items[index];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-preview-interactive className="max-w-5xl gap-4 p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-4 pr-8">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <span className="text-sm text-muted-foreground">{index + 1} / {total}</span>
        </div>
        <div className="relative overflow-hidden rounded-lg bg-muted">
          <img src={item.src} alt={item.alt} className="mx-auto max-h-[65vh] w-full object-contain" />
          <button type="button" onClick={() => go(-1)} aria-label="Anterior"
            className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-foreground shadow">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Próximo"
            className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-foreground shadow">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((it, i) => (
            <button key={it.src} type="button" onClick={() => setIndex(i)} aria-label={`Ver item ${i + 1}`}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded border-2 ${i === index ? "border-primary" : "border-transparent opacity-60"}`}>
              <img src={it.src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
