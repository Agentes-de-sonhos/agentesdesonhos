import { createContext, useContext, useMemo, type ReactNode } from 'react'

/**
 * Escopo explícito da central de equipe.
 *
 * - Fluxo da agência (proprietário/master): NENHUM provider é usado, o escopo é
 *   `null` e os hooks seguem exatamente o comportamento original (RPCs da sessão).
 * - Painel administrativo global: o provider informa `agencyId` explicitamente e
 *   todos os hooks passam a enviar `target_agency_id` para as Edge Functions
 *   administrativas. Nunca há dependência implícita da agência da sessão.
 */
export interface TeamScope {
  /** Agência alvo. `null` = agência da própria sessão. */
  agencyId: string | null
  isPlatformAdmin: boolean
  agencyName?: string | null
  ownerName?: string | null
  ownerEmail?: string | null
  plan?: string | null
}

const NEUTRAL_SCOPE: TeamScope = { agencyId: null, isPlatformAdmin: false }

const TeamScopeContext = createContext<TeamScope>(NEUTRAL_SCOPE)

export function TeamScopeProvider({ scope, children }: { scope: TeamScope; children: ReactNode }) {
  const value = useMemo(
    () => scope,
    [scope.agencyId, scope.isPlatformAdmin, scope.agencyName, scope.ownerName, scope.ownerEmail, scope.plan],
  )
  return <TeamScopeContext.Provider value={value}>{children}</TeamScopeContext.Provider>
}

export function useTeamScope(): TeamScope {
  return useContext(TeamScopeContext)
}