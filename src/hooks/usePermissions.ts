import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { useTeamSession, type CommunityFlags } from '@/contexts/TeamSessionContext'
import type { DataScope } from '@/lib/teamPermissions'

/**
 * Camada central de permissões.
 * Regra: proprietário/master (sem registro em agency_team_members) tem acesso total,
 * exceto pelas travas de comunidade/chat definidas pela própria agência.
 * Colaborador: avalia agency_team_permissions, agency_team_scopes e
 * agency_team_stage_permissions.
 *
 * IMPORTANTE: estas checagens são de interface. A autoridade final é o RLS
 * e a validação de servidor nas Edge Functions/RPCs.
 */

export type PermissionKey = string

export type StagePipeline = 'opportunities' | 'operations'
export type StageAction = 'view' | 'edit' | 'move'

const DEFAULT_COMMUNITY: CommunityFlags = {
  public_community_enabled: true,
  internal_community_enabled: true,
  online_users_enabled: true,
  internal_chat_enabled: true,
  external_chat_enabled: true,
}

// ─────────────────────────────────────────────────────────────
// Snapshot global (acessível fora do React, para guards em mutations)
// ─────────────────────────────────────────────────────────────

interface Snapshot {
  isTeamMember: boolean
  permissions: Set<string>
  stagePerms: Map<string, { can_view: boolean; can_edit: boolean; can_move: boolean }>
  scopes: Record<string, DataScope>
  community: CommunityFlags
}

let currentSnapshot: Snapshot = {
  isTeamMember: false,
  permissions: new Set(),
  stagePerms: new Map(),
  scopes: {},
  community: DEFAULT_COMMUNITY,
}

export function updatePermissionsSnapshot(input: {
  isTeamMember: boolean
  permissions: { permission_key: string; enabled: boolean }[]
  stagePermissions: { pipeline_type: string; stage_id: string; can_view: boolean; can_edit: boolean; can_move: boolean }[]
  scopes?: Record<string, DataScope>
  community?: CommunityFlags
}) {
  const perms = new Set<string>()
  input.permissions.forEach(p => { if (p.enabled) perms.add(p.permission_key) })
  const sm = new Map<string, { can_view: boolean; can_edit: boolean; can_move: boolean }>()
  input.stagePermissions.forEach(s => {
    sm.set(`${s.pipeline_type}:${s.stage_id}`, { can_view: s.can_view, can_edit: s.can_edit, can_move: s.can_move })
  })
  currentSnapshot = {
    isTeamMember: input.isTeamMember,
    permissions: perms,
    stagePerms: sm,
    scopes: input.scopes ?? {},
    community: { ...DEFAULT_COMMUNITY, ...(input.community ?? {}) },
  }
}

/** Guard síncrono fora do React. Proprietário sempre passa. */
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

/** Escopo de dados vigente fora do React. */
export function currentScopeFor(module: string): DataScope {
  if (!currentSnapshot.isTeamMember) return 'agency'
  return currentSnapshot.scopes[module] ?? 'own'
}

export function currentCommunityFlags(): CommunityFlags {
  return currentSnapshot.community
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

/** Hook principal: bypass do proprietário + checagens reativas. */
export function usePermissions() {
  const { member, permissions, stagePermissions, scopes, community, loading, accessProfile } = useTeamSession()
  const isTeamMember = !!member
  const isMaster = !loading && !member

  const permsSet = useMemo(() => {
    const s = new Set<string>()
    permissions.forEach(p => { if (p.enabled) s.add(p.permission_key) })
    return s
  }, [permissions])

  const can = useCallback((key: PermissionKey | string | undefined | null): boolean => {
    if (!key) return true
    // Travas de comunidade/chat valem também para o proprietário.
    if (key === 'community.public.view' && !community.public_community_enabled) return false
    if (key === 'community.internal.view' && !community.internal_community_enabled) return false
    if (key === 'online_users.view' && !community.online_users_enabled) return false
    if (key === 'chat.internal' && !community.internal_chat_enabled) return false
    if (key === 'chat.external' && !community.external_chat_enabled) return false
    if (!isTeamMember) return true
    return permsSet.has(key)
  }, [isTeamMember, permsSet, community])

  /** Verdadeiro se o colaborador tem pelo menos uma permissão do módulo. */
  const canModule = useCallback((module: string): boolean => {
    if (!isTeamMember) return true
    return permissions.some(p => p.module_key === module && p.enabled)
  }, [isTeamMember, permissions])

  const scopeFor = useCallback((module: string): DataScope => {
    if (!isTeamMember) return 'agency'
    return scopes[module] ?? 'own'
  }, [isTeamMember, scopes])

  const canStage = useCallback((pipeline: StagePipeline, stageId: string, action: StageAction): boolean => {
    if (!isTeamMember) return true
    const row = stagePermissions.find(s => s.pipeline_type === pipeline && s.stage_id === stageId)
    if (!row) return false
    if (action === 'view') return row.can_view
    if (action === 'edit') return row.can_edit
    return row.can_move
  }, [isTeamMember, stagePermissions])

  return { can, canModule, canStage, scopeFor, community, accessProfile, isTeamMember, isMaster, loading }
}

/** Atalho: useCan('clients.edit'). */
export function useCan(key: PermissionKey | string): boolean {
  const { can } = usePermissions()
  return can(key)
}
