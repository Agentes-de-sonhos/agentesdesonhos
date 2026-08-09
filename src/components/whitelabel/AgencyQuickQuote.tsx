import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plane, BedDouble, Car, Bus, Ticket, ShieldCheck, Ship, Compass, ArrowRight,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AgencyRequestCenter } from "@/components/whitelabel/AgencyRequestCenter";
import { isEditorialTheme } from "@/lib/agencySiteTheme";
import {
  REQUEST_SERVICES, initialServiceValues, quickQuoteFields, serviceByKey,
  type ServiceValues,
} from "@/lib/agencySiteRequests";

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
 * Compact "Cotação rápida" card of the home: horizontal service tabs plus the
 * 3–4 essential fields of the selected service. The CTA opens the existing
 * AgencyRequestCenter in a modal, preserving the service and the typed values —
 * all validation, hooks, RPC and CRM integration stay in that component.
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
  const fields = useMemo(() => quickQuoteFields(service), [service]);
  const editorial = isEditorialTheme(hostname);

  const [valuesByService, setValuesByService] = useState<Record<string, ServiceValues>>(() => {
    const initial: Record<string, ServiceValues> = {};
    for (const item of REQUEST_SERVICES) initial[item.key] = initialServiceValues(item);
    return initial;
  });
  const values = valuesByService[service.key] ?? initialServiceValues(service);

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
      setValuesByService((prev) => ({ ...prev, [service.key]: { ...prev[service.key], [name]: value } }));
    },
    [service.key],
  );

  return (
    <>
      <div
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
          className={
            editorial
              ? "grid gap-4 border-t border-border/70 pt-5 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-end"
              : "grid gap-3 border-t border-border/60 pt-4 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-end"
          }
        >
          {fields.map((field) => {
            const id = `quick-${field.name}`;
            const value = String(values[field.name] ?? "");
            return (
              <div key={field.name} className="min-w-0">
                <Label
                  htmlFor={id}
                  className={
                    editorial
                      ? "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                      : "text-xs font-medium text-muted-foreground"
                  }
                >
                  {field.label}
                </Label>
                {field.type === "select" ? (
                  <Select value={value} onValueChange={(v) => setValue(field.name, v)}>
                    <SelectTrigger
                      id={id}
                      className={editorial ? "mt-2 h-12 rounded-lg" : "mt-1.5 h-11 rounded-xl"}
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={id}
                    className={editorial ? "mt-2 h-12 rounded-lg" : "mt-1.5 h-11 rounded-xl"}
                    type={field.type === "number" ? "number" : field.type}
                    inputMode={field.type === "number" ? "numeric" : undefined}
                    min={field.min}
                    max={field.max}
                    placeholder={field.placeholder}
                    value={value}
                    onChange={(e) => setValue(field.name, e.target.value)}
                  />
                )}
              </div>
            );
          })}

          <Button
            size="lg"
            className={
              editorial
                ? "mt-2 h-12 w-full rounded-lg bg-[hsl(var(--wl-ink))] px-6 text-[15px] font-semibold text-white hover:bg-[hsl(var(--wl-ink))]/90 md:w-auto"
                : "mt-1.5 h-11 w-full rounded-xl md:w-auto"
            }
            onClick={() => onOpenChange(true)}
          >
            Solicitar cotação <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <p className={editorial ? "mt-4 text-[13px] text-muted-foreground" : "mt-3 text-xs text-muted-foreground"}>
          Não é uma busca automática: cada pedido é analisado por um consultor da equipe.
        </p>
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto rounded-2xl p-5 md:p-7">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl">Central de Solicitações</DialogTitle>
            <DialogDescription>
              Confirme os dados da viagem e como podemos falar com você. Um consultor analisa cada pedido.
            </DialogDescription>
          </DialogHeader>
          {open && (
            <AgencyRequestCenter
              hostname={hostname}
              agencyName={agencyName}
              variant="plain"
              hideHeading
              initialService={service.key}
              prefill={values}
              onServiceChange={onServiceChange}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}