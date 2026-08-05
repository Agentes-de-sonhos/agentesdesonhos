import { useMemo, useState } from 'react'
import { ChevronDown, ShieldAlert } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PERMISSION_GROUPS, ALL_PERMISSION_KEYS } from '@/lib/teamPermissions'
import { cn } from '@/lib/utils'

interface Props {
  value: Set<string>
  onChange: (next: Set<string>) => void
  disabled?: boolean
}

export function PermissionMatrix({ value, onChange, disabled }: Props) {
  const [search, setSearch] = useState('')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ clients: true })

  const term = search.trim().toLowerCase()

  const groups = useMemo(() => {
    if (!term) return PERMISSION_GROUPS
    return PERMISSION_GROUPS
      .map(g => ({ ...g, permissions: g.permissions.filter(p => p.label.toLowerCase().includes(term) || p.key.includes(term)) }))
      .filter(g => g.permissions.length > 0)
  }, [term])

  const toggle = (key: string, on: boolean) => {
    const next = new Set(value)
    on ? next.add(key) : next.delete(key)
    onChange(next)
  }

  const toggleGroup = (keys: string[], on: boolean) => {
    const next = new Set(value)
    keys.forEach(k => (on ? next.add(k) : next.delete(k)))
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar permissão..."
          className="sm:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{value.size} permissões</Badge>
          <Button type="button" variant="ghost" size="sm" disabled={disabled}
            onClick={() => onChange(new Set(ALL_PERMISSION_KEYS))}>
            Marcar todas
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={disabled}
            onClick={() => onChange(new Set())}>
            Limpar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {groups.map(group => {
          const keys = group.permissions.map(p => p.key)
          const selected = keys.filter(k => value.has(k)).length
          const isOpen = !!term || openGroups[group.module]
          return (
            <div key={group.module} className="rounded-lg border">
              <button
                type="button"
                onClick={() => setOpenGroups(s => ({ ...s, [group.module]: !s[group.module] }))}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{group.label}</p>
                  {group.description && (
                    <p className="truncate text-xs text-muted-foreground">{group.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={selected ? 'default' : 'outline'} className="text-[10px]">
                    {selected}/{keys.length}
                  </Badge>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                </div>
              </button>

              {isOpen && (
                <div className="border-t px-4 py-3">
                  <div className="mb-2 flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={disabled}
                      onClick={() => toggleGroup(keys, true)}>Liberar tudo</Button>
                    <Button type="button" variant="ghost" size="sm" disabled={disabled}
                      onClick={() => toggleGroup(keys, false)}>Remover tudo</Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.permissions.map(p => (
                      <label key={p.key} className="flex items-start gap-2 rounded-md p-1.5 text-sm hover:bg-accent/50">
                        <Checkbox
                          className="mt-0.5"
                          disabled={disabled}
                          checked={value.has(p.key)}
                          onCheckedChange={v => toggle(p.key, !!v)}
                        />
                        <span className="flex items-center gap-1.5">
                          {p.label}
                          {p.sensitive && <ShieldAlert className="h-3.5 w-3.5 text-amber-500" title="Permissão sensível" />}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {!groups.length && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma permissão encontrada.</p>
        )}
      </div>
    </div>
  )
}
