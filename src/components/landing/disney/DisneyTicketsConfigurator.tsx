import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Check, Loader2, Minus, Pencil, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useDisneyPreviewRequest } from "@/hooks/useDisneyPreviewRequest";
import { cn } from "@/lib/utils";
import {
  DISNEY_THEME_PARKS, DISNEY_WATER_PARKS, RECOMMENDATION_LABEL, THEME_DAYS_MAX, WATER_VISITS_MAX,
  buildDisneyRequest, clampThemeDays, clampWaterVisits, fmtDateBR, hopperApplies, monthLabel, recommendTicket,
  upcomingMonths, validatePeriod, validateTravelers, festivalNeedsEpcot, tripDaysInclusive, validateThemeDays, validateHopperIntent,
  type Choice3, type DisneyThemeParkId, type DisneyWaterParkId, type PeriodMode,
} from "@/lib/disneyTickets";
import { DISNEY_EVENTS, DISNEY_LOGOS, DISNEY_WATER_CALENDAR_URL, EVENT_STATUS_LABEL } from "./content";
import juPortrait from "@/assets/whitelabel/destinos-com-a-ju/hero-ju-magic-kingdom.png.asset.json";

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const contactSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  whatsapp: z.string().trim().refine((v) => v.replace(/\D/g, "").length >= 10, "Informe um WhatsApp válido com DDD.").pipe(z.string().max(30)),
  email: z.union([z.literal(""), z.string().trim().email("E-mail inválido.").max(200)]),
});
const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
};

