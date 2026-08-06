import { useMemo, useState } from 'react'
import { Loader2, History, FilterX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useTeamAuditLog, useTeamMembers } from '@/hooks/useTeamMembers'

const ACTION_LABELS: Record<string, string> = {
  login: 'Entrou na plataforma',
  create_member: 'Criou colaborador',
  update_member: 'Atualizou colaborador',
  set_status_active: 'Reativou colaborador',
  set_status_blocked: 'Bloqueou colaborador',
  set_status_disabled: 'Desativou colaborador',
  delete_member: 'Excluiu colaborador',
  invite_created: 'Enviou convite',
  invite_revoked: 'Cancelou convite',
  invite_resent: 'Reenviou convite',
  invite_accepted: 'Convite aceito',
  community_settings_update: 'Alterou configurações de comunidade',
  team_limit_override_set: 'Definiu limite administrativo de usuários',
  team_limit_override_cleared: 'Removeu limite administrativo de usuários',
}

function label(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, ' ')
}

export function TeamAuditLogView({ memberId }: { memberId?: string | null }) {
  const [member, setMember] = useState<string>('all')
  const [action, setAction] = useState<string>('all')
  const [moduleKey, setModuleKey] = useState<string>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: members = [] } = useTeamMembers()
  const effectiveMember = memberId ?? (member === 'all' ? null : member)

  const { data = [], isLoading } = useTeamAuditLog({
    memberId: effectiveMember,
    action: action === 'all' ? null : action,
    moduleKey: moduleKey === 'all' ? null : moduleKey,
    from: from ? `${from}T00:00:00` : null,
    to: to ? `${to}T23:59:59` : null,
  }, 300)

  const modules = useMemo(
    () => Array.from(new Set(data.map(r => r.module_key).filter(Boolean) as string[])).sort(),
    [data],
  )
  const hasFilters = member !== 'all' || action !== 'all' || moduleKey !== 'all' || !!from || !!to
  const clear = () => { setMember('all'); setAction('all'); setModuleKey('all'); setFrom(''); setTo('') }

  const filters = (
    <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-5">
      {!memberId && (
        <div className="space-y-1">
          <Label className="text-[11px]">Usuário</Label>
          <Select value={member} onValueChange={setMember}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {members.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-[11px]">Ação</Label>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.keys(ACTION_LABELS).map(k => (
              <SelectItem key={k} value={k}>{ACTION_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">Módulo</Label>
        <Select value={moduleKey} onValueChange={setModuleKey}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">De</Label>
        <Input type="date" className="h-9" value={from} onChange={e => setFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">Até</Label>
        <Input type="date" className="h-9" value={to} onChange={e => setTo(e.target.value)} />
      </div>
      {hasFilters && (
        <div className="flex items-end lg:col-span-5">
          <Button variant="ghost" size="sm" onClick={clear}>
            <FilterX className="mr-2 h-4 w-4" /> Limpar filtros
          </Button>
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {filters}
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="space-y-3">
        {filters}
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <div className="mb-3 rounded-full bg-muted p-3"><History className="h-5 w-5" /></div>
          <p className="text-sm font-medium">
            {hasFilters ? 'Nenhum registro para os filtros aplicados' : 'Nenhum registro ainda'}
          </p>
          <p className="text-xs">
            {hasFilters
              ? 'Ajuste os filtros para ver outras ações.'
              : 'As ações da equipe aparecerão aqui automaticamente.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {filters}
      <div className="space-y-2">
      {data.map(row => (
        <div key={row.id} className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{label(row.action)}</p>
            {(row.details as any)?.message && (
              <p className="text-xs text-foreground/80">{String((row.details as any).message)}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {row.member_name ?? 'Proprietário'}
              {row.entity_type ? ` · ${row.entity_type}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {row.actor_is_platform_admin && (
              <Badge variant="secondary" className="text-[10px]">Admin da plataforma</Badge>
            )}
            {row.module_key && <Badge variant="outline" className="text-[10px]">{row.module_key}</Badge>}
            <span className="text-[11px] text-muted-foreground">
              {new Date(row.created_at).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}
