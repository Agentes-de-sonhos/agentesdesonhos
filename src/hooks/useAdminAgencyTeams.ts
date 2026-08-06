import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminAgencyTeamsCall } from '@/hooks/useTeamMembers'

/**
 * Hooks exclusivos do painel administrativo global (Administração → Agências e Equipes).
 * Toda leitura e escrita passa pela Edge Function `admin-agency-teams`, que valida
 * o papel `admin` no servidor e registra auditoria.
 */

export interface AdminAgencyTeamsStats {
  agencies_total: number
  agencies_with_team: number
  active_members: number
  inactive_members: number
  pending_invites: number
  custom_profiles: number
}

export interface AdminAgencyRow {
  agency_id: string
  agency_name: string
  owner_name: string | null
  owner_email: string | null
  plan: string
  active_members: number
  inactive_members: number
  pending_invites: number
  seats_used: number
  seats_limit: number
  limit_override: number | null
  last_activity: string | null
}

export interface AdminAgencyFilters {
  search: string
  plan: string
  team: 'all' | 'with' | 'without'
  atLimit: boolean
  pendingInvites: boolean
  page: number
  pageSize: number
}

export interface AdminAgencyQuota {
  used: number
  total: number
  plan: string | null
  plan_limit: number | null
  pending: number
  override: { max_members: number; reason: string | null; created_by: string | null; updated_at: string | null } | null
}

export function useAdminAgencyTeamsStats() {
  return useQuery({
    queryKey: ['admin-agency-teams', 'stats'],
    queryFn: () => adminAgencyTeamsCall<AdminAgencyTeamsStats>({ action: 'stats' }),
    staleTime: 60_000,
  })
}

export function useAdminAgencyList(filters: AdminAgencyFilters) {
  return useQuery({
    queryKey: ['admin-agency-teams', 'agencies', filters],
    queryFn: () => adminAgencyTeamsCall<{ items: AdminAgencyRow[]; total: number; page: number; page_size: number }>({
      action: 'agencies',
      search: filters.search || null,
      plan: filters.plan,
      team: filters.team,
      at_limit: filters.atLimit,
      pending_invites: filters.pendingInvites,
      page: filters.page,
      page_size: filters.pageSize,
    }),
    staleTime: 30_000,
  })
}

export function useAdminAgencyDetail(agencyId: string | null) {
  return useQuery({
    queryKey: ['admin-agency-teams', 'detail', agencyId],
    enabled: !!agencyId,
    queryFn: () => adminAgencyTeamsCall<{
      agency: { agency_id: string; agency_name: string; owner_name: string | null; owner_email: string | null; avatar_url: string | null }
      quota: AdminAgencyQuota
    }>({ action: 'agency_detail', target_agency_id: agencyId }),
  })
}

export function useAdminAgencyLimitOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { agencyId: string; maxMembers?: number | null; reason?: string; clear?: boolean }) =>
      adminAgencyTeamsCall(input.clear
        ? { action: 'limit_override_clear', target_agency_id: input.agencyId }
        : {
            action: 'limit_override_set',
            target_agency_id: input.agencyId,
            max_members: input.maxMembers,
            reason: input.reason ?? null,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-agency-teams'] })
      qc.invalidateQueries({ queryKey: ['team-quota'] })
      qc.invalidateQueries({ queryKey: ['team-audit-log'] })
    },
  })
}