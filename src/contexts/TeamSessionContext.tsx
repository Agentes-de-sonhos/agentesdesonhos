import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'

const TOKEN_KEY = 'team_session_token'

export interface TeamMember {
  id: string
  agency_id: string
  login: string
  full_name: string
  role_title: string | null
}

export interface TeamPermissionRow {
  module_key: 'clients' | 'financial'
  permission_key: string
  enabled: boolean
}

export interface TeamStagePermissionRow {
  pipeline_type: 'opportunities' | 'operations'
  stage_id: string
  can_view: boolean
  can_edit: boolean
  can_move: boolean
}

interface TeamSessionState {
  loading: boolean
  member: TeamMember | null
  token: string | null
  permissions: TeamPermissionRow[]
  stagePermissions: TeamStagePermissionRow[]
}

interface TeamSessionContextValue extends TeamSessionState {
  signIn: (login: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  has: (permissionKey: string) => boolean
  hasModule: (module: 'clients' | 'financial') => boolean
  canStage: (pipeline: 'opportunities' | 'operations', stageId: string, action: 'view' | 'edit' | 'move') => boolean
}

const TeamSessionContext = createContext<TeamSessionContextValue | undefined>(undefined)

export function TeamSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TeamSessionState>({
    loading: true, member: null, token: null, permissions: [], stagePermissions: [],
  })

  const validate = useCallback(async (token: string) => {
    const { data, error } = await supabase.functions.invoke('team-session', {
      body: { token, action: 'validate' },
    })
    if (error || !data || (data as any).error) {
      localStorage.removeItem(TOKEN_KEY)
      setState({ loading: false, member: null, token: null, permissions: [], stagePermissions: [] })
      return
    }
    setState({
      loading: false,
      member: (data as any).member,
      token,
      permissions: (data as any).permissions ?? [],
      stagePermissions: (data as any).stage_permissions ?? [],
    })
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setState(s => ({ ...s, loading: false }))
      return
    }
    void validate(token)
  }, [validate])

  const signIn = useCallback(async (login: string, password: string) => {
    const { data, error } = await supabase.functions.invoke('team-login', {
      body: { login, password },
    })
    if (error) return { error: 'Não foi possível autenticar' }
    const payload = data as any
    if (payload?.error) return { error: payload.error }
    localStorage.setItem(TOKEN_KEY, payload.token)
    setState({
      loading: false, member: payload.member, token: payload.token,
      permissions: payload.permissions ?? [], stagePermissions: payload.stage_permissions ?? [],
    })
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      try { await supabase.functions.invoke('team-session', { body: { token, action: 'logout' } }) } catch {}
    }
    localStorage.removeItem(TOKEN_KEY)
    setState({ loading: false, member: null, token: null, permissions: [], stagePermissions: [] })
  }, [])

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) await validate(token)
  }, [validate])

  const has = useCallback((permissionKey: string) => {
    return state.permissions.some(p => p.permission_key === permissionKey && p.enabled)
  }, [state.permissions])

  const hasModule = useCallback((module: 'clients' | 'financial') => {
    if (module === 'financial') return has('financial.access')
    return state.permissions.some(p => p.module_key === 'clients' && p.enabled)
  }, [state.permissions, has])

  const canStage = useCallback((pipeline: 'opportunities' | 'operations', stageId: string, action: 'view' | 'edit' | 'move') => {
    const row = state.stagePermissions.find(s => s.pipeline_type === pipeline && s.stage_id === stageId)
    if (!row) return false
    if (action === 'view') return row.can_view
    if (action === 'edit') return row.can_edit
    return row.can_move
  }, [state.stagePermissions])

  const value = useMemo<TeamSessionContextValue>(() => ({
    ...state, signIn, signOut, refresh, has, hasModule, canStage,
  }), [state, signIn, signOut, refresh, has, hasModule, canStage])

  return <TeamSessionContext.Provider value={value}>{children}</TeamSessionContext.Provider>
}

export function useTeamSession() {
  const ctx = useContext(TeamSessionContext)
  if (!ctx) throw new Error('useTeamSession must be used within TeamSessionProvider')
  return ctx
}

/** Conveniência: retorna se o usuário atual é subusuário da equipe */
export function useIsTeamMember() {
  const { member } = useTeamSession()
  return !!member
}