import { Loader2, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useTeamAuditLog } from '@/hooks/useTeamMembers'

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
}

function label(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, ' ')
}

export function TeamAuditLogView({ memberId }: { memberId?: string | null }) {
  const { data = [], isLoading } = useTeamAuditLog(memberId ?? null, 150)

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <div className="mb-3 rounded-full bg-muted p-3"><History className="h-5 w-5" /></div>
        <p className="text-sm font-medium">Nenhum registro ainda</p>
        <p className="text-xs">As ações da equipe aparecerão aqui automaticamente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {data.map(row => (
        <div key={row.id} className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{label(row.action)}</p>
            <p className="text-xs text-muted-foreground">
              {row.member_name ?? 'Proprietário'}
              {row.entity_type ? ` · ${row.entity_type}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {row.module_key && <Badge variant="outline" className="text-[10px]">{row.module_key}</Badge>}
            <span className="text-[11px] text-muted-foreground">
              {new Date(row.created_at).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
