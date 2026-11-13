import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import cadasturSeal from "@/assets/whitelabel/selo-cadastur.png.asset.json";
import certLimites from "@/assets/whitelabel/certificado-cadastur-100-limites.jpg.asset.json";
import certMundo from "@/assets/whitelabel/certificado-cadastur-o-mundo-em-cores.jpg.asset.json";
import certParaiso from "@/assets/paraiso/certificado-cadastur.pdf.asset.json";
import certJu from "@/assets/whitelabel/certificado-cadastur-destinos-com-a-ju.jpg.asset.json";
import certCurti from "@/assets/whitelabel/certificado-cadastur-curti.jpg.asset.json";
import certEssya from "@/assets/whitelabel/certificado-cadastur-essyatur.jpg.asset.json";

interface CadasturCertificate {
  url: string;
  agency: string;
  validityLabel?: string;
}

/** Certificado por agência autorizada (hostname). */
export function cadasturCertificateFor(hostname?: string | null): CadasturCertificate | null {
  const h = hostname ?? "";
  // Arena: documento enviado pelo proprietário, mantido sem alterar a validade impressa.
  if (h === "briefing-23-v1.preview.local") return {
    url: "/arena-travel-group/certificado-cadastur-2026-2028.webp",
    agency: "Arena Travel Group",
    validityLabel: "13/11/2026 a 13/11/2028",
  };
  if (/(^|\.)destinoscomaju\.com\.br$/i.test(h)) return { url: certJu.url, agency: "Destinos com a Ju" };
  if (h === "briefing-14-v1.preview.local" || /(^|\.)omundoemcores\.com\.br$/i.test(h)) return { url: certMundo.url, agency: "O Mundo em Cores" };
  if (/(^|\.)paraisoviagens\.com$/i.test(h)) return { url: certParaiso.url, agency: "Paraíso Viagens" };
  if (/100limites/i.test(h)) return { url: certLimites.url, agency: "100 Limites" };
  // Curti Viagens: site oficial e prévia técnica compartilham o certificado real (PDF 35.133.431/0001-00).
  if (/(^|\.)curtiviagens\.com\.br$/i.test(h) || h === "briefing-20-v1.preview.local") return { url: certCurti.url, agency: "Curti Viagens" };
  // Essyatur: certificado real (CNPJ 63.501.397/0001-15, válido 05/11/2025 a 05/11/2027).
  if (/(^|\.)essyatur\.com\.br$/i.test(h) || h === "essya-curti-v1.preview.local") return { url: certEssya.url, agency: "Essyatur" };
  return null;
}

/** Selo Cadastur clicável que abre o certificado em pop-up (fundo preto 75%). */
export function CadasturSeal({ className, lazy, hostname }: { className: string; lazy?: boolean; hostname?: string | null }) {
  const [open, setOpen] = useState(false);
  const certificate: CadasturCertificate = cadasturCertificateFor(hostname) ?? { url: certLimites.url, agency: "100 Limites" };

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

  if (!certificate.url) {
    return <img src={cadasturSeal.url} alt="Somos certificados Cadastur" loading={lazy ? "lazy" : undefined} className={`shrink-0 ${className}`} />;
  }

  const tip = `${certificate.agency}, uma Agência de Viagens licenciada pelo Ministério do Turismo`;
  const sealAlt = certificate.validityLabel ? "Certificado Cadastur" : "Somos certificados Cadastur";

  return (
    <>
      <span className="group relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver certificado Cadastur"
        data-preview-local="true"
        className="shrink-0 cursor-pointer rounded transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <img src={cadasturSeal.url} alt={sealAlt} loading={lazy ? "lazy" : undefined} className={className} />
      </button>
      {tip && (
        <span
          role="tooltip"
          className="wl-cadastur-tooltip pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border px-4 py-2.5 text-center text-sm leading-snug opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <span className="block font-semibold">Certificado CADASTUR</span>
          {tip}
        </span>
      )}
      </span>
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
              {/\.pdf$/i.test(certificate.url) ? (
                <iframe
                  src={`${certificate.url}#view=FitH&toolbar=0`}
                  title={`Certificado Cadastur da ${certificate.agency}`}
                  className="h-[80vh] w-full rounded-lg bg-white shadow-2xl"
                />
              ) : (
                <img
                  src={certificate.url}
                  alt={`Certificado Cadastur da ${certificate.agency}`}
                  className="max-h-[80vh] w-full rounded-lg object-contain shadow-2xl"
                />
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
