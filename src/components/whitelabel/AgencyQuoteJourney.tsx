import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plane, BedDouble, Car, Bus, Ticket, ShieldCheck, Ship, Compass,
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Send, AlertCircle, Pencil, Trash2, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { EDITORIAL_ROOT_CLASS, isEditorialTheme } from "@/lib/agencySiteTheme";
import { RouteLegsEditor } from "@/components/whitelabel/RouteLegsEditor";
import { TripDatePicker } from "@/components/whitelabel/TripDatePicker";
import {
  CONTACT_CHANNELS, CONTACT_TIMES, EMPTY_CONTACT,
  describeServiceValues, fieldIsVisible, formFields, initialServiceValues, isMultiRoute,
  mergeServiceValues, quickQuoteFields, serviceByKey, validateContactStep, validateServiceStep,
  type ContactValues, type RequestField, type RequestService, type ServiceValues,
} from "@/lib/agencySiteRequests";
import {
  CHILD_AGE_HELP, CHILD_AGE_OPTIONS, applyContextToService, buildJourneyPayload,
  applyRouteToContext, contextFromService, describeContext, describeTravelers, eligibleComplements,
  emptyRouteLegs, emptyTripContext, formatChildAges, rebuildContext, serializeRoute, syncChildAges, totalTravelers,
  validateChildAges, validateRouteLegs,
  type JourneyEntry, type RouteLeg, type TripContext,
} from "@/lib/agencyQuoteJourney";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";

export const SERVICE_ICONS: Record<string, typeof Plane> = {
  aereo: Plane,
  hospedagem: BedDouble,
  carro: Car,
  transfer: Bus,
  ingressos: Ticket,
  seguro: ShieldCheck,
  cruzeiros: Ship,
  pacotes: Compass,
};

type JourneyStep = "details" | "complements" | "review";

const STEP_LABELS: { key: JourneyStep; label: string }[] = [
  { key: "details", label: "Detalhes do serviço" },
  { key: "complements", label: "Complementos" },
  { key: "review", label: "Revisão e contato" },
];

