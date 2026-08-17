import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  applyAgeRule,
  formatCompositionLabel,
  isCustomized,
  needsReview,
  reconcileComposition,
  setPassengerAge,
  setPassengerCategory,
  validateAgeRule,
  type AttractionFareComposition,
  type FareCategory,
  type PaxSnapshot,
} from "@/lib/attractionFareComposition";

const CATEGORY_OPTIONS: { value: FareCategory; label: string }[] = [
  { value: "adult", label: "Adulto" },
  { value: "child", label: "Criança" },
  { value: "free", label: "Gratuito" },
];

interface Props {
  value: AttractionFareComposition;
  onChange: (next: AttractionFareComposition) => void;
  /** Composição global de passageiros do orçamento. */
  pax: PaxSnapshot;
  childrenAges?: (number | null | undefined)[] | null;
  /** Erro de regra etária reportado para fora (bloqueia o salvamento). */
  onValidityChange?: (error: string | null) => void;
}

/**
 * Bloco "Composição tarifária deste ingresso": permite classificar cada
 * passageiro do orçamento como adulto, criança ou gratuito SOMENTE neste
 * ingresso, com uma regra etária opcional.
 */
export function AttractionFareCompositionEditor({ value, onChange, pax, childrenAges, onValidityChange }: Props) {
  const [open, setOpen] = useState(false);
  const counts = value.counts;
  const ruleError = useMemo(() => validateAgeRule(value.age_rule), [value.age_rule]);
  const outOfSync = needsReview(value, pax);
  const customized = isCustomized(value);

  // Reporta validade sem efeito colateral tardio (render puro + callback).
  const lastReported = useMemo(() => ruleError, [ruleError]);
  if (onValidityChange) onValidityChange(lastReported);

  const updateRule = (patch: Partial<AttractionFareComposition["age_rule"]>) => {
    const next = { ...value, age_rule: { ...value.age_rule, ...patch } };
    onChange(next.age_rule.enabled && !validateAgeRule(next.age_rule) ? applyAgeRule(next) : next);
  };

  return (
    <div className="rounded-lg border bg-muted/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Composição tarifária deste ingresso</span>
              {customized && <Badge variant="secondary" className="text-[10px]">Personalizado</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Cobrança: <span className="font-medium text-foreground">{formatCompositionLabel(counts)}</span>
            </p>
          </div>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              {open ? "Fechar" : "Ajustar"}
              <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", open && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </div>

        {outOfSync && (
          <div className="mx-4 mb-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              A composição de passageiros do orçamento mudou ({pax.adults} adulto(s) e {pax.children} criança(s)).
              Revise este ingresso.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange(reconcileComposition(value, pax, childrenAges))}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Atualizar
            </Button>
          </div>
        )}

        <CollapsibleContent>
          <div className="space-y-4 border-t px-4 py-4">
            <div className="space-y-2">
              {value.passengers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum passageiro no orçamento. Informe adultos e crianças no orçamento para compor este ingresso.
                </p>
              )}
              {value.passengers.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2">
                  <span className="min-w-[6.5rem] text-sm">{p.label}</span>
                  <div className="flex items-center gap-1">
                    <Label className="text-[11px] text-muted-foreground" htmlFor={`age-${p.id}`}>Idade</Label>
                    <Input
                      id={`age-${p.id}`}
                      type="number"
                      min={0}
                      max={120}
                      className="h-8 w-16"
                      value={p.age ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const age = raw === "" ? null : Math.max(0, Math.min(120, Number(raw)));
                        const next = setPassengerAge(value, p.id, Number.isFinite(age as number) ? (age as number) : null);
                        onChange(next.age_rule.enabled && !validateAgeRule(next.age_rule) ? applyAgeRule(next) : next);
                      }}
                    />
                  </div>
                  <div className="ml-auto flex flex-wrap gap-1">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        size="sm"
                        variant={p.category === opt.value ? "default" : "outline"}
                        className="h-8 px-2.5 text-xs"
                        onClick={() => onChange(setPassengerCategory(value, p.id, opt.value))}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-md border bg-background px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label className="text-sm">Regra etária deste ingresso <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                  <p className="text-xs text-muted-foreground">Classifica automaticamente por idade, apenas neste ingresso.</p>
                </div>
                <Switch
                  checked={value.age_rule.enabled}
                  onCheckedChange={(enabled) => updateRule({ enabled })}
                />
              </div>
              {value.age_rule.enabled && (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Gratuito até</Label>
                      <Input
                        type="number" min={0} max={120} className="h-8"
                        value={value.age_rule.free_max_age ?? ""}
                        onChange={(e) => updateRule({ free_max_age: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Criança de</Label>
                      <Input
                        type="number" min={0} max={120} className="h-8"
                        value={value.age_rule.child_min_age ?? ""}
                        onChange={(e) => updateRule({ child_min_age: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Criança até</Label>
                      <Input
                        type="number" min={0} max={120} className="h-8"
                        value={value.age_rule.child_max_age ?? ""}
                        onChange={(e) => updateRule({ child_max_age: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  {ruleError && <p className="text-xs text-destructive">{ruleError}</p>}
                </>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
