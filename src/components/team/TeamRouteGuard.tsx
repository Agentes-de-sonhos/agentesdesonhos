import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTeamSession } from '@/contexts/TeamSessionContext'
import { usePermissions } from '@/hooks/usePermissions'
import { canAccessRoute, isPublicRoute, permissionsForRoute } from '@/lib/routePermissions'

/**
 * Colaborador da equipe: rotas fora do escopo permitido voltam para a página
 * inicial. Rotas mapeadas e negadas são tratadas pelo RoutePermissionGuard,
 * que exibe a tela de acesso negado sem perder o endereço.
 */
export function TeamRouteGuard() {
  const { member, loading } = useTeamSession()
  const { can } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading || !member) return
    const path = location.pathname
    if (isPublicRoute(path) || path === '/' || path === '/dashboard') return
    // Rota sem mapeamento de permissão: mantém o colaborador no painel.
    if (permissionsForRoute(path).length === 0) {
      navigate('/dashboard', { replace: true })
      return
    }
    if (!canAccessRoute(path, can)) return // guard visual assume o bloqueio
  }, [member, loading, location.pathname, navigate, can])

  return null
}
