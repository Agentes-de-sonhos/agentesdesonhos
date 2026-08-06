import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { DataScope } from '@/lib/teamPermissions'
import { useTeamScope } from '@/components/team/TeamScopeContext'

export type TeamMemberStatus = 'active' | 'blocked' | 'pending' | 'disabled'

export interface TeamMemberRow {
  id: string
  login: string
  full_name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  role_title: string | null
  department: string | null
  team_name: string | null
  access_profile_id: string | null
  access_profile_name: string | null
  access_profile_key: string | null
  status: TeamMemberStatus
  last_login_at: string | null
  invited_at: string | null
  activated_at: string | null
  created_at: string
  permissions_count: number
  stage_permissions_count: number
}

export interface TeamInviteRow {
  id: string
  email: string
  full_name: string | null
  role_title: string | null
  department: string | null
  team_name: string | null
  access_profile_id: string | null
  access_profile_name: string | null
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
  sent_count: number
  last_sent_at: string | null
  created_at: string
}

export interface AccessProfileRow {
  id: string
  agency_id: string | null
  key: string
  name: string
  description: string | null
  is_native: boolean
  permission_keys: string[]
  scopes: Record<string, DataScope>
}

export interface TeamMemberDetail {
  id: string
  login: string
  full_name: string
  role_title: string | null
  status: TeamMemberStatus
  last_login_at: string | null
  created_at: string
  permissions: { module_key: string; permission_key: string; enabled: boolean }[]
  stage_permissions: { pipeline_type: 'opportunities' | 'operations'; stage_id: string; can_view: boolean; can_edit: boolean; can_move: boolean }[]
}

export interface TeamAuditRow {
  id: string
  action: string
  module_key: string | null
  entity_type: string | null
  entity_id: string | null
  team_member_id: string | null
  member_name: string | null
  actor_user_id: string | null
  actor_is_platform_admin?: boolean | null
  details: Record<string, unknown> | null
  created_at: string
}

const rpc = (fn: string, args?: Record<string, unknown>) =>
  supabase.rpc(fn as any, args as any)

/**
 * Chamada administrativa global. Só é usada quando o escopo informa uma agência
 * explícita (`target_agency_id`). O navegador nunca acessa tabelas globais direto:
 * tudo passa pela Edge Function `admin-agency-teams`, que valida o papel `admin`.
 */
export async function adminAgencyTeamsCall<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-agency-teams', { body: payload })
  if (error) throw new Error((data as any)?.error || error.message)
  if ((data as any)?.error) throw new Error((data as any).error)
  return data as T
}

export function useTeamMembers() {
  const { agencyId } = useTeamScope()
  return useQuery({
    queryKey: ['team-members', agencyId ?? 'self'],
    queryFn: async () => {
      if (agencyId) {
        return await adminAgencyTeamsCall<TeamMemberRow[]>({ action: 'members', target_agency_id: agencyId })
      }
      const { data, error } = await rpc('team_members_overview')
      if (error) throw error
      return (data ?? []) as unknown as TeamMemberRow[]
    },
    staleTime: 30_000,
  })
}

export function useTeamInvites() {
  const { agencyId } = useTeamScope()
  return useQuery({
    queryKey: ['team-invites', agencyId ?? 'self'],
    queryFn: async () => {
      if (agencyId) {
        return await adminAgencyTeamsCall<TeamInviteRow[]>({ action: 'invites', target_agency_id: agencyId })
      }
      const { data, error } = await rpc('team_list_invites')
      if (error) throw error
      return (data ?? []) as unknown as TeamInviteRow[]
    },
    staleTime: 30_000,
  })
}

export function useAccessProfiles() {
  const { agencyId } = useTeamScope()
  return useQuery({
    queryKey: ['team-access-profiles', agencyId ?? 'self'],
    queryFn: async () => {
      if (agencyId) {
        return await adminAgencyTeamsCall<AccessProfileRow[]>({ action: 'access_profiles', target_agency_id: agencyId })
      }
      const { data, error } = await rpc('team_access_profiles')
      if (error) throw error
      return (data ?? []) as unknown as AccessProfileRow[]
    },
    staleTime: 5 * 60_000,
  })
}

export function useTeamQuota() {
  const { agencyId } = useTeamScope()
  return useQuery({
    queryKey: ['team-quota', agencyId ?? 'self'],
    queryFn: async () => {
      if (agencyId) {
        const row = await adminAgencyTeamsCall<any>({ action: 'quota', target_agency_id: agencyId })
        return {
          used: row?.used ?? 0,
          total: row?.total ?? 3,
          plan: (row?.plan ?? null) as string | null,
          pending: row?.pending ?? 0,
        }
      }
      const { data, error } = await rpc('team_member_quota')
      if (error) throw error
      const row: any = Array.isArray(data) ? data[0] : data
      return {
        used: row?.used ?? 0,
        total: row?.total ?? 3,
        plan: (row?.plan ?? null) as string | null,
        pending: row?.pending ?? 0,
      }
    },
    staleTime: 30_000,
  })
}

