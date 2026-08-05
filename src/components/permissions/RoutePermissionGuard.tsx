import { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { canAccessRoute } from '@/lib/routePermissions'

/**
 * Bloqueia o acesso por URL direta a módulos sem permissão.
 * Enquanto a sessão de equipe carrega, nada é renderizado para evitar
 * que dados do módulo sejam buscados por engano.
 */
export function RoutePermissionGuard({ children }: { children: ReactNode }) {
  const { can, loading, isTeamMember } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()

  if (loading) return null
  if (!isTeamMember) return <>{children}</>
  if (canAccessRoute(location.pathname, can)) return <>{children}</>

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full bg-muted p-4">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-lg font-semibold">Acesso não liberado</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Você não possui permissão para acessar esta área. Fale com o administrador
        da sua agência para solicitar a liberação.
      </p>
      <Button className="mt-6" variant="outline" onClick={() => navigate('/dashboard', { replace: true })}>
        Voltar para a página inicial
      </Button>
    </div>
  )
}
