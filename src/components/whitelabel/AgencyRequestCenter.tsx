import { useCallback, useMemo, useState } from "react";
import {
  Plane, BedDouble, Car, Bus, Ticket, ShieldCheck, Ship, Compass,
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Send, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  REQUEST_SERVICES, CONTACT_CHANNELS, CONTACT_TIMES, EMPTY_CONTACT,
  buildDetailsPayload, buildRequestSummary, describeServiceValues,
  initialServiceValues, mergeServiceValues, resolveDestination, serviceByKey,
  validateContactStep, validateServiceStep,
  type ContactValues, type RequestField, type ServiceValues,
} from "@/lib/agencySiteRequests";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";

const SERVICE_ICONS: Record<string, typeof Plane> = {
  aereo: Plane,
  hospedagem: BedDouble,
  carro: Car,
  transfer: Bus,
  ingressos: Ticket,
  seguro: ShieldCheck,
  cruzeiros: Ship,
  pacotes: Compass,
};

function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: RequestField;
  value: string | boolean;
  error?: string;
  onChange: (value: string | boolean) => void;
}) {
  const id = `req-${field.name}`;
  const describedBy = error ? `${id}-error` : undefined;

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

  return (
    <div className={field.span === 2 ? "sm:col-span-2" : ""}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {field.label}
        {field.required && <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>}
      </Label>

      {field.type === "select" ? (
        <Select value={String(value ?? "")} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={id} aria-invalid={!!error} aria-describedby={describedBy} className="mt-1.5">
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
          className="mt-1.5 min-h-20"
          value={String(value ?? "")}
          placeholder={field.placeholder}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          className="mt-1.5"
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
        <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>
      ) : null}
    </div>
  );
}

export interface AgencyRequestCenterProps {
  hostname: string;
  agencyName: string;
  /** Optional privacy/terms links shown next to the consent checkbox. */
  privacyUrl?: string;
  termsUrl?: string;
  /** Controlled service tab (used by the campaign modules CTAs). */
  service?: string;
  onServiceChange?: (key: string) => void;
  /** Uncontrolled initial tab (used when opened from the quick quote card). */
  initialService?: string;
  /** Values already typed in the compact card, carried into step 1. */
  prefill?: ServiceValues | null;
  /** `plain` removes the card chrome so it can live inside a modal/drawer. */
  variant?: "card" | "plain";
  /** Hides the internal heading when the container already provides one. */
  hideHeading?: boolean;
}