export function useTeamMemberDetail(id: string | null) {
  const { agencyId } = useTeamScope()
  return useQuery({
    queryKey: ['team-member-detail', agencyId ?? 'self', id],
    enabled: !!id,
    queryFn: async () => {
      if (agencyId) {
        return await adminAgencyTeamsCall<TeamMemberDetail>({
          action: 'member_detail', target_agency_id: agencyId, member_id: id,
        })
      }
      const { data, error } = await rpc('team_get_member_detail', { _member_id: id })
      if (error) throw error
      return (data as unknown) as TeamMemberDetail | null
    },
  })
}

export function useTeamMemberScopes(id: string | null) {
  const { agencyId } = useTeamScope()
  return useQuery({
    queryKey: ['team-member-scopes', agencyId ?? 'self', id],
    enabled: !!id,
    queryFn: async () => {
      const map: Record<string, DataScope> = {}
      if (agencyId) {
        const rows = await adminAgencyTeamsCall<any[]>({
          action: 'member_scopes', target_agency_id: agencyId, member_id: id,
        })
        ;(rows ?? []).forEach(r => { map[r.module_key] = r.scope })
        return map
      }
      const { data, error } = await rpc('team_member_scopes', { _member_id: id })
      if (error) throw error
      ;((data ?? []) as any[]).forEach(r => { map[r.module_key] = r.scope })
      return map
    },
  })
}

export function useTeamAuditLog(memberId?: string | null, limit = 100) {
  const { agencyId } = useTeamScope()
  return useQuery({
    queryKey: ['team-audit-log', agencyId ?? 'self', memberId ?? 'all', limit],
    queryFn: async () => {
      if (agencyId) {
        return await adminAgencyTeamsCall<TeamAuditRow[]>({
          action: 'audit', target_agency_id: agencyId, member_id: memberId ?? null,
        })
      }
      const { data, error } = await rpc('team_audit_log', { _limit: limit, _member_id: memberId ?? null })
      if (error) throw error
      return (data ?? []) as unknown as TeamAuditRow[]
    },
    staleTime: 15_000,
  })
}

export function useCommunitySettings() {
  const { agencyId } = useTeamScope()
  return useQuery({
    queryKey: ['agency-community-settings', agencyId ?? 'self'],
    queryFn: async () => {
      if (agencyId) {
        return await adminAgencyTeamsCall<any>({ action: 'community_get', target_agency_id: agencyId })
      }
      const { data, error } = await rpc('agency_community_settings_get')
      if (error) throw error
      return data as unknown as {
        public_community_enabled: boolean
        internal_community_enabled: boolean
        online_users_enabled: boolean
        internal_chat_enabled: boolean
        external_chat_enabled: boolean
        preset: 'full' | 'agency_only' | 'disabled' | 'custom'
      }
    },
    staleTime: 60_000,
  })
}

export function useSaveCommunitySettings() {
  const qc = useQueryClient()
  const { agencyId } = useTeamScope()
  return useMutation({
    mutationFn: async (input: {
      public_community_enabled: boolean
      internal_community_enabled: boolean
      online_users_enabled: boolean
      internal_chat_enabled: boolean
      external_chat_enabled: boolean
      preset: string
    }) => {
      if (agencyId) {
        return await adminAgencyTeamsCall({
          action: 'community_save', target_agency_id: agencyId, ...input,
        })
      }
      const { data, error } = await rpc('agency_community_settings_save', {
        _public: input.public_community_enabled,
        _internal: input.internal_community_enabled,
        _online: input.online_users_enabled,
        _internal_chat: input.internal_chat_enabled,
        _external_chat: input.external_chat_enabled,
        _preset: input.preset,
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-community-settings'] })
      qc.invalidateQueries({ queryKey: ['team-audit-log'] })
    },
  })
}

export function useTeamAdminMutation() {
  const qc = useQueryClient()
  const { agencyId } = useTeamScope()
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const body = agencyId ? { ...payload, target_agency_id: agencyId } : payload
      const { data, error } = await supabase.functions.invoke('team-admin', { body })
      if (error) throw new Error((data as any)?.error || error.message)
      if ((data as any)?.error) throw new Error((data as any).error)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members'] })
      qc.invalidateQueries({ queryKey: ['team-invites'] })
      qc.invalidateQueries({ queryKey: ['team-quota'] })
      qc.invalidateQueries({ queryKey: ['team-audit-log'] })
      qc.invalidateQueries({ queryKey: ['team-access-profiles'] })
      qc.invalidateQueries({ queryKey: ['admin-agency-teams'] })
    },
  })
}
