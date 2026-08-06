import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus, Pencil, Ban, Trash2, CircleCheck, Loader2, Users, ShieldAlert, PauseCircle,
} from 'lucide-react'
import { useTeamMembers, useTeamQuota, useTeamAdminMutation, TeamMemberRow } from '@/hooks/useTeamMembers'
import { useTeamScope } from './TeamScopeContext'
import { TeamMemberForm } from './TeamMemberForm'
import { TeamInvitesList } from './TeamInvitesList'
import { AccessProfilesManager } from './AccessProfilesManager'
import { AgencyCommunitySettings } from './AgencyCommunitySettings'
import { TeamAuditLogView } from './TeamAuditLogView'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Ativo', variant: 'default' },
  blocked: { label: 'Bloqueado', variant: 'destructive' },
  pending: { label: 'Convite pendente', variant: 'secondary' },
  disabled: { label: 'Desativado', variant: 'outline' },
}

type StatusAction = 'active' | 'blocked' | 'disabled'

const STATUS_ACTION_COPY: Record<StatusAction, { title: string; description: string; confirm: string }> = {
  blocked: {
    title: 'Bloquear colaborador',
    description: 'O acesso será bloqueado imediatamente e as sessões abertas serão encerradas. A vaga continua ocupada e o acesso pode ser reativado depois.',
    confirm: 'Bloquear',
  },
  disabled: {
    title: 'Desativar colaborador',
    description: 'O colaborador deixa de acessar a plataforma e a vaga é liberada para outro acesso. O histórico e os registros criados por ele são preservados.',
    confirm: 'Desativar',
  },
  active: {
    title: 'Reativar colaborador',
    description: 'O acesso volta a funcionar com as mesmas permissões já configuradas.',
    confirm: 'Reativar',
  },
}

/**
 * Central de equipe e permissões (Colaboradores, Convites, Perfis de acesso,
 * Comunidade e Auditoria).
 *
 * O conteúdo é idêntico para a agência e para o painel administrativo global —
 * a única diferença é o escopo informado por `TeamScopeProvider`, consumido pelos
 * hooks. Nenhum comportamento do fluxo do proprietário foi alterado.
 */
