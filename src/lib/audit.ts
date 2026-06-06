import { supabase } from '@/integrations/supabase/client'

export type AuditAction =
  | 'client.create' | 'client.update' | 'client.delete'
  | 'opportunity.create' | 'opportunity.update' | 'opportunity.delete' | 'opportunity.stage_move'
  | 'operation.create' | 'operation.update' | 'operation.delete' | 'operation.stage_move'
  | 'sale.create' | 'sale.update' | 'sale.delete'
  | 'expense.create' | 'expense.update' | 'expense.delete'
  | 'income.create' | 'income.update' | 'income.delete'
  | 'goal.update'

interface LogPayload {
  action: AuditAction
  entity_type?: string
  entity_id?: string | null
  details?: Record<string, unknown>
}

/**
 * Fire-and-forget. Falha silenciosamente — auditoria nunca bloqueia UX.
 * Edge Function `team-audit` valida sessão e ignora masters (não há team_member_id).
 */
export function logTeamAction(payload: LogPayload): void {
  void (async () => {
    try {
      await supabase.functions.invoke('team-audit', { body: payload })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[audit] falha ao registrar ação', e)
    }
  })()
}