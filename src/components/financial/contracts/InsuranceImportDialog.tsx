import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, Info } from 'lucide-react';
import {
  FIELD_LABEL,
  SOURCE_LABEL,
  bestCandidateFor,
  candidatesWithField,
  type InsuranceCandidate,
  type InsuranceField,
  type InsuranceFieldProvenance,
} from '@/lib/insuranceSources';

const FIELDS: InsuranceField[] = ['insurer', 'plan', 'validity', 'coverage'];

export interface InsuranceImportResult {
  values: Partial<Record<InsuranceField, string>>;
  provenance: InsuranceFieldProvenance[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  candidates: InsuranceCandidate[];
  current: Record<InsuranceField, string>;
  userId: string | null;
  onApply: (result: InsuranceImportResult) => void;
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR');
}

export function InsuranceImportDialog({
  open,
  onOpenChange,
  loading,
  candidates,
  current,
  userId,
  onApply,
}: Props) {
  // Fonte escolhida por campo (chave do candidato) e seleção de importação.
  const [chosen, setChosen] = useState<Partial<Record<InsuranceField, string>>>({});
  const [checked, setChecked] = useState<Partial<Record<InsuranceField, boolean>>>({});
  const [useDescriptionAsCoverage, setUseDescriptionAsCoverage] = useState(false);

  const availability = useMemo(() => {
    const map = {} as Record<InsuranceField, InsuranceCandidate[]>;
    FIELDS.forEach((f) => {
      map[f] = candidatesWithField(f, candidates);
    });
    return map;
  }, [candidates]);

  const descriptionCandidate = useMemo(
    () => candidates.find((c) => !!c.description) ?? null,
    [candidates],
  );

  // Sugestão inicial (apenas prévia — nada é aplicado sem confirmar).
  useEffect(() => {
    if (!open || loading) return;
    const nextChosen: Partial<Record<InsuranceField, string>> = {};
    const nextChecked: Partial<Record<InsuranceField, boolean>> = {};
    FIELDS.forEach((f) => {
      const best = bestCandidateFor(f, candidates);
      if (best) {
        nextChosen[f] = best.key;
        nextChecked[f] = !current[f]; // não marca por padrão o que sobrescreveria
      }
    });
    setChosen(nextChosen);
    setChecked(nextChecked);
    setUseDescriptionAsCoverage(false);
  }, [open, loading, candidates, current]);

  const candidateByKey = (key?: string) => candidates.find((c) => c.key === key) ?? null;

  const selectedCount =
    FIELDS.filter((f) => checked[f] && candidateByKey(chosen[f])?.[f]).length +
    (useDescriptionAsCoverage && !checked.coverage ? 1 : 0);

  const handleApply = () => {
    const values: Partial<Record<InsuranceField, string>> = {};
    const provenance: InsuranceFieldProvenance[] = [];
    const importedAt = new Date().toISOString();

    FIELDS.forEach((f) => {
      if (!checked[f]) return;
      const c = candidateByKey(chosen[f]);
      const value = c?.[f];
      if (!c || typeof value !== 'string' || !value) return;
      values[f] = value;
      provenance.push({
        field: f,
        source_kind: c.kind,
        source_record_id: c.recordId,
        source_record_label: c.recordLabel,
        imported_at: importedAt,
        imported_by: userId,
        value,
      });
    });

    if (useDescriptionAsCoverage && !checked.coverage && descriptionCandidate?.description) {
      values.coverage = descriptionCandidate.description;
      provenance.push({
        field: 'coverage',
        source_kind: descriptionCandidate.kind,
        source_record_id: descriptionCandidate.recordId,
        source_record_label: `${descriptionCandidate.recordLabel} (descrição do serviço)`,
        imported_at: importedAt,
        imported_by: userId,
        value: descriptionCandidate.description,
      });
    }

    onApply({ values, provenance });
  };

  const nothingFound = !loading && FIELDS.every((f) => availability[f].length === 0) && !descriptionCandidate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[min(96vw,42rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar dados do seguro</DialogTitle>
          <DialogDescription>
            Apenas dados já cadastrados pela agência nas fontes vinculadas a esta venda. Confira e
            escolha o que deseja trazer para o contrato.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando dados vinculados...
          </div>
        ) : nothingFound ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nenhum dado de seguro encontrado nas fontes vinculadas. Preencha os campos manualmente.
          </p>
        ) : (
          <div className="space-y-3">
            {FIELDS.map((field) => {
              const options = availability[field];
              const selected = candidateByKey(chosen[field]);
              const value = selected?.[field] as string | undefined;
              const currentValue = current[field];
              const willOverwrite = !!currentValue && !!value && currentValue !== value;

              return (
                <div key={field} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`imp-${field}`}
                      className="mt-0.5"
                      disabled={!value}
                      checked={!!checked[field] && !!value}
                      onCheckedChange={(v) =>
                        setChecked((prev) => ({ ...prev, [field]: v === true }))
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={`imp-${field}`} className="text-sm font-medium">
                        {FIELD_LABEL[field]}
                      </Label>

                      {!value ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Não encontrado nas fontes vinculadas.
                        </p>
                      ) : (
                        <>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="break-words text-sm text-foreground">{value}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {SOURCE_LABEL[selected!.kind]}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {selected!.recordLabel}
                            {formatUpdatedAt(selected!.updatedAt)
                              ? ` • atualizado em ${formatUpdatedAt(selected!.updatedAt)}`
                              : ''}
                          </p>
                          {field === 'validity' && selected!.validityIsTripFallback && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                              <Info className="h-3 w-3" /> Sugestão baseada no período da viagem.
                            </p>
                          )}
                          {willOverwrite && (
                            <p className="mt-1 flex items-start gap-1 text-xs text-amber-600">
                              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>
                                Substituirá o valor atual: <strong>{currentValue}</strong>
                              </span>
                            </p>
                          )}
                          {options.length > 1 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {options.map((o) => (
                                <Button
                                  key={o.key}
                                  type="button"
                                  size="sm"
                                  variant={o.key === selected!.key ? 'default' : 'outline'}
                                  className="h-7 text-xs"
                                  onClick={() =>
                                    setChosen((prev) => ({ ...prev, [field]: o.key }))
                                  }
                                >
                                  {SOURCE_LABEL[o.kind]}: {String(o[field]).slice(0, 28)}
                                </Button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {descriptionCandidate?.description && (
              <div className="rounded-xl border border-dashed border-border p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="imp-description"
                    className="mt-0.5"
                    checked={useDescriptionAsCoverage}
                    onCheckedChange={(v) => setUseDescriptionAsCoverage(v === true)}
                  />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor="imp-description" className="text-sm font-medium">
                      Descrição do serviço
                    </Label>
                    <p className="mt-1 break-words text-sm text-foreground">
                      {descriptionCandidate.description}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {SOURCE_LABEL[descriptionCandidate.kind]} • {descriptionCandidate.recordLabel}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Texto original cadastrado. Só será usado como coberturas se você confirmar
                      aqui — nada é interpretado ou resumido automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={loading || selectedCount === 0} onClick={handleApply}>
            Aplicar dados selecionados
            {selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}