export function TeamManagementCenter() {
  const scope = useTeamScope()
  const { data: members = [], isLoading } = useTeamMembers()
  const { data: quota } = useTeamQuota()
  const mutation = useTeamAdminMutation()
  const [editing, setEditing] = useState<TeamMemberRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<TeamMemberRow | null>(null)
  const [confirmStatus, setConfirmStatus] = useState<{ member: TeamMemberRow; status: StatusAction } | null>(null)

  const used = quota?.used ?? 0
  const total = quota?.total ?? 3
  const atLimit = used >= total

  const setStatus = (m: TeamMemberRow, status: StatusAction) => {
    mutation.mutate({ action: 'set_status', id: m.id, status }, {
      onSuccess: () => {
        toast.success(
          status === 'blocked' ? 'Colaborador bloqueado'
            : status === 'disabled' ? 'Colaborador desativado' : 'Colaborador reativado',
        )
        setConfirmStatus(null)
      },
      onError: (e: any) => toast.error(e.message),
    })
  }

  const doDelete = () => {
    if (!confirmDelete) return
    mutation.mutate({ action: 'delete', id: confirmDelete.id }, {
      onSuccess: () => { toast.success('Colaborador excluído'); setConfirmDelete(null) },
      onError: (e: any) => toast.error(e.message),
    })
  }

  return (
    <>
      {scope.isPlatformAdmin && scope.agencyId && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/40">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <p className="font-semibold">
              Você está administrando a agência {scope.agencyName || 'selecionada'} como administrador da plataforma.
            </p>
            <p>
              Todas as alterações valem para esta agência
              {scope.ownerName ? ` (responsável: ${scope.ownerName}` : ''}
              {scope.ownerEmail ? `${scope.ownerName ? ' · ' : ' ('}${scope.ownerEmail}` : ''}
              {scope.ownerName || scope.ownerEmail ? ')' : ''} e ficam registradas na auditoria como ação administrativa.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="membros">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="membros">Colaboradores</TabsTrigger>
          <TabsTrigger value="convites">
            Convites{quota?.pending ? ` (${quota.pending})` : ''}
          </TabsTrigger>
          <TabsTrigger value="perfis">Perfis de acesso</TabsTrigger>
          <TabsTrigger value="comunidade">Comunidade</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="membros" className="space-y-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {atLimit
                ? 'Limite de acessos atingido. Novas inclusões e convites ficam bloqueados até liberar uma vaga ou ajustar o limite.'
                : 'Cada colaborador tem login próprio e permissões independentes.'}
            </p>
            <Button onClick={() => setCreating(true)} disabled={atLimit} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !members.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="mb-3 rounded-full bg-muted p-3"><Users className="h-5 w-5" /></div>
              <p className="text-sm font-medium">Nenhum colaborador cadastrado</p>
              <p className="text-xs">Adicione o primeiro acesso ou envie um convite por e-mail.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(m => {
                const st = STATUS_META[m.status] ?? STATUS_META.active
                return (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{m.full_name}</p>
                        <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                        {m.access_profile_name && (
                          <Badge variant="outline" className="text-[10px]">{m.access_profile_name}</Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.login}
                        {m.email ? ` · ${m.email}` : ''}
                        {m.role_title ? ` · ${m.role_title}` : ''}
                        {m.department ? ` · ${m.department}` : ''}
                        {m.team_name ? ` · ${m.team_name}` : ''}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {m.permissions_count} permissões · {m.stage_permissions_count} etapas
                        {m.last_login_at
                          ? ` · último acesso ${new Date(m.last_login_at).toLocaleDateString('pt-BR')}`
                          : ' · nunca acessou'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditing(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {m.status === 'active' ? (
                        <>
                          <Button variant="ghost" size="icon" title="Bloquear"
                            onClick={() => setConfirmStatus({ member: m, status: 'blocked' })}>
                            <Ban className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Desativar"
                            onClick={() => setConfirmStatus({ member: m, status: 'disabled' })}>
                            <PauseCircle className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" title="Reativar"
                            onClick={() => setConfirmStatus({ member: m, status: 'active' })}>
                            <CircleCheck className="h-4 w-4 text-emerald-600" />
                          </Button>
                          {m.status !== 'disabled' && (
                            <Button variant="ghost" size="icon" title="Desativar"
                              onClick={() => setConfirmStatus({ member: m, status: 'disabled' })}>
                              <PauseCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      <Button variant="ghost" size="icon" title="Excluir" onClick={() => setConfirmDelete(m)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="convites" className="pt-4">
          <TeamInvitesList disabledCreate={atLimit} />
        </TabsContent>

        <TabsContent value="perfis" className="pt-4">
          <AccessProfilesManager />
        </TabsContent>

        <TabsContent value="comunidade" className="pt-4">
          <AgencyCommunitySettings />
        </TabsContent>

        <TabsContent value="auditoria" className="pt-4">
          <TeamAuditLogView />
        </TabsContent>
      </Tabs>

      {creating && (
        <TeamMemberForm mode="create" open={creating} onOpenChange={setCreating} />
      )}
      {editing && (
        <TeamMemberForm mode="edit" memberId={editing.id} open={!!editing}
          onOpenChange={(v) => { if (!v) setEditing(null) }} />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={v => { if (!v) setConfirmDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir colaborador</AlertDialogTitle>
            <AlertDialogDescription>
              O acesso de <strong>{confirmDelete?.full_name}</strong> será removido imediatamente.
              Os registros criados por ele continuam na agência. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmStatus} onOpenChange={v => { if (!v) setConfirmStatus(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmStatus ? STATUS_ACTION_COPY[confirmStatus.status].title : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmStatus?.member.full_name}</strong>{' '}
              {confirmStatus ? STATUS_ACTION_COPY[confirmStatus.status].description : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (confirmStatus) setStatus(confirmStatus.member, confirmStatus.status)
              }}>
              {confirmStatus ? STATUS_ACTION_COPY[confirmStatus.status].confirm : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}