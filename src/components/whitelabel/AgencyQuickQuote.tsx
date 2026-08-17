import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plane, BedDouble, Car, Bus, Ticket, ShieldCheck, Ship, Compass, ArrowRight,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AgencyQuoteJourney } from "@/components/whitelabel/AgencyQuoteJourney";
import { RouteLegsEditor } from "@/components/whitelabel/RouteLegsEditor";
import { ServiceInitialFields } from "@/components/whitelabel/ServiceInitialFields";
import { isEditorialTheme } from "@/lib/agencySiteTheme";
import { initialGridClass } from "@/lib/agencyInitialGrid";
import {
  REQUEST_SERVICES, initialBlockFields, initialServiceValues, isMultiRoute, periodMode, serviceByKey,
  validateQuickStep,
  type ServiceValues,
} from "@/lib/agencySiteRequests";
import {
  emptyRouteLegs, formatChildAges, serializeRoute, syncChildAges, validateChildAges, validateRouteLegs,
  type RouteLeg,
} from "@/lib/agencyQuoteJourney";

const ICONS: Record<string, typeof Plane> = {
  aereo: Plane,
  hospedagem: BedDouble,
  carro: Car,
  transfer: Bus,
  ingressos: Ticket,
  seguro: ShieldCheck,
  cruzeiros: Ship,
  pacotes: Compass,
};

