import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { ContractDynamicSnapshot, ContractRenderConfig } from '@/types/contracts';
import type { ContractDraftOverrides } from '@/lib/saleContractData';

/**
 * Campos de modelos com dados embutidos no texto jurídico (genérico, guiado pelo render_config).
 * Só aparece quando o modelo ativo da agência usa esse formato. Nada é marcado automaticamente.
 */
const SOURCE_TO_OVERRIDE: Record<string, keyof ContractDraftOverrides> = {
  'contractor.marital_status': 'client_marital_status',
  'contractor.profession': 'client_profession',
  'contractor.rg': 'client_rg',
  'suppliers.airlines': 'suppliers_airlines',
  'suppliers.operators': 'suppliers_operators',
  'suppliers.travel_agency': 'suppliers_travel_agency',
  'financial.down_payment_date': 'down_payment_date',
};

export function TemplateDynamicFields({
  cfg,
  dynamic,
  overrides,
  setOverrides,
}: {
  cfg: ContractRenderConfig;
  dynamic?: ContractDynamicSnapshot;
  overrides: ContractDraftOverrides;
  setOverrides: (fn: (prev: ContractDraftOverrides) => ContractDraftOverrides) => void;
}) {
  const editable = Object.entries(cfg.slots ?? {}).filter(([, d]) => SOURCE_TO_OVERRIDE[d.source]);
  const seen = new Set<string>();
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Campos do contrato da agência</h3>
        <p className="text-xs text-muted-foreground">
          Estes dados entram exatamente no ponto indicado do texto do contrato. Os valores ficam só no contrato e não alteram o cadastro do cliente.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {editable.map(([key, def]) => {
          const ov = SOURCE_TO_OVERRIDE[def.source];
          if (seen.has(ov)) return null;
          seen.add(ov);
          const isDate = def.source === 'financial.down_payment_date';
          const current = (overrides[ov] as string | undefined) ?? (isDate ? undefined : dynamic?.slots[key]?.value ?? '');
          return (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`slot-${key}`}>
                {def.label}
                {def.required && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                id={`slot-${key}`}
                type={isDate ? 'date' : 'text'}
                value={current ?? ''}
                onChange={(e) => setOverrides((p) => ({ ...p, [ov]: e.target.value }))}
              />
            </div>
          );
        })}
      </div>

      {Object.entries(cfg.checks ?? {}).map(([key, def]) => (
        <label key={key} className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={overrides.template_checks?.[key] === true}
            onCheckedChange={(v) =>
              setOverrides((p) => ({ ...p, template_checks: { ...(p.template_checks ?? {}), [key]: v === true } }))
            }
          />
          <span>
            {def.label}
            {def.required && <span className="text-destructive"> *</span>}
          </span>
        </label>
      ))}

      {Object.entries(cfg.choices ?? {})
        .filter(([, def]) => def.source !== 'insurance')
        .map(([key, def]) => (
          <div key={key} className="space-y-1.5">
            <Label>
              {def.label}
              {def.required && <span className="text-destructive"> *</span>}
            </Label>
            <RadioGroup
              value={overrides.template_choices?.[key] ?? 'nao_informado'}
              onValueChange={(v) =>
                setOverrides((p) => {
                  const next = { ...(p.template_choices ?? {}) };
                  if (v === 'nao_informado') delete next[key];
                  else next[key] = v;
                  return { ...p, template_choices: next };
                })
              }
              className="flex flex-col gap-1.5"
            >
              {Object.entries(def.options).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={value} /> {label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <RadioGroupItem value="nao_informado" /> Não informado
              </label>
            </RadioGroup>
          </div>
        ))}
    </section>
  );
}
