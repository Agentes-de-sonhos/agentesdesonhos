import { ArrowRight, BedDouble, Car, ShieldCheck, Headphones } from "lucide-react";
import f1 from "@/assets/whitelabel/sports/f1.jpg";
import football from "@/assets/whitelabel/sports/football.jpg";
import nfl from "@/assets/whitelabel/sports/nfl.jpg";
import nba from "@/assets/whitelabel/sports/nba.jpg";
import tennis from "@/assets/whitelabel/sports/tennis.jpg";
import motogp from "@/assets/whitelabel/sports/motogp.jpg";
import {
  AGENCY_SECTION_EYEBROW_CLASS,
  AGENCY_SECTION_HEADING_CLASS,
  AGENCY_SECTION_SUBTITLE_CLASS,
  AGENCY_SECTION_TITLE_CLASS,
} from "@/lib/agencySiteTypography";

/** Turismo esportivo: eventos e pilares (opt-in por perfil, seção "sports"). */
export const SPORTS_EVENTS = [
  { key: "f1", badge: "Automobilismo", title: "Fórmula 1", text: "Corridas em circuitos icônicos, incluindo o prestigiado GP de Mônaco.", image: f1 },
  { key: "champions", badge: "Futebol europeu", title: "UEFA Champions League", text: "A competição de clubes mais prestigiada do futebol europeu.", image: football },
  { key: "nfl", badge: "Futebol americano", title: "NFL e Super Bowl", text: "Jogos eletrizantes da principal liga e a final mais famosa do esporte.", image: nfl },
  { key: "nba", badge: "Basquete", title: "NBA", text: "Assista de perto às maiores estrelas do basquete mundial.", image: nba },
  { key: "tenis", badge: "Tênis", title: "Wimbledon, Roland-Garros e US Open", text: "Os torneios internacionais de tênis mais tradicionais do circuito.", image: tennis },
  { key: "motogp", badge: "Motociclismo", title: "MotoGP", text: "Os melhores pilotos do mundo em disputas emocionantes de velocidade.", image: motogp },
] as const;

const PILLARS = [
  { icon: ShieldCheck, title: "Ingressos oficiais", text: "Ingressos garantidos para jogos e finais." },
  { icon: BedDouble, title: "Hospedagem próxima", text: "Hotéis perto dos estádios e circuitos." },
  { icon: Car, title: "Transfers e VIP", text: "Transfers, experiências VIP e ativações para torcedores." },
  { icon: Headphones, title: "Pacote sob medida", text: "Viagem personalizada, do planejamento ao retorno." },
];

export function AgencySportsEventsSection({ container, onRequest }: { container: string; onRequest: () => void }) {
  return (
    <section id="esportes" className="scroll-mt-32 md:scroll-mt-36">
      <div className={`${container} py-14 md:py-24`}>
        <div className={AGENCY_SECTION_HEADING_CLASS}>
          <p className={AGENCY_SECTION_EYEBROW_CLASS}>TORÇA COM A GENTE</p>
          <h2 className={AGENCY_SECTION_TITLE_CLASS}>Viva os maiores eventos do esporte mundial</h2>
          <p className={AGENCY_SECTION_SUBTITLE_CLASS}>
            Ingressos oficiais, experiências exclusivas e suporte completo para a sua viagem esportiva. Também atendemos Copa do Mundo FIFA e Copa Libertadores da América.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SPORTS_EVENTS.map((e) => (
            <article key={e.key} className="group flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm">
              <div className="relative overflow-hidden">
                <img src={e.image} alt={e.title} width={1024} height={768} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]" />
                <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">{e.badge}</span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold text-foreground">{e.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{e.text}</p>
                <button type="button" onClick={onRequest} className="mt-5 inline-flex items-center gap-2 self-start text-sm font-semibold text-primary hover:underline">
                  Solicitar orçamento <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-6 rounded-md border border-border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4 md:p-8">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3">
              <Icon className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