function FieldControl({
  field, value, error, onChange, surface, editorial,
}: {
  field: RequestField;
  value: string | boolean;
  error?: string;
  onChange: (value: string | boolean) => void;
  surface: string;
  editorial?: boolean;
}) {
  const id = `wlq-${field.name}`;
  const describedBy = error ? `${id}-error` : field.help ? `${id}-help` : undefined;

  if (field.type === "checkbox") {
    return (
      <div className={field.span === 2 ? "sm:col-span-2" : ""}>
        <div className="flex items-center gap-2">
          <Checkbox id={id} checked={value === true} onCheckedChange={(v) => onChange(v === true)} />
          <Label htmlFor={id} className="text-sm font-normal">{field.label}</Label>
        </div>
      </div>
    );
  }

  // Toda data usa o mesmo controle de calendário da primeira dobra.
  if (field.type === "date") {
    return (
      <TripDatePicker
        id={id}
        label={field.label}
        mode="single"
        start={String(value ?? "")}
        onChange={({ start }) => onChange(start)}
        editorial={editorial}
        error={error}
        help={field.help}
        required={field.required}
        className={field.span === 2 ? "sm:col-span-2" : ""}
      />
    );
  }

  return (
    <div className={field.span === 2 ? "sm:col-span-2" : ""}>
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {field.label}
        {field.required && <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>}
      </Label>

      {field.type === "select" ? (
        <Select value={String(value ?? "")} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={id} aria-invalid={!!error} aria-describedby={describedBy} className={`mt-1.5 ${surface}`}>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "textarea" ? (
        <Textarea
          id={id}
          className={`mt-1.5 min-h-20 ${surface}`}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          className={`mt-1.5 ${surface}`}
          type={field.type === "number" ? "number" : field.type}
          inputMode={field.type === "number" ? "numeric" : undefined}
          min={field.min}
          max={field.max}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">{error}</p>
      ) : field.help ? (
        <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">{field.help}</p>
      ) : null}
    </div>
  );
}

export interface AgencyQuoteJourneyProps {
  hostname: string;
  agencyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Serviço escolhido na primeira dobra — vira o serviço principal. */
  primaryService: string;
  /** Valores já digitados na cotação rápida. */
  quickValues: ServiceValues;
  /** Rota estruturada de multidestinos vinda da cotação rápida (aéreo). */
  quickRoute?: RouteLeg[];
  /** Volta o foco para a cotação rápida sem perder os detalhes preenchidos. */
  onEditQuickValues?: () => void;
  privacyUrl?: string;
  termsUrl?: string;
}

/**
 * Jornada única, contextual e progressiva de cotação White Label.
 * Abre focada SOMENTE no serviço ativo (sem abas de todos os serviços), herda o
 * contexto da viagem entre serviços e envia UMA solicitação pelo endpoint atual.
 */
export function AgencyQuoteJourney({
  hostname,
  agencyName,
  open,
  onOpenChange,
  primaryService,
  quickValues,
  quickRoute,
  onEditQuickValues,
  privacyUrl = "/politicasdeprivacidade",
  termsUrl = "/termosdeuso",
}: AgencyQuoteJourneyProps) {
  const editorial = isEditorialTheme(hostname);
  const { state, error, submit, reset } = useAgencySiteRequest(hostname);

  const [step, setStep] = useState<JourneyStep>("details");
  const [context, setContext] = useState<TripContext>(() => emptyTripContext());
  const [entries, setEntries] = useState<JourneyEntry[]>([]);
  const [activeKey, setActiveKey] = useState(primaryService);
  const [activeValues, setActiveValues] = useState<ServiceValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [legs, setLegs] = useState<RouteLeg[]>(() => emptyRouteLegs());
  const [contact, setContact] = useState<ContactValues>(EMPTY_CONTACT);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");

  const primaryKey = entries[0]?.key ?? primaryService;
  const activeService = useMemo(() => serviceByKey(activeKey), [activeKey]);
  const isPrimary = activeKey === primaryKey && entries.findIndex((e) => e.key === activeKey) <= 0;
  const isComplement = !isPrimary;

  /** Ao abrir, monta o serviço principal com o contexto vindo da primeira dobra. */
  useEffect(() => {
    if (!open) return;
    const service = serviceByKey(primaryService);
    const merged = mergeServiceValues(service, quickValues);
    const initialLegs = quickRoute?.length ? quickRoute.map((l) => ({ ...l })) : emptyRouteLegs();
    setLegs(initialLegs);
    let baseContext = contextFromService(service.key, merged, emptyTripContext());
    if (isMultiRoute(service, merged)) {
      baseContext = applyRouteToContext(baseContext, String(merged.origem ?? ""), initialLegs);
    }
    setContext(baseContext);
    setEntries([]);
    setActiveKey(service.key);
    setActiveValues(applyContextToService(service, merged, baseContext));
    setErrors({});
    setStep("details");
    if (state !== "idle") reset();
    // Reabrir o modal reinicia a jornada com os dados atuais da cotação rápida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, primaryService]);

  const visibleFields = useMemo(
    () =>
      formFields(activeService, { isPrimary, isComplement, values: activeValues })
        .filter((f) => fieldIsVisible(f, activeValues)),
    [activeService, isPrimary, isComplement, activeValues],
  );

  const activeIsMultiRoute = activeService.key === "aereo" && isMultiRoute(activeService, activeValues);

  /** Ida e volta do aéreo: um único calendário de período no lugar de dois campos. */
  const rangeDates = useMemo(() => {
    if (activeService.key !== "aereo" || activeIsMultiRoute) return null;
    const showsIda = visibleFields.some((f) => f.name === "data_ida");
    const showsVolta = visibleFields.some((f) => f.name === "data_volta");
    if (!showsIda && !showsVolta) return null;
    return { range: String(activeValues.tipo_viagem ?? "") !== "Somente ida" && showsVolta };
  }, [activeService.key, activeIsMultiRoute, visibleFields, activeValues.tipo_viagem]);

  const renderedFields = useMemo(
    () =>
      visibleFields.filter((f) =>
        activeIsMultiRoute
          ? f.name !== "destino" && f.name !== "data_ida" && f.name !== "data_volta"
          : rangeDates
          ? f.name !== "data_ida" && f.name !== "data_volta"
          : true,
      ),
    [visibleFields, activeIsMultiRoute, rangeDates],
  );

  const updateLegs = useCallback((next: RouteLeg[]) => {
    setLegs(next);
    setActiveValues((prev) => ({
      ...prev,
      rota_multidestinos: serializeRoute(String(prev.origem ?? ""), next),
    }));
    setErrors({});
  }, []);

  const setDates = useCallback((next: { start: string; end: string }) => {
    setActiveValues((prev) => ({ ...prev, data_ida: next.start, data_volta: next.end }));
    setErrors((prev) => ({ ...prev, data_ida: "", data_volta: "", periodo: "" }));
  }, []);

  const exposesChildren = visibleFields.some((f) => f.name === "criancas");
  const childCount = exposesChildren
    ? Math.max(0, Math.min(12, Number(String(activeValues.criancas ?? "0")) || 0))
    : context.criancas;

  useEffect(() => {
    setContext((prev) =>
      prev.idades_criancas.length === childCount
        ? prev
        : { ...prev, criancas: childCount, idades_criancas: syncChildAges(prev.idades_criancas, childCount) },
    );
  }, [childCount]);

  const setValue = useCallback((name: string, value: string | boolean) => {
    setActiveValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  }, []);

  const setChildAge = (index: number, value: string) => {
    let updated: string[] = [];
    setContext((prev) => {
      const ages = syncChildAges(prev.idades_criancas, Math.max(prev.criancas, index + 1));
      ages[index] = value;
      updated = ages;
      return { ...prev, idades_criancas: ages };
    });
    setErrors((prev) => {
      if (!prev[`child_age_${index}`] && !prev.idades_criancas) return prev;
      const next = { ...prev };
      delete next[`child_age_${index}`];
      const allValid = updated.every((age) => {
        const parsed = Number(age);
        return age !== "" && Number.isInteger(parsed) && parsed >= 0 && parsed <= 17;
      });
      if (allValid) delete next.idades_criancas;
      return next;
    });
  };

  const surface = "bg-card";

  /** Conclui o serviço ativo: valida, grava a entrada e atualiza o contexto. */
  const finishActive = () => {
    const found = validateServiceStep(activeService, activeValues);
    // Campos não renderizados (herdados/derivados) nunca acusam erro ao usuário.
    const renderable = new Set(renderedFields.map((f) => f.name));
    const relevant: Record<string, string> = {};
    for (const [name, message] of Object.entries(found)) {
      if (renderable.has(name)) relevant[name] = message;
    }

    if (activeIsMultiRoute) {
      Object.assign(relevant, validateRouteLegs(String(activeValues.origem ?? ""), legs));
    } else if (rangeDates) {
      if (found.data_ida) relevant.periodo = "Selecione a data de ida.";
      else if (found.data_volta) relevant.periodo = found.data_volta;
    }

    // Idades das crianças são obrigatórias sempre que houver crianças.
    const ageErrors = childCount > 0 ? validateChildAges(context.idades_criancas, childCount) : {};
    Object.assign(relevant, ageErrors);

    setErrors(relevant);
    if (Object.keys(relevant).length) return;

    let nextContext = contextFromService(activeService.key, activeValues, {
      ...context,
      criancas: childCount,
      idades_criancas: syncChildAges(context.idades_criancas, childCount),
    });
    if (activeIsMultiRoute) {
      nextContext = applyRouteToContext(nextContext, String(activeValues.origem ?? ""), legs);
    }
    setContext(nextContext);

    const stored: ServiceValues = {
      ...activeValues,
      idades_criancas:
        activeService.fields.some((f) => f.name === "idades_criancas")
          ? formatChildAges(nextContext.idades_criancas)
          : (activeValues.idades_criancas as string) ?? "",
    };
    setEntries((prev) => {
      const index = prev.findIndex((e) => e.key === activeService.key);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = { key: activeService.key, values: stored };
        return copy;
      }
      return [...prev, { key: activeService.key, values: stored }];
    });

    const chosen = entries.map((e) => e.key);
    if (!chosen.includes(activeService.key)) chosen.push(activeService.key);
    setStep(eligibleComplements(chosen).length ? "complements" : "review");
  };

  const openComplement = (service: RequestService) => {
    const existing = entries.find((e) => e.key === service.key);
    const base = existing?.values ?? initialServiceValues(service);
    setActiveKey(service.key);
    setActiveValues(applyContextToService(service, base, context));
    setErrors({});
    setStep("details");
  };

  const removeEntry = (key: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.key !== key);
      // O contexto volta a refletir SOMENTE os serviços que continuam no pedido.
      setContext((current) => rebuildContext(next, current));
      return next;
    });
  };

  const handleSubmit = async () => {
    const found = validateContactStep(contact);
    setContactErrors(found);
    if (Object.keys(found).length || !entries.length) return;

    const parts = buildJourneyPayload(entries, context);
    await submit({
      ...parts,
      lead_name: contact.lead_name,
      lead_phone: contact.lead_phone,
      lead_email: contact.lead_email,
      preferred_channel: contact.preferred_channel,
      best_time: contact.best_time,
      notes: contact.notes,
      consent: contact.consent,
      consent_version: "v1",
      honeypot,
    });
  };

  const chosenKeys = entries.map((e) => e.key);
  const complements = eligibleComplements(chosenKeys);
  const contextLines = describeContext(context);
  const quickSummary = quickQuoteFields(serviceByKey(primaryKey), 5)
    .map((field) => {
      const source = entries[0]?.values ?? activeValues;
      const value = typeof source[field.name] === "string" ? String(source[field.name]).trim() : "";
      return value ? { label: field.label, value } : null;
    })
    .filter(Boolean) as { label: string; value: string }[];

  const shellBg = editorial ? "bg-[hsl(var(--wl-sand))]" : "bg-muted/30";
  const cardCls = "rounded-xl border border-border/70 bg-card p-4 md:p-5";
  const stepIndex = STEP_LABELS.findIndex((s) => s.key === step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-h-[92vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto rounded-2xl p-0 sm:w-[calc(100vw-3rem)] ${shellBg} ${editorial ? EDITORIAL_ROOT_CLASS : ""}`}
      >
        <DialogHeader className="border-b border-border/60 px-4 pt-5 text-left md:px-7 md:pt-6">
          <DialogTitle className="text-lg md:text-xl">Solicitação de cotação</DialogTitle>
          <DialogDescription>
            {state === "success"
              ? "Recebemos a sua solicitação completa."
              : "Informe apenas o que falta. Um consultor analisa cada pedido — não é uma busca automática."}
          </DialogDescription>

          {state !== "success" && (
            <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-4 pt-3">
              {STEP_LABELS.map((item, index) => {
                const active = item.key === step;
                const done = index < stepIndex;
                return (
                  <li key={item.key} className="flex items-center gap-2">
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                        active || done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <span className={`text-xs ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </DialogHeader>

        <div className="px-4 pb-6 pt-5 md:px-7">
          {state === "success" ? (
            <div className="mx-auto max-w-lg py-4 text-center" role="status">
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <h3 className="text-lg font-semibold text-foreground">Solicitação enviada</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Recebemos a sua solicitação com {entries.length === 1 ? "1 serviço" : `${entries.length} serviços`}
                {entries.length ? ` (${entries.map((e) => serviceByKey(e.key).label).join(", ")})` : ""}. Um consultor da{" "}
                {agencyName} vai retornar pelo canal escolhido para alinhar todos os detalhes.
              </p>
              <Button className="mt-6" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          ) : step === "details" ? (
            <div>
              {/* Resumo do que já veio da primeira dobra / do contexto herdado */}
              <div className={`${cardCls} mb-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {isComplement ? "Dados herdados da viagem" : "Dados iniciais"}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-foreground">{activeService.label}</h3>
                  </div>
                  {isComplement ? null : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onOpenChange(false);
                        onEditQuickValues?.();
                      }}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Editar dados iniciais
                    </Button>
                  )}
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  {(isComplement ? contextLines : quickSummary).map((item) => (
                    <div key={item.label} className="flex gap-2">
                      <dt className="text-muted-foreground">{item.label}:</dt>
                      <dd className="min-w-0 break-words font-medium text-foreground">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className={cardCls}>
                <p className="mb-4 text-sm text-muted-foreground">{activeService.intro}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderedFields.map((field) => (
                    <FieldControl
                      key={field.name}
                      field={field}
                      value={activeValues[field.name] ?? ""}
                      error={errors[field.name] || undefined}
                      onChange={(v) => setValue(field.name, v)}
                      surface={surface}
                      editorial={editorial}
                    />
                  ))}

                  {rangeDates && (
                    <TripDatePicker
                      id="wlq-periodo"
                      label={rangeDates.range ? "Ida e volta" : "Data da ida"}
                      mode={rangeDates.range ? "range" : "single"}
                      start={String(activeValues.data_ida ?? "")}
                      end={String(activeValues.data_volta ?? "")}
                      onChange={setDates}
                      editorial={editorial}
                      required
                      error={errors.periodo || errors.data_ida || errors.data_volta || undefined}
                      className="sm:col-span-2"
                    />
                  )}

                  {activeIsMultiRoute && (
                    <RouteLegsEditor
                      legs={legs}
                      onChange={updateLegs}
                      errors={errors}
                      editorial={editorial}
                      idPrefix="wlq-rota"
                      className="sm:col-span-2"
                    />
                  )}

                  {childCount > 0 && (
                    <fieldset className="sm:col-span-2">
                      <legend className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        Idade das crianças
                        <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                      </legend>
                      <div className="mt-2 grid gap-3 sm:grid-cols-3">
                        {Array.from({ length: childCount }, (_, index) => {
                          const id = `child-age-${index}`;
                          const ageError = errors[`child_age_${index}`];
                          return (
                            <div key={id}>
                              <Label htmlFor={id} className="text-xs text-muted-foreground">
                                Criança {index + 1}
                              </Label>
                              <Select
                                value={context.idades_criancas[index] ?? ""}
                                onValueChange={(v) => setChildAge(index, v)}
                              >
                                <SelectTrigger
                                  id={id}
                                  aria-invalid={!!ageError}
                                  aria-describedby={ageError ? `${id}-error` : undefined}
                                  className={`mt-1.5 ${surface} ${ageError ? "border-destructive" : ""}`}
                                >
                                  <SelectValue placeholder="Idade" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CHILD_AGE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {ageError && (
                                <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">
                                  {ageError}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{CHILD_AGE_HELP}</p>
                      {errors.idades_criancas && (
                        <p role="alert" className="mt-1 text-xs text-destructive">{errors.idades_criancas}</p>
                      )}
                    </fieldset>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                {entries.length ? (
                  <Button variant="ghost" onClick={() => setStep(complements.length ? "complements" : "review")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                ) : (
                  <span />
                )}
                <Button size="lg" className="w-full sm:w-auto" onClick={finishActive}>
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : step === "complements" ? (
            <div>
              <div className={cardCls}>
                <h3 className="text-base font-semibold text-foreground">
                  Quer incluir mais algum serviço nesta solicitação?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Aproveitamos os dados que você já informou. Escolha um serviço ou siga para a revisão.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {complements.map((service) => {
                    const Icon = SERVICE_ICONS[service.key] ?? Compass;
                    return (
                      <button
                        key={service.key}
                        type="button"
                        onClick={() => openComplement(service)}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">{service.label}</span>
                          <span className="block text-xs text-muted-foreground">Adicionar ao pedido</span>
                        </span>
                        <Plus className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => setStep("details")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao serviço
                </Button>
                <Button size="lg" className="w-full sm:w-auto" onClick={() => setStep("review")}>
                  Revisar e finalizar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className={`${cardCls} mb-5`}>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Resumo da viagem
                </p>
                <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  {contextLines.map((item) => (
                    <div key={item.label} className="flex gap-2">
                      <dt className="text-muted-foreground">{item.label}:</dt>
                      <dd className="min-w-0 break-words font-medium text-foreground">{item.value}</dd>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Total de viajantes:</dt>
                    <dd className="font-medium text-foreground">{totalTravelers(context)}</dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-3">
                {entries.map((entry) => {
                  const service = serviceByKey(entry.key);
                  const Icon = SERVICE_ICONS[service.key] ?? Compass;
                  const answers = describeServiceValues(service, entry.values);
                  return (
                    <div key={entry.key} className={cardCls}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <h4 className="text-sm font-semibold text-foreground">{service.label}</h4>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openComplement(service)}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                          </Button>
                          {entries.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEntry(entry.key)}
                              aria-label={`Remover ${service.label}`}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover
                            </Button>
                          )}
                        </div>
                      </div>
                      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                        {answers.map((item) => (
                          <div key={item.label} className="flex gap-2">
                            <dt className="text-muted-foreground">{item.label}:</dt>
                            <dd className="min-w-0 break-words font-medium text-foreground">{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })}
              </div>

              {complements.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {complements.map((service) => (
                    <Button key={service.key} variant="outline" size="sm" onClick={() => openComplement(service)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> {service.label}
                    </Button>
                  ))}
                </div>
              )}

              <div className={`${cardCls} mt-5`}>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Como podemos falar com você
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="wlq_lead_name" className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Nome completo <span aria-hidden="true" className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="wlq_lead_name"
                      className={`mt-1.5 ${surface}`}
                      autoComplete="name"
                      value={contact.lead_name}
                      aria-invalid={!!contactErrors.lead_name}
                      aria-describedby={contactErrors.lead_name ? "wlq_lead_name-error" : undefined}
                      onChange={(e) => setContact((c) => ({ ...c, lead_name: e.target.value }))}
                    />
                    {contactErrors.lead_name && (
                      <p id="wlq_lead_name-error" role="alert" className="mt-1 text-xs text-destructive">
                        {contactErrors.lead_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="wlq_lead_phone" className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      WhatsApp
                    </Label>
                    <Input
                      id="wlq_lead_phone"
                      className={`mt-1.5 ${surface}`}
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(11) 90000-0000"
                      value={contact.lead_phone}
                      aria-invalid={!!contactErrors.lead_phone}
                      aria-describedby={contactErrors.lead_phone ? "wlq_lead_phone-error" : undefined}
                      onChange={(e) => setContact((c) => ({ ...c, lead_phone: e.target.value }))}
                    />
                    {contactErrors.lead_phone && (
                      <p id="wlq_lead_phone-error" role="alert" className="mt-1 text-xs text-destructive">
                        {contactErrors.lead_phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="wlq_lead_email" className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      E-mail
                    </Label>
                    <Input
                      id="wlq_lead_email"
                      className={`mt-1.5 ${surface}`}
                      type="email"
                      autoComplete="email"
                      placeholder="voce@email.com"
                      value={contact.lead_email}
                      aria-invalid={!!contactErrors.lead_email}
                      aria-describedby={contactErrors.lead_email ? "wlq_lead_email-error" : undefined}
                      onChange={(e) => setContact((c) => ({ ...c, lead_email: e.target.value }))}
                    />
                    {contactErrors.lead_email && (
                      <p id="wlq_lead_email-error" role="alert" className="mt-1 text-xs text-destructive">
                        {contactErrors.lead_email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="wlq_channel" className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Canal preferido
                    </Label>
                    <Select
                      value={contact.preferred_channel}
                      onValueChange={(v) => setContact((c) => ({ ...c, preferred_channel: v }))}
                    >
                      <SelectTrigger id="wlq_channel" className={`mt-1.5 ${surface}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_CHANNELS.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="wlq_best_time" className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Melhor horário
                    </Label>
                    <Select
                      value={contact.best_time}
                      onValueChange={(v) => setContact((c) => ({ ...c, best_time: v }))}
                    >
                      <SelectTrigger id="wlq_best_time" className={`mt-1.5 ${surface}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_TIMES.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="wlq_notes" className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Observação
                    </Label>
                    <Textarea
                      id="wlq_notes"
                      className={`mt-1.5 min-h-20 ${surface}`}
                      value={contact.notes}
                      placeholder="Algo mais que devemos saber?"
                      onChange={(e) => setContact((c) => ({ ...c, notes: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Honeypot: escondido de usuários e de leitores de tela. */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="wlq-company-website">Website</label>
                  <input
                    id="wlq-company-website"
                    name="company-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <div className="mt-5 flex items-start gap-2">
                  <Checkbox
                    id="wlq_consent"
                    checked={contact.consent}
                    aria-invalid={!!contactErrors.consent}
                    aria-describedby={contactErrors.consent ? "wlq_consent-error" : undefined}
                    onCheckedChange={(v) => setContact((c) => ({ ...c, consent: v === true }))}
                  />
                  <div>
                    <Label htmlFor="wlq_consent" className="text-sm font-normal leading-snug">
                      Autorizo o uso dos meus dados para contato sobre esta solicitação, conforme a{" "}
                      <a className="underline hover:text-primary" href={privacyUrl}>Política de Privacidade</a> e os{" "}
                      <a className="underline hover:text-primary" href={termsUrl}>Termos de Uso</a>.
                    </Label>
                    {contactErrors.consent && (
                      <p id="wlq_consent-error" role="alert" className="mt-1 text-xs text-destructive">
                        {contactErrors.consent}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {state === "error" && error && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep(complements.length ? "complements" : "details")}
                  disabled={state === "submitting"}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button size="lg" className="w-full sm:w-auto" onClick={handleSubmit} disabled={state === "submitting"}>
                  {state === "submitting" ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Enviar solicitação</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}