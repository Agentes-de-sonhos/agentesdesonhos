import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plane, BedDouble, Car, Bus, Ticket, ShieldCheck, Ship, Compass,
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Send, AlertCircle, Pencil, Trash2, Plus, Minus,
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
import { LocationSearchInput } from "@/components/whitelabel/LocationSearchInput";
import { DestinationTagsInput } from "@/components/whitelabel/DestinationTagsInput";
import { TravelersFields } from "@/components/whitelabel/TravelersFields";
import {
  EMPTY_CONTACT,
  describeServiceValues, fieldIsVisible, initialServiceValues, isMultiRoute,
  mergeServiceValues, periodFieldNames, periodMode, serviceByKey,
  validateContactStep, validateServiceStep,
  type ContactValues, type RequestField, type RequestService, type ServiceValues,
} from "@/lib/agencySiteRequests";
import {
  applyContextToService, buildJourneyPayload,
  applyRouteToContext, contextFromService, describeContext, eligibleComplements,
  emptyRouteLegs, emptyTripContext, formatChildAges, rebuildContext, serializeRoute, syncChildAges, totalTravelers,
  validateChildAges, validateRouteLegs,
  type JourneyEntry, type RouteLeg, type TripContext,
} from "@/lib/agencyQuoteJourney";
import {
  additionalProgressLabel, isTravelerField, stepFields, toggleSelection,
  type JourneyStage,
} from "@/lib/agencyJourneyFlow";
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

