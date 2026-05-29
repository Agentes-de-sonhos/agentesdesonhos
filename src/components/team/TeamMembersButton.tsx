import { useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useIsTeamMember } from '@/contexts/TeamSessionContext'
import { TeamMembersDialog } from './TeamMembersDialog'

/** Botão "Usuários da Equipe" — visível apenas para o dono autenticado da agência. */
export function TeamMembersButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const isTeam = useIsTeamMember()
  if (!user || isTeam) return null
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className={className}>
        <Users className="mr-2 h-4 w-4" /> Usuários da Equipe
      </Button>
      <TeamMembersDialog open={open} onOpenChange={setOpen} />
    </>
  )
}