import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { useTeamSession } from '@/contexts/TeamSessionContext'

/**
 * Camada central de permissões.
 * Regra: master (sem registro em agency_team_members) tem acesso total.
 * Team member: avalia agency_team_permissions / agency_team_stage_permissions.
 */

export type PermissionKey =
  | 'dashboard.view'
  | 'clients.view' | 'clients.create' | 'clients.edit' | 'clients.delete'
  | 'opportunities.view' | 'opportunities.create' | 'opportunities.edit' | 'opportunities.delete'
  | 'opportunities.generate_quote' | 'opportunities.generate_wallet'
  | 'operations.view' | 'operations.create' | 'operations.edit' | 'operations.delete'
  | 'goals.view' | 'goals.edit'
  | 'financial.access'

export type StagePipeline = 'opportunities' | 'operations'
export type StageAction = 'view' | 'edit' | 'move'

// ─────────────────────────────────────────────────────────────
// Snapshot global (acessível fora do React, para guards em mutations)
// ─────────────────────────────────────────────────────────────

interface Snapshot {
  isTeamMember: boolean
  permissions: Set<string>
  stagePerms: Map<string, { can_view: boolean; can_edit: boolean; can_move: boolean }>
}

let currentSnapshot: Snapshot = {
  isTeamMember: false,
  permissions: new Set(),
  stagePerms: new Map(),
}

export function updatePermissionsSnapshot(input: {
  isTeamMember: boolean
  permissions: { permission_key: string; enabled: boolean }[]
  stagePermissions: { pipeline_type: string; stage_id: string; can_view: boolean; can_edit: boolean; can_move: boolean }[]
}) {
  const perms = new Set<string>()
  input.permissions.forEach(p => { if (p.enabled) perms.add(p.permission_key) })
  const sm = new Map<string, { can_view: boolean; can_edit: boolean; can_move: boolean }>()
  input.stagePermissions.forEach(s => {
    sm.set(`${s.pipeline_type}:${s.stage_id}`, { can_view: s.can_view, can_edit: s.can_edit, can_move: s.can_move })
  })
  currentSnapshot = { isTeamMember: input.isTeamMember, permissions: perms, stagePerms: sm }
}

/** Guard síncrono fora do React. Master sempre passa. */
export function ensurePermission(key: PermissionKey | string): boolean {
  if (!currentSnapshot.isTeamMember) return true
  return currentSnapshot.permissions.has(key)
}

export function ensureStagePermission(pipeline: StagePipeline, stageId: string, action: StageAction): boolean {
  if (!currentSnapshot.isTeamMember) return true
  const row = currentSnapshot.stagePerms.get(`${pipeline}:${stageId}`)
  if (!row) return false
  if (action === 'view') return row.can_view
  if (action === 'edit') return row.can_edit
  return row.can_move
}

export class PermissionDeniedError extends Error {
  constructor(message = 'Você não possui permissão para executar esta ação.') {
    super(message)
    this.name = 'PermissionDeniedError'
  }
}

export const DENY_MESSAGE = 'Você não possui permissão para executar esta ação.'

/** Dispara toast padronizado e lança erro. */
export function denyAction(): never {
  toast.error(DENY_MESSAGE)
  throw new PermissionDeniedError()
}

/** Hook principal: master bypass + checagens reativas. */
export function usePermissions() {
  const { member, permissions, stagePermissions, loading } = useTeamSession()
  const isTeamMember = !!member
  const isMaster = !loading && !member

  const permsSet = useMemo(() => {
    const s = new Set<string>()
    permissions.forEach(p => { if (p.enabled) s.add(p.permission_key) })
    return s
  }, [permissions])

  const can = useCallback((key: PermissionKey | string | undefined | null): boolean => {
    if (!key) return true
    if (!isTeamMember) return true
    return permsSet.has(key)
  }, [isTeamMember, permsSet])

  const canStage = useCallback((pipeline: StagePipeline, stageId: string, action: StageAction): boolean => {
    if (!isTeamMember) return true
    const row = stagePermissions.find(s => s.pipeline_type === pipeline && s.stage_id === stageId)
    if (!row) return false
    if (action === 'view') return row.can_view
    if (action === 'edit') return row.can_edit
    return row.can_move
  }, [isTeamMember, stagePermissions])

  return { can, canStage, isTeamMember, isMaster, loading }
}

/** Atalho: useCan('clients.edit'). */
export function useCan(key: PermissionKey | string): boolean {
  const { can } = usePermissions()
  return can(key)
}