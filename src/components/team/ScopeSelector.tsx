import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DATA_SCOPES, SCOPED_MODULES, type DataScope } from '@/lib/teamPermissions'

interface Props {
  value: Record<string, DataScope>
  onChange: (next: Record<string, DataScope>) => void
  disabled?: boolean
}

export function ScopeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Defina quais registros o colaborador enxerga em cada módulo. A regra é aplicada no banco de dados,
        então também vale para acesso direto por URL ou integrações.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {SCOPED_MODULES.map(m => (
          <div key={m.key} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <span className="text-sm">{m.label}</span>
            <Select
              disabled={disabled}
              value={value[m.key] ?? 'own'}
              onValueChange={v => onChange({ ...value, [m.key]: v as DataScope })}
            >
              <SelectTrigger className="h-8 w-[190px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATA_SCOPES.map(s => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  )
}
