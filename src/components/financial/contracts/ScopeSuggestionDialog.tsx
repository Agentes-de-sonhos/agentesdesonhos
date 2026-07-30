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
import { Input } from '@/components/ui/input';
import { AlertTriangle, Info, Loader2, Sparkles } from 'lucide-react';
import {
  SCOPE_SOURCE_LABEL,
  splitCurrentLines,
  type ScopeField,
  type ScopeItem,
} from '@/lib/contractScope';

export interface ScopeSuggestionResult {
  mode: 'replace' | 'append';
  items: { text: string; item: ScopeItem; edited: boolean }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: ScopeField;
  loading: boolean;
  error: string | null;
  items: ScopeItem[];
  current: string;
  onApply: (result: ScopeSuggestionResult) => void;
  onRetry: () => void;
}

export function ScopeSuggestionDialog({
  open,
  onOpenChange,
  field,
  loading,
  error,
  items,
  current,
  onApply,
  onRetry,
}: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<'replace' | 'append'>('append');

  const hasCurrent = splitCurrentLines(current).length > 0;

  useEffect(() => {
    if (!open) return;
    const nextChecked: Record<number, boolean> = {};
    const nextTexts: Record<number, string> = {};
    items.forEach((item, i) => {
      // Fatos extraídos vêm pré-marcados; sugestões gerais exigem escolha ativa.
      nextChecked[i] = item.confidence === 'sourced';
      nextTexts[i] = item.text;
    });
    setChecked(nextChecked);
    setTexts(nextTexts);
    setMode(hasCurrent ? 'append' : 'replace');
  }, [open, items, hasCurrent]);

  const sourced = useMemo(() => items.map((it, i) => ({ it, i })).filter((x) => x.it.confidence === 'sourced'), [items]);
  const suggested = useMemo(
    () => items.map((it, i) => ({ it, i })).filter((x) => x.it.confidence === 'suggested'),
    [items],
  );
  const selectedCount = Object.values(checked).filter(Boolean).length;

  const title = field === 'included' ? 'Serviços inclusos sugeridos' : 'Serviços não inclusos sugeridos';

  function apply() {
    const chosen = items
      .map((item, i) => ({ item, i }))
      .filter(({ i }) => checked[i])
      .map(({ item, i }) => ({
        text: (texts[i] ?? item.text).trim(),
        item,
        edited: (texts[i] ?? item.text).trim() !== item.text,
      }))
      .filter((x) => !!x.text);
    if (!chosen.length) return;
    onApply({ mode, items: chosen });
  }

  function renderGroup(group: { it: ScopeItem; i: number }[], heading: string, hint: string) {
    if (!group.length) return null;
    return (
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">{heading}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="space-y-2">
          {group.map(({ it, i }) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                id={`scope-${i}`}
                className="mt-2"
                checked={!!checked[i]}
                onCheckedChange={(v) => setChecked((prev) => ({ ...prev, [i]: v === true }))}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <Input
                  value={texts[i] ?? it.text}
                  onChange={(e) => setTexts((prev) => ({ ...prev, [i]: e.target.value }))}
                  className="h-9"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={it.confidence === 'sourced' ? 'secondary' : 'outline'} className="text-[11px]">
                    {SCOPE_SOURCE_LABEL[it.source_type]}
                  </Badge>
                  {it.rationale && (
                    <span className="text-[11px] text-muted-foreground">{it.rationale}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Sugestão gerada a partir dos serviços desta venda. Nada é aplicado sem sua confirmação —
            revise, edite e escolha item a item.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Gerando sugestões...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <div className="space-y-2">
              <p>{error}</p>
              <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4" />
            Não há dados suficientes nos serviços desta venda para gerar uma lista confiável.
          </div>
        ) : (
          <div className="space-y-5">
            {renderGroup(
              sourced,
              field === 'included' ? 'Extraído dos serviços da venda' : 'Exclusões identificadas nos dados',
              'Itens baseados apenas em informações já cadastradas.',
            )}
            {renderGroup(
              suggested,
              'Sugestões para conferência',
              'Não confirmadas pelos dados. Revise antes de incluir no contrato.',
            )}

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium">Como aplicar</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'append' ? 'default' : 'outline'}
                  onClick={() => setMode('append')}
                  disabled={!hasCurrent}
                >
                  Adicionar ao texto atual
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'replace' ? 'default' : 'outline'}
                  onClick={() => setMode('replace')}
                >
                  Substituir o texto atual
                </Button>
              </div>
              {mode === 'replace' && hasCurrent && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                  O conteúdo já preenchido neste campo será substituído.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={apply} disabled={loading || selectedCount === 0}>
            Aplicar {selectedCount > 0 ? `${selectedCount} ${selectedCount === 1 ? 'item' : 'itens'}` : 'seleção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}