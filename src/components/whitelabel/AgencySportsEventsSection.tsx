import { useEffect, useState } from "react";
import { ArrowRight, BedDouble, Car, ShieldCheck, Headphones, ChevronLeft, ChevronRight } from "lucide-react";
import libertadores from "@/assets/whitelabel/sports/libertadores-2026-v2.png.asset.json";
import sulamericana from "@/assets/whitelabel/sports/sulamericana-2026-v2.png.asset.json";
import londres from "@/assets/whitelabel/sports/classicos-londrinos-2027.jpg.asset.json";
import type { SportsEventChoice } from "@/components/whitelabel/AgencySportsRequestDialog";
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

/** Pacotes à venda divulgados no banner rotativo (dados das artes enviadas pela agência). */
export const SPORTS_PACKAGES: (SportsEventChoice & { badge: string; subtitle: string; image: string })[] = [
  { key: "libertadores-2026", badge: "Copa Libertadores", title: "Final da Libertadores 2026", subtitle: "Palmeiras na grande final · pacote com ingresso categoria 2", fixedDate: "26 a 29/11/2026 · final em 28/11", place: "Montevidéu, Uruguai · Estádio Centenário", image: libertadores.url, includes: ["Voo fretado direto Azul saindo de São Paulo", "3 noites de hospedagem 4★ ou similar", "Café da manhã", "Traslados aeroporto e para o jogo", "Ingresso categoria 2", "Kit torcedor", "Equipe no destino", "Seguro viagem"], price: "A partir de 10x de R$ 1.709,26", priceNote: "ou R$ 16.237,97 no PIX · por pessoa · apartamento duplo" },
  { key: "sulamericana-2026", badge: "Copa Sul-Americana", title: "Final da Sul-Americana 2026", subtitle: "Atlético Mineiro na grande final · pacote com ingresso categoria 2", fixedDate: "20 a 22/11/2026 · final em 21/11", place: "Barranquilla, Colômbia · Estádio Metropolitano Roberto Meléndez", image: sulamericana.url, includes: ["Voo Avianca", "2 noites de hospedagem 4★", "Ingresso categoria 2", "Traslados", "Seguro viagem"], price: "A partir de 10x de R$ 1.067,80", priceNote: "ou R$ 10.678,00 por pessoa · apartamento triplo · saída de São Paulo" },
  { key: "classicos-londrinos-2027", badge: "Premier League", title: "Clássicos Londrinos 2027", subtitle: "Especial Carnaval · 2 jogos do Manchester City (Fulham × Man City 06/02 e Tottenham × Man City 10/02, sujeitos à confirmação)", fixedDate: "05 a 12/02/2027", place: "Londres, Inglaterra · 7 noites em Kensington", image: londres.url, includes: ["Voos Iberia", "7 noites de hospedagem 4★", "2 ingressos oficiais", "Traslados privativos", "City tour + London Eye"], price: "A partir de 6x de R$ 3.761,89", priceNote: "ou R$ 22.571,34 por pessoa + taxas de embarque" },
];

function SportsPackagesBanner({ onRequest }: { onRequest: (p: SportsEventChoice) => void }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = SPORTS_PACKAGES.length;
  useEffect(() => { if (paused) return; const t = setInterval(() => setI(v => (v + 1) % n), 7000); return () => clearInterval(t); }, [paused, n]);
  const p = SPORTS_PACKAGES[i];
  return (
    <div className="relative mt-10 overflow-hidden rounded-md border border-border bg-card shadow-sm" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carrossel" aria-label="Pacotes esportivos à venda">
      <div key={p.key} className="animate-in fade-in duration-500">
        <button type="button" onClick={() => onRequest(p)} className="block w-full bg-muted" aria-label={`Ver pacote ${p.title}`}>
          <img src={p.image} alt={p.title} className="h-auto w-full object-contain" />
        </button>
      </div>
      <button type="button" onClick={() => setI((i - 1 + n) % n)} aria-label="Pacote anterior" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 text-foreground shadow"><ChevronLeft className="h-5 w-5" /></button>
      <button type="button" onClick={() => setI((i + 1) % n)} aria-label="Próximo pacote" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 text-foreground shadow"><ChevronRight className="h-5 w-5" /></button>
      <div className="absolute bottom-3 right-4 flex gap-2">
        {SPORTS_PACKAGES.map((x, k) => <button key={x.key} type="button" onClick={() => setI(k)} aria-label={`Ir para ${x.title}`} aria-current={k === i} className={`h-2.5 rounded-full transition-all ${k === i ? "w-6 bg-primary" : "w-2.5 bg-muted-foreground/40"}`} />)}
      </div>
    </div>
  );
}

const PILLARS = [
  { icon: ShieldCheck, title: "Ingressos oficiais", text: "Ingressos garantidos para jogos e finais." },
  { icon: BedDouble, title: "Hospedagem próxima", text: "Hotéis perto dos estádios e circuitos." },
  { icon: Car, title: "Transfers e VIP", text: "Transfers, experiências VIP e ativações para torcedores." },
  { icon: Headphones, title: "Pacote sob medida", text: "Viagem personalizada, do planejamento ao retorno." },
];

export function AgencySportsEventsSection({ container, onRequest }: { container: string; onRequest: (event: SportsEventChoice) => void }) {
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

        <SportsPackagesBanner onRequest={onRequest} />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SPORTS_EVENTS.map((e) => (
            <article key={e.key} className="group flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm">
              <div className="relative overflow-hidden">
                <img src={e.image} alt={e.title} width={1024} height={768} loading="lazy" className="aspect-[8/3] w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]" />
                <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">{e.badge}</span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold text-foreground">{e.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{e.text}</p>
                <button type="button" onClick={() => onRequest({ key: e.key, title: e.title })} className="mt-5 inline-flex items-center gap-2 self-start text-sm font-semibold text-primary hover:underline">
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
