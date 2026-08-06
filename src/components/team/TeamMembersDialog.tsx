import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useTeamQuota } from '@/hooks/useTeamMembers'
import { TeamManagementCenter } from './TeamManagementCenter'

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

/**
 * Central de equipe da agência (proprietário/master ou colaborador com team.manage).
 * Ponto de entrada usado por Minha Conta, Gestão de Clientes e Gestão Financeira.
 */
export function TeamMembersDialog({ open, onOpenChange }: Props) {
  const { data: quota } = useTeamQuota()
  const used = quota?.used ?? 0
  const total = quota?.total ?? 3

  return (
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

        <TeamManagementCenter />
      </DialogContent>
    </Dialog>
  )
}
