import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface TeamMemberRow {
  id: string
  login: string
  full_name: string
  role_title: string | null
  status: 'active' | 'blocked'
  last_login_at: string | null
  created_at: string
  permissions_count: number
  stage_permissions_count: number
}

export interface TeamMemberDetail {
  id: string
  login: string
  full_name: string
  role_title: string | null
  status: 'active' | 'blocked'
  last_login_at: string | null
  created_at: string
  permissions: { module_key: string; permission_key: string; enabled: boolean }[]
  stage_permissions: { pipeline_type: 'opportunities' | 'operations'; stage_id: string; can_view: boolean; can_edit: boolean; can_move: boolean }[]
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('team_list_members')
      if (error) throw error
      return (data ?? []) as TeamMemberRow[]
    },
    staleTime: 30_000,
  })
}

export function useTeamQuota() {
  return useQuery({
    queryKey: ['team-quota'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('team_member_quota')
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      return { used: row?.used ?? 0, total: row?.total ?? 3 }
    },
    staleTime: 30_000,
  })
}

export function useTeamMemberDetail(id: string | null) {
  return useQuery({
    queryKey: ['team-member-detail', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('team_get_member_detail', { _member_id: id })
      if (error) throw error
      return (data as unknown) as TeamMemberDetail | null
    },
  })
}

export function useTeamAdminMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke('team-admin', { body: payload })
      if (error) throw new Error(error.message)
      if ((data as any)?.error) throw new Error((data as any).error)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members'] })
      qc.invalidateQueries({ queryKey: ['team-quota'] })
    },
  })
}