export interface AgencyQuickQuoteProps {
  hostname: string;
  agencyName: string;
  /** Service pre-selected from the outside (campaign/section CTAs). */
  service: string;
  onServiceChange: (key: string) => void;
  /** Opens the full Central de Solicitações immediately (external CTA). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Cartão compacto "Cotação rápida" da home: rail horizontal de serviços mais os
 * campos essenciais do serviço escolhido. O aéreo usa um único calendário de
 * período (ou data única em "Somente ida") e um editor estruturado de destinos
 * em "Multidestinos". O CTA abre a jornada contextual (`AgencyQuoteJourney`),
 * que herda tudo o que foi digitado aqui e faz o envio.
 */
export function AgencyQuickQuote({
  hostname,
  agencyName,
  service: activeKey,
  onServiceChange,
  open,
  onOpenChange,
}: AgencyQuickQuoteProps) {
  const service = useMemo(() => serviceByKey(activeKey), [activeKey]);
  const editorial = isEditorialTheme(hostname);
  const railWrapRef = useRef<HTMLDivElement | null>(null);
  const [quickErrors, setQuickErrors] = useState<Record<string, string>>({});
  const [legsByService, setLegsByService] = useState<Record<string, RouteLeg[]>>({});
  const [agesByService, setAgesByService] = useState<Record<string, string[]>>({});

  const [valuesByService, setValuesByService] = useState<Record<string, ServiceValues>>(() => {
    const initial: Record<string, ServiceValues> = {};
    for (const item of REQUEST_SERVICES) initial[item.key] = initialServiceValues(item);
    return initial;
  });
  const values = valuesByService[service.key] ?? initialServiceValues(service);
  const isAereo = service.key === "aereo";
  const multi = isMultiRoute(service, values);
  const legs = legsByService[service.key] ?? emptyRouteLegs();
  const childCount = Math.max(0, Math.min(12, Number(String(values.criancas ?? "0")) || 0));
  const ages = syncChildAges(agesByService[service.key] ?? [], childCount);

  // No aéreo multidestinos, destino e datas saem do editor estruturado de rota.
  const hiddenFields = useMemo(
    () => (isAereo && multi ? ["destino", "data_ida", "data_volta"] : []),
    [isAereo, multi],
  );
  const fields = useMemo(
    () => initialBlockFields(service).filter((f) => !hiddenFields.includes(f.name)),
    [service, hiddenFields],
  );

  // Rail horizontal das categorias (preset editorial): linha única, sem barra
  // de rolagem visível e setas discretas quando os rótulos não couberem.
  const railRef = useRef<HTMLDivElement | null>(null);
  const [railOverflow, setRailOverflow] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncRail = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setRailOverflow(el.scrollWidth - el.clientWidth > 4);
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    if (!editorial) return;
    syncRail();
    window.addEventListener("resize", syncRail);
    return () => window.removeEventListener("resize", syncRail);
  }, [editorial, syncRail]);

  const scrollRail = useCallback((direction: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: reduced ? "auto" : "smooth",
    });
  }, []);

  const setValue = useCallback(
    (name: string, value: string) => {
      setValuesByService((prev) => {
        const next: ServiceValues = { ...prev[service.key], [name]: value };
        // "Somente ida" (aéreo/transfer) descarta a data final do período.
        if (service.period && periodMode(service, next) === "single") next[service.period.end] = "";
        return { ...prev, [service.key]: next };
      });
      if (name === "criancas") {
        const count = Math.max(0, Math.min(12, Number(value) || 0));
        setAgesByService((prev) => ({ ...prev, [service.key]: syncChildAges(prev[service.key] ?? [], count) }));
      }
      setQuickErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
    },
    [service],
  );

  const setDates = useCallback(
    (next: { start: string; end: string }) => {
      const period = service.period;
      if (!period) return;
      setValuesByService((prev) => ({
        ...prev,
        [service.key]: { ...prev[service.key], [period.start]: next.start, [period.end]: next.end },
      }));
      setQuickErrors((prev) => ({ ...prev, [period.start]: "", [period.end]: "", periodo: "" }));
    },
    [service],
  );

  /** Idade de cada criança: mantida por serviço e serializada no payload. */
  const setAge = useCallback(
    (index: number, value: string) => {
      setAgesByService((prev) => {
        const current = syncChildAges(prev[service.key] ?? [], Math.max(index + 1, (prev[service.key] ?? []).length));
        current[index] = value;
        setValuesByService((values) => ({
          ...values,
          [service.key]: { ...values[service.key], idades_criancas: formatChildAges(current) },
        }));
        return { ...prev, [service.key]: current };
      });
      setQuickErrors((prev) => {
        if (!prev[`child_age_${index}`]) return prev;
        const next = { ...prev };
        delete next[`child_age_${index}`];
        return next;
      });
    },
    [service.key],
  );

  /** Rota estruturada: mantém `rota_multidestinos` serializado por compatibilidade. */
  const setLegs = useCallback(
    (next: RouteLeg[]) => {
      setLegsByService((prev) => ({ ...prev, [service.key]: next }));
      setValuesByService((prev) => ({
        ...prev,
        [service.key]: {
          ...prev[service.key],
          rota_multidestinos: serializeRoute(String(prev[service.key]?.origem ?? ""), next),
        },
      }));
      setQuickErrors({});
    },
    [service.key],
  );

  /** Abre a jornada única já com o contexto digitado aqui. */
  const startJourney = useCallback(() => {
    const found = validateQuickStep(service, values);
    const visible = new Set(fields.map((f) => f.name));
    const relevant: Record<string, string> = {};
    for (const [name, message] of Object.entries(found)) {
      if (visible.has(name)) relevant[name] = message;
    }

    if (isAereo && multi) {
      const routeErrors = validateRouteLegs(String(values.origem ?? ""), legs);
      Object.assign(relevant, routeErrors);
    } else if (service.period) {
      // O período é um campo só: o erro aparece uma única vez, abaixo dele.
      const { start, end } = service.period;
      delete relevant[start];
      delete relevant[end];
      if (found[start]) relevant.periodo = "Selecione a data inicial.";
      else if (found[end]) relevant.periodo = found[end];
    }

    // Idades das crianças são obrigatórias sempre que houver crianças.
    Object.assign(relevant, childCount > 0 ? validateChildAges(ages, childCount) : {});

    setQuickErrors(relevant);
    if (Object.keys(relevant).length) return;
    // Origem pode ter mudado depois das linhas: reserializa a rota antes de abrir.
    if (isAereo && multi) {
      setValuesByService((prev) => ({
        ...prev,
        [service.key]: {
          ...prev[service.key],
          rota_multidestinos: serializeRoute(String(prev[service.key]?.origem ?? ""), legs),
        },
      }));
    }
    onOpenChange(true);
  }, [service, values, fields, onOpenChange, isAereo, multi, legs, ages, childCount]);

  return (
    <>
      <div
        ref={railWrapRef}
        className={
          editorial
            ? "rounded-xl border border-border/70 bg-card p-5 shadow-[0_14px_40px_-28px_hsl(220_12%_10%/0.3)] md:p-7"
            : "rounded-[18px] border border-border/60 bg-card/95 p-4 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/90 md:p-6"
        }
      >
        <div className={editorial ? "relative flex items-start gap-1" : undefined}>
          {editorial && railOverflow && (
            <button
              type="button"
              aria-label="Categorias anteriores"
              onClick={() => scrollRail(-1)}
              disabled={atStart}
              className="mt-1 hidden h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-border disabled:hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:grid"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <div
            ref={editorial ? railRef : undefined}
            onScroll={editorial ? syncRail : undefined}
            role="tablist"
            aria-label="Serviços para cotação"
            className={
              editorial
                ? "wl-rail flex min-w-0 flex-1 flex-nowrap snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-4"
                : "-mx-1 flex gap-1 overflow-x-auto pb-3 [scrollbar-width:thin]"
            }
          >
            {REQUEST_SERVICES.map((item) => {
              const Icon = ICONS[item.key] ?? Compass;
              const selected = item.key === service.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onServiceChange(item.key)}
                  className={
                    editorial
                      ? `flex h-[46px] shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          selected
                            ? "border-primary bg-primary text-white [&_svg]:text-white hover:text-white focus-visible:text-white"
                            : "border-transparent text-foreground/70 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                        }`
                      : `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                          selected
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`
                  }
                >
                  <Icon className={editorial ? "h-[18px] w-[18px] shrink-0" : "h-4 w-4"} aria-hidden="true" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
          {editorial && railOverflow && (
            <button
              type="button"
              aria-label="Próximas categorias"
              onClick={() => scrollRail(1)}
              disabled={atEnd}
              className="mt-1 hidden h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-border disabled:hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:grid"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          data-testid="wl-initial-grid"
          className={cn(
            "grid border-t md:items-end",
            // Desktop: reserva duas linhas de rótulo para que TODOS os labels e
            // caixas comecem na mesma altura, mesmo em colunas compactas, e
            // espaço inferior para textos de ajuda ancorados sob o campo.
            "lg:pb-5 lg:[&_label]:flex lg:[&_label]:min-h-[2.1rem] lg:[&_label]:items-end lg:[&_label]:whitespace-nowrap",
            editorial ? "gap-4 border-border/70 pt-5 lg:gap-3" : "gap-3 border-border/60 pt-4 lg:gap-2.5",
            initialGridClass(service.key),
          )}
        >
          <ServiceInitialFields
            service={service}
            values={values}
            ages={ages}
            errors={quickErrors}
            editorial={editorial}
            idPrefix="quick"
            onValue={setValue}
            onDates={setDates}
            onAgeChange={setAge}
            hidden={hiddenFields}
          />

          <Button
            size="lg"
            className={cn(
              "w-full min-w-0 whitespace-nowrap px-4",
              editorial
                ? "mt-2 h-12 rounded-lg bg-[hsl(var(--wl-ink))] text-[15px] font-semibold text-white hover:bg-[hsl(var(--wl-ink))]/90 md:mt-0"
                : "mt-1.5 h-11 rounded-xl md:mt-0",
            )}
            onClick={startJourney}
          >
            Solicitar <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </div>

        {isAereo && multi && (
          <RouteLegsEditor
            legs={legs}
            onChange={setLegs}
            errors={quickErrors}
            editorial={editorial}
            idPrefix="quick-rota"
            className="mt-4 border-t border-border/70 pt-4"
          />
        )}

        <p className={editorial ? "mt-4 text-[13px] text-muted-foreground" : "mt-3 text-xs text-muted-foreground"}>
          Não é uma busca automática: cada pedido é analisado por um consultor da equipe.
        </p>
      </div>

      <AgencyQuoteJourney
        hostname={hostname}
        agencyName={agencyName}
        open={open}
        onOpenChange={onOpenChange}
        primaryService={service.key}
        quickValues={values}
        quickRoute={isAereo && multi ? legs : undefined}
        onEditQuickValues={() =>
          railWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      />
    </>
  );
}