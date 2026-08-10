/**
 * Consolidação da lista do painel "Gerenciar Usuários".
 *
 * Regras de negócio:
 * - Colaboradores de equipe têm um auth user técnico com e-mail sintético
 *   (`@team.agentesdesonhos.local`). No painel eles devem aparecer com o e-mail
 *   real do cadastro de equipe (login/email/notification_email).
 * - O plano exibido para colaboradores é o plano efetivo da conta master
 *   ("herdado"), sem alterar a assinatura comercial individual.
 * - Convites pendentes aparecem como linhas próprias, sem auth user.
 * - Registros de equipe ativos cujo auth user não existe mais são órfãos e não
 *   podem ser tratados como usuários ativos.
 */

export type AdminAccountKind = "master" | "member" | "invite";

export interface TeamOverviewMember {
  member_id: string;
  auth_user_id: string | null;
  auth_exists: boolean;
  agency_id: string;
  full_name: string | null;
  real_email: string | null;
  status: string;
  department?: string | null;
  role_title?: string | null;
  created_at?: string | null;
  access_profile_name?: string | null;
  master_name?: string | null;
  master_agency_name?: string | null;
  effective_plan?: string | null;
}

export interface TeamOverviewInvite {
  invite_id: string;
  agency_id: string;
  email: string;
  full_name: string | null;
  role_title?: string | null;
  department?: string | null;
  expires_at?: string | null;
  sent_count?: number | null;
  last_sent_at?: string | null;
  created_at?: string | null;
  access_profile_name?: string | null;
  master_name?: string | null;
  master_agency_name?: string | null;
  effective_plan?: string | null;
}

export interface TeamOverview {
  members: TeamOverviewMember[];
  invites: TeamOverviewInvite[];
}

export const SYNTHETIC_EMAIL_DOMAIN = "@team.agentesdesonhos.local";

export const isSyntheticTeamEmail = (email?: string | null) =>
  !!email && email.toLowerCase().endsWith(SYNTHETIC_EMAIL_DOMAIN);

export interface BaseAccountRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  plan: string;
  is_active: boolean;
  [key: string]: unknown;
}

export interface AdminAccountRow extends BaseAccountRow {
  kind: AdminAccountKind;
  /** Registro de equipe de origem (colaborador) ou convite. */
  team_member_id?: string | null;
  invite_id?: string | null;
  agency_id?: string | null;
  access_profile_name?: string | null;
  master_name?: string | null;
  plan_inherited: boolean;
  team_status?: string | null;
  is_orphan: boolean;
}

/** Índice dos colaboradores por auth_user_id. */
export function indexMembersByAuthUser(members: TeamOverviewMember[]): Map<string, TeamOverviewMember> {
  const map = new Map<string, TeamOverviewMember>();
  for (const m of members) if (m.auth_user_id) map.set(m.auth_user_id, m);
  return map;
}

/** Colaborador ativo cujo auth user não existe mais. */
export const isOrphanMember = (m: TeamOverviewMember) => m.status !== "pending" && !m.auth_exists;

/**
 * Combina os perfis da plataforma com o overview de equipe e os convites
 * pendentes, sem duplicidade (um convite já aceito nunca vira linha própria
 * porque o overview só devolve convites em aberto).
 */
export function buildAdminAccountRows(
  profiles: BaseAccountRow[],
  overview: TeamOverview | null | undefined,
): AdminAccountRow[] {
  const members = overview?.members ?? [];
  const invites = overview?.invites ?? [];
  const byAuth = indexMembersByAuthUser(members);

  const rows: AdminAccountRow[] = profiles.map((p) => {
    const member = byAuth.get(p.user_id);
    if (!member) {
      return { ...p, kind: "master", plan_inherited: false, is_orphan: false };
    }
    const orphan = isOrphanMember(member);
    return {
      ...p,
      kind: "member",
      name: member.full_name || p.name,
      email: member.real_email || (isSyntheticTeamEmail(p.email) ? "" : p.email),
      plan: member.effective_plan || p.plan,
      plan_inherited: true,
      is_active: !orphan && member.status === "active",
      team_member_id: member.member_id,
      agency_id: member.agency_id,
      access_profile_name: member.access_profile_name ?? null,
      master_name: member.master_name ?? member.master_agency_name ?? null,
      team_status: member.status,
      is_orphan: orphan,
    };
  });

  // Colaboradores sem perfil (ex.: perfil apagado / registro órfão) também
  // precisam aparecer para que o administrador possa corrigir.
  const seenAuth = new Set(profiles.map((p) => p.user_id));
  for (const member of members) {
    if (member.auth_user_id && seenAuth.has(member.auth_user_id)) continue;
    const orphan = isOrphanMember(member);
    rows.push({
      id: `member:${member.member_id}`,
      user_id: member.auth_user_id ?? "",
      name: member.full_name || member.real_email || "Colaborador",
      email: member.real_email || "",
      plan: member.effective_plan || "start",
      is_active: !orphan && member.status === "active",
      kind: "member",
      plan_inherited: true,
      team_member_id: member.member_id,
      agency_id: member.agency_id,
      access_profile_name: member.access_profile_name ?? null,
      master_name: member.master_name ?? member.master_agency_name ?? null,
      team_status: member.status,
      is_orphan: orphan,
      agency_name: member.master_agency_name ?? null,
      created_at: member.created_at ?? null,
      phone: null,
      role: "agente",
      monthly_paid: false,
    });
  }

  for (const invite of invites) {
    rows.push({
      id: `invite:${invite.invite_id}`,
      user_id: "",
      name: invite.full_name || invite.email,
      email: invite.email,
      plan: invite.effective_plan || "start",
      is_active: false,
      kind: "invite",
      plan_inherited: true,
      invite_id: invite.invite_id,
      agency_id: invite.agency_id,
      access_profile_name: invite.access_profile_name ?? null,
      master_name: invite.master_name ?? invite.master_agency_name ?? null,
      is_orphan: false,
      agency_name: invite.master_agency_name ?? null,
      created_at: invite.created_at ?? null,
      phone: null,
      role: "agente",
      monthly_paid: false,
    });
  }

  return rows;
}

/** Ações administrativas permitidas por tipo de registro. */
export function allowedActions(row: Pick<AdminAccountRow, "kind" | "is_orphan">) {
  if (row.kind === "invite") {
    return { impersonate: false, resetPassword: false, forceLogout: false, changePlan: false, toggleRole: false, delete: false, togglePayment: false, toggleActive: false };
  }
  if (row.kind === "member") {
    return {
      impersonate: !row.is_orphan, resetPassword: false, forceLogout: !row.is_orphan,
      changePlan: false, toggleRole: false, delete: true, togglePayment: false, toggleActive: false,
    };
  }
  return { impersonate: true, resetPassword: true, forceLogout: true, changePlan: true, toggleRole: true, delete: true, togglePayment: true, toggleActive: true };
}
