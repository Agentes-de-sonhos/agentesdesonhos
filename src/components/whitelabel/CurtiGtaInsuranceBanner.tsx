import { ArrowRight, BriefcaseMedical, Headset, Luggage, ShieldCheck } from "lucide-react";
import gtaFundo from "@/assets/curti-gta-seguro-fundo.png.asset.json";
import gtaLogo from "@/assets/curti-gta-logo.png.asset.json";

// Cores oficiais da GTA (marca terceira), aplicadas apenas neste banner.
const GTA_QUOTE_URL = "https://seguro.gtawlabel.com.br/CURTIVIAGENS";
const BENEFITS = [
  { icon: BriefcaseMedical, label: "Assistência médica 24h" },
  { icon: Luggage, label: "Extravio de bagagem" },
  { icon: ShieldCheck, label: "Coberturas completas" },
  { icon: Headset, label: "Suporte em português" },
];

export function CurtiGtaInsuranceBanner({ container }: { container: string }) {
  return (
    <div className={container}>
      <div className="relative mx-auto w-full overflow-hidden rounded-3xl md:w-[77%] shadow-xl ring-1 ring-foreground/10 md:aspect-[4.62/1]">
        <img src={gtaFundo.url} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full object-cover object-right" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background/40 md:bg-gradient-to-r md:from-background/95 md:via-background/80 md:to-background/0" />
        <div className="relative flex h-full flex-col gap-4 p-5 md:max-w-[50%] md:flex-row md:items-center md:gap-6 md:px-8 md:py-4">
          <img src={gtaLogo.url} alt="GTA — Global Travel Assistance" loading="lazy" className="h-9 w-auto self-start md:h-12 md:self-center" />
          <div className="min-w-0">
            <h3 className="text-xl font-bold leading-tight text-[hsl(224_64%_24%)] md:text-2xl">Sua viagem merece proteção do início ao fim.</h3>
            <p className="mt-1 text-sm leading-snug text-[hsl(224_30%_30%)]">
              Imprevistos acontecem. Viaje tranquilo com o <strong className="font-semibold">Seguro Viagem GTA</strong>.
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-y-2 md:grid-cols-4 md:divide-x md:divide-[hsl(224_64%_24%/0.15)]">
              {BENEFITS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-1.5 px-2 first:pl-0">
                  <Icon className="h-5 w-5 shrink-0 text-[hsl(224_64%_24%)]" strokeWidth={1.75} />
                  <span className="text-[11px] font-semibold leading-tight text-[hsl(224_64%_24%)]">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="relative p-5 pt-0 md:absolute md:bottom-0 md:right-6 md:top-0 md:flex md:items-center md:p-0">
          <a
            href={GTA_QUOTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(356_78%_48%)] px-6 py-3 text-sm font-bold text-background shadow-lg transition hover:bg-[hsl(356_78%_42%)] md:w-auto"
          >
            Cotar meu seguro viagem <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
