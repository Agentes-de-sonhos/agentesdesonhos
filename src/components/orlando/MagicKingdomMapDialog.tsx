import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import styles from "./MagicKingdomMapDialog.module.css";

/** The static approved document (and its full-resolution image) load only on open. */
export function MagicKingdomMapTrigger({ children, className, ariaLabel }: { children: ReactNode; className?: string; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeFromMap = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "magic-kingdom-map:close") setOpen(false);
    };
    window.addEventListener("message", closeFromMap);
    return () => window.removeEventListener("message", closeFromMap);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" className={className} aria-label={ariaLabel ?? "Abrir mapa interativo do Magic Kingdom"}>
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent hideClose className={styles.content} data-preview-interactive>
        <DialogTitle className="sr-only">Mapa interativo do Magic Kingdom</DialogTitle>
        <DialogDescription className="sr-only">Mapa de junho de 2026 com 84 pontos, busca e filtros de atrações, restaurantes e compras.</DialogDescription>
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon" className={styles.close} aria-label="Fechar mapa do Magic Kingdom"><X aria-hidden="true" /></Button>
        </DialogClose>
        {open && <iframe ref={frame} src="/maps/magic-kingdom.html" title="Mapa interativo do Magic Kingdom — junho de 2026" className={styles.frame} />}
      </DialogContent>
    </Dialog>
  );
}