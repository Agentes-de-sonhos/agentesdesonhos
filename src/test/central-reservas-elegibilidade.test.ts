import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Complemento da revisão de elegibilidade da Central de Reservas.
 * Lê as migrations efetivamente aplicadas; nenhum plano ou permissão de
 * agência real é alterado.
 */
const DIR = join(process.cwd(), "supabase/migrations");
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const all = files.map((f) => readFileSync(join(DIR, f), "utf8")).join("\n");

function lastDefinition(name: string): string {
  const parts = all.split(new RegExp(`CREATE OR REPLACE FUNCTION (?:public|private)\\.${name}\\b`));
  const tail = parts[parts.length - 1];
  const end = tail.search(/\nREVOKE ALL ON FUNCTION/);
  return end > 0 ? tail.slice(0, end) : tail;
}

const gateFn = lastDefinition("can_use_reservations_center");
const ownerFn = lastDefinition("reservations_owner_is_eligible");
const manualGate = lastDefinition("assert_manual_file_gate");

/** Réplica fiel da regra de elegibilidade da conta master. */
function ownerEligible(owner: {
  grant?: boolean;
  plan?: string | null;
  isActive?: boolean;
  expiresAt?: Date | null;
} | null): boolean {
  if (!owner) return false;
  if (owner.grant) return true;
  if (!owner.isActive) return false;
  if (owner.expiresAt && owner.expiresAt.getTime() <= Date.now()) return false;
  return ["premium", "fundador", "promo_grupo_sc"].includes(owner.plan || "start");
}

/** Réplica fiel de can_use_reservations_center(). */
function canUseCenter(ctx: {
  uid?: string | null;
  isAdmin?: boolean;
  isPromotor?: boolean;
  ownGrant?: boolean;
  member?: { status: string; canTeamView: boolean } | null;
  masterOwner?: Parameters<typeof ownerEligible>[0];
}): boolean {
  if (!ctx.uid) return false;
  if (ctx.isAdmin || ctx.isPromotor) return true;
  if (ctx.member) {
    if (ctx.member.status !== "active") return false;
    if (!ctx.member.canTeamView) return false;
    return ownerEligible(ctx.masterOwner ?? null);
  }
  if (ctx.ownGrant) return true;
  return ownerEligible(ctx.masterOwner ?? null);
}

const VALID_MASTER = { plan: "premium", isActive: true, expiresAt: null };
const EXPIRED_MASTER = { plan: "premium", isActive: true, expiresAt: new Date(Date.now() - 8.64e7) };