function Step({ label, title, children, innerRef }: { label: string; title: string; children: React.ReactNode; innerRef?: (el: HTMLDivElement | null) => void }) {
  return (
    <div ref={innerRef} className="scroll-mt-28 rounded-xl border border-border bg-card p-5 shadow-sm md:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{label}</p>
      <h3 className="mt-2 text-balance text-2xl font-semibold leading-tight md:text-3xl">{title}</h3>
      <div className="mt-6">{children}</div>
    </div>
  );
}
function Opt({ active, onClick, children, className, ...rest }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button variant="outline" type="button" aria-pressed={active} onClick={onClick} {...rest}
      className={cn("relative block h-auto whitespace-normal rounded-lg border p-4 text-left", active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background hover:border-primary/50", className)}>
      {active && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" aria-hidden />}
      {children}
    </Button>
  );
}
function Counter({ label, value, min, max, onChange, testId }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; testId?: string }) {
  return (
    <span className="flex items-center gap-3">
      <Button type="button" size="icon" variant="outline" aria-label={`Diminuir ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus className="h-4 w-4" /></Button>
      <span className="w-20 text-center text-sm font-semibold" data-testid={testId}>{value}</span>
      <Button type="button" size="icon" variant="outline" aria-label={`Aumentar ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Plus className="h-4 w-4" /></Button>
    </span>
  );
}
const Err = ({ children }: { children?: string | null }) => children ? <p role="alert" className="mt-4 text-sm font-medium text-destructive">{children}</p> : null;
const CHOICES: [Choice3, string][] = [["yes", "Sim"], ["no", "Não"], ["guidance", "Quero orientação"]];

type StepId = "pick" | "period" | "days" | "hopper" | "water" | "summary" | "contact";

export function DisneyTicketsConfigurator({ hostname }: { hostname: string }) {
  const { submit, state, error, reset, simulated } = useDisneyPreviewRequest(hostname);
  const today = useMemo(todayIso, []);
  const monthOptions = useMemo(() => upcomingMonths(today, 24), [today]);
  const years = useMemo(() => Array.from(new Set(monthOptions.map((m) => m.slice(0, 4)))), [monthOptions]);

  const [reached, setReached] = useState<StepId[]>(["pick"]);
  const [errs, setErrs] = useState<Partial<Record<StepId, string | null>>>({});
  const [themes, setThemes] = useState<DisneyThemeParkId[]>([]);
  const [waters, setWaters] = useState<DisneyWaterParkId[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [periodMode, setPeriodMode] = useState<PeriodMode | null>(null);
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [months, setMonths] = useState<string[]>([]);
  const [year, setYear] = useState(years[0]);
  const [themeDays, setThemeDays] = useState(4);
  const [daysHelp, setDaysHelp] = useState(false);
  const [hopper, setHopper] = useState<Choice3 | null>(null);
  const [waterVisits, setWaterVisits] = useState(1);
  const [lightningLane, setLightningLane] = useState(false);
  const [hotelInterest, setHotelInterest] = useState(false);
  const [tenPlus, setTenPlus] = useState(2);
  const [kids, setKids] = useState(0);
  const [infants, setInfants] = useState(0);
  const [kidAges, setKidAges] = useState<string[]>([]);
  const [infantAges, setInfantAges] = useState<string[]>([]);
  const [festivalHelp, setFestivalHelp] = useState(false);
  const [contact, setContact] = useState({ name: "", whatsapp: "", email: "" });
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const sending = useRef(false);
  const refs = useRef<Partial<Record<StepId, HTMLDivElement | null>>>({});

  // Extras incompatíveis saem quando a escolha que os justificava deixa de existir.
  useEffect(() => { if (!hopperApplies(themes)) setHopper(null); if (!themes.length) setLightningLane(false); }, [themes]);
  // Cada grupo guarda suas idades: mudar um grupo nunca desloca as idades do outro.
  useEffect(() => { setKidAges((a) => Array.from({ length: kids }, (_, i) => a[i] ?? "")); }, [kids]);
  useEffect(() => { setInfantAges((a) => Array.from({ length: infants }, (_, i) => a[i] ?? "")); }, [infants]);
  const ages = [...kidAges, ...infantAges];
  const eventIntents = DISNEY_EVENTS.filter((e) => events.includes(e.id)).map((e) => ({ id: e.id, name: e.name, ticket: e.ticket }));
  const needsEpcot = festivalNeedsEpcot(themes, eventIntents);
  useEffect(() => { if (!needsEpcot) setFestivalHelp(false); }, [needsEpcot]);

  const sequence: StepId[] = ["pick", "period", ...(themes.length ? ["days" as const] : []), ...(hopperApplies(themes) ? ["hopper" as const] : []), ...(waters.length ? ["water" as const] : []), "summary", "contact"];
  const visible = sequence.filter((s) => reached.includes(s) || sequence.indexOf(s) <= Math.max(...reached.map((r) => sequence.indexOf(r))));
  const labelOf = (s: StepId) => `Etapa ${sequence.indexOf(s) + 1} de ${sequence.length}`;
  const rec = recommendTicket({ themes, waters, events: eventIntents, hopper, waterExtras: waters.length ? "yes" : "no" });
  const tripDays = periodMode === "dates" ? tripDaysInclusive(arrival, departure) : null;

  const validate = (s: StepId): string | null => {
    if (s === "pick") {
      if (!themes.length && !waters.length && !events.length) return "Escolha ao menos um parque ou evento.";
      if (needsEpcot && !festivalHelp) return "Os festivais do EPCOT estão incluídos na entrada do parque e precisam de um ingresso válido do EPCOT. Inclua o EPCOT nos parques temáticos ou peça orientação.";
      return null;
    }
    if (s === "period") return validatePeriod(periodMode, arrival, departure, months, today);
    if (s === "days") return validateThemeDays({ themes, themeDays, themeDaysHelp: daysHelp, periodMode, arrival, departure });
    if (s === "hopper") return hopper ? validateHopperIntent({ themes, themeDays, themeDaysHelp: daysHelp, hopper }) : "Conte se quer visitar mais de um parque no mesmo dia.";
    return null;
  };
  const scrollTo = (s: StepId) => setTimeout(() => refs.current[s]?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  const goNext = (s: StepId) => {
    for (const x of sequence.slice(0, sequence.indexOf(s) + 1)) {
      const e = validate(x);
      if (e) { setErrs({ [x]: e }); scrollTo(x); return; }
    }
    setErrs({});
    const next = sequence[sequence.indexOf(s) + 1];
    setReached((r) => (r.includes(next) ? r : [...r, next]));
    scrollTo(next);
  };
  const isLast = (s: StepId) => { const idx = visible.indexOf(s); return idx === visible.length - 1; };
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const periodText = periodMode === "dates" && arrival && departure ? `${fmtDateBR(arrival)} a ${fmtDateBR(departure)}` : periodMode === "months" && months.length ? months.map(monthLabel).join(", ") : "—";

  const onSubmit = async () => {
    if (sending.current || state === "submitting") return;
    for (const x of sequence.slice(0, -1)) { const e = validate(x); if (e) { setErrs({ [x]: e }); scrollTo(x); return; } }
    const tv = validateTravelers({ tenPlus, kids, infants, ages });
    if (tv) { setErrs({ contact: tv }); return; }
    const parsed = contactSchema.safeParse(contact);
    if (!parsed.success) { setErrs({ contact: parsed.error.issues[0]?.message ?? "Revise seus dados." }); return; }
    if (!consent) { setErrs({ contact: "Autorize o contato para receber sua cotação." }); return; }
    if (!periodMode || state === "success") return;
    setErrs({});
    sending.current = true;
    try {
      const payload = buildDisneyRequest({
        themes, waters, events: eventIntents,
        periodMode, arrival, departure, months, themeDays: themes.length && !daysHelp ? themeDays : null, themeDaysHelp: daysHelp,
        hopper, waterVisits: waters.length ? waterVisits : null, lightningLane, hotelInterest,
        tenPlus, kids, infants, ages: ages.map(Number), name: parsed.data.name, whatsapp: parsed.data.whatsapp, email: parsed.data.email,
      });
      await submit({ ...payload, honeypot });
    } finally { sending.current = false; }
  };

  if (state === "success") {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 text-center shadow-sm" role="status">
        <Check className="mx-auto h-10 w-10 text-primary" aria-hidden />
        {simulated ? (
          <>
            <h3 className="mt-4 text-2xl font-semibold">Simulação concluída</h3>
            <p className="mt-3 leading-7 text-muted-foreground" data-testid="disney-simulated">Prévia: envio simulado. Nada foi enviado ao CRM e ninguém vai entrar em contato a partir deste teste.</p>
          </>
        ) : (
          <>
            <h3 className="mt-4 text-2xl font-semibold">Recebi sua solicitação!</h3>
            <p className="mt-3 leading-7 text-muted-foreground">Vou analisar seu plano e confirmar o ingresso, a validade e as condições para as suas datas. Em breve entro em contato pelo WhatsApp.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="disney-configurator">
      <div className="flex flex-col items-center gap-6 rounded-xl bg-card p-6 shadow-sm sm:flex-row md:p-8">
        <span className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full md:h-32 md:w-32">
          <img src={juPortrait.url} alt="Juliana Neves Sanches, da Destinos com a Ju" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 25%" }} />
        </span>
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-primary">Oi, eu sou a Ju!</p>
          <h2 className="mt-1 text-balance text-3xl font-semibold leading-tight md:text-4xl">Vamos planejar seus ingressos Disney?</h2>
          <p className="mt-3 leading-7 text-muted-foreground">Me conte o que você quer viver no Walt Disney World. Eu indico a opção de ingresso para a cotação e confirmo produto, validade e preço para as suas datas.</p>
        </div>
      </div>
      {simulated && <p className="rounded-md border border-dashed border-border bg-muted/50 p-3 text-center text-xs text-muted-foreground">Prévia: os envios deste formulário são simulados e não chegam ao CRM.</p>}

      <Step label={labelOf("pick")} title="O que você quer incluir?" innerRef={(el) => (refs.current.pick = el)}>
        <p className="mb-3 text-sm font-semibold text-muted-foreground">Parques temáticos</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {DISNEY_THEME_PARKS.map((p) => (
            <Opt key={p.id} active={themes.includes(p.id)} onClick={() => setThemes((t) => toggle(t, p.id))} className="flex flex-col items-center gap-3 text-center" data-testid={`pick-${p.id}`}>
              <img src={DISNEY_LOGOS[p.id]} alt="" className="h-16 w-16 object-contain" /><span className="text-sm font-semibold">{p.name}</span>
            </Opt>
          ))}
        </div>
        <p className="mb-3 mt-6 text-sm font-semibold text-muted-foreground">Parques aquáticos <span className="font-normal">(visitas à parte, não contam como parque temático)</span></p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {DISNEY_WATER_PARKS.map((p) => (
            <Opt key={p.id} active={waters.includes(p.id)} onClick={() => setWaters((w) => toggle(w, p.id))} className="flex flex-col items-center gap-3 text-center" data-testid={`pick-${p.id}`}>
              <img src={DISNEY_LOGOS[p.id]} alt="" className="h-16 w-16 object-contain" /><span className="text-sm font-semibold">{p.name}</span>
            </Opt>
          ))}
        </div>
        <p className="mb-3 mt-6 text-sm font-semibold text-muted-foreground">Eventos especiais <span className="font-normal">(interesse; calendário variável)</span></p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DISNEY_EVENTS.map((e) => (
            <Opt key={e.id} active={events.includes(e.id)} onClick={() => setEvents((v) => toggle(v, e.id))} className="py-3 pr-9" data-testid={`pick-${e.id}`}>
              <span className="block text-sm font-semibold">{e.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{e.ticket === "included" ? "Incluído no ingresso do EPCOT" : "Ingresso separado"} · {EVENT_STATUS_LABEL[e.status]}</span>
            </Opt>
          ))}
        </div>
        {needsEpcot && (
          <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm" data-testid="disney-festival-needs-epcot">
            <p className="font-semibold">Festival do EPCOT não tem ingresso próprio</p>
            <p className="mt-1 text-muted-foreground">Ele acontece dentro do EPCOT e está incluído na entrada do parque: é preciso um ingresso válido do EPCOT no dia.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" className="rounded-md" onClick={() => setThemes((t) => (t.includes("epcot") ? t : [...t, "epcot"]))} data-testid="festival-add-epcot">Incluir EPCOT</Button>
              <Opt active={festivalHelp} onClick={() => setFestivalHelp((v) => !v)} className="px-3 py-2 pr-9 text-sm font-medium" data-testid="festival-help">Quero orientação</Opt>
            </div>
          </div>
        )}
        <Err>{errs.pick}</Err>
        {isLast("pick") && <Button className="mt-6 rounded-md" size="lg" onClick={() => goNext("pick")}>Continuar</Button>}
      </Step>

      {visible.includes("period") && (
        <Step label={labelOf("period")} title="Quando você pretende visitar?" innerRef={(el) => (refs.current.period = el)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Opt active={periodMode === "dates"} onClick={() => setPeriodMode("dates")}><span className="font-semibold">Já tenho as datas</span><span className="mt-1 block text-sm text-muted-foreground">Chegada e saída de Orlando.</span></Opt>
            <Opt active={periodMode === "months"} onClick={() => setPeriodMode("months")}><span className="font-semibold">Ainda não decidi</span><span className="mt-1 block text-sm text-muted-foreground">Marque os meses possíveis.</span></Opt>
          </div>
          {periodMode === "dates" && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">Chegada a Orlando<Input type="date" min={today} value={arrival} onChange={(e) => setArrival(e.target.value)} className="mt-2 h-12" aria-label="Chegada a Orlando" /></label>
              <label className="text-sm font-semibold">Saída de Orlando<Input type="date" min={arrival || today} value={departure} onChange={(e) => setDeparture(e.target.value)} className="mt-2 h-12" aria-label="Saída de Orlando" /></label>
            </div>
          )}
          {periodMode === "months" && (
            <div className="mt-6">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Ano da viagem">
                {years.map((y) => <Button key={y} type="button" size="sm" variant={y === year ? "default" : "outline"} onClick={() => setYear(y)} className="rounded-md">{y}</Button>)}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {monthOptions.filter((m) => m.startsWith(year)).map((m) => <Opt key={m} active={months.includes(m)} onClick={() => setMonths((v) => toggle(v, m).sort())} className="px-3 py-3 text-sm font-medium">{monthLabel(m)}</Opt>)}
              </div>
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">O período da viagem é separado da quantidade de dias de parque.</p>
          <Err>{errs.period}</Err>
          {isLast("period") && <Button className="mt-6 rounded-md" size="lg" onClick={() => goNext("period")}>Continuar</Button>}
        </Step>
      )}

      {visible.includes("days") && (
        <Step label={labelOf("days")} title="Quantos dias de parques temáticos?" innerRef={(el) => (refs.current.days = el)}>
          <div className="flex flex-wrap items-center gap-4">
            <Counter label="dias de parques temáticos" value={themeDays} min={1} max={THEME_DAYS_MAX} onChange={(v) => { setDaysHelp(false); setThemeDays(clampThemeDays(v)); }} testId="disney-theme-days" />
            <Opt active={daysHelp} onClick={() => setDaysHelp((h) => !h)} className="py-2.5 pr-9 text-sm font-medium">Quero ajuda para decidir</Opt>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">O ingresso padrão vai de 1 a 10 dias. Você pode repetir parques; não é preciso um dia para cada parque escolhido.</p>
          {tripDays && <p className="mt-2 text-sm text-muted-foreground" data-testid="disney-trip-days">Dias de viagem em Orlando: <strong>{tripDays}</strong> (contando chegada e saída). Dias de parque são as visitas; dias de chegada e saída costumam ficar livres.</p>}
          {!daysHelp && themes.length > themeDays && <p className="mt-2 text-sm text-muted-foreground">Você escolheu {themes.length} parques para {themeDays} {themeDays === 1 ? "dia" : "dias"}: para ver todos será preciso trocar de parque no mesmo dia.</p>}
          <Err>{errs.days}</Err>
          {errs.days && tripDays && themeDays > tripDays && <Button type="button" variant="outline" size="sm" className="mt-3 rounded-md" onClick={() => { setThemeDays(clampThemeDays(tripDays)); setErrs({}); }} data-testid="disney-fit-days">Ajustar para {Math.min(tripDays, THEME_DAYS_MAX)} {tripDays === 1 ? "dia" : "dias"}</Button>}
          {isLast("days") && <Button className="mt-6 rounded-md" size="lg" onClick={() => goNext("days")}>Continuar</Button>}
        </Step>
      )}

      {visible.includes("hopper") && (
        <Step label={labelOf("hopper")} title="Quer visitar mais de um parque temático no mesmo dia?" innerRef={(el) => (refs.current.hopper = el)}>
          <div className="grid gap-3 sm:grid-cols-3">
            {CHOICES.map(([v, l]) => <Opt key={v} active={hopper === v} onClick={() => setHopper(v)} data-testid={`hopper-${v}`}><span className="font-semibold">{l}</span></Opt>)}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Com Park Hopper, depois de entrar no primeiro parque você pode trocar durante o funcionamento, sujeito à capacidade.</p>
          <Err>{errs.hopper}</Err>
          {isLast("hopper") && <Button className="mt-6 rounded-md" size="lg" onClick={() => goNext("hopper")}>Continuar</Button>}
        </Step>
      )}

      {visible.includes("water") && (
        <Step label={labelOf("water")} title="Quantas visitas aos parques aquáticos?" innerRef={(el) => (refs.current.water = el)}>
          <Counter label="visitas aos parques aquáticos" value={waterVisits} min={1} max={WATER_VISITS_MAX} onChange={(v) => setWaterVisits(clampWaterVisits(v))} testId="disney-water-visits" />
          <p className="mt-4 text-sm text-muted-foreground">Cada visita é um uso separado. Os dois parques aquáticos não funcionam necessariamente ao mesmo tempo; <a href={DISNEY_WATER_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">veja o calendário oficial</a>.</p>
          {isLast("water") && <Button className="mt-6 rounded-md" size="lg" onClick={() => goNext("water")}>Continuar</Button>}
        </Step>
      )}

      {visible.includes("summary") && (
        <Step label={labelOf("summary")} title="O resumo do seu plano" innerRef={(el) => (refs.current.summary = el)}>
          <dl className="grid gap-4 text-sm sm:grid-cols-2" data-testid="disney-summary">
            {([
              ["Parques e eventos", [...themes.map((t) => DISNEY_THEME_PARKS.find((p) => p.id === t)!.name), ...waters.map((w) => DISNEY_WATER_PARKS.find((p) => p.id === w)!.name), ...DISNEY_EVENTS.filter((e) => events.includes(e.id)).map((e) => e.name)].join(", "), "pick"],
              ["Período", periodText, "period"],
              ...(themes.length ? [["Dias de temáticos", daysHelp ? "Quer ajuda para decidir" : `${themeDays} ${themeDays === 1 ? "dia" : "dias"}`, "days"]] : []),
              ...(hopperApplies(themes) ? [["Mais de um parque por dia", hopper ? CHOICES.find(([v]) => v === hopper)![1] : "—", "hopper"]] : []),
              ...(waters.length ? [["Visitas aquáticas", String(waterVisits), "water"]] : []),
            ] as [string, string, StepId][]).map(([t, v, s]) => (
              <div key={t} className="rounded-lg bg-muted/60 p-3">
                <dt className="flex items-center justify-between font-semibold">{t}<button type="button" onClick={() => scrollTo(s)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" aria-label={`Editar ${t}`}><Pencil className="h-3 w-3" />Editar</button></dt>
                <dd className="mt-1 text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          {rec && (
            <div className="mt-5 rounded-lg border border-primary/40 bg-primary/5 p-4" data-testid="disney-recommendation">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Opção indicada para cotação</p>
              <p className="mt-1 text-lg font-semibold">{RECOMMENDATION_LABEL[rec]}</p>
              <p className="mt-1 text-xs text-muted-foreground">É uma orientação, não um produto garantido. Confirmamos validade, benefícios, disponibilidade e preço.</p>
            </div>
          )}
          <p className="mb-3 mt-6 text-sm font-semibold">Também quero orientação sobre</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {themes.length > 0 && <Opt active={lightningLane} onClick={() => setLightningLane((v) => !v)} data-testid="extra-lightning-lane"><span className="font-semibold">Lightning Lane</span><span className="mt-1 block text-sm text-muted-foreground">Complemento pago para algumas atrações; não é ingresso nem "sem fila".</span></Opt>}
            <Opt active={hotelInterest} onClick={() => setHotelInterest((v) => !v)}><span className="font-semibold">Hotel Disney</span><span className="mt-1 block text-sm text-muted-foreground">Sem compromisso; o hotel entra como interesse.</span></Opt>
          </div>
          {isLast("summary") && <Button className="mt-6 rounded-md" size="lg" onClick={() => goNext("summary")}>Quero receber a cotação</Button>}
        </Step>
      )}

      {visible.includes("contact") && (
        <Step label={labelOf("contact")} title="Quem vai e como falamos com você" innerRef={(el) => (refs.current.contact = el)}>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {([["10 anos ou mais", tenPlus, setTenPlus, 1], ["Crianças de 3 a 9 anos", kids, setKids, 0], ["Menores de 3 anos", infants, setInfants, 0]] as const).map(([l, v, set, min]) => (
              <li key={l} className="flex flex-wrap items-center justify-between gap-3 p-4"><span className="font-medium">{l}</span><Counter label={l} value={v} min={min} max={12} onChange={set} /></li>
            ))}
          </ul>
          {infants > 0 && <p className="mt-2 text-xs text-muted-foreground">Menores de 3 não precisam de ingresso temático; contamos para logística e hospedagem.</p>}
          {ages.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {kidAges.map((a, i) => (
                <label key={`k${i}`} className="text-xs font-semibold">Idade na visita — criança {i + 1} (3 a 9)
                  <Input inputMode="numeric" value={a} onChange={(e) => setKidAges((x) => x.map((y, j) => (j === i ? e.target.value.replace(/\D/g, "").slice(0, 2) : y)))} className="mt-1 h-11" aria-label={`Idade da criança ${i + 1}`} />
                </label>
              ))}
              {infantAges.map((a, i) => (
                <label key={`i${i}`} className="text-xs font-semibold">Idade na visita — menor de 3 nº {i + 1} (0 a 2)
                  <Input inputMode="numeric" value={a} onChange={(e) => setInfantAges((x) => x.map((y, j) => (j === i ? e.target.value.replace(/\D/g, "").slice(0, 1) : y)))} className="mt-1 h-11" aria-label={`Idade do menor de 3 anos ${i + 1}`} />
                </label>
              ))}
            </div>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Nome<Input value={contact.name} maxLength={120} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="mt-2 h-12" autoComplete="name" /></label>
            <label className="text-sm font-semibold">WhatsApp<Input value={contact.whatsapp} inputMode="tel" onChange={(e) => setContact({ ...contact, whatsapp: formatPhone(e.target.value) })} className="mt-2 h-12" autoComplete="tel" placeholder="(11) 99999-9999" /></label>
            <label className="text-sm font-semibold sm:col-span-2">E-mail (opcional)<Input type="email" value={contact.email} maxLength={200} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="mt-2 h-12" autoComplete="email" /></label>
          </div>
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-muted-foreground">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-1" aria-label="Autorizo o contato" />
            Autorizo a Destinos com a Ju a entrar em contato sobre esta cotação.
          </label>
          <Err>{errs.contact}</Err>
          {state === "error" && (
            <div role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {error ?? "Não foi possível enviar agora."} Seus dados continuam aqui.
              <Button type="button" variant="outline" size="sm" className="ml-3 rounded-md" onClick={() => { reset(); void onSubmit(); }} data-testid="disney-retry"><RotateCcw className="mr-1.5 h-4 w-4" />Tentar novamente</Button>
            </div>
          )}
          <Button className="mt-6 w-full rounded-md sm:w-auto" size="lg" disabled={state === "submitting"} onClick={onSubmit} data-testid="disney-submit">
            {state === "submitting" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{simulated ? "Simulando…" : "Enviando…"}</> : simulated ? "Simular envio (prévia)" : "Solicitar cotação"}
          </Button>
        </Step>
      )}
    </div>
  );
}
