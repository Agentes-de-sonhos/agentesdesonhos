import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Pencil, Ban, Trash2, CircleCheck, Loader2, Users } from 'lucide-react'
import { useTeamMembers, useTeamQuota, useTeamAdminMutation, TeamMemberRow } from '@/hooks/useTeamMembers'
import { TeamMemberForm } from './TeamMemberForm'
import { TeamInvitesList } from './TeamInvitesList'
import { AgencyCommunitySettings } from './AgencyCommunitySettings'
import { TeamAuditLogView } from './TeamAuditLogView'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

const STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Ativo', variant: 'default' },
  blocked: { label: 'Bloqueado', variant: 'destructive' },
  pending: { label: 'Convite pendente', variant: 'secondary' },
  disabled: { label: 'Desativado', variant: 'outline' },
}

export function TeamMembersDialog({ open, onOpenChange }: Props) {
  const { data: members = [], isLoading } = useTeamMembers()
  const { data: quota } = useTeamQuota()
  const mutation = useTeamAdminMutation()
  const [editing, setEditing] = useState<TeamMemberRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<TeamMemberRow | null>(null)

  const used = quota?.used ?? 0
  const total = quota?.total ?? 3
  const atLimit = used >= total

  const toggleStatus = (m: TeamMemberRow) => {
    const status = m.status === 'active' ? 'blocked' : 'active'
    mutation.mutate({ action: 'set_status', id: m.id, status }, {
      onSuccess: () => toast.success(status === 'blocked' ? 'Colaborador bloqueado' : 'Colaborador reativado'),
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Equipe e permissões</DialogTitle>
            <DialogDescription>
              Gerencie os colaboradores da sua agência, o que cada um acessa e quais dados enxerga.{' '}
              <span className="font-medium text-foreground">{used} de {total}</span> acessos utilizados
              {quota?.plan ? ` no plano ${quota.plan}` : ''}.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="membros">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="membros">Colaboradores</TabsTrigger>
              <TabsTrigger value="convites">
                Convites{quota?.pending ? ` (${quota.pending})` : ''}
              </TabsTrigger>
              <TabsTrigger value="comunidade">Comunidade</TabsTrigger>
              <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
            </TabsList>

            <TabsContent value="membros" className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {atLimit
                    ? 'Você atingiu o limite de acessos do seu plano. Faça upgrade para adicionar mais colaboradores.'
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
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{m.full_name}</p>
                            <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                            {m.access_profile_name && (
                              <Badge variant="outline" className="text-[10px]">{m.access_profile_name}</Badge>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.login}
                            {m.role_title ? ` · ${m.role_title}` : ''}
                            {m.department ? ` · ${m.department}` : ''}
                            {m.team_name ? ` · ${m.team_name}` : ''}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {m.permissions_count} permissões · {m.stage_permissions_count} etapas
                            {m.last_login_at ? ` · último acesso ${new Date(m.last_login_at).toLocaleDateString('pt-BR')}` : ' · nunca acessou'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditing(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            title={m.status === 'active' ? 'Bloquear' : 'Reativar'}
                            onClick={() => toggleStatus(m)}>
                            {m.status === 'active'
                              ? <Ban className="h-4 w-4" />
                              : <CircleCheck className="h-4 w-4 text-emerald-600" />}
                          </Button>
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

            <TabsContent value="comunidade" className="pt-4">
              <AgencyCommunitySettings />
            </TabsContent>

            <TabsContent value="auditoria" className="pt-4">
              <TeamAuditLogView />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

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
    </>
  )
}
