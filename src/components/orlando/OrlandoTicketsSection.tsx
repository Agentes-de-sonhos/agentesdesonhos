import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  Castle, Clapperboard, Fish, TreePine, Blocks, Rocket, FerrisWheel, Drama, Music, Trophy,
  ChevronLeft, ChevronRight, Check, Minus, Plus, Clock, Moon, CheckCircle2, MessageCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { cn } from "@/lib/utils";
import {
  ORLANDO_CARDS, ORLANDO_CATALOG, ORLANDO_CATALOG_VERSION, ORLANDO_GROUPS, ORLANDO_SECTION,
  type OrlandoCategory,
} from "./orlandoCatalog";
import { disneyMin, estimate, getExperience, tripCalendarDays, universalMin } from "./orlandoPlanning";

const CARD_ICONS: Record<string, typeof Castle> = {
  disney: Castle, universal: Clapperboard, seaworld: Fish, "busch-gardens": TreePine, legoland: Blocks,
  ksc: Rocket, icon: FerrisWheel, cirque: Drama, "blue-man": Music, magic: Trophy,
};
const GROUP_ICONS: Record<string, typeof Castle> = {
  disney: Castle, universal: Clapperboard, "united-parks": Fish, legoland: Blocks, ksc: Rocket,
  icon: FerrisWheel, cirque: Drama, "blue-man": Music, magic: Trophy,
};
const groupName = (id: string) => ORLANDO_GROUPS.find((g) => g.id === id)?.name ?? id;

const STEPS = ["Sua viagem", "Seus parques", "Mais experiências", "Revisar e solicitar"];
const PARK_GROUPS = ["disney", "universal", "united-parks", "legoland", "ksc"];
const EXTRA_BLOCKS: { title: string; cats: OrlandoCategory[] }[] = [
  { title: "Quer incluir parques aquáticos?", cats: ["water_park"] },
  { title: "Quer conhecer outras atrações?", cats: ["short_attraction"] },
  { title: "Quer incluir shows ou jogos?", cats: ["show", "sport"] },
  { title: "Tem interesse em festas e eventos especiais?", cats: ["special_event"] },
];

type PeriodMode = "exact_dates" | "month_options" | "unknown";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  whatsapp: z.string().trim().refine((v) => v.replace(/\D/g, "").length >= 10, "Informe um WhatsApp válido.").pipe(z.string().max(30)),
  email: z.union([z.literal(""), z.string().trim().email("E-mail inválido.").max(200)]),
  notes: z.string().max(1500),
});

const fmtDate = (iso: string) => iso.split("-").reverse().join("/");
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const monthLabel = (ym: string) => { const [y, m] = ym.split("-"); return `${MONTHS[Number(m) - 1]}/${y}`; };
function upcomingMonths(n = 18) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmtUnits = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

