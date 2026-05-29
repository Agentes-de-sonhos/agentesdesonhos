import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Ban, Trash2, CircleCheck, Loader2 } from 'lucide-react'
import { useTeamMembers, useTeamQuota, useTeamAdminMutation, TeamMemberRow } from '@/hooks/useTeamMembers'
import { TeamMemberForm } from './TeamMemberForm'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

export function TeamMembersDialog({ open, onOpenChange }: Props) {
  const { data: members = [], isLoading } = useTeamMembers()
  const { data: quota } = useTeamQuota()
  const mutation = useTeamAdminMutation()
  const [editing, setEditing] = useState<TeamMemberRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<TeamMemberRow | null>(null)

  const used = quota?.used ?? 0
  const total = quota?.total ?? 6
  const atLimit = used >= total

  const toggleStatus = (m: TeamMemberRow) => {
    const status = m.status === 'active' ? 'blocked' : 'active'
    mutation.mutate({ action: 'set_status', id: m.id, status }, {
      onSuccess: () => toast.success(status === 'blocked' ? 'Usuário bloqueado' : 'Usuário reativado'),
      onError: (e: any) => toast.error(e.message),
    })
  }

  const doDelete = () => {
    if (!confirmDelete) return
    mutation.mutate({ action: 'delete', id: confirmDelete.id }, {
      onSuccess: () => { toast.success('Usuário excluído'); setConfirmDelete(null) },
      onError: (e: any) => toast.error(e.message),
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Usuários da Equipe</DialogTitle>
            <DialogDescription>
              Crie e gerencie os colaboradores internos da sua agência.{' '}
              <span className="font-medium text-foreground">{used} de {total}</span> utilizados.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button onClick={() => setCreating(true)} disabled={atLimit} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Adicionar usuário
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : members.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Nenhum usuário cadastrado. Adicione o primeiro membro da sua equipe.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Nome / Login</th>
                    <th className="px-3 py-2 text-left">Cargo</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Permissões</th>
                    <th className="px-3 py-2 text-left">Último acesso</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{m.full_name}</div>
                        <div className="text-xs text-muted-foreground">{m.login}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{m.role_title || '—'}</td>
                      <td className="px-3 py-2">
                        {m.status === 'active'
                          ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Ativo</Badge>
                          : <Badge variant="secondary" className="bg-rose-100 text-rose-700">Bloqueado</Badge>}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {m.permissions_count} ações · {m.stage_permissions_count} etapas
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {m.last_login_at ? new Date(m.last_login_at).toLocaleString('pt-BR') : 'Nunca'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditing(m)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => toggleStatus(m)} title={m.status === 'active' ? 'Bloquear' : 'Reativar'}>
                            {m.status === 'active' ? <Ban className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(m)} title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {creating && (
        <TeamMemberForm
          mode="create"
          open={creating}
          onOpenChange={setCreating}
        />
      )}
      {editing && (
        <TeamMemberForm
          mode="edit"
          memberId={editing.id}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && `O acesso de "${confirmDelete.full_name}" será removido permanentemente. Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}