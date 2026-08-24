import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plane, BedDouble, Car, Bus, Ticket, ShieldCheck, Ship, Compass,
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Send, AlertCircle, Plus, Trash2, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isEditorialTheme } from "@/lib/agencySiteTheme";
import { portalThemeClass } from "@/lib/agencySitePortalTheme";
import { RouteLegsEditor } from "@/components/whitelabel/RouteLegsEditor";
import { TripDatePicker } from "@/components/whitelabel/TripDatePicker";
import { LocationSearchInput } from "@/components/whitelabel/LocationSearchInput";
import { DestinationTagsInput } from "@/components/whitelabel/DestinationTagsInput";
import {
  EMPTY_CONTACT, REQUEST_SERVICES,
  mergeServiceValues, isMultiRoute, serviceByKey, validateContactStep,
  type ContactValues, type RequestField, type RequestService, type ServiceValues,
} from "@/lib/agencySiteRequests";
import {
  applyRouteToContext, buildJourneyPayload, contextFromService, describeContext,
  emptyRouteLegs, emptyTripContext, formatChildAges, serializeRoute, syncChildAges,
  type JourneyEntry, type RouteLeg, type TripContext,
} from "@/lib/agencyQuoteJourney";
import { isTravelerField } from "@/lib/agencyJourneyFlow";
import {
  extraOccurrence, inheritedOccurrence, newOccurrenceId, occurrenceLabel, occurrencePlan,
  validateOccurrence,
  type Occurrence, type ServiceGroup,
} from "@/lib/agencyJourneyOccurrences";
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

/** Rótulos usados na escolha de serviços adicionais. */
const PICK_LABELS: Record<string, string> = { pacotes: "Outros serviços" };

const pickLabel = (service: RequestService) => PICK_LABELS[service.key] ?? service.label;

/** Título curto do complemento de cada serviço inicial. */
const PRIMARY_HEADINGS: Record<string, { title: string; text: string }> = {
  aereo: { title: "Preferências do seu voo", text: "Só o que falta para o consultor cotar com precisão." },
  hospedagem: { title: "Preferências da sua hospedagem", text: "Só o que falta para o consultor cotar com precisão." },
  carro: { title: "Preferências do seu aluguel de carro", text: "Só o que falta para o consultor cotar com precisão." },
  transfer: { title: "Preferências do seu transfer", text: "Só o que falta para o consultor cotar com precisão." },
  ingressos: { title: "Preferências dos seus ingressos", text: "Só o que falta para o consultor cotar com precisão." },
  seguro: { title: "Preferências do seu seguro viagem", text: "Só o que falta para o consultor cotar com precisão." },
  cruzeiros: { title: "Preferências do seu cruzeiro", text: "Só o que falta para o consultor cotar com precisão." },
  pacotes: { title: "Preferências da sua viagem", text: "Só o que falta para o consultor cotar com precisão." },
};

const PICK_TEXT =
  "Selecione os demais serviços que você gostaria de incluir na sua solicitação. Você poderá informar os detalhes na próxima etapa.";

type Stage = "primary" | "pick" | "additional" | "contact";

const INPUT_CLASS =
  "mt-1.5 rounded-xl border-border/60 bg-background shadow-none focus-visible:ring-2 focus-visible:ring-primary/30";

