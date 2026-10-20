import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Check, Loader2, Minus, Plus, RotateCcw, TrainFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TravelersFields } from "@/components/whitelabel/TravelersFields";
import { WhatsappGroupInvite } from "@/components/whitelabel/WhatsappGroupInvite";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { cn } from "@/lib/utils";
import {
  UNIVERSAL_EXTRAS, UNIVERSAL_TICKET_PARKS, allowedExtras, bothClassicParks, buildUniversalRequest, calendarDays,
  effectiveDays, fmtDateBR, hhnEligible, maxDaysFor, monthLabel, normalizeDays, orderParks, parkName, totalDays,
  upcomingMonths, validatePeriod, type DaysMode, type ExtraId, type PeriodMode, type UniversalParkId,
} from "@/lib/universalTickets";
import logoUsf from "@/assets/orlando/parks/park-universal-studios.asset.json";
import logoIoa from "@/assets/orlando/parks/park-islands-of-adventure.asset.json";
import logoEpic from "@/assets/orlando/parks/park-epic-universe.asset.json";
import logoVb from "@/assets/orlando/parks/park-volcano-bay.asset.json";
import logoHhn from "@/assets/orlando/parks/park-universal-halloween.asset.json";
import logoUniversal from "@/assets/orlando/universal.asset.json";
import juPortrait from "@/assets/whitelabel/destinos-com-a-ju/hero-ju-magic-kingdom.png.asset.json";

const LOGOS: Record<UniversalParkId, string> = {
  "universal-studios": logoUsf.url, "islands-of-adventure": logoIoa.url, "epic-universe": logoEpic.url, "volcano-bay": logoVb.url,
};
const EXTRA_LOGOS: Record<ExtraId, string> = { express: logoUniversal.url, vip: logoUniversal.url, hhn: logoHhn.url };

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

