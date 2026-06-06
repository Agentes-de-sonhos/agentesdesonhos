import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'

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
  permissions: TeamPermissionRow[]
  stagePermissions: TeamStagePermissionRow[]
}

interface TeamSessionContextValue extends TeamSessionState {
  refresh: () => Promise<void>
  has: (permissionKey: string) => boolean
  hasModule: (module: 'clients' | 'financial') => boolean
  canStage: (pipeline: 'opportunities' | 'operations', stageId: string, action: 'view' | 'edit' | 'move') => boolean
}

const TeamSessionContext = createContext<TeamSessionContextValue | undefined>(undefined)

export function TeamSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TeamSessionState>({
    loading: true, member: null, permissions: [], stagePermissions: [],
  })

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setState({ loading: false, member: null, permissions: [], stagePermissions: [] })
      return
    }
    const { data, error } = await supabase.rpc('team_self')
    if (error || !data) {
      setState({ loading: false, member: null, permissions: [], stagePermissions: [] })
      return
    }
    const payload = data as any
    setState({
      loading: false,
      member: payload.member,
      permissions: payload.permissions ?? [],
      stagePermissions: payload.stage_permissions ?? [],
    })
  }, [])

  useEffect(() => {
    void load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void load()
    })
    return () => subscription.unsubscribe()
  }, [load])

  const refresh = useCallback(async () => { await load() }, [load])

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
    ...state, refresh, has, hasModule, canStage,
  }), [state, refresh, has, hasModule, canStage])

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