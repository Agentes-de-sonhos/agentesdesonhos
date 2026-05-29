import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTeamSession } from '@/contexts/TeamSessionContext'

/** Rotas (prefixos) permitidas para subusuários da equipe. */
const TEAM_ALLOWED_PREFIXES = [
  '/team-dashboard',
  '/gestao-clientes',
  '/financeiro',
  '/auth',
]

const TEAM_PUBLIC_PREFIXES = [
  '/orcamento/', '/roteiro/', '/viagem/', '/c/', '/v/', '/cadastro/',
  '/formulario/', '/lp/', '/pesquisa/', '/ativar-cartao',
  '/politicasdeprivacidade', '/termosdeuso', '/reset-password',
]

function isAllowedForTeam(path: string) {
  if (path === '/' || path === '') return true
  if (TEAM_PUBLIC_PREFIXES.some(p => path.startsWith(p))) return true
  return TEAM_ALLOWED_PREFIXES.some(p => path === p || path.startsWith(p + '/') || path === p)
}

/**
 * Quando o usuário logado é membro da equipe, redireciona qualquer rota
 * fora do escopo permitido para o dashboard reduzido (/team-dashboard).
 */
export function TeamRouteGuard() {
  const { member, loading } = useTeamSession()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading || !member) return
    if (!isAllowedForTeam(location.pathname)) {
      navigate('/team-dashboard', { replace: true })
    }
  }, [member, loading, location.pathname, navigate])

  return null
}