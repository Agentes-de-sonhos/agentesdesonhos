import { useEffect } from "react";
import { normalizeHostname } from "@/lib/agencyDomains";

const PUBLIC_DOMAIN_LABELS: Record<string, string> = {
  "vitrine.tur.br": "VITRINE",
  "seuroteiro.tur.br": "SEU ROTEIRO",
  "seuorcamento.tur.br": "SEU ORÇAMENTO",
  "proximaviagem.tur.br": "PRÓXIMA VIAGEM",
  "contato.tur.br": "CONTATO",
  "carteiradigital.tur.br": "CARTEIRA DIGITAL",
};

const CLOUD_PATH = "M12.5 21A6.5 6.5 0 1 1 17.8 10.7A5.5 5.5 0 1 1 20.5 21Z";

export function publicDomainRootLabel(hostname: string, pathname: string) {
  if (pathname !== "/" && pathname !== "") return null;
  const host = normalizeHostname(hostname).replace(/^www\./, "");
  return PUBLIC_DOMAIN_LABELS[host] ?? null;
}

export default function PublicDomainRoot({ label }: { label: string }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${label} — Agentes de Sonhos`;
    return () => {
      document.title = previousTitle;
    };
  }, [label]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-public-root px-6 py-12 text-center">
      <div className="flex flex-col items-center">
        <svg
          viewBox="0 0 32 32"
          className="h-20 w-20 text-primary sm:h-24 sm:w-24"
          fill="none"
          role="img"
          aria-label="Agentes de Sonhos"
        >
          <path
            d={CLOUD_PATH}
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1 className="mt-6 text-xl font-semibold uppercase text-foreground sm:text-2xl">
          {label}
        </h1>
      </div>
    </main>
  );
}