import { useEffect } from "react";
import { normalizeHostname } from "@/lib/agencyDomains";
import vitrineLogo from "@/assets/public-domains/vitrine.png.asset.json";
import seuRoteiroLogo from "@/assets/public-domains/seuroteiro.png.asset.json";
import seuOrcamentoLogo from "@/assets/public-domains/seuorcamento.png.asset.json";
import proximaViagemLogo from "@/assets/public-domains/proximaviagem.png.asset.json";
import contatoLogo from "@/assets/public-domains/contato.png.asset.json";
import carteiraDigitalLogo from "@/assets/public-domains/carteiradigital.png.asset.json";

const PUBLIC_DOMAINS: Record<string, { label: string; logo: string }> = {
  "vitrine.tur.br": { label: "VITRINE", logo: vitrineLogo.url },
  "seuroteiro.tur.br": { label: "SEU ROTEIRO", logo: seuRoteiroLogo.url },
  "seuorcamento.tur.br": { label: "SEU ORÇAMENTO", logo: seuOrcamentoLogo.url },
  "proximaviagem.tur.br": { label: "PRÓXIMA VIAGEM", logo: proximaViagemLogo.url },
  "contato.tur.br": { label: "CONTATO", logo: contatoLogo.url },
  "carteiradigital.tur.br": { label: "CARTEIRA DIGITAL", logo: carteiraDigitalLogo.url },
};

const LOGO_BY_LABEL = Object.fromEntries(
  Object.values(PUBLIC_DOMAINS).map((d) => [d.label, d.logo]),
);

export function publicDomainRootLabel(hostname: string, pathname: string) {
  if (pathname !== "/" && pathname !== "") return null;
  const host = normalizeHostname(hostname).replace(/^www\./, "");
  return PUBLIC_DOMAINS[host]?.label ?? null;
}

export default function PublicDomainRoot({ label }: { label: string }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${label} — Agentes de Sonhos`;
    return () => {
      document.title = previousTitle;
    };
  }, [label]);

  const logo = LOGO_BY_LABEL[label];

  return (
    <main className="flex min-h-screen items-center justify-center bg-public-root px-6 py-12 text-center">
      <div className="flex flex-col items-center">
        <h1 className="sr-only">{label}</h1>
        {logo ? (
          <img
            src={logo}
            alt={label}
            className="h-auto w-full max-w-[20rem] sm:max-w-[28rem]"
          />
        ) : (
          <p className="text-xl font-semibold uppercase text-foreground">{label}</p>
        )}
      </div>
    </main>
  );
}