/** Títulos curtos e acolhedores do complemento de cada serviço inicial. */
const PRIMARY_HEADINGS: Record<string, { title: string; text: string }> = {
  aereo: {
    title: "Confirme quem viaja e as preferências de voo",
    text: "Buscamos as melhores combinações de rota e tarifa.",
  },
  hospedagem: {
    title: "Confirme quem viaja e o perfil da hospedagem",
    text: "Selecionamos as opções que combinam com a sua viagem.",
  },
  carro: {
    title: "Confirme quem viaja e o tipo de carro",
    text: "Cotamos com a cobertura adequada para o seu roteiro.",
  },
  transfer: {
    title: "Confirme quem viaja e o tipo de transfer",
    text: "Os horários exatos são alinhados com o consultor depois.",
  },
  ingressos: {
    title: "Confirme quem viaja nas experiências",
    text: "Organizamos datas e ingressos com calma.",
  },
  seguro: {
    title: "Confirme quem viaja no seguro",
    text: "Indicamos a cobertura certa para o destino e o perfil.",
  },
  cruzeiros: {
    title: "Confirme quem viaja e a cabine",
    text: "Explicamos itinerários e categorias antes de decidir.",
  },
  pacotes: {
    title: "Confirme quem viaja e o estilo da viagem",
    text: "Montamos um roteiro sob medida para você.",
  },
};

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
      <div className={field.span === 2 ? "md:col-span-2" : ""}>
        <div className="flex items-center gap-2">
          <Checkbox id={id} checked={value === true} onCheckedChange={(v) => onChange(v === true)} />
          <Label htmlFor={id} className="text-sm font-normal">{field.label}</Label>
        </div>
      </div>
    );
  }

  if (field.search) {
    return (
      <LocationSearchInput
        id={id}
        label={field.label}
        kind={field.search}
        value={String(value ?? "")}
        onChange={onChange}
        placeholder={field.placeholder}
        error={error}
        help={field.help}
        required={field.required}
        editorial={editorial}
        className={field.span === 2 ? "md:col-span-2" : ""}
      />
    );
  }

  if (field.type === "tags") {
    return (
      <DestinationTagsInput
        id={id}
        label={field.label}
        value={String(value ?? "")}
        onChange={onChange}
        placeholder={field.placeholder}
        error={error}
        help={field.help}
        required={field.required}
        editorial={editorial}
        className={field.span === 2 ? "md:col-span-2" : ""}
      />
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
        className={field.span === 2 ? "md:col-span-2" : ""}
      />
    );
  }

  return (
    <div className={`min-w-0 ${field.span === 2 || field.type === "textarea" ? "md:col-span-2" : ""}`}>
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {field.label}
        {field.required ? (
          <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
        ) : (
          <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground/80">(opcional)</span>
        )}
      </Label>

      {field.type === "select" ? (
        <Select value={String(value ?? "")} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={id} aria-invalid={!!error} aria-describedby={describedBy} className={`mt-1.5 ${surface} ${error ? "border-destructive" : ""}`}>
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

/** Card quadrado de seleção de serviço — selecionar NUNCA abre formulário. */
function ServiceChoiceCard({
  service, selected, onToggle,
}: {
  service: RequestService;
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = SERVICE_ICONS[service.key] ?? Compass;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      data-testid={`wlq-choice-${service.key}`}
      onClick={onToggle}
      className={`relative flex aspect-square min-h-[112px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        selected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/60 hover:bg-primary/5"
      }`}
    >
      <span className={`grid h-10 w-10 place-items-center rounded-full ${selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-xs font-semibold leading-tight text-foreground">{service.label}</span>
      <span
        aria-hidden="true"
        className={`absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full ${
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {selected ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      </span>
    </button>
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
  /**
   * @deprecated Mantido apenas por compatibilidade de props: a jornada nunca
   * fecha o modal para editar. A edição acontece dentro da própria janela.
   */
  onEditQuickValues?: () => void;
  privacyUrl?: string;
  termsUrl?: string;
}

/**
 * Jornada de cotação White Label em UMA única janela.
 *
 * Máquina de estados: primary -> pick -> additional* -> contact -> (review).
 * Navegar dentro do modal nunca fecha a janela nem apaga dados: valores por
 * serviço, contato, seleção de complementos e idades ficam preservados.
 */
export function AgencyQuoteJourney({
  hostname,
  agencyName,
  open,
  onOpenChange,
  primaryService,
  quickValues,
  quickRoute,
  privacyUrl = "/politicasdeprivacidade",
  termsUrl = "/termosdeuso",
}: AgencyQuoteJourneyProps) {
  const editorial = isEditorialTheme(hostname);
  const { state, error, submit, reset } = useAgencySiteRequest(hostname);

  const [stage, setStage] = useState<JourneyStage>("primary");
  const [context, setContext] = useState<TripContext>(() => emptyTripContext());
  const [entries, setEntries] = useState<JourneyEntry[]>([]);
  const [activeKey, setActiveKey] = useState(primaryService);
  const [activeValues, setActiveValues] = useState<ServiceValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [legs, setLegs] = useState<RouteLeg[]>(() => emptyRouteLegs());
  const [contact, setContact] = useState<ContactValues>(EMPTY_CONTACT);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [selection, setSelection] = useState<string[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [returnToReview, setReturnToReview] = useState(false);

  const primaryKey = entries[0]?.key ?? primaryService;
  const activeService = useMemo(() => serviceByKey(activeKey), [activeKey]);
  const role: "primary" | "additional" = stage === "primary" ? "primary" : "additional";
  const isComplement = role === "additional";

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
    setSelection([]);
    setQueue([]);
    setQueueIndex(0);
    setReturnToReview(false);
    setStage("primary");
    if (state !== "idle") reset();
    // Reabrir o modal reinicia a jornada com os dados atuais da cotação rápida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, primaryService]);

  const allFields = useMemo(
    () => stepFields(activeService, { role, values: activeValues }).filter((f) => fieldIsVisible(f, activeValues)),
    [activeService, role, activeValues],
  );

  const showTravelers = role === "primary";
  const activeIsMultiRoute = activeService.key === "aereo" && isMultiRoute(activeService, activeValues);

  /** Período do serviço: um único calendário no lugar de dois campos de data. */
  const periodNames = useMemo(() => periodFieldNames(activeService), [activeService]);
  const rangeDates = useMemo(() => {
    if (activeIsMultiRoute || !activeService.period) return null;
    const mode = periodMode(activeService, activeValues);
    if (!mode) return null;
    const shown = allFields.some((f) => periodNames.includes(f.name));
    if (!shown) return null;
    return {
      mode,
      label: mode === "single" ? activeService.period.singleLabel ?? activeService.period.label : activeService.period.label,
    };
  }, [activeService, activeIsMultiRoute, allFields, activeValues, periodNames]);

  const renderedFields = useMemo(
    () =>
      allFields
        .filter((f) => !isTravelerField(f.name))
        .filter((f) =>
          activeIsMultiRoute
            ? f.name !== "destino" && f.name !== "data_ida" && f.name !== "data_volta"
            : rangeDates
            ? !periodNames.includes(f.name)
            : true,
        ),
    [allFields, activeIsMultiRoute, rangeDates, periodNames],
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
    const period = activeService.period;
    if (!period) return;
    setActiveValues((prev) => ({ ...prev, [period.start]: next.start, [period.end]: next.end }));
    setErrors((prev) => ({ ...prev, [period.start]: "", [period.end]: "", periodo: "" }));
  }, [activeService]);

  const childCount = showTravelers
    ? Math.max(0, Math.min(12, Number(String(activeValues.criancas ?? "0")) || 0))
    : context.criancas;

  useEffect(() => {
    setContext((prev) =>
      prev.idades_criancas.length === childCount && prev.criancas === childCount
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
  const shellBg = editorial ? "bg-[hsl(var(--wl-sand))]" : "bg-muted/30";
  const cardCls = "rounded-2xl border border-border/70 bg-card p-4 md:p-5";

  const chosenKeys = entries.map((e) => e.key);
  const complements = eligibleComplements(chosenKeys);
  const contextLines = describeContext(context);

  /** Guarda o serviço ativo no pedido e devolve o contexto atualizado. */
  const commitActive = (): TripContext | null => {
    const found = validateServiceStep(activeService, activeValues);
    const renderable = new Set(renderedFields.map((f) => f.name));
    const relevant: Record<string, string> = {};
    for (const [name, message] of Object.entries(found)) {
      if (renderable.has(name)) relevant[name] = message;
    }

    for (const field of renderedFields) {
      if (!field.required) continue;
      const raw = activeValues[field.name];
      const value = typeof raw === "string" ? raw.trim() : raw;
      if (field.type !== "checkbox" && !value) relevant[field.name] = "Campo obrigatório.";
    }

    if (activeIsMultiRoute) {
      Object.assign(relevant, validateRouteLegs(String(activeValues.origem ?? ""), legs));
    } else if (rangeDates && activeService.period) {
      const { start, end } = activeService.period;
      delete relevant[start];
      delete relevant[end];
      if (found[start]) relevant.periodo = "Selecione a data inicial.";
      else if (found[end]) relevant.periodo = found[end];
    }

    if (showTravelers) {
      const adults = Number(String(activeValues.adultos ?? ""));
      if (!Number.isInteger(adults) || adults < 1) relevant.adultos = "Informe quantos adultos viajam.";
      const kidsRaw = String(activeValues.criancas ?? "").trim();
      const kids = Number(kidsRaw);
      if (kidsRaw === "" || !Number.isInteger(kids) || kids < 0) {
        relevant.criancas = "Informe 0 se não houver crianças.";
      }
      if (childCount > 0) Object.assign(relevant, validateChildAges(context.idades_criancas, childCount));
    }

    setErrors(relevant);
    if (Object.keys(relevant).length) return null;

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
    return nextContext;
  };

  const openService = (service: RequestService, nextStage: "primary" | "additional", ctx?: TripContext) => {
    const existing = entries.find((e) => e.key === service.key);
    const base = existing?.values ?? initialServiceValues(service);
    setActiveKey(service.key);
    setActiveValues(applyContextToService(service, base, ctx ?? context));
    setErrors({});
    setStage(nextStage);
  };

  const startQueue = (keys: string[], toReview: boolean, ctx?: TripContext) => {
    setQueue(keys);
    setQueueIndex(0);
    setReturnToReview(toReview);
    setSelection([]);
    openService(serviceByKey(keys[0]), "additional", ctx);
  };

  const handlePrimaryContinue = () => {
    const nextContext = commitActive();
    if (!nextContext) return;
    if (returnToReview) {
      setReturnToReview(false);
      setStage("review");
      return;
    }
    const chosen = entries.map((e) => e.key);
    if (!chosen.includes(activeService.key)) chosen.push(activeService.key);
    setStage(eligibleComplements(chosen).length ? "pick" : "contact");
  };

  const handlePickContinue = () => {
    if (!selection.length) {
      setQueue([]);
      setQueueIndex(0);
      setStage("contact");
      return;
    }
    startQueue(selection, false);
  };

  const handleAdditionalContinue = () => {
    const nextContext = commitActive();
    if (!nextContext) return;
    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex);
      openService(serviceByKey(queue[nextIndex]), "additional", nextContext);
      return;
    }
    if (returnToReview) {
      setReturnToReview(false);
      setStage("review");
      return;
    }
    setStage("contact");
  };

  const handleAdditionalBack = () => {
    if (queueIndex > 0) {
      const previous = queueIndex - 1;
      setQueueIndex(previous);
      openService(serviceByKey(queue[previous]), "additional");
      return;
    }
    setStage(returnToReview ? "review" : "pick");
  };

  const handleContactBack = () => {
    if (returnToReview) {
      setReturnToReview(false);
      setStage("review");
      return;
    }
    if (queue.length) {
      setQueueIndex(queue.length - 1);
      openService(serviceByKey(queue[queue.length - 1]), "additional");
      return;
    }
    setStage(complements.length ? "pick" : "primary");
  };

  const removeEntry = (key: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.key !== key);
      setContext((current) => rebuildContext(next, current));
      return next;
    });
    setQueue((prev) => prev.filter((item) => item !== key));
  };

  const editEntry = (key: string) => {
    setReturnToReview(true);
    openService(serviceByKey(key), key === primaryKey ? "primary" : "additional");
    if (key !== primaryKey) {
      setQueue([key]);
      setQueueIndex(0);
    }
  };

  const validateContact = () => {
    const found = validateContactStep(contact);
    setContactErrors(found);
    return !Object.keys(found).length;
  };

  const handleSubmit = async () => {
    if (!validateContact() || !entries.length) return;
    const parts = buildJourneyPayload(entries, context);
    await submit({
      ...parts,
      lead_name: contact.lead_name,
      lead_phone: contact.lead_phone,
      lead_email: contact.lead_email,
      // Campos legados do payload: derivados do que o cliente informou.
      preferred_channel: contact.lead_phone.trim() ? "WhatsApp" : "E-mail",
      best_time: "Qualquer horário",
      notes: contact.notes,
      consent: contact.consent,
      consent_version: "v1",
      honeypot,
    });
  };

  const heading = PRIMARY_HEADINGS[activeService.key] ?? {
    title: "Confirme os últimos detalhes",
    text: activeService.intro,
  };

  const travelersBlock = showTravelers ? (
    <TravelersFields
      idPrefix="wlq"
      adults={String(activeValues.adultos ?? "")}
      children={String(activeValues.criancas ?? "0")}
      ages={context.idades_criancas}
      onAdultsChange={(v) => setValue("adultos", v)}
      onChildrenChange={(v) => setValue("criancas", v)}
      onAgeChange={setChildAge}
      errors={errors}
      editorial={editorial}
    />
  ) : null;

  const contactSummary = [
    contact.lead_name && { label: "Nome", value: contact.lead_name },
    contact.lead_phone && { label: "WhatsApp", value: contact.lead_phone },
    contact.lead_email && { label: "E-mail", value: contact.lead_email },
    contact.notes && { label: "Observações", value: contact.notes },
  ].filter(Boolean) as { label: string; value: string }[];

  const contactBlock = (
    <div className={cardCls}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0 md:col-span-2">
          <Label htmlFor="wlq_lead_name" className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Nome <span aria-hidden="true" className="text-destructive">*</span>
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

        <div className="min-w-0">
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

        <div className="min-w-0">
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

        <div className="min-w-0 md:col-span-2">
          <Label htmlFor="wlq_notes" className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Observações <span className="font-normal normal-case tracking-normal text-muted-foreground/80">(opcional)</span>
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
  );

  const submitError = state === "error" && error ? (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  ) : null;

  const serviceForm = (
    <div className={cardCls}>
      <div className="grid gap-4 md:grid-cols-2">
        {travelersBlock}

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
            label={rangeDates.label}
            mode={rangeDates.mode}
            start={String(activeValues[activeService.period!.start] ?? "")}
            end={String(activeValues[activeService.period!.end] ?? "")}
            onChange={setDates}
            editorial={editorial}
            required
            error={errors.periodo || undefined}
            className="md:col-span-2"
          />
        )}

        {activeIsMultiRoute && (
          <RouteLegsEditor
            legs={legs}
            onChange={updateLegs}
            errors={errors}
            editorial={editorial}
            idPrefix="wlq-rota"
            className="md:col-span-2"
          />
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-h-[92vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto overflow-x-hidden rounded-2xl border-0 p-0 sm:w-[calc(100vw-3rem)] ${shellBg} ${editorial ? EDITORIAL_ROOT_CLASS : ""}`}
      >
        <DialogHeader className="border-b border-border/60 bg-card px-4 pb-4 pt-5 text-left md:px-7 md:pt-6">
          <DialogTitle className="text-lg md:text-xl">
            {state === "success"
              ? "Solicitação enviada"
              : stage === "primary"
              ? heading.title
              : stage === "pick"
              ? "Quer incluir mais algum serviço nesta solicitação?"
              : stage === "additional"
              ? activeService.label
              : stage === "contact"
              ? "Como podemos falar com você?"
              : "Revise sua solicitação"}
          </DialogTitle>
          <DialogDescription>
            {state === "success"
              ? "Recebemos a sua solicitação completa."
              : stage === "primary"
              ? heading.text
              : stage === "pick"
              ? "Aproveitamos tudo o que você já informou."
              : stage === "additional"
              ? additionalProgressLabel(queueIndex, queue.length || 1)
              : stage === "contact"
              ? "É só um contato para o consultor retornar. Não é uma compra."
              : "Confira e edite o que quiser antes de enviar."}
          </DialogDescription>
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
                {agencyName} vai retornar para alinhar todos os detalhes.
              </p>
              <Button className="mt-6" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          ) : stage === "primary" || stage === "additional" ? (
            <div>
              <div className={`${cardCls} mb-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {isComplement ? "Dados herdados da viagem" : "Você já informou"}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-foreground">{activeService.label}</h3>
                  </div>
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  {contextLines.map((item) => (
                    <div key={item.label} className="flex min-w-0 gap-2">
                      <dt className="text-muted-foreground">{item.label}:</dt>
                      <dd className="min-w-0 break-words font-medium text-foreground">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {serviceForm}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                {stage === "additional" || returnToReview ? (
                  <Button variant="ghost" onClick={stage === "additional" ? handleAdditionalBack : () => setStage("review")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={stage === "primary" ? handlePrimaryContinue : handleAdditionalContinue}
                >
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : stage === "pick" ? (
            <div>
              <div className={cardCls}>
                <p className="text-sm text-muted-foreground">
                  Selecione quantos serviços quiser — você preenche cada um em seguida.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {complements.map((service) => (
                    <ServiceChoiceCard
                      key={service.key}
                      service={service}
                      selected={selection.includes(service.key)}
                      onToggle={() => setSelection((prev) => toggleSelection(prev, service.key))}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => setStage("primary")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button size="lg" className="w-full sm:w-auto" onClick={handlePickContinue}>
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : stage === "contact" ? (
            <div>
              {contactBlock}
              {submitError}
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="ghost" onClick={handleContactBack} disabled={state === "submitting"}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    variant="link"
                    className="text-muted-foreground"
                    disabled={state === "submitting"}
                    onClick={() => {
                      if (validateContact()) setStage("review");
                    }}
                  >
                    Revisar solicitação
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
            </div>
          ) : (
            <div>
              <div className={`${cardCls} mb-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Dados gerais da viagem
                  </p>
                  <Button variant="outline" size="sm" onClick={() => editEntry(primaryKey)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                  </Button>
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  {contextLines.map((item) => (
                    <div key={item.label} className="flex min-w-0 gap-2">
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
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`Editar ${service.label}`}
                            onClick={() => editEntry(entry.key)}
                          >
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
                          <div key={item.label} className="flex min-w-0 gap-2">
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
                <div className={`${cardCls} mt-4`}>
                  <p className="text-sm font-semibold text-foreground">Quer incluir mais algum serviço?</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {complements.map((service) => (
                      <ServiceChoiceCard
                        key={service.key}
                        service={service}
                        selected={selection.includes(service.key)}
                        onToggle={() => setSelection((prev) => toggleSelection(prev, service.key))}
                      />
                    ))}
                  </div>
                  {selection.length > 0 && (
                    <Button className="mt-4" onClick={() => startQueue(selection, true)}>
                      Preencher {selection.length === 1 ? "o serviço" : "os serviços"} selecionado
                      {selection.length === 1 ? "" : "s"} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              <div className={`${cardCls} mt-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Dados de contato
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Editar dados de contato"
                    onClick={() => {
                      setReturnToReview(true);
                      setStage("contact");
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                  </Button>
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  {contactSummary.map((item) => (
                    <div key={item.label} className="flex min-w-0 gap-2">
                      <dt className="text-muted-foreground">{item.label}:</dt>
                      <dd className="min-w-0 break-words font-medium text-foreground">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {submitError}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button
                  variant="ghost"
                  disabled={state === "submitting"}
                  onClick={() => {
                    setReturnToReview(true);
                    setStage("contact");
                  }}
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
