import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Garantias da Etapa 4: dashboard operacional e Central de Reservas com
 * agregação/paginação no servidor e respeito às permissões da equipe.
 */

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

const home = read("src/pages/whitelabel/admin/AgencyAdminHome.tsx");
const hook = read("src/hooks/useAgencyAdminDashboard.ts");
const reservas = read("src/components/reservas/ReservasTab.tsx");
const processo = read("src/pages/ProcessoReserva.tsx");
const permissions = read("src/lib/teamPermissions.ts");

describe("catálogo de permissões", () => {
  it("inclui as chaves da Central de Reservas", () => {
    expect(permissions).toContain("reservations.view");
    expect(permissions).toContain("reservations.manage");
    expect(permissions).toContain("reservations.assign");
  });
});

describe("dashboard operacional white label", () => {
  it("usa uma única função segura no servidor", () => {
    expect(hook).toContain('rpc("get_agency_admin_dashboard"');
    expect(hook).toContain("_time_zone");
  });

  it("não exibe valores financeiros na home", () => {
    expect(home).not.toMatch(/style:\s*"currency"/);
    expect(home).not.toContain("requested_amount");
    expect(home).not.toContain("final_sale_amount");
  });

  it("respeita as permissões devolvidas pelo servidor", () => {
    expect(home).toContain("can?.reservations");
    expect(home).toContain("can?.agenda");
    expect(home).toContain("can.quotes_create");
  });

  it("mantém Comunidade, Academy, Notícias e gamificação fora do painel", () => {
    for (const term of ["Comunidade", "Academy", "Notícias", "gamifica"]) {
      expect(home.includes(term)).toBe(false);
    }
  });

  it("navega sempre pelos caminhos contextuais do painel", () => {
    expect(home).toContain("useAdminNav");
    expect(home).not.toMatch(/to="\/gestao\//);
  });
});

describe("Central de Reservas", () => {
  it("consulta busca, filtros, período, responsável, página e ordenação no servidor", () => {
    expect(reservas).toContain("useTravelFilesPage");
    for (const key of ["search:", "statuses", "from:", "to:", "responsibleTeamMemberId", "page,", "pageSize"]) {
      expect(reservas).toContain(key);
    }
    expect(reservas).not.toContain("filterTravelFiles");
  });

  it("oculta valores sem permissão financeira", () => {
    expect(reservas).toContain("can.revenue");
  });

  it("aplica debounce na busca do servidor", () => {
    expect(reservas).toContain("setDebouncedSearch");
  });
});

describe("Processo de reserva", () => {
  it("grava apenas por funções seguras do servidor", () => {
    expect(processo).toContain("setStatus.mutateAsync");
    expect(processo).toContain("setResponsibles.mutateAsync");
    expect(processo).toContain("saveService.mutateAsync");
    expect(processo).not.toContain("updateFile.mutateAsync");
  });

  it("exige motivo para cancelar o processo", () => {
    expect(processo).toContain("Informe o motivo do cancelamento.");
    expect(processo).toContain("Motivo do cancelamento (obrigatório)");
  });

  it("separa as permissões de gestão, atribuição e finanças", () => {
    expect(processo).toContain('can("reservations.manage")');
    expect(processo).toContain('can("reservations.assign")');
    expect(processo).toContain('can("financial.view_revenue")');
    expect(processo).toContain('can("financial.commissions.view")');
  });
});
