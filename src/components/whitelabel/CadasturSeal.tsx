import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import cadasturSeal from "@/assets/whitelabel/selo-cadastur.png.asset.json";
import certLimites from "@/assets/whitelabel/certificado-cadastur-100-limites.jpg.asset.json";
import certMundo from "@/assets/whitelabel/certificado-cadastur-o-mundo-em-cores.jpg.asset.json";
import certJu from "@/assets/whitelabel/certificado-cadastur-destinos-com-a-ju.jpg.asset.json";

/** Certificado por agência autorizada (hostname). */
export function cadasturCertificateFor(hostname?: string | null) {
  const h = hostname ?? "";
  if (/(^|\.)destinoscomaju\.com\.br$/i.test(h)) return { url: certJu.url, agency: "Destinos com a Ju" };
  if (h === "briefing-14-v1.preview.local" || /(^|\.)omundoemcores\.com\.br$/i.test(h)) return { url: certMundo.url, agency: "O Mundo em Cores" };
  if (/100limites/i.test(h)) return { url: certLimites.url, agency: "100 Limites" };
  return null;
}

/** Selo Cadastur clicável que abre o certificado em pop-up (fundo preto 75%). */
export function CadasturSeal({ className, lazy, hostname }: { className: string; lazy?: boolean; hostname?: string | null }) {
  const [open, setOpen] = useState(false);
  const certificate = cadasturCertificateFor(hostname) ?? { url: certLimites.url, agency: "100 Limites" };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver certificado Cadastur"
        className="shrink-0 cursor-pointer rounded transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <img src={cadasturSeal.url} alt="Somos certificados Cadastur" loading={lazy ? "lazy" : undefined} className={className} />
      </button>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Certificado Cadastur"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in md:p-10"
          >
            <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                autoFocus
                className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform hover:scale-105"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              <img
                src={certificate.url}
                alt={`Certificado Cadastur da ${certificate.agency}`}
                className="max-h-[80vh] w-full rounded-lg object-contain shadow-2xl"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
