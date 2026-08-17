import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  { value: "free", label: "Gratuito/Isento" },
];

interface Props {
  value: AttractionFareComposition;
  onChange: (next: AttractionFareComposition) => void;
  /** Composição global de passageiros do orçamento. */
  pax: PaxSnapshot;
  childrenAges?: (number | null | undefined)[] | null;
  /** Erro de regra etária reportado para fora (bloqueia o salvamento). */
  onValidityChange?: (error: string | null) => void;
  /** Sinaliza edição inline em andamento (bloqueia submissão). */
  onPendingChange?: (pending: boolean) => void;
}

/**
 * Bloco "Composição tarifária deste ingresso": permite classificar cada
 * passageiro do orçamento como adulto, criança ou gratuito SOMENTE neste
 * ingresso, com uma regra etária opcional.
 */
export function AttractionFareCompositionEditor({
  value,
  onChange,
  pax,
  childrenAges,
  onValidityChange,
  onPendingChange,
}: Props) {
  const [draft, setDraft] = useState<AttractionFareComposition | null>(null);
  const open = draft !== null;
  const current = draft ?? value;
  const ruleError = useMemo(() => validateAgeRule(current.age_rule), [current.age_rule]);
  const outOfSync = needsReview(value, pax);
  const customized = isCustomized(value);
  const tripLabel = formatCompositionLabel({ adult: pax.adults, child: pax.children, free: 0 });

  useEffect(() => {
    onValidityChange?.(open ? ruleError : validateAgeRule(value.age_rule));
  }, [ruleError, open, value.age_rule, onValidityChange]);

  useEffect(() => {
    onPendingChange?.(open);
    return () => onPendingChange?.(false);
  }, [open, onPendingChange]);

  const patchDraft = (next: AttractionFareComposition) => {
    setDraft(next.age_rule.enabled && !validateAgeRule(next.age_rule) ? applyAgeRule(next) : next);
  };

  const updateRule = (patch: Partial<AttractionFareComposition["age_rule"]>) => {
    patchDraft({ ...current, age_rule: { ...current.age_rule, ...patch } });
  };

  return (
    <div className="rounded-lg border bg-muted/30">
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Composição tarifária deste ingresso</span>
            {customized && <Badge variant="secondary" className="text-[10px]">Personalizado</Badge>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Defina como cada passageiro será cobrado neste produto. Essa alteração será aplicada somente a este ingresso.
          </p>
          {!open && (
            <div className="mt-2 space-y-0.5 text-xs">
              {customized && (
                <p className="text-muted-foreground">
                  Composição da viagem: <span className="font-medium text-foreground">{tripLabel}</span>
                </p>
              )}
              <p className="text-muted-foreground">
                {customized ? "Cobrança neste ingresso: " : "Composição: "}
                <span className="font-medium text-foreground">{formatCompositionLabel(value.counts)}</span>
              </p>
              {customized && (
                <p className="text-amber-700 dark:text-amber-300">
                  Composição tarifária ajustada somente para este ingresso.
                </p>
              )}
            </div>
          )}
        </div>
        {!open && (
          <Button type="button" variant="outline" size="sm" onClick={() => setDraft(value)}>
            {customized ? "Editar composição" : "Ajustar composição"}
          </Button>
        )}
      </div>

      {outOfSync && (
        <div className="mx-4 mb-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            A composição da viagem foi alterada. Revise a configuração tarifária deste ingresso.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const next = reconcileComposition(value, pax, childrenAges);
              setDraft(null);
              onChange(next);
            }}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>
      )}

      {open && (
        <div className="space-y-4 border-t px-4 py-4">
          <div className="space-y-2">
            {current.passengers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum passageiro no orçamento. Informe adultos e crianças no orçamento para compor este ingresso.
              </p>
            )}
            {current.passengers.map((p) => (
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
                      patchDraft(setPassengerAge(current, p.id, Number.isFinite(age as number) ? (age as number) : null));
                    }}
                  />
                </div>
                <div className="ml-auto">
                  <Select
                    value={p.category}
                    onValueChange={(v) => setDraft(setPassengerCategory(current, p.id, v as FareCategory))}
                  >
                    <SelectTrigger className="h-8 w-[10.5rem] text-xs" aria-label={`Categoria de ${p.label}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-md border bg-background px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-sm">Regra etária deste ingresso <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <p className="text-xs text-muted-foreground">Sugere categorias por idade apenas neste ingresso. Você pode alterar manualmente depois.</p>
              </div>
              <Switch checked={current.age_rule.enabled} onCheckedChange={(enabled) => updateRule({ enabled })} />
            </div>
            {current.age_rule.enabled && (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Gratuito até</Label>
                    <Input
                      type="number" min={0} max={120} className="h-8"
                      value={current.age_rule.free_max_age ?? ""}
                      onChange={(e) => updateRule({ free_max_age: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Criança de</Label>
                    <Input
                      type="number" min={0} max={120} className="h-8"
                      value={current.age_rule.child_min_age ?? ""}
                      onChange={(e) => updateRule({ child_min_age: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Criança até</Label>
                    <Input
                      type="number" min={0} max={120} className="h-8"
                      value={current.age_rule.child_max_age ?? ""}
                      onChange={(e) => updateRule({ child_max_age: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Adulto a partir de</Label>
                    <Input
                      type="number" min={0} max={120} className="h-8"
                      value={current.age_rule.adult_min_age ?? ""}
                      onChange={(e) => updateRule({ adult_min_age: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                </div>
                {ruleError && <p className="text-xs text-destructive">{ruleError}</p>}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Cobrança: <span className="font-medium text-foreground">{formatCompositionLabel(current.counts)}</span>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!!ruleError}
                onClick={() => {
                  onChange(current);
                  setDraft(null);
                }}
              >
                Confirmar composição
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