export function AgencyRequestCenter({
  hostname,
  agencyName,
  privacyUrl = "/politicasdeprivacidade",
  termsUrl = "/termosdeuso",
  service: controlledService,
  onServiceChange,
  initialService,
  prefill,
  variant = "card",
  hideHeading = false,
}: AgencyRequestCenterProps) {
  const [internalKey, setInternalKey] = useState(
    () => serviceByKey(initialService ?? REQUEST_SERVICES[0].key).key,
  );
  const activeKey = controlledService ?? internalKey;
  const setActiveKey = useCallback(
    (key: string) => {
      setInternalKey(key);
      onServiceChange?.(key);
    },
    [onServiceChange],
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [serviceErrors, setServiceErrors] = useState<Record<string, string>>({});
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [contact, setContact] = useState<ContactValues>(EMPTY_CONTACT);
  const [honeypot, setHoneypot] = useState("");

  // One value bag per service — switching tabs or steps never loses data.
  const [valuesByService, setValuesByService] = useState<Record<string, ServiceValues>>(() => {
    const initial: Record<string, ServiceValues> = {};
    for (const service of REQUEST_SERVICES) initial[service.key] = initialServiceValues(service);
    const prefillKey = initialService ?? controlledService;
    if (prefill && prefillKey) {
      const target = serviceByKey(prefillKey);
      initial[target.key] = mergeServiceValues(target, prefill);
    }
    return initial;
  });

  const service = useMemo(() => serviceByKey(activeKey), [activeKey]);
  const values = valuesByService[activeKey] ?? initialServiceValues(service);
  const { state, error, submit, reset } = useAgencySiteRequest(hostname);

  const setValue = useCallback(
    (name: string, value: string | boolean) => {
      setValuesByService((prev) => ({ ...prev, [activeKey]: { ...prev[activeKey], [name]: value } }));
      setServiceErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
    },
    [activeKey],
  );

  const goToContact = () => {
    const errors = validateServiceStep(service, values);
    setServiceErrors(errors);
    if (Object.keys(errors).length) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    const errors = validateContactStep(contact);
    setContactErrors(errors);
    if (Object.keys(errors).length) return;

    await submit({
      service_key: service.key,
      service_label: service.label,
      lead_name: contact.lead_name,
      lead_phone: contact.lead_phone,
      lead_email: contact.lead_email,
      preferred_channel: contact.preferred_channel,
      best_time: contact.best_time,
      notes: contact.notes,
      consent: contact.consent,
      consent_version: "v1",
      destination: resolveDestination(values),
      summary: buildRequestSummary(service, values),
      details: buildDetailsPayload(service, values),
      honeypot,
    });
  };

  const startOver = () => {
    reset();
    setStep(1);
    setContact(EMPTY_CONTACT);
    setContactErrors({});
    setServiceErrors({});
    setValuesByService((prev) => ({ ...prev, [activeKey]: initialServiceValues(service) }));
  };

  const review = describeServiceValues(service, values);

  const body = (
    <>
      <div className={variant === "card" ? "border-b border-border/60 px-5 pt-5 md:px-7" : "border-b border-border/60 pb-1"}>
        {!hideHeading && (
          <>
            <h2 className="text-lg font-semibold text-foreground md:text-xl">Central de Solicitações</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Escolha o serviço, conte os detalhes e receba uma proposta personalizada da nossa equipe.
              Não é uma busca automática: cada pedido é analisado por um consultor.
            </p>
          </>
        )}

        <Tabs
          value={activeKey}
          onValueChange={(key) => {
            setActiveKey(key);
            setStep(1);
            setServiceErrors({});
            if (state !== "idle") reset();
          }}
          className="mt-4"
        >
          <TabsList
            aria-label="Serviços disponíveis"
            className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b-0 bg-transparent p-0 [scrollbar-width:thin]"
          >
            {REQUEST_SERVICES.map((item) => {
              const Icon = SERVICE_ICONS[item.key] ?? Compass;
              return (
                <TabsTrigger
                  key={item.key}
                  value={item.key}
                  className="shrink-0 gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <div className={variant === "card" ? "px-5 py-6 md:px-7" : "py-6"}>
        {state === "success" ? (
          <div className="mx-auto max-w-lg py-6 text-center" role="status">
            <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h3 className="text-lg font-semibold text-foreground">Solicitação enviada!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Recebemos o seu pedido de {service.label.toLowerCase()}. Um consultor da {agencyName} vai
              retornar pelo canal escolhido para alinhar os detalhes.
            </p>
            <Button className="mt-6" variant="outline" onClick={startOver}>
              Fazer outra solicitação
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-3" aria-hidden="true">
              {[1, 2].map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                      step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {n}
                  </span>
                  <span className={`text-xs ${step === n ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {n === 1 ? "Dados da viagem" : "Contato"}
                  </span>
                  {n === 1 && <span className="mx-1 h-px w-8 bg-border sm:w-16" />}
                </div>
              ))}
            </div>

            {step === 1 ? (
              <div>
                <p className="mb-4 text-sm text-muted-foreground">{service.intro}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {service.fields.map((field) => (
                    <FieldControl
                      key={field.name}
                      field={field}
                      value={values[field.name] ?? ""}
                      error={serviceErrors[field.name] || undefined}
                      onChange={(v) => setValue(field.name, v)}
                    />
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={goToContact} size="lg">
                    Continuar <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6 rounded-xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Resumo · {service.label}
                  </p>
                  <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                    {review.length ? (
                      review.map((item) => (
                        <div key={item.label} className="flex gap-2">
                          <dt className="text-muted-foreground">{item.label}:</dt>
                          <dd className="font-medium text-foreground">{item.value}</dd>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">Sem detalhes informados.</p>
                    )}
                  </dl>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="lead_name" className="text-xs font-medium text-muted-foreground">
                      Nome completo <span aria-hidden="true" className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lead_name"
                      className="mt-1.5"
                      autoComplete="name"
                      value={contact.lead_name}
                      aria-invalid={!!contactErrors.lead_name}
                      aria-describedby={contactErrors.lead_name ? "lead_name-error" : undefined}
                      onChange={(e) => setContact((c) => ({ ...c, lead_name: e.target.value }))}
                    />
                    {contactErrors.lead_name && (
                      <p id="lead_name-error" role="alert" className="mt-1 text-xs text-destructive">
                        {contactErrors.lead_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="lead_phone" className="text-xs font-medium text-muted-foreground">WhatsApp</Label>
                    <Input
                      id="lead_phone"
                      className="mt-1.5"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(11) 90000-0000"
                      value={contact.lead_phone}
                      aria-invalid={!!contactErrors.lead_phone}
                      aria-describedby={contactErrors.lead_phone ? "lead_phone-error" : undefined}
                      onChange={(e) => setContact((c) => ({ ...c, lead_phone: e.target.value }))}
                    />
                    {contactErrors.lead_phone && (
                      <p id="lead_phone-error" role="alert" className="mt-1 text-xs text-destructive">
                        {contactErrors.lead_phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="lead_email" className="text-xs font-medium text-muted-foreground">E-mail</Label>
                    <Input
                      id="lead_email"
                      className="mt-1.5"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@email.com"
                      value={contact.lead_email}
                      aria-invalid={!!contactErrors.lead_email}
                      aria-describedby={contactErrors.lead_email ? "lead_email-error" : undefined}
                      onChange={(e) => setContact((c) => ({ ...c, lead_email: e.target.value }))}
                    />
                    {contactErrors.lead_email && (
                      <p id="lead_email-error" role="alert" className="mt-1 text-xs text-destructive">
                        {contactErrors.lead_email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="preferred_channel" className="text-xs font-medium text-muted-foreground">
                      Canal preferido
                    </Label>
                    <Select
                      value={contact.preferred_channel}
                      onValueChange={(v) => setContact((c) => ({ ...c, preferred_channel: v }))}
                    >
                      <SelectTrigger id="preferred_channel" className="mt-1.5">
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
                    <Label htmlFor="best_time" className="text-xs font-medium text-muted-foreground">
                      Melhor horário
                    </Label>
                    <Select
                      value={contact.best_time}
                      onValueChange={(v) => setContact((c) => ({ ...c, best_time: v }))}
                    >
                      <SelectTrigger id="best_time" className="mt-1.5">
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
                    <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground">Observação</Label>
                    <Textarea
                      id="notes"
                      className="mt-1.5 min-h-20"
                      value={contact.notes}
                      placeholder="Algo mais que devemos saber?"
                      onChange={(e) => setContact((c) => ({ ...c, notes: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Honeypot: hidden from users and assistive tech. */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="company-website">Website</label>
                  <input
                    id="company-website"
                    name="company-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <div className="mt-5 flex items-start gap-2">
                  <Checkbox
                    id="consent"
                    checked={contact.consent}
                    aria-invalid={!!contactErrors.consent}
                    aria-describedby={contactErrors.consent ? "consent-error" : undefined}
                    onCheckedChange={(v) => setContact((c) => ({ ...c, consent: v === true }))}
                  />
                  <div>
                    <Label htmlFor="consent" className="text-sm font-normal leading-snug">
                      Autorizo o uso dos meus dados para contato sobre esta solicitação, conforme a{" "}
                      <a className="underline hover:text-primary" href={privacyUrl}>Política de Privacidade</a> e os{" "}
                      <a className="underline hover:text-primary" href={termsUrl}>Termos de Uso</a>.
                    </Label>
                    {contactErrors.consent && (
                      <p id="consent-error" role="alert" className="mt-1 text-xs text-destructive">
                        {contactErrors.consent}
                      </p>
                    )}
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

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)} disabled={state === "submitting"}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                  <Button size="lg" onClick={handleSubmit} disabled={state === "submitting"}>
                    {state === "submitting" ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" /> Enviar solicitação</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  if (variant === "plain") {
    return <div id="solicitacoes" className="w-full min-w-0">{body}</div>;
  }

  return (
    <Card
      id="solicitacoes"
      className="overflow-hidden rounded-2xl border-border/60 bg-card/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/90"
    >
      {body}
    </Card>
  );
}
