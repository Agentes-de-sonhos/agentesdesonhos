import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MonitorPlay,
  Sparkles,
} from "lucide-react";
import {
  BR_STATES,
  agendeErrorMessage,
  fetchAgendeSessions,
  firstSelectableIndex,
  formatSessionDate,
  formatSessionTime,
  isSessionSelectable,
  maskWhatsapp,
  readAgendePrefill,
  registerAgende,
  resolveTracking,
  saveAgendePrefill,
  sendAgendeLeadToSheet,

  seatsLabel,
  sortSessions,
  trackAgende,
  validateAgendeForm,
  type AgendeFormErrors,
  type AgendeFormValues,
  type AgendeSession,
} from "@/lib/agendePublic";

type Step = "date" | "form" | "success";

const EMPTY_FORM: AgendeFormValues = {
  email: "",
  firstName: "",
  lastName: "",
  whatsapp: "",
  whatsappOptIn: false,
  agencyName: "",
  state: "",
  city: "",
};

function SessionSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "min-w-[82%] sm:min-w-[280px] rounded-2xl border border-border bg-card p-5 space-y-4",
            i > 0 && "hidden sm:block",
          )}
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function Agende() {
  const [step, setStep] = useState<Step>("date");
  const [sessions, setSessions] = useState<AgendeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [values, setValues] = useState<AgendeFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<AgendeFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [formStarted, setFormStarted] = useState(false);
  const [prefillAvailable, setPrefillAvailable] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const tracking = useMemo(
    () => resolveTracking(typeof window === "undefined" ? "" : window.location.search),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = sortSessions(await fetchAgendeSessions(15));
      setSessions(list);
      setActiveIndex(firstSelectableIndex(list));
    } catch (error) {
      setLoadError(agendeErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    trackAgende("agende_view", { ...tracking });
    setPrefillAvailable(Boolean(readAgendePrefill()));
  }, [tracking]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.slug === selectedSlug) ?? null,
    [sessions, selectedSlug],
  );

  const scrollToCard = (index: number) => {
    const container = trackRef.current;
    if (!container) return;
    const card = container.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const goToIndex = (index: number) => {
    const next = Math.max(0, Math.min(sessions.length - 1, index));
    setActiveIndex(next);
    scrollToCard(next);
  };

  const onScroll = () => {
    const container = trackRef.current;
    if (!container) return;
    const center = container.scrollLeft + container.clientWidth / 2;
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    Array.from(container.children).forEach((child, index) => {
      const el = child as HTMLElement;
      const cardCenter = el.offsetLeft + el.offsetWidth / 2;
      const distance = Math.abs(cardCenter - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    setActiveIndex(best);
  };

  const selectSession = (session: AgendeSession) => {
    setSelectedSlug(session.slug);
    setSubmitError(null);
    setErrors({});
    setStep("form");
    trackAgende("session_select", {
      session_id: session.id,
      session_slug: session.slug,
      seats_left: session.seats_left ?? null,
      ...tracking,
    });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    });
  };

  const usePrefill = () => {
    const prefill = readAgendePrefill();
    if (!prefill) return;
    setValues((prev) => ({ ...prev, ...prefill }));
    setPrefillAvailable(false);
  };

  const update = (key: keyof AgendeFormValues, value: string | boolean) => {
    if (!formStarted) {
      setFormStarted(true);
      trackAgende("form_start", { session_slug: selectedSlug, ...tracking });
    }
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSession) return;
    const nextErrors = validateAgendeForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      formRef.current
        ?.querySelector<HTMLElement>("[data-invalid='true']")
        ?.focus();
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    trackAgende("agende_submit", { session_slug: selectedSession.slug, ...tracking });
    try {
      const result = await registerAgende(
        {
          slug: selectedSession.slug,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          whatsapp: values.whatsapp,
          whatsappOptIn: values.whatsappOptIn,
          agencyName: values.agencyName,
          state: values.state,
          city: values.city,
        },
        tracking,
      );
      void sendAgendeLeadToSheet(
        {
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          whatsapp: values.whatsapp,
          whatsappOptIn: values.whatsappOptIn,
          agencyName: values.agencyName,
          state: values.state,
          city: values.city,
          session: `${formatSessionDate(selectedSession.starts_at)} ${formatSessionTime(selectedSession.starts_at)}`.trim(),
        },
        tracking,
      );
      saveAgendePrefill({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        whatsapp: values.whatsapp,
        agencyName: values.agencyName,
        state: values.state,
        city: values.city,
      });

      setAlreadyRegistered(result.alreadyRegistered);
      setStep("success");
      trackAgende("agende_success", {
        session_slug: selectedSession.slug,
        already_registered: result.alreadyRegistered,
        whatsapp_opt_in: values.whatsappOptIn,
        ...tracking,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setSubmitError(agendeErrorMessage(code));
      if (code.toLowerCase().includes("full") || code.toLowerCase().includes("not_found")) {
        void load();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const chooseAnotherDate = () => {
    setStep("date");
    setSelectedSlug(null);
    setAlreadyRegistered(false);
    setSubmitError(null);
    void load();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fieldError = (key: keyof AgendeFormValues) => errors[key];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Agende uma apresentação | Agentes de Sonhos"
        description="Escolha o melhor dia para conhecer o Agentes de Sonhos em uma apresentação online gratuita de aproximadamente 30 minutos."
        canonical="/agende"
        noindex
      />

      {/* Topo compacto */}
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <img src={logoAgentes} alt="Agentes de Sonhos" className="h-7 w-auto" />
          <span className="text-xs font-medium text-muted-foreground">Apresentação online</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
        {step !== "success" && (
          <section className="space-y-3">
            <h1 className="text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-3xl">
              Escolha o melhor dia para conhecer o Agentes de Sonhos
            </h1>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Participe de uma apresentação online, tire suas dúvidas e veja como a plataforma pode
              facilitar o dia a dia da sua agência.
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" /> Online
              </span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> aproximadamente 30 minutos
              </span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> gratuito
              </span>
            </p>
          </section>
        )}

        {/* Etapa 1 — datas */}
        {step === "date" && (
          <section className="mt-7 space-y-4" aria-labelledby="datas-titulo">
            <div className="flex items-center justify-between gap-3">
              <h2 id="datas-titulo" className="text-sm font-semibold text-foreground">
                Datas disponíveis
              </h2>
              {sessions.length > 1 && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    aria-label="Ver data anterior"
                    onClick={() => goToIndex(activeIndex - 1)}
                    disabled={activeIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    aria-label="Ver próxima data"
                    onClick={() => goToIndex(activeIndex + 1)}
                    disabled={activeIndex >= sessions.length - 1}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {loading && <SessionSkeleton />}

            {!loading && loadError && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center"
              >
                <p className="text-sm text-foreground">{loadError}</p>
                <Button type="button" className="mt-4 h-11 rounded-xl" onClick={() => void load()}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {!loading && !loadError && sessions.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <CalendarDays className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">Nenhuma data aberta neste momento</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Novas apresentações são abertas com frequência. Tente novamente em breve.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 h-11 rounded-xl"
                  onClick={() => void load()}
                >
                  Atualizar datas
                </Button>
              </div>
            )}

            {!loading && !loadError && sessions.length > 0 && (
              <>
                <div
                  ref={trackRef}
                  onScroll={onScroll}
                  role="group"
                  aria-label="Carrossel de datas disponíveis"
                  className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {sessions.map((session, index) => {
                    const seats = seatsLabel(session);
                    const selectable = isSessionSelectable(session);
                    const isActive = index === activeIndex;
                    return (
                      <article
                        key={session.id || session.slug}
                        className={cn(
                          "flex min-w-[82%] max-w-[420px] snap-center flex-col rounded-2xl border bg-card p-5 transition-[opacity,box-shadow] motion-reduce:transition-none sm:min-w-[calc((100%-2rem)/3)]",
                          isActive
                            ? "border-primary/60 shadow-md"
                            : "border-border opacity-80 sm:opacity-100",
                          !selectable && "opacity-70",
                        )}
                      >
                        <p className="text-base font-semibold leading-snug">
                          {formatSessionDate(session.starts_at)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatSessionTime(session.starts_at)} (horário de Brasília)
                        </p>
                        <p
                          className={cn(
                            "mt-3 inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium",
                            seats.tone === "scarce" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                            seats.tone === "full" && "bg-muted text-muted-foreground",
                            (seats.tone === "available" || seats.tone === "unknown") &&
                              "bg-primary/10 text-primary",
                          )}
                        >
                          {seats.text}
                        </p>
                        <Button
                          type="button"
                          className="mt-5 h-12 w-full rounded-xl text-[15px]"
                          disabled={!selectable}
                          onClick={() => selectSession(session)}
                        >
                          {selectable ? "Quero participar neste dia" : "Vagas esgotadas"}
                        </Button>
                      </article>
                    );
                  })}
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Arraste para o lado para ver mais datas.
                </p>
              </>
            )}
          </section>
        )}

        {/* Etapa 2 — dados */}
        {step === "form" && selectedSession && (
          <section className="mt-7 space-y-5">
            <div className="sticky top-14 z-30 flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-card/95 p-4 backdrop-blur">
              <div>
                <p className="text-sm font-semibold">{formatSessionDate(selectedSession.starts_at)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSessionTime(selectedSession.starts_at)} (horário de Brasília)
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-xl px-3 text-sm"
                onClick={chooseAnotherDate}
              >
                Trocar data
              </Button>
            </div>

            {prefillAvailable && (
              <button
                type="button"
                onClick={usePrefill}
                className="w-full rounded-xl border border-dashed border-border px-4 py-3 text-left text-sm text-muted-foreground hover:border-primary hover:text-foreground"
              >
                Usar meus dados salvos neste dispositivo
              </button>
            )}

            <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="h-12 rounded-xl"
                  value={values.email}
                  data-invalid={fieldError("email") ? "true" : undefined}
                  aria-invalid={Boolean(fieldError("email"))}
                  aria-describedby={fieldError("email") ? "email-error" : undefined}
                  onChange={(e) => update("email", e.target.value)}
                />
                {fieldError("email") && (
                  <p id="email-error" className="text-sm text-destructive">
                    {fieldError("email")}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Primeiro nome</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    className="h-12 rounded-xl"
                    value={values.firstName}
                    data-invalid={fieldError("firstName") ? "true" : undefined}
                    aria-invalid={Boolean(fieldError("firstName"))}
                    onChange={(e) => update("firstName", e.target.value)}
                  />
                  {fieldError("firstName") && (
                    <p className="text-sm text-destructive">{fieldError("firstName")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    className="h-12 rounded-xl"
                    value={values.lastName}
                    data-invalid={fieldError("lastName") ? "true" : undefined}
                    aria-invalid={Boolean(fieldError("lastName"))}
                    onChange={(e) => update("lastName", e.target.value)}
                  />
                  {fieldError("lastName") && (
                    <p className="text-sm text-destructive">{fieldError("lastName")}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(11) 99999-9999"
                  className="h-12 rounded-xl"
                  value={values.whatsapp}
                  data-invalid={fieldError("whatsapp") ? "true" : undefined}
                  aria-invalid={Boolean(fieldError("whatsapp"))}
                  onChange={(e) => update("whatsapp", maskWhatsapp(e.target.value))}
                />
                {fieldError("whatsapp") && (
                  <p className="text-sm text-destructive">{fieldError("whatsapp")}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="agencyName">Nome da agência</Label>
                <Input
                  id="agencyName"
                  autoComplete="organization"
                  className="h-12 rounded-xl"
                  value={values.agencyName}
                  data-invalid={fieldError("agencyName") ? "true" : undefined}
                  aria-invalid={Boolean(fieldError("agencyName"))}
                  onChange={(e) => update("agencyName", e.target.value)}
                />
                {fieldError("agencyName") && (
                  <p className="text-sm text-destructive">{fieldError("agencyName")}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-[120px,1fr]">
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <select
                    id="state"
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={values.state}
                    data-invalid={fieldError("state") ? "true" : undefined}
                    aria-invalid={Boolean(fieldError("state"))}
                    onChange={(e) => update("state", e.target.value)}
                  >
                    <option value="">UF</option>
                    {BR_STATES.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                  {fieldError("state") && (
                    <p className="text-sm text-destructive">{fieldError("state")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    autoComplete="address-level2"
                    className="h-12 rounded-xl"
                    value={values.city}
                    data-invalid={fieldError("city") ? "true" : undefined}
                    aria-invalid={Boolean(fieldError("city"))}
                    onChange={(e) => update("city", e.target.value)}
                  />
                  {fieldError("city") && <p className="text-sm text-destructive">{fieldError("city")}</p>}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <Checkbox
                  id="whatsappOptIn"
                  className="mt-0.5 h-5 w-5"
                  checked={values.whatsappOptIn}
                  aria-invalid={Boolean(fieldError("whatsappOptIn"))}
                  onCheckedChange={(checked) => update("whatsappOptIn", checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="whatsappOptIn" className="text-sm font-medium leading-snug">
                    Autorizo receber a confirmação e os lembretes desta apresentação no meu WhatsApp.
                  </Label>
                  {fieldError("whatsappOptIn") && (
                    <p className="text-sm text-destructive">{fieldError("whatsappOptIn")}</p>
                  )}
                </div>
              </div>

              <div aria-live="polite" className="min-h-[1px]">
                {submitError && (
                  <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                    {submitError}
                  </p>
                )}
              </div>

              <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Confirmando...
                  </>
                ) : (
                  "Confirmar minha participação"
                )}
              </Button>
            </form>
          </section>
        )}

        {/* Etapa 3 — sucesso */}
        {step === "success" && selectedSession && (
          <section aria-live="polite" className="mt-10 space-y-5 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-[-0.02em]">
                {alreadyRegistered ? "Você já está inscrito!" : "Participação confirmada!"}
              </h1>
              <p className="text-[15px] text-muted-foreground">
                {formatSessionDate(selectedSession.starts_at)},{" "}
                {formatSessionTime(selectedSession.starts_at)} (horário de Brasília).
              </p>
            </div>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
              {values.whatsappOptIn
                ? "Você vai receber a confirmação e os lembretes por e-mail e também no WhatsApp autorizado."
                : "Você vai receber a confirmação e os lembretes por e-mail."}
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl"
              onClick={chooseAnotherDate}
            >
              Escolher outra data
            </Button>
          </section>
        )}
      </main>

      <footer className="border-t border-border/50 py-6">
        <p className="text-center text-xs text-muted-foreground">
          Agentes de Sonhos • apresentação online e gratuita
        </p>
      </footer>
    </div>
  );
}