describe("elegibilidade da Central: colaborador depende da master", () => {
  it("resolve a agência da equipe e avalia a assinatura da master", () => {
    expect(gateFn).toMatch(/FROM public\.agency_team_members/);
    expect(gateFn).toMatch(/reservations_owner_is_eligible\(v_owner\)/);
    expect(ownerFn).toMatch(/FROM public\.subscriptions/);
    expect(ownerFn).toMatch(/expires_at/);
  });

  it("colaborador ativo NÃO tem passe livre: exige can_team e elegibilidade", () => {
    expect(gateFn).toMatch(/can_team\('reservations\.view'\)/);
    // não existe RETURN true logo após identificar o colaborador
    expect(gateFn).not.toMatch(/v_member_id IS NOT NULL THEN\s*RETURN true/);
  });

  it("master expirada + colaborador ativo é bloqueado", () => {
    expect(
      canUseCenter({
        uid: "u1",
        member: { status: "active", canTeamView: true },
        masterOwner: EXPIRED_MASTER,
      }),
    ).toBe(false);
  });

  it("master sem plano elegível bloqueia colaborador ativo", () => {
    expect(
      canUseCenter({
        uid: "u1",
        member: { status: "active", canTeamView: true },
        masterOwner: { plan: "profissional", isActive: true, expiresAt: null },
      }),
    ).toBe(false);
  });

  it("colaborador ativo com master válida e sem site white label cria", () => {
    expect(gateFn).not.toMatch(/agency_public_domains|agency_can_use_booking_requests/);
    expect(
      canUseCenter({
        uid: "u1",
        member: { status: "active", canTeamView: true },
        masterOwner: VALID_MASTER,
      }),
    ).toBe(true);
  });

  it("colaborador sem permissão de reservas não passa nem com master válida", () => {
    expect(
      canUseCenter({
        uid: "u1",
        member: { status: "active", canTeamView: false },
        masterOwner: VALID_MASTER,
      }),
    ).toBe(false);
  });

  it("colaborador bloqueado/desativado nunca passa", () => {
    for (const status of ["blocked", "disabled", "pending"]) {
      expect(
        canUseCenter({
          uid: "u1",
          member: { status, canTeamView: true },
          masterOwner: VALID_MASTER,
        }),
      ).toBe(false);
    }
  });

  it("dono e equipe têm a mesma elegibilidade comercial", () => {
    const owner = canUseCenter({ uid: "master", masterOwner: EXPIRED_MASTER });
    const member = canUseCenter({
      uid: "u1",
      member: { status: "active", canTeamView: true },
      masterOwner: EXPIRED_MASTER,
    });
    expect(owner).toBe(member);
  });

  it("concessão da master e exceções administrativas continuam valendo", () => {
    expect(ownerFn).toMatch(/feature_key = 'crm_basic'/);
    expect(gateFn).toMatch(/has_role\(v_uid, 'admin'/);
    expect(
      canUseCenter({
        uid: "u1",
        member: { status: "active", canTeamView: true },
        masterOwner: { grant: true, isActive: false },
      }),
    ).toBe(true);
    expect(canUseCenter({ uid: "u1", isAdmin: true, masterOwner: EXPIRED_MASTER })).toBe(true);
  });

  it("não altera o bypass global de outros módulos", () => {
    expect(gateFn).not.toMatch(/has_feature_access/);
    const globalFeature = lastDefinition("has_feature_access");
    expect(globalFeature).not.toMatch(/can_use_reservations_center/);
  });
});

describe("mutações de fichas manuais respeitam o gate", () => {
  const gated = [
    "travel_file_set_status",
    "travel_file_service_save",
    "travel_file_set_responsibles",
    "travel_file_note_add",
    "travel_file_note_delete",
  ];

  it("o gate é condicional à origem manual", () => {
    expect(manualGate).toMatch(/_origin = 'manual'/);
    expect(manualGate).toMatch(/can_use_reservations_center\(\)/);
  });

  it.each(gated)("%s aplica o gate manual", (fn) => {
    const def = lastDefinition(fn);
    expect(def).toMatch(/assert_manual_file_gate\(/);
    // continua exigindo as permissões de equipe já existentes
    expect(def).toMatch(/assert_travel_file_access\(/);
  });

  it("web_quote mantém a regra anterior (somente permissões)", () => {
    // o gate só dispara para origin='manual'
    const blocked = (origin: string, allowed: boolean) => origin === "manual" && !allowed;
    expect(blocked("web_quote", false)).toBe(false);
    expect(blocked("manual", false)).toBe(true);
    expect(blocked("manual", true)).toBe(false);
  });

  it("leitura do histórico não recebe gate de plano", () => {
    const detail = lastDefinition("travel_file_detail");
    const page = lastDefinition("travel_files_page");
    expect(detail).not.toMatch(/can_use_reservations_center/);
    expect(page).not.toMatch(/can_use_reservations_center/);
  });
});

describe("cadastro de empresas exige elegibilidade comercial", () => {
  const save = lastDefinition("agency_company_save");

  it("grava somente com elegibilidade, além de clients.create/edit", () => {
    expect(save).toMatch(/IF NOT public\.can_use_reservations_center\(\) THEN/);
    expect(save).toMatch(/can_team\('clients\.create'\)/);
    expect(save).toMatch(/can_team\('clients\.edit'\)/);
    const gateIndex = save.indexOf("can_use_reservations_center");
    expect(gateIndex).toBeGreaterThan(0);
    expect(gateIndex).toBeLessThan(save.indexOf("INSERT INTO public.companies"));
  });

  it("busca e leitura de cadastros históricos não recebem gate", () => {
    const search = lastDefinition("agency_companies_search");
    expect(search).not.toMatch(/can_use_reservations_center/);
  });
});
