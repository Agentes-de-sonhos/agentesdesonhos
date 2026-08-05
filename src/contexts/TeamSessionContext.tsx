import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { updatePermissionsSnapshot } from '@/hooks/usePermissions'
import type { DataScope } from '@/lib/teamPermissions'

export interface TeamMember {
  id: string
  agency_id: string
  login: string
  full_name: string
  role_title: string | null
  email?: string | null
  phone?: string | null
  avatar_url?: string | null
  department?: string | null
  team_name?: string | null
  status?: 'active' | 'blocked' | 'pending' | 'disabled'
  access_profile_id?: string | null
}

export interface TeamAccessProfile {
  id: string
  key: string
  name: string
  is_native: boolean
}

export interface TeamPermissionRow {
  module_key: string
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

export interface CommunityFlags {
  public_community_enabled: boolean
  internal_community_enabled: boolean
  online_users_enabled: boolean
  internal_chat_enabled: boolean
  external_chat_enabled: boolean
}

const DEFAULT_COMMUNITY: CommunityFlags = {
  public_community_enabled: true,
  internal_community_enabled: true,
  online_users_enabled: true,
  internal_chat_enabled: true,
  external_chat_enabled: true,
}

interface TeamSessionState {
  loading: boolean
  member: TeamMember | null
  agencyId: string | null
  accessProfile: TeamAccessProfile | null
  permissions: TeamPermissionRow[]
  stagePermissions: TeamStagePermissionRow[]
  scopes: Record<string, DataScope>
  community: CommunityFlags
}

interface TeamSessionContextValue extends TeamSessionState {
  isOwner: boolean
  refresh: () => Promise<void>
  has: (permissionKey: string) => boolean
  hasModule: (module: string) => boolean
  scopeFor: (module: string) => DataScope
  canStage: (pipeline: 'opportunities' | 'operations', stageId: string, action: 'view' | 'edit' | 'move') => boolean
}

const EMPTY: TeamSessionState = {
  loading: true, member: null, agencyId: null, accessProfile: null,
  permissions: [], stagePermissions: [], scopes: {}, community: DEFAULT_COMMUNITY,
}

const TeamSessionContext = createContext<TeamSessionContextValue | undefined>(undefined)

export function TeamSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TeamSessionState>(EMPTY)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setState({ ...EMPTY, loading: false })
      return
    }
    const { data, error } = await supabase.rpc('team_self')
    if (error || !data) {
      setState({ ...EMPTY, loading: false, agencyId: user.id })
      return
    }
    const payload = data as any
    setState({
      loading: false,
      member: payload.member ?? null,
      agencyId: payload.agency_id ?? user.id,
      accessProfile: payload.access_profile ?? null,
      permissions: payload.permissions ?? [],
      stagePermissions: payload.stage_permissions ?? [],
      scopes: (payload.scopes ?? {}) as Record<string, DataScope>,
      community: { ...DEFAULT_COMMUNITY, ...(payload.community ?? {}) },
    })
  }, [])

  useEffect(() => {
    void load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void load()
    })
    return () => subscription.unsubscribe()
  }, [load])

  // Sincroniza snapshot global usado por guards síncronos em mutations
  useEffect(() => {
    updatePermissionsSnapshot({
      isTeamMember: !!state.member,
      permissions: state.permissions,
      stagePermissions: state.stagePermissions,
      scopes: state.scopes,
      community: state.community,
    })
  }, [state])

  const refresh = useCallback(async () => { await load() }, [load])

  const has = useCallback((permissionKey: string) => {
    return state.permissions.some(p => p.permission_key === permissionKey && p.enabled)
  }, [state.permissions])

  const hasModule = useCallback((module: string) => {
    if (module === 'financial') return has('financial.access')
    return state.permissions.some(p => p.module_key === module && p.enabled)
  }, [state.permissions, has])

  const scopeFor = useCallback((module: string): DataScope => {
    if (!state.member) return 'agency'
    return state.scopes[module] ?? 'own'
  }, [state.member, state.scopes])

  const canStage = useCallback((pipeline: 'opportunities' | 'operations', stageId: string, action: 'view' | 'edit' | 'move') => {
    const row = state.stagePermissions.find(s => s.pipeline_type === pipeline && s.stage_id === stageId)
    if (!row) return false
    if (action === 'view') return row.can_view
    if (action === 'edit') return row.can_edit
    return row.can_move
  }, [state.stagePermissions])

  const value = useMemo<TeamSessionContextValue>(() => ({
    ...state, isOwner: !state.loading && !state.member,
    refresh, has, hasModule, scopeFor, canStage,
  }), [state, refresh, has, hasModule, scopeFor, canStage])

  return <TeamSessionContext.Provider value={value}>{children}</TeamSessionContext.Provider>
}

export function useTeamSession() {
  const ctx = useContext(TeamSessionContext)
  if (!ctx) throw new Error('useTeamSession must be used within TeamSessionProvider')
  return ctx
}

/** Conveniência: retorna se o usuário atual é colaborador (subusuário) da equipe */
export function useIsTeamMember() {
  const { member } = useTeamSession()
  return !!member
}

/** Conveniência: flags de comunidade/chat vigentes para a agência atual. */
export function useCommunityFlags() {
  const { community } = useTeamSession()
  return community
}