function Counter({ label, value, min, max, onChange }: { label: string; value: number; min: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label={`Diminuir ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus className="h-4 w-4" /></Button>
        <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label={`Aumentar ${label}`} disabled={max !== undefined && value >= max} onClick={() => onChange(value + 1)}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export function OrlandoTicketsSection({ hostname, phone }: { hostname: string; phone?: string | null }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { submit, state, error } = useAgencySiteRequest(hostname);

  const [step, setStep] = useState<number | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [mode, setMode] = useState<PeriodMode>("exact_dates");
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [months, setMonths] = useState<string[]>([]);
  const [adults, setAdults] = useState(2);
  const [childAges, setChildAges] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [disneyDays, setDisneyDays] = useState(0);
  const [universalExtra, setUniversalExtra] = useState(0);
  const [expressInterest, setExpressInterest] = useState(false);
  const [allParticipate, setAllParticipate] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, string[]>>({});
  const [contact, setContact] = useState({ name: "", whatsapp: "", email: "", notes: "" });
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());

  const travelers = useMemo(() => [
    ...Array.from({ length: adults }, (_, i) => ({ id: `adult-${i + 1}`, label: `Adulto ${i + 1}`, kind: "adult" as const, age: null as number | null })),
    ...childAges.map((age, i) => ({ id: `child-${i + 1}`, label: `Criança ${i + 1}${age != null ? ` — ${age} anos` : ""}`, kind: "child" as const, age })),
  ], [adults, childAges]);

  const dMin = disneyMin(selected);
  const uMin = universalMin(selected);
  const universalDays = uMin ? uMin + universalExtra : 0;
  const est = estimate(selected, disneyDays, universalDays);
  const calDays = mode === "exact_dates" ? tripCalendarDays(arrival, departure) : null;
  const exceeds = calDays != null && est.dayUnits > calDays;

  const scrollTop = () => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => headingRef.current?.focus(), 350);
  };
  const go = (s: number | null) => { setStepError(null); setStep(s); scrollTop(); };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const newMin = disneyMin(next);
      setDisneyDays((d) => (newMin === 0 ? 0 : Math.max(d, newMin)));
      if (universalMin(next) === 0) setUniversalExtra(0);
      return next;
    });
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (mode === "exact_dates") {
        if (!arrival || !departure) return "Informe as datas de chegada e saída.";
        if (arrival < todayIso()) return "A chegada não pode ser uma data passada.";
        if (departure < arrival) return "A saída deve ser igual ou posterior à chegada.";
      }
      if (mode === "month_options" && months.length === 0) return "Selecione ao menos um mês.";
      if (childAges.some((a) => a == null)) return "Informe a idade de cada criança.";
    }
    if (s === 2 && selected.length === 0) return "Selecione pelo menos uma experiência.";
    if (s === 3 && !allParticipate) {
      const empty = selected.find((id) => (overrides[id] ?? travelers.map((t) => t.id)).length === 0);
      if (empty) return `Marque ao menos um participante para ${getExperience(empty)?.name ?? "a experiência"} ou remova-a.`;
    }
    return null;
  };
  const next = () => {
    const err = validateStep(step ?? 0);
    if (err) { setStepError(err); return; }
    go((step ?? 0) + 1);
  };

  const participantsFor = (id: string) => (allParticipate ? travelers.map((t) => t.id) : overrides[id] ?? travelers.map((t) => t.id));

  const periodText = mode === "exact_dates" && arrival && departure
    ? `${fmtDate(arrival)} a ${fmtDate(departure)}`
    : mode === "month_options" ? `Meses possíveis: ${months.map(monthLabel).join(", ")}` : "Ainda não definido";
  const paxText = `${adults} ${adults === 1 ? "adulto" : "adultos"}` +
    (childAges.length ? ` e ${childAges.length} ${childAges.length === 1 ? "criança" : "crianças"} (${childAges.join(", ")} anos)` : "");

  const onSubmit = async () => {
    const stepErr = validateStep(2) ?? validateStep(3);
    if (stepErr) { setStepError(stepErr); return; }
    const parsed = contactSchema.safeParse(contact);
    if (!parsed.success) { setStepError(parsed.error.issues[0]?.message ?? "Revise seus dados."); return; }
    if (!consent) { setStepError("Autorize o contato para enviar."); return; }
    setStepError(null);
    const names = selected.map((id) => getExperience(id)?.name ?? id);
    const days = `Disney: ${dMin ? disneyDays : 0} dia(s) · Universal: ${universalDays} dia(s)`;
    const estimateText = `${fmtUnits(est.dayUnits)} dia(s) de parques${est.eveningExperiences ? ` + ${est.eveningExperiences} experiência(s) noturna(s)` : ""}`;
    const participantsText = allParticipate ? "Todos participam de todas as experiências"
      : selected.map((id) => `${getExperience(id)?.name}: ${participantsFor(id).map((t) => travelers.find((x) => x.id === t)?.label).join(", ")}`).join(" | ");
    const res = await submit({
      service_key: "ingressos",
      service_label: "Ingressos",
      destination: "Orlando, Flórida",
      summary: `Serviços solicitados: Ingressos | Orlando | Período: ${periodText} | Viajantes: ${paxText} | Experiências: ${names.join(", ")} | ${days} | Estimativa: ${estimateText}`.slice(0, 1990),
      notes: [parsed.data.notes, expressInterest ? "Quer orientação sobre filas/Universal Express." : "", exceeds ? "Seleção pode exceder o período informado." : "", `Participantes: ${participantsText}`].filter(Boolean).join("\n").slice(0, 1990),
      lead_name: parsed.data.name,
      lead_phone: parsed.data.whatsapp,
      lead_email: parsed.data.email || null,
      preferred_channel: "WhatsApp",
      best_time: "Qualquer horário",
      consent: true,
      consent_version: "v1",
      honeypot,
      details: {
        origem: "home_orlando_tickets",
        catalog_version: ORLANDO_CATALOG_VERSION,
        request_id: requestId,
        destino: "Orlando, Flórida",
        modo_periodo: mode,
        check_in: mode === "exact_dates" ? arrival : "",
        check_out: mode === "exact_dates" ? departure : "",
        meses: months.join(", "),
        adultos: String(adults),
        criancas: String(childAges.length),
        idades_criancas: childAges.join(", "),
        experiencias: names.join(", "),
        experiencias_ids: selected.join(","),
        dias_disney: String(dMin ? disneyDays : 0),
        dias_universal: String(universalDays),
        universal_express: expressInterest ? "Sim, quer orientação" : "Não informado",
        estimativa_dias: fmtUnits(est.dayUnits),
        experiencias_noturnas: String(est.eveningExperiences),
        participantes: participantsText.slice(0, 900),
        servicos: "Ingressos",
        servicos_keys: "ingressos",
      },
    });
    if ("success" in res) scrollTop();
  };

  const whatsappHref = (() => {
    const digits = (phone ?? "").replace(/\D/g, "");
    if (digits.length < 10) return null;
    const p = digits.startsWith("55") ? digits : `55${digits}`;
    const names = selected.map((id) => getExperience(id)?.name).filter(Boolean).join(", ");
    return `https://wa.me/${p}?text=${encodeURIComponent(`Olá! Acabei de solicitar um orçamento de ingressos em Orlando (${periodText}, ${paxText}): ${names}.`)}`;
  })();

  const scrollStrip = (dir: number) => stripRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  const ExperienceCard = ({ id }: { id: string }) => {
    const e = getExperience(id)!;
    const on = selected.includes(id);
    const Icon = GROUP_ICONS[e.group] ?? Castle;
    return (
      <button type="button" aria-pressed={on} onClick={() => toggle(id)}
        className={cn("relative flex h-full flex-col gap-1.5 rounded-xl border bg-card p-4 text-left transition",
          on ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50")}>
        <span className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5 shrink-0", on ? "text-primary" : "text-muted-foreground")} aria-hidden />
          <span className="text-sm font-semibold text-foreground">{e.name}</span>
        </span>
        <span className="text-xs leading-relaxed text-muted-foreground">{e.description}</span>
        {on && <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>}
      </button>
    );
  };

  const Summary = () => (
    <aside className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
      <h3 className="text-base font-semibold text-foreground">Sua seleção</h3>
      {selected.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma experiência escolhida ainda.</p>
      ) : (
        <ul className="mt-3 space-y-1.5 text-sm text-foreground">
          {selected.map((id) => <li key={id} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{getExperience(id)?.name}</li>)}
        </ul>
      )}
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Tempo estimado para sua seleção</p>
        <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-foreground"><Clock className="h-4 w-4 text-primary" />{fmtUnits(est.dayUnits)} {est.dayUnits === 1 ? "dia" : "dias"}</p>
        {est.eveningExperiences > 0 && <p className="mt-1 flex items-center gap-2 text-sm text-foreground"><Moon className="h-4 w-4 text-primary" />+ {est.eveningExperiences} experiência(s) noturna(s) ou com horário a confirmar</p>}
        {calDays != null && <p className="mt-2 text-xs text-muted-foreground">Seu período: {calDays} dias de calendário (chegada e saída podem ser parciais).</p>}
        {exceeds && <p className="mt-2 rounded-lg bg-muted p-2 text-xs text-foreground">Sua seleção pode precisar de mais tempo que o período informado. Nossa equipe pode ajudar a ajustar o roteiro.</p>}
        <p className="mt-3 text-xs text-muted-foreground">Estimativa de planejamento. A agência confirma ingressos, horários e disponibilidade.</p>
      </div>
    </aside>
  );

  return (
    <section ref={sectionRef} id="ingressos-orlando" className="scroll-mt-24 bg-background py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold text-foreground outline-none md:text-4xl">
            {step === null || state === "success" ? ORLANDO_SECTION.title : STEPS[step]}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {step === null ? ORLANDO_SECTION.subtitle : state === "success" ? "" : `Etapa ${step + 1} de ${STEPS.length}`}
          </p>
        </div>

        {state === "success" ? (
          <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h3 className="mt-4 text-xl font-semibold text-foreground">Solicitação enviada!</h3>
            <p className="mt-2 text-muted-foreground">Sua agência recebeu as escolhas e vai preparar seu orçamento.</p>
            {whatsappHref && (
              <Button asChild className="mt-6"><a href={whatsappHref} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Falar no WhatsApp</a></Button>
            )}
          </div>
        ) : step === null ? (
          <>
            <div className="relative mt-10">
              <div ref={stripRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]">
                {ORLANDO_CARDS.map((c) => {
                  const Icon = CARD_ICONS[c.id] ?? Castle;
                  return (
                    <article key={c.id} className="flex w-64 shrink-0 snap-start flex-col rounded-2xl border border-border bg-card p-5">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-6 w-6" aria-hidden /></span>
                      <h3 className="mt-4 text-base font-semibold text-foreground">{c.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
                    </article>
                  );
                })}
              </div>
              <div className="mt-2 hidden justify-end gap-2 md:flex">
                <Button type="button" variant="outline" size="icon" aria-label="Anterior" onClick={() => scrollStrip(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button type="button" variant="outline" size="icon" aria-label="Próximo" onClick={() => scrollStrip(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-card p-6 text-center md:p-8">
              <h3 className="text-xl font-semibold text-foreground">{ORLANDO_SECTION.cta_title}</h3>
              <p className="mt-2 text-muted-foreground">{ORLANDO_SECTION.cta_description}</p>
              <Button size="lg" className="mt-5" onClick={() => go(0)}>{ORLANDO_SECTION.cta_label}</Button>
            </div>
          </>
        ) : (
          <div className="mt-8">
            <div className="mb-6 flex gap-1.5" aria-hidden>
              {STEPS.map((_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />)}
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 space-y-6">
                {step === 0 && (
                  <>
                    <fieldset>
                      <legend className="mb-3 text-sm font-semibold text-foreground">Quando você pretende viajar?</legend>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {([["exact_dates", "Tenho as datas"], ["month_options", "Ainda estou decidindo os meses"], ["unknown", "Ainda não sei"]] as const).map(([v, l]) => (
                          <button key={v} type="button" aria-pressed={mode === v} onClick={() => setMode(v)}
                            className={cn("rounded-xl border bg-card px-4 py-3 text-sm font-medium text-foreground", mode === v ? "border-primary ring-2 ring-primary/30" : "border-border")}>{l}</button>
                        ))}
                      </div>
                    </fieldset>
                    {mode === "exact_dates" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-medium text-foreground">Chegada<Input type="date" min={todayIso()} value={arrival} onChange={(e) => setArrival(e.target.value)} className="mt-1 bg-card" /></label>
                        <label className="text-sm font-medium text-foreground">Saída<Input type="date" min={arrival || todayIso()} value={departure} onChange={(e) => setDeparture(e.target.value)} className="mt-1 bg-card" /></label>
                      </div>
                    )}
                    {mode === "month_options" && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-foreground">Selecione os meses possíveis</p>
                        <div className="flex flex-wrap gap-2">
                          {upcomingMonths().map((m) => {
                            const on = months.includes(m);
                            return <button key={m} type="button" aria-pressed={on} onClick={() => setMonths((p) => on ? p.filter((x) => x !== m) : [...p, m].sort())}
                              className={cn("rounded-full border px-3 py-1.5 text-sm", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground")}>{monthLabel(m)}</button>;
                          })}
                        </div>
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Counter label="Adultos" value={adults} min={1} max={12} onChange={setAdults} />
                      <Counter label="Crianças" value={childAges.length} min={0} max={8}
                        onChange={(n) => setChildAges((p) => (n > p.length ? [...p, ...Array(n - p.length).fill(null)] : p.slice(0, n)))} />
                    </div>
                    {childAges.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-foreground">Idade de cada criança na época da viagem</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {childAges.map((age, i) => (
                            <select key={i} aria-label={`Idade da criança ${i + 1}`} value={age ?? ""} onChange={(e) => setChildAges((p) => p.map((a, j) => (j === i ? (e.target.value === "" ? null : Number(e.target.value)) : a)))}
                              className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground">
                              <option value="">Criança {i + 1}</option>
                              {Array.from({ length: 18 }, (_, a) => <option key={a} value={a}>{a} {a === 1 ? "ano" : "anos"}</option>)}
                            </select>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {step === 1 && (
                  <>
                    <p className="text-sm text-muted-foreground">Escolha os parques que deseja visitar. Nossa equipe indica a combinação de ingressos para você.</p>
                    {PARK_GROUPS.map((g) => {
                      const items = ORLANDO_CATALOG.filter((e) => e.group === g && (e.category === "theme_park" || e.category === "day_experience"));
                      if (!items.length) return null;
                      return (
                        <div key={g}>
                          <h3 className="mb-2 text-sm font-semibold text-foreground">{groupName(g)}</h3>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((e) => <ExperienceCard key={e.id} id={e.id} />)}</div>
                          {g === "disney" && dMin > 0 && (
                            <div className="mt-3 space-y-1">
                              <Counter label="Dias desejados na Disney" value={disneyDays} min={dMin} max={10} onChange={setDisneyDays} />
                              {disneyDays === dMin && dMin < 10 && <p className="text-xs text-muted-foreground">Quer aproveitar mais ou repetir um parque? Considere um dia adicional.</p>}
                            </div>
                          )}
                          {g === "universal" && uMin > 0 && (
                            <div className="mt-3"><Counter label="Dias desejados na Universal" value={universalDays} min={uMin} onChange={(v) => setUniversalExtra(v - uMin)} /></div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {step === 2 && (
                  <>
                    {EXTRA_BLOCKS.map((b) => (
                      <div key={b.title}>
                        <h3 className="mb-2 text-sm font-semibold text-foreground">{b.title}</h3>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {ORLANDO_CATALOG.filter((e) => b.cats.includes(e.category)).map((e) => <ExperienceCard key={e.id} id={e.id} />)}
                        </div>
                      </div>
                    ))}
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-foreground">Quer orientação sobre filas e experiências especiais?</h3>
                      <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
                        <Checkbox checked={expressInterest} onCheckedChange={(v) => setExpressInterest(v === true)} className="mt-0.5" />
                        Quero saber sobre o Universal Express e opções para reduzir filas.
                      </label>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="rounded-2xl border border-border bg-card p-5 text-sm text-foreground">
                      <p><strong>Período:</strong> {periodText}</p>
                      <p className="mt-1"><strong>Viajantes:</strong> {paxText}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold text-foreground">Todos os viajantes participarão de todas as experiências?</p>
                      <div className="flex gap-2">
                        {[true, false].map((v) => (
                          <button key={String(v)} type="button" aria-pressed={allParticipate === v} onClick={() => setAllParticipate(v)}
                            className={cn("rounded-xl border bg-card px-4 py-2 text-sm", allParticipate === v ? "border-primary ring-2 ring-primary/30" : "border-border")}>{v ? "Sim" : "Não"}</button>
                        ))}
                      </div>
                      {!allParticipate && (
                        <div className="mt-3 space-y-3">
                          {selected.map((id) => (
                            <div key={id} className="rounded-xl border border-border bg-card p-4">
                              <p className="text-sm font-semibold text-foreground">{getExperience(id)?.name}</p>
                              <div className="mt-2 flex flex-wrap gap-3">
                                {travelers.map((t) => {
                                  const list = participantsFor(id);
                                  return (
                                    <label key={t.id} className="flex items-center gap-2 text-sm text-foreground">
                                      <Checkbox checked={list.includes(t.id)} onCheckedChange={(v) => setOverrides((p) => ({ ...p, [id]: v ? [...list, t.id] : list.filter((x) => x !== t.id) }))} />
                                      {t.label}
                                    </label>
                                  );
                                })}
                              </div>
                              <button type="button" className="mt-2 text-xs text-muted-foreground underline" onClick={() => toggle(id)}>Remover experiência</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-medium text-foreground">Seu nome<Input value={contact.name} maxLength={120} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="mt-1 bg-card" /></label>
                      <label className="text-sm font-medium text-foreground">WhatsApp<Input type="tel" value={contact.whatsapp} maxLength={30} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} className="mt-1 bg-card" /></label>
                      <label className="text-sm font-medium text-foreground sm:col-span-2">E-mail (opcional)<Input type="email" value={contact.email} maxLength={200} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="mt-1 bg-card" /></label>
                      <label className="text-sm font-medium text-foreground sm:col-span-2">Quer nos contar mais alguma coisa?<Textarea value={contact.notes} maxLength={1500} onChange={(e) => setContact({ ...contact, notes: e.target.value })} className="mt-1 bg-card" /></label>
                    </div>
                    <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                    <label className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                      Autorizo a agência a entrar em contato comigo sobre esta solicitação, conforme a política de privacidade.
                    </label>
                  </>
                )}

                {(stepError || (state === "error" && step === 3)) && (
                  <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    {stepError ?? error ?? "Não conseguimos enviar agora. Suas escolhas foram mantidas. Tente novamente."}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => go(step === 0 ? null : step - 1)}>{step === 0 ? "Voltar a explorar as experiências" : "Voltar"}</Button>
                  </div>
                  <div className="flex gap-2">
                    {step === 2 && selected.every((id) => { const c = getExperience(id)?.category; return c === "theme_park" || c === "day_experience"; }) && selected.length > 0 && (
                      <Button type="button" variant="ghost" onClick={next}>Continuar sem outras experiências</Button>
                    )}
                    {step < 3 ? (
                      <Button type="button" onClick={next}>Continuar</Button>
                    ) : (
                      <Button type="button" onClick={onSubmit} disabled={state === "submitting"}>
                        {state === "submitting" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Solicitar meu orçamento de ingressos
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <Summary />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