function Step({ n, title, children, innerRef }: { n: number; title: string; children: React.ReactNode; innerRef?: (el: HTMLDivElement | null) => void }) {
  return (
    <div ref={innerRef} className="scroll-mt-28 rounded-xl border border-border bg-card p-5 shadow-sm md:p-8" data-step={n}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Etapa {n}</p>
      <h3 className="mt-2 text-balance text-2xl font-semibold leading-tight md:text-3xl">{title}</h3>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Choice({ active, onClick, children, className, ...rest }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} {...rest}
      className={cn("relative rounded-lg border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
        active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background hover:border-primary/50", className)}>
      {active && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" aria-hidden />}
      {children}
    </button>
  );
}

const ErrorText = ({ children }: { children?: string | null }) => children ? <p role="alert" className="mt-4 text-sm font-medium text-destructive">{children}</p> : null;

export function UniversalTicketsConfigurator({ hostname }: { hostname: string }) {
  const { submit, state, error, reset } = useAgencySiteRequest(hostname);
  const today = useMemo(todayIso, []);
  const monthOptions = useMemo(() => upcomingMonths(today, 24), [today]);
  const years = useMemo(() => Array.from(new Set(monthOptions.map((m) => m.slice(0, 4)))), [monthOptions]);

  const [revealed, setRevealed] = useState(1);
  const [stepError, setStepError] = useState<Record<number, string | null>>({});
  const [selected, setSelected] = useState<UniversalParkId[]>([]);
  const [periodMode, setPeriodMode] = useState<PeriodMode | null>(null);
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [months, setMonths] = useState<string[]>([]);
  const [year, setYear] = useState(years[0]);
  const [daysMode, setDaysMode] = useState<DaysMode | null>(null);
  const [rawDays, setRawDays] = useState<Partial<Record<UniversalParkId, number>>>({});
  const [parkToPark, setParkToPark] = useState<boolean | null>(null);
  const [extras, setExtras] = useState<ExtraId[]>([]);
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [ages, setAges] = useState<string[]>([]);
  const [contact, setContact] = useState({ name: "", whatsapp: "", email: "" });
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const sending = useRef(false);
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const ordered = orderParks(selected);
  const both = bothClassicParks(ordered);
  const days = effectiveDays(ordered, daysMode ?? "one_each", normalizeDays(ordered, rawDays));
  const total = totalDays(days);
  const eligibleHhn = hhnEligible(periodMode, arrival, departure, months);
  const activeExtras = allowedExtras(extras, eligibleHhn);

  // Dados dependentes: nunca guardar escolhas que deixaram de valer.
  useEffect(() => { if (!both) setParkToPark(null); }, [both]);
  useEffect(() => { if (!eligibleHhn) setExtras((e) => e.filter((x) => x !== "hhn")); }, [eligibleHhn]);
  useEffect(() => { setRawDays((d) => normalizeDays(ordered, d)); }, [ordered.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Etapas: 1 parques, 2 período, 3 dias, 4 troca (só com os dois parques clássicos), 5 resumo, 6 cotação.
  const sequence = [1, 2, 3, ...(both ? [4] : []), 5, 6];
  const nextOf = (n: number) => sequence[sequence.indexOf(n) + 1];

  const calDays = periodMode === "dates" ? calendarDays(arrival, departure) : null;
  const validate = (n: number): string | null => {
    if (n === 1) return ordered.length ? null : "Escolha pelo menos um parque para continuar.";
    if (n === 2) return validatePeriod(periodMode, arrival, departure, months, today);
    if (n === 3) {
      if (!daysMode) return "Escolha como quer distribuir os dias.";
      if (calDays != null && total > calDays) return `Os dias de parque escolhidos não cabem na sua estadia em Orlando (${calDays} ${calDays === 1 ? "dia" : "dias"} entre chegada e saída). Reduza os dias ou ajuste as datas.`;
      return null;
    }
    if (n === 4) return parkToPark === null ? "Conte se quer trocar de parque no mesmo dia." : null;
    return null;
  };

  const goNext = (n: number) => {
    for (const s of sequence.slice(0, sequence.indexOf(n) + 1)) {
      const err = validate(s);
      if (err) { setStepError((e) => ({ ...e, [s]: err })); stepRefs.current[s]?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    }
    setStepError({});
    const target = nextOf(n);
    setRevealed((r) => Math.max(r, target));
    setTimeout(() => stepRefs.current[target]?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  const clearErr = (n: number) => setStepError((e) => (e[n] ? { ...e, [n]: null } : e));

  const togglePark = (id: UniversalParkId) => { clearErr(1); setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); };
  const toggleMonth = (ym: string) => { clearErr(2); setMonths((m) => (m.includes(ym) ? m.filter((x) => x !== ym) : [...m, ym].sort())); };
  const setParkDays = (id: UniversalParkId, value: number) => {
    clearErr(3);
    const max = maxDaysFor(id, ordered, days);
    setRawDays((d) => ({ ...normalizeDays(ordered, d), [id]: Math.min(max, Math.max(1, value)) }));
  };
  const onChildren = (v: string) => {
    const n = Math.max(0, Math.min(12, Number(v) || 0));
    setChildren(String(n));
    setAges((a) => Array.from({ length: n }, (_, i) => a[i] ?? ""));
  };

  const periodText = periodMode === "dates" && arrival && departure ? `${fmtDateBR(arrival)} a ${fmtDateBR(departure)}, em Orlando`
    : periodMode === "months" && months.length ? months.map(monthLabel).join(", ") : "";

  const onSubmit = async () => {
    if (sending.current || state === "submitting") return;
    for (const s of sequence.slice(0, -1)) { const err = validate(s); if (err) { setStepError({ [s]: err }); stepRefs.current[s]?.scrollIntoView({ behavior: "smooth", block: "start" }); return; } }
    const parsed = contactSchema.safeParse(contact);
    if (!parsed.success) { setStepError({ 6: parsed.error.issues[0]?.message ?? "Revise seus dados." }); return; }
    const nAdults = Number(adults) || 0;
    if (nAdults < 1) { setStepError({ 6: "Informe ao menos um adulto." }); return; }
    if (ages.some((a) => a === "")) { setStepError({ 6: "Informe a idade de cada criança na data da viagem." }); return; }
    if (!consent) { setStepError({ 6: "Autorize o contato para receber sua cotação." }); return; }
    setStepError({});
    sending.current = true;
    try {
      const payload = buildUniversalRequest({
        selected: ordered, daysMode: daysMode ?? "one_each", days, periodMode: periodMode!, arrival, departure, months,
        parkToPark, extras: activeExtras, adults: nAdults, childAges: ages.map(Number),
        name: parsed.data.name, whatsapp: parsed.data.whatsapp, email: parsed.data.email,
      });
      await submit({ ...payload, honeypot });
    } finally {
      sending.current = false;
    }
  };

  if (state === "success") {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 text-center shadow-sm" role="status">
        <Check className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h3 className="mt-4 text-2xl font-semibold">Recebi sua solicitação!</h3>
        <p className="mt-3 text-pretty leading-7 text-muted-foreground">Vou analisar o seu plano e identificar o ingresso que combina com ele. Em breve entro em contato pelo WhatsApp.</p>
        <WhatsappGroupInvite hostname={hostname} className="mt-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="universal-configurator">
      <div className="flex flex-col items-center gap-6 rounded-xl bg-card p-6 shadow-sm sm:flex-row md:p-8">
        <img src={juPortrait.url} alt="Juliana Neves Sanches, da Destinos com a Ju" className="h-28 w-28 shrink-0 rounded-full object-cover object-[50%_20%] md:h-32 md:w-32" />
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-primary">Oi, eu sou a Ju!</p>
          <h2 className="mt-1 text-balance text-3xl font-semibold leading-tight md:text-4xl">Vamos encontrar o seu ingresso?</h2>
          <p className="mt-3 text-pretty leading-7 text-muted-foreground">Me conte quais parques você quer conhecer, quando vai estar em Orlando e quantos dias quer aproveitar. Eu monto a cotação com o ingresso certo para o seu plano.</p>
        </div>
      </div>

      <Step n={1} title="Quais parques você quer conhecer?" innerRef={(el) => (stepRefs.current[1] = el)}>
        <p className="mb-3 text-sm font-semibold text-muted-foreground">Parques temáticos</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {UNIVERSAL_TICKET_PARKS.filter((p) => p.kind === "theme").map((p) => (
            <Choice key={p.id} active={selected.includes(p.id)} onClick={() => togglePark(p.id)} className="flex flex-col items-center gap-3 text-center">
              <img src={LOGOS[p.id]} alt="" className="h-20 w-20 object-contain" />
              <span className="text-sm font-semibold">{p.name}</span>
            </Choice>
          ))}
        </div>
        <p className="mb-3 mt-6 text-sm font-semibold text-muted-foreground">Parque aquático</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {UNIVERSAL_TICKET_PARKS.filter((p) => p.kind === "water").map((p) => (
            <Choice key={p.id} active={selected.includes(p.id)} onClick={() => togglePark(p.id)} className="flex flex-col items-center gap-3 text-center">
              <img src={LOGOS[p.id]} alt="" className="h-20 w-20 object-contain" />
              <span className="text-sm font-semibold">{p.name}</span>
            </Choice>
          ))}
        </div>
        <ErrorText>{stepError[1]}</ErrorText>
        {revealed <= 1 && <Button className="mt-6 rounded-md" size="lg" onClick={() => goNext(1)}>Continuar</Button>}
      </Step>

      {revealed >= 2 && (
        <Step n={2} title="Quando você vai estar em Orlando?" innerRef={(el) => (stepRefs.current[2] = el)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice active={periodMode === "dates"} onClick={() => { clearErr(2); setPeriodMode("dates"); }}><span className="font-semibold">Já tenho as datas</span><span className="mt-1 block text-sm text-muted-foreground">Chegada e saída de Orlando.</span></Choice>
            <Choice active={periodMode === "months"} onClick={() => { clearErr(2); setPeriodMode("months"); }}><span className="font-semibold">Ainda estou escolhendo</span><span className="mt-1 block text-sm text-muted-foreground">Marque os meses possíveis.</span></Choice>
          </div>
          {periodMode === "dates" && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">Chegada a Orlando
                <Input type="date" min={today} value={arrival} onChange={(e) => { clearErr(2); setArrival(e.target.value); }} className="mt-2 h-12" aria-label="Chegada a Orlando" />
              </label>
              <label className="text-sm font-semibold">Saída de Orlando
                <Input type="date" min={arrival || today} value={departure} onChange={(e) => { clearErr(2); setDeparture(e.target.value); }} className="mt-2 h-12" aria-label="Saída de Orlando" />
              </label>
            </div>
          )}
          {periodMode === "months" && (
            <div className="mt-6">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Ano da viagem">
                {years.map((y) => <Button key={y} type="button" size="sm" variant={y === year ? "default" : "outline"} onClick={() => setYear(y)} className="rounded-md">{y}</Button>)}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {monthOptions.filter((m) => m.startsWith(year)).map((m) => (
                  <Choice key={m} active={months.includes(m)} onClick={() => toggleMonth(m)} className="px-3 py-3 text-sm font-medium capitalize">{monthLabel(m)}</Choice>
                ))}
              </div>
              {months.length > 0 && <p className="mt-4 text-sm text-muted-foreground">Meses marcados: <span className="font-medium text-foreground">{months.map(monthLabel).join(", ")}</span></p>}
            </div>
          )}
          <ErrorText>{stepError[2]}</ErrorText>
          {revealed <= 2 && <Button className="mt-6 rounded-md" size="lg" onClick={() => goNext(2)}>Continuar</Button>}
        </Step>
      )}

      {revealed >= 3 && (
        <Step n={3} title="Quantos dias você quer visitar os parques?" innerRef={(el) => (stepRefs.current[3] = el)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice active={daysMode === "one_each"} onClick={() => { clearErr(3); setDaysMode("one_each"); }}><span className="font-semibold">Um dia para cada parque</span></Choice>
            <Choice active={daysMode === "repeat"} onClick={() => { clearErr(3); setDaysMode("repeat"); }}><span className="font-semibold">Quero repetir um ou mais parques</span></Choice>
          </div>
          {daysMode === "repeat" && (
            <ul className="mt-6 divide-y divide-border rounded-lg border border-border">
              {ordered.map((id) => {
                const max = maxDaysFor(id, ordered, days);
                return (
                  <li key={id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <span className="flex min-w-0 items-center gap-3"><img src={LOGOS[id]} alt="" className="h-10 w-10 object-contain" /><span className="font-medium">{parkName(id)}</span></span>
                    <span className="flex items-center gap-3">
                      <Button type="button" size="icon" variant="outline" aria-label={`Menos um dia em ${parkName(id)}`} disabled={days[id] <= 1} onClick={() => setParkDays(id, days[id] - 1)}><Minus className="h-4 w-4" /></Button>
                      <span className="w-16 text-center text-sm font-semibold" data-testid={`days-${id}`}>{days[id]} {days[id] === 1 ? "dia" : "dias"}</span>
                      <Button type="button" size="icon" variant="outline" aria-label={`Mais um dia em ${parkName(id)}`} disabled={days[id] >= max} onClick={() => setParkDays(id, days[id] + 1)}><Plus className="h-4 w-4" /></Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <ErrorText>{stepError[3]}</ErrorText>
          {revealed <= 3 && <Button className="mt-6 rounded-md" size="lg" onClick={() => goNext(3)}>Continuar</Button>}
        </Step>
      )}

      {revealed >= 4 && both && (
        <Step n={4} title="Quer trocar entre Universal Studios Florida e Universal Islands of Adventure no mesmo dia?" innerRef={(el) => (stepRefs.current[4] = el)}>
          <p className="mb-5 flex gap-3 text-pretty leading-7 text-muted-foreground"><TrainFront className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />O Hogwarts Express liga Universal Studios Florida e Universal Islands of Adventure. Para embarcar no trem e trocar de parque no mesmo dia, é preciso ter acesso Park-to-Park.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice active={parkToPark === true} onClick={() => { clearErr(4); setParkToPark(true); }}><span className="font-semibold">Sim, quero trocar e usar o Hogwarts Express</span></Choice>
            <Choice active={parkToPark === false} onClick={() => { clearErr(4); setParkToPark(false); }}><span className="font-semibold">Não, prefiro um parque por dia</span></Choice>
          </div>
          <ErrorText>{stepError[4]}</ErrorText>
          {revealed <= 4 && <Button className="mt-6 rounded-md" size="lg" onClick={() => goNext(4)}>Continuar</Button>}
        </Step>
      )}

      {revealed >= 5 && (
        <Step n={sequence.indexOf(5) + 1} title="O resumo da sua Universal" innerRef={(el) => (stepRefs.current[5] = el)}>
          <ul className="grid gap-3 sm:grid-cols-2" data-testid="universal-summary">
            {ordered.map((id) => (
              <li key={id} className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
                <img src={LOGOS[id]} alt="" className="h-12 w-12 object-contain" />
                <span><span className="block text-sm font-semibold">{parkName(id)}</span><span className="text-sm text-muted-foreground">{days[id]} {days[id] === 1 ? "dia" : "dias"}</span></span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Dias de parque</dt><dd className="text-muted-foreground">{total} {total === 1 ? "dia" : "dias"}</dd></div>
            <div><dt className="font-semibold">{periodMode === "dates" ? "Período em Orlando" : "Meses possíveis"}</dt><dd className="text-muted-foreground">{periodText}</dd></div>
            <div className="sm:col-span-2"><dt className="font-semibold">Acesso</dt><dd className="text-muted-foreground">{both && parkToPark ? "Park-to-Park, trocando entre Universal Studios Florida e Universal Islands of Adventure com o Hogwarts Express" : "Um parque por dia"}</dd></div>
          </dl>
          {revealed <= 5 && <Button className="mt-6 rounded-md" size="lg" onClick={() => goNext(5)}>Quero receber a cotação</Button>}
        </Step>
      )}

      {revealed >= 6 && (
        <Step n={sequence.length} title="Receba sua cotação com a Ju" innerRef={(el) => (stepRefs.current[6] = el)}>
          <p className="mb-3 text-sm font-semibold">Quer incluir na cotação?</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {UNIVERSAL_EXTRAS.filter((x) => x.id !== "hhn" || eligibleHhn).map((x) => (
              <Choice key={x.id} active={activeExtras.includes(x.id)} onClick={() => setExtras((e) => (e.includes(x.id) ? e.filter((y) => y !== x.id) : [...e, x.id]))} data-testid={`extra-${x.id}`}>
                <img src={EXTRA_LOGOS[x.id]} alt="" className="h-10 w-auto object-contain" />
                <span className="mt-3 block font-semibold">{x.name}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">{x.description}</span>
              </Choice>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Nome<Input value={contact.name} maxLength={120} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="mt-2 h-12" autoComplete="name" /></label>
            <label className="text-sm font-semibold">WhatsApp<Input value={contact.whatsapp} inputMode="tel" onChange={(e) => setContact({ ...contact, whatsapp: formatPhone(e.target.value) })} className="mt-2 h-12" autoComplete="tel" placeholder="(11) 99999-9999" /></label>
            <label className="text-sm font-semibold sm:col-span-2">E-mail (opcional)<Input type="email" value={contact.email} maxLength={200} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="mt-2 h-12" autoComplete="email" /></label>
          </div>
          <TravelersFields idPrefix="universal" adults={adults} children={children} ages={ages} onAdultsChange={setAdults} onChildrenChange={onChildren}
            onAgeChange={(i, v) => setAges((a) => a.map((x, j) => (j === i ? v : x)))} editorial className="mt-6" />
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-muted-foreground">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-1" aria-label="Autorizo o contato" />
            Autorizo a Destinos com a Ju a entrar em contato sobre esta cotação.
          </label>
          <ErrorText>{stepError[6]}</ErrorText>
          {state === "error" && (
            <div role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {error ?? "Não foi possível enviar agora."} Seus dados continuam aqui.
              <Button type="button" variant="outline" size="sm" className="ml-3 rounded-md" onClick={() => { reset(); void onSubmit(); }}><RotateCcw className="mr-1.5 h-4 w-4" />Tentar novamente</Button>
            </div>
          )}
          <Button className="mt-6 w-full rounded-md sm:w-auto" size="lg" disabled={state === "submitting"} onClick={onSubmit}>
            {state === "submitting" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando…</> : "Pedir minha cotação"}
          </Button>
        </Step>
      )}
    </div>
  );
}
