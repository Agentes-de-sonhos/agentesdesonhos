import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTeamSession } from '@/contexts/TeamSessionContext'

/** Rotas (prefixos) permitidas para subusuários da equipe. */
const TEAM_ALLOWED_PREFIXES = [
  '/gestao-clientes',
  '/financeiro',
  '/auth',
  '/dashboard',
  '/agenda',
  '/meus-projetos',
  '/perfil',
  '/minha-conta',
  '/ferramentas-ia/criar-roteiro',
  '/ferramentas-ia/gerar-orcamento',
  '/ferramentas-ia/trip-wallet',
  '/ferramentas-ia/modelos-roteiros',
]

const TEAM_PUBLIC_PREFIXES = [
  '/orcamento/', '/roteiro/', '/viagem/', '/c/', '/v/', '/cadastro/',
  '/formulario/', '/lp/', '/pesquisa/', '/ativar-cartao',
  '/politicasdeprivacidade', '/termosdeuso', '/reset-password',
]

function isAllowedForTeam(path: string) {
  if (TEAM_PUBLIC_PREFIXES.some(p => path.startsWith(p))) return true
  if (path === '/dashboard') return true
  return TEAM_ALLOWED_PREFIXES.some(p => path === p || path.startsWith(p + '/') || path === p)
}

/**
 * Quando o usuário logado é membro da equipe, redireciona qualquer rota
 * fora do escopo permitido para o primeiro módulo liberado (clientes ou financeiro).
 */
export function TeamRouteGuard() {
  const { member, loading, hasModule } = useTeamSession()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading || !member) return
    const landing = '/dashboard'
    if (!isAllowedForTeam(location.pathname)) {
      navigate(landing, { replace: true })
    }
  }, [member, loading, location.pathname, navigate, hasModule])

  return null
}