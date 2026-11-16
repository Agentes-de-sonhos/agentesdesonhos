import { ArrowRight, BriefcaseMedical, Headset, Luggage, ShieldCheck } from "lucide-react";
import gtaFundo from "@/assets/curti-gta-seguro-fundo.png.asset.json";
import gtaLogo from "@/assets/curti-gta-logo.png.asset.json";

// Cores oficiais da GTA (marca terceira): azul-marinho e vermelho do logotipo,
// aplicadas como valores arbitrários apenas neste banner.
const BENEFITS = [
  { icon: BriefcaseMedical, label: "Assistência médica 24h" },
  { icon: Luggage, label: "Extravio de bagagem" },
  { icon: ShieldCheck, label: "Coberturas completas" },
  { icon: Headset, label: "Suporte em português" },
];

type CurtiGtaInsuranceBannerProps = {
  container: string;
  onQuote: () => void;
};

export function CurtiGtaInsuranceBanner({ container, onQuote }: CurtiGtaInsuranceBannerProps) {
  return (
    <div className={`${container} pb-14 md:pb-20`}>
      <div className="relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-foreground/10">
        <img
          src={gtaFundo.url}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-right"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background/40 md:bg-gradient-to-r md:from-background/95 md:via-background/85 md:to-background/10"
        />
        <div className="relative flex flex-col gap-6 p-6 pb-0 md:max-w-[46%] md:p-10 md:pb-24">
          <img
            src={gtaLogo.url}
            alt="GTA — Global Travel Assistance"
            loading="lazy"
            className="h-10 w-auto self-start md:h-12"
          />
          <div>
            <h3 className="text-2xl font-bold leading-tight text-[hsl(224_64%_24%)] md:text-4xl">
              Sua viagem merece proteção do início ao fim.
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-[hsl(224_30%_30%)] md:text-lg">
              Imprevistos acontecem. Viaje com mais tranquilidade e conte com o{" "}
              <strong className="font-semibold">Seguro Viagem GTA</strong> para aproveitar cada momento.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-y-5 md:grid-cols-4 md:divide-x md:divide-[hsl(224_64%_24%/0.15)]">
            {BENEFITS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-2 px-2 text-center">
                <Icon className="h-8 w-8 text-[hsl(224_64%_24%)]" strokeWidth={1.75} />
                <span className="text-xs font-semibold leading-snug text-[hsl(224_64%_24%)] md:text-sm">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative p-6 pt-0 md:static md:p-0">
          <button
            type="button"
            onClick={onQuote}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(356_78%_48%)] px-7 py-3.5 text-sm font-bold text-background shadow-lg transition hover:bg-[hsl(356_78%_42%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(356_78%_48%)] focus-visible:ring-offset-2 md:absolute md:bottom-8 md:right-8 md:w-auto"
          >
            Cotar meu seguro viagem <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
