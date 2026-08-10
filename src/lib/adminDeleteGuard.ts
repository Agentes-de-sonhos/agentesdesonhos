/**
 * Regra de proteção da conta master na exclusão administrativa de usuários.
 *
 * Espelha a validação aplicada no servidor (`admin-delete-user`): a conta
 * principal de uma agência NÃO pode ser excluída enquanto existir qualquer
 * colaborador vinculado ou convite pendente. Não há cascata destrutiva de
 * agência — o administrador precisa remover/revogar a equipe primeiro.
 */

export interface MasterTeamCounts {
  /** Registros em agency_team_members com agency_id = conta master. */
  teamMembers: number;
  /** Convites não aceitos e não revogados da agência. */
  pendingInvites: number;
}

export interface MasterDeletionBlock {
  blocked: boolean;
  code?: "master_has_team";
  message?: string;
}

/** Retorna o bloqueio (409) quando a master ainda tem equipe ou convites. */
export function checkMasterDeletion(counts: MasterTeamCounts): MasterDeletionBlock {
  const members = Math.max(0, counts.teamMembers | 0);
  const invites = Math.max(0, counts.pendingInvites | 0);
  if (members === 0 && invites === 0) return { blocked: false };

  const partes = [
    members > 0 ? `${members} colaborador(es)` : null,
    invites > 0 ? `${invites} convite(s) pendente(s)` : null,
  ].filter(Boolean).join(" e ");

  return {
    blocked: true,
    code: "master_has_team",
    message: `Esta é a conta principal de uma agência com ${partes}. Remova os colaboradores e revogue os convites pendentes em Equipe e Permissões antes de excluir a conta principal.`,
  };
}

/** Extrai a mensagem real do erro de Edge Function (nunca "non-2xx"). */
export async function parseDeleteUserError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.clone === "function") {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      try {
        const text = await ctx.clone().text();
        if (text?.trim()) return text.trim();
      } catch { /* ignore */ }
    }
  }
  const msg = (error as { message?: string })?.message;
  if (msg && !/non-2xx/i.test(msg)) return msg;
  return "Não foi possível excluir este usuário. Tente novamente.";
}