function FieldControl({
  field, value, error, onChange, editorial,
}: {
  field: RequestField;
  value: string | boolean;
  error?: string;
  onChange: (value: string | boolean) => void;
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
          <span aria-hidden="true" className="wl-required ml-0.5 text-destructive">*</span>
        ) : (
          <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground/80">(opcional)</span>
        )}
      </Label>

      {field.type === "select" ? (
        <Select value={String(value ?? "")} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={id} aria-invalid={!!error} aria-describedby={describedBy} className={`${INPUT_CLASS} ${error ? "border-destructive" : ""}`}>
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
          className={`${INPUT_CLASS} min-h-20`}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          className={`${INPUT_CLASS} ${error ? "border-destructive" : ""}`}
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

/** Opção de serviço adicional — seleção múltipla, sem abrir formulário. */
function ServiceChoiceRow({
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
      className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        selected ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50 hover:bg-primary/[0.03]"
      }`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{pickLabel(service)}</span>
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
        }`}
      >
        {selected ? <Check className="h-3.5 w-3.5" /> : null}
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
  /** @deprecated a jornada nunca fecha o modal para editar. */
  onEditQuickValues?: () => void;
  privacyUrl?: string;
  termsUrl?: string;
}

interface DraftShape {
  sig: string;
  stage: Stage;
  context: TripContext;
  groups: ServiceGroup[];
  selection: string[];
  stepIndex: number;
  contact: ContactValues;
}

/**
 * Assistente de preenchimento da solicitação White Label — uma única janela.
 *
 * Etapas: complemento do serviço inicial -> escolha de serviços adicionais ->
 * um formulário por serviço adicional (com ocorrências múltiplas) -> contato,
 * que já envia. Não existe tela de revisão.
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

  const draftKey = `wl-journey:${hostname}:${primaryService}`;
  const signature = useMemo(
    () => JSON.stringify({ quickValues, quickRoute: quickRoute ?? [] }),
    [quickValues, quickRoute],
  );

  const [stage, setStage] = useState<Stage>("primary");
  const [context, setContext] = useState<TripContext>(() => emptyTripContext());
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [stepIndex, setStepIndex] = useState(1);
  const [selection, setSelection] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [contact, setContact] = useState<ContactValues>(EMPTY_CONTACT);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const buildFreshGroups = useCallback((): { groups: ServiceGroup[]; context: TripContext } => {
    const service = serviceByKey(primaryService);
    const merged = mergeServiceValues(service, quickValues);
    const legs = quickRoute?.length ? quickRoute.map((l) => ({ ...l })) : emptyRouteLegs();
    let baseContext = contextFromService(service.key, merged, emptyTripContext());
    if (isMultiRoute(service, merged)) {
      baseContext = applyRouteToContext(baseContext, String(merged.origem ?? ""), legs);
    }
    return {
      context: baseContext,
      groups: [{ key: service.key, items: [{ id: newOccurrenceId(service.key), values: merged, legs }] }],
    };
  }, [primaryService, quickValues, quickRoute]);

  /** Ao abrir: retoma o rascunho da sessão ou monta a etapa inicial. */
  useEffect(() => {
    if (!open) return;
    let restored = false;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as DraftShape;
        if (draft?.sig === signature && draft.groups?.length) {
          setStage(draft.stage ?? "primary");
          setContext(draft.context);
          setGroups(draft.groups);
          setSelection(draft.selection ?? []);
          setStepIndex(draft.stepIndex ?? 1);
          setContact(draft.contact ?? EMPTY_CONTACT);
          restored = true;
        }
      }
    } catch { /* rascunho inválido: começa limpo */ }

    if (!restored) {
      const fresh = buildFreshGroups();
      setContext(fresh.context);
      setGroups(fresh.groups);
      setSelection([]);
      setStepIndex(1);
      setStage("primary");
    }
    setErrors({});
    setContactErrors({});
    if (state !== "idle") reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, primaryService, signature]);

  /** Rascunho de sessão: fechar e reabrir não perde nada. */
  useEffect(() => {
    if (!open || !groups.length || state === "success") return;
    try {
      const draft: DraftShape = { sig: signature, stage, context, groups, selection, stepIndex, contact };
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch { /* quota */ }
  }, [open, draftKey, signature, stage, context, groups, selection, stepIndex, contact, state]);

  const groupIndex = stage === "primary" ? 0 : stepIndex;
  const group = groups[groupIndex];
  const groupService = useMemo(
    () => serviceByKey(group?.key ?? primaryService),
    [group?.key, primaryService],
  );
  const isPrimaryStep = stage === "primary";

  const complements = useMemo(
    () => REQUEST_SERVICES.filter((s) => s.key !== (groups[0]?.key ?? primaryService)),
    [groups, primaryService],
  );

  const totalSteps = 3 + Math.max(0, groups.length - 1);
  const currentStep =
    stage === "primary" ? 1 : stage === "pick" ? 2 : stage === "additional" ? stepIndex + 2 : totalSteps;
  const isLastStep = stage === "contact";

  const childCount = context.criancas;

  const updateOccurrence = useCallback(
    (occId: string, patch: (values: ServiceValues) => ServiceValues, legs?: RouteLeg[]) => {
      setGroups((prev) =>
        prev.map((g, gi) =>
          gi !== groupIndex
            ? g
            : {
                ...g,
                items: g.items.map((item) =>
                  item.id !== occId ? item : { ...item, values: patch(item.values), legs: legs ?? item.legs },
                ),
              },
        ),
      );
    },
    [groupIndex],
  );

  const setValue = useCallback(
    (occId: string, name: string, value: string | boolean) => {
      updateOccurrence(occId, (values) => ({ ...values, [name]: value }));
      setErrors((prev) => {
        if (!prev[occId]?.[name]) return prev;
        const next = { ...prev, [occId]: { ...prev[occId] } };
        delete next[occId][name];
        return next;
      });
    },
    [updateOccurrence],
  );

  const setLegs = useCallback(
    (occId: string, legs: RouteLeg[]) => {
      updateOccurrence(
        occId,
        (values) => ({ ...values, rota_multidestinos: serializeRoute(String(values.origem ?? ""), legs) }),
        legs,
      );
      setErrors((prev) => ({ ...prev, [occId]: {} }));
    },
    [updateOccurrence],
  );

  const addOccurrence = () => {
    setGroups((prev) =>
      prev.map((g, gi) => (gi !== groupIndex ? g : { ...g, items: [...g.items, extraOccurrence(groupService, context)] })),
    );
  };

  const removeOccurrence = (occId: string) => {
    setGroups((prev) =>
      prev.map((g, gi) => (gi !== groupIndex ? g : { ...g, items: g.items.filter((i) => i.id !== occId) })),
    );
  };

  /** Valida o passo atual e atualiza o contexto compartilhado. */
  const commitStep = (): boolean => {
    if (!group) return false;
    const found: Record<string, Record<string, string>> = {};
    let hasError = false;

    group.items.forEach((item, index) => {
      const role = isPrimaryStep && index === 0 ? "primary" : "additional";
      const itemErrors = validateOccurrence(groupService, item, {
        role,
        childAges: context.idades_criancas,
        childCount,
      });
      if (Object.keys(itemErrors).length) hasError = true;
      found[item.id] = itemErrors;
    });

    setErrors(found);
    if (hasError) {
      window.requestAnimationFrame(() => {
        const first = bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (first?.tabIndex !== undefined) first.focus?.();
      });
      return false;
    }

    if (isPrimaryStep) {
      const first = group.items[0];
      let next = contextFromService(groupService.key, first.values, {
        ...context,
        idades_criancas: syncChildAges(context.idades_criancas, childCount),
      });
      if (groupService.key === "aereo" && isMultiRoute(groupService, first.values)) {
        next = applyRouteToContext(next, String(first.values.origem ?? ""), first.legs);
      }
      setContext(next);
    }
    return true;
  };

  const goToStage = (next: Stage) => {
    setStage(next);
    setErrors({});
    window.requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: 0 }));
  };

  const handlePrimaryContinue = () => {
    if (!commitStep()) return;
    goToStage("pick");
  };

  const startSelected = (keys: string[]) => {
    const base = groups.slice(0, 1);
    const added = keys.map((key) => ({
      key,
      items: [inheritedOccurrence(serviceByKey(key), context)],
    }));
    setGroups([...base, ...added]);
    setSelection([]);
    if (!added.length) {
      goToStage("contact");
      return;
    }
    setStepIndex(1);
    goToStage("additional");
  };

  const handlePickContinue = () => startSelected(selection);

  const handleAdditionalContinue = () => {
    if (!commitStep()) return;
    if (stepIndex + 1 < groups.length) {
      setStepIndex(stepIndex + 1);
      goToStage("additional");
      return;
    }
    goToStage("contact");
  };

  const handleAdditionalBack = () => {
    if (stepIndex > 1) {
      setStepIndex(stepIndex - 1);
      goToStage("additional");
      return;
    }
    goToStage("pick");
  };

  const handleContactBack = () => {
    if (groups.length > 1) {
      setStepIndex(groups.length - 1);
      goToStage("additional");
      return;
    }
    goToStage("pick");
  };

  const entriesForPayload = (): JourneyEntry[] =>
    groups.flatMap((g) => {
      const service = serviceByKey(g.key);
      const hasAgesField = service.fields.some((f) => f.name === "idades_criancas");
      return g.items.map((item) => ({
        key: g.key,
        values: {
          ...item.values,
          idades_criancas: hasAgesField
            ? formatChildAges(context.idades_criancas)
            : (item.values.idades_criancas as string) ?? "",
        },
      }));
    });

  const handleSubmit = async () => {
    const found = validateContactStep(contact);
    setContactErrors(found);
    if (Object.keys(found).length) return;
    const entries = entriesForPayload();
    if (!entries.length) return;
    const parts = buildJourneyPayload(entries, context);
    await submit({
      ...parts,
      lead_name: contact.lead_name,
      lead_phone: contact.lead_phone,
      lead_email: contact.lead_email,
      preferred_channel: contact.lead_phone.trim() ? "WhatsApp" : "E-mail",
      best_time: "Qualquer horário",
      notes: contact.notes,
      consent: contact.consent,
      consent_version: "v1",
      honeypot,
    });
    try {
      sessionStorage.removeItem(draftKey);
    } catch { /* ignore */ }
  };

  const heading = PRIMARY_HEADINGS[groupService.key] ?? {
    title: "Confirme os últimos detalhes",
    text: groupService.intro,
  };
  const HeaderIcon =
    SERVICE_ICONS[stage === "pick" || stage === "contact" ? (groups[0]?.key ?? primaryService) : groupService.key] ??
    Compass;

  const contextLines = describeContext(context);
  const totalServices = groups.reduce((sum, g) => sum + g.items.length, 0);

  const submitError = state === "error" && error ? (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  ) : null;

  const renderOccurrence = (item: Occurrence, index: number, total: number) => {
    const role = isPrimaryStep && index === 0 ? "primary" : "additional";
    const plan = occurrencePlan(groupService, item.values, role);
    const occErrors = errors[item.id] ?? {};

    return (
      <div key={item.id} className={index > 0 ? "border-t border-border/50 pt-5" : ""}>
        {total > 1 && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              {occurrenceLabel(groupService.label, index, total)}
            </p>
            {index > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => removeOccurrence(item.id)}
                aria-label={`Remover ${occurrenceLabel(groupService.label, index, total)}`}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Viajantes (adultos, crianças e idades) vêm da primeira etapa:
              ficam herdados no estado e no payload, sem reaparecer aqui. */}
          {plan.fields
            .filter((f) => !isTravelerField(f.name))
            .map((field) => (
              <FieldControl
                key={field.name}
                field={field}
                value={item.values[field.name] ?? ""}
                error={occErrors[field.name] || undefined}
                onChange={(v) => setValue(item.id, field.name, v)}
                editorial={editorial}
              />
            ))}

          {plan.period && (
            <TripDatePicker
              id={`wlq-periodo-${item.id}`}
              label={plan.period.label}
              mode={plan.period.mode}
              start={String(item.values[plan.period.start] ?? "")}
              end={String(item.values[plan.period.end] ?? "")}
              onChange={({ start, end }) =>
                updateOccurrence(item.id, (values) => ({
                  ...values,
                  [plan.period!.start]: start,
                  [plan.period!.end]: end,
                }))
              }
              editorial={editorial}
              required
              error={occErrors.periodo || undefined}
              className="md:col-span-2"
            />
          )}

          {plan.multiRoute && (
            <RouteLegsEditor
              legs={item.legs.length ? item.legs : emptyRouteLegs()}
              onChange={(next) => setLegs(item.id, next)}
              errors={occErrors}
              editorial={editorial}
              idPrefix={`wlq-rota-${item.id}`}
              className="md:col-span-2"
            />
          )}
        </div>
      </div>
    );
  };

  const serviceStep = group ? (
    <div>
      {contextLines.length > 0 && (
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          {contextLines.map((line) => `${line.label}: ${line.value}`).join(" · ")}
        </p>
      )}

      <div className="space-y-5">
        {group.items.map((item, index) => renderOccurrence(item, index, group.items.length))}
      </div>

      <button
        type="button"
        onClick={addOccurrence}
        data-testid="wlq-add-occurrence"
        className="wl-add-action mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar outro {groupService.label.toLowerCase()}
      </button>
    </div>
  ) : null;

  const pickStep = (
    <div>
      <p className="text-sm leading-relaxed text-muted-foreground">{PICK_TEXT}</p>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {complements.map((service) => (
          <ServiceChoiceRow
            key={service.key}
            service={service}
            selected={selection.includes(service.key)}
            onToggle={() =>
              setSelection((prev) =>
                prev.includes(service.key) ? prev.filter((k) => k !== service.key) : [...prev, service.key],
              )
            }
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => startSelected([])}
        className="mt-5 text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
      >
        Enviar somente {serviceByKey(groups[0]?.key ?? primaryService).label.toLowerCase()}
      </button>
    </div>
  );

  const contactStep = (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0 md:col-span-2">
          <Label htmlFor="wlq_lead_name" className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Nome <span aria-hidden="true" className="wl-required text-destructive">*</span>
          </Label>
          <Input
            id="wlq_lead_name"
            className={INPUT_CLASS}
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
            className={INPUT_CLASS}
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
            className={INPUT_CLASS}
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
            className={`${INPUT_CLASS} min-h-20`}
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
      {submitError}
    </div>
  );

  const title =
    state === "success"
      ? "Solicitação enviada"
      : stage === "primary"
      ? heading.title
      : stage === "pick"
      ? "Quais outros serviços você deseja incluir?"
      : stage === "additional"
      ? groupService.label
      : "Como podemos falar com você?";

  const description =
    state === "success"
      ? "Recebemos a sua solicitação."
      : stage === "primary"
      ? heading.text
      : stage === "pick"
      ? null
      : stage === "additional"
      ? `Informe os dados de ${groupService.label.toLowerCase()}.`
      : "É só um contato para o consultor retornar. Não é uma compra.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-3xl border-0 bg-card p-0 shadow-2xl sm:w-[calc(100vw-3rem)] ${editorial ? portalThemeClass(hostname) : ""}`}
      >
        <div className="flex items-start gap-3 px-5 pb-3 pt-6 md:px-8">
          <span className="wl-icon-badge grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <HeaderIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 pr-8">
            {state !== "success" && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Etapa {currentStep} de {totalSteps}
              </p>
            )}
            <DialogTitle className="mt-0.5 text-lg font-semibold leading-snug md:text-xl">{title}</DialogTitle>
            {description && (
              <DialogDescription className="mt-1 text-sm text-muted-foreground">{description}</DialogDescription>
            )}
          </div>
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 pt-2 md:px-8">
          {state === "success" ? (
            <div className="mx-auto max-w-md py-6 text-center" role="status">
              <span className="wl-icon-badge mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <h3 className="text-lg font-semibold text-foreground">Solicitação enviada</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Recebemos a sua solicitação com{" "}
                {totalServices === 1 ? "1 serviço" : `${totalServices} serviços`}. Um consultor da {agencyName} vai
                retornar para alinhar todos os detalhes.
              </p>
              <Button className="mt-6" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          ) : stage === "pick" ? (
            pickStep
          ) : stage === "contact" ? (
            contactStep
          ) : (
            serviceStep
          )}
        </div>

        {state !== "success" && (
          <div className="flex items-center justify-between gap-3 border-t border-border/50 bg-card px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8">
            {stage === "primary" ? (
              <span />
            ) : (
              <Button
                variant="ghost"
                className="text-muted-foreground"
                disabled={state === "submitting"}
                onClick={
                  stage === "pick"
                    ? () => goToStage("primary")
                    : stage === "additional"
                    ? handleAdditionalBack
                    : handleContactBack
                }
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
            )}

            <Button
              size="lg"
              className="wl-journey-cta min-w-[9rem] rounded-xl"
              disabled={state === "submitting"}
              onClick={
                stage === "primary"
                  ? handlePrimaryContinue
                  : stage === "pick"
                  ? handlePickContinue
                  : stage === "additional"
                  ? handleAdditionalContinue
                  : handleSubmit
              }
            >
              {isLastStep ? (
                state === "submitting" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Enviar solicitação</>
                )
              ) : (
                <>Continuar <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
