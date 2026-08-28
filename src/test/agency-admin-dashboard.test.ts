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

  it("trata a alteração de valores da reserva como permissão sensível", () => {
    expect(permissions).toContain("reservations.financial.manage");
    expect(permissions).toMatch(/reservations\.financial\.manage[^\]]*true/);
  });
});

describe("dashboard operacional white label", () => {
  it("usa uma única função segura no servidor", () => {
    expect(hook).toContain('rpc("get_agency_admin_dashboard"');
    expect(hook).toContain("_time_zone");
  });

  it("exibe somente os três indicadores operacionais pedidos", () => {
    expect(home).toContain("Novas oportunidades");
    expect(home).toContain("Oportunidades abertas");
    expect(home).toContain("Operações ativas");
    expect(home).not.toContain("Viagens em 30 dias");
    expect(home).not.toContain("Precisa da sua atenção");
  });

  it("mantém a ordem final das seções", () => {
    const order = [
      "Meu dia",
      "Próximos dias",
      "Próximas viagens",
      "Resumo financeiro do mês",
      "Continue de onde parou",
    ].map((t) => home.indexOf(t));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("reutiliza as regras do financeiro para o resumo do mês", () => {
    expect(home).toContain("computeMonthIncomeSummary");
    expect(home).toContain("Em atraso");
    expect(read("src/components/financial/SmartDashboard.tsx")).toContain(
      "computeMonthIncomeSummary",
    );
  });

  it("pagina os blocos internamente em vez de rolar", () => {
    expect(home).toContain("Pager");
    expect(home).toContain("tripsPerPage");
  });

  it("respeita as permissões devolvidas pelo servidor", () => {
    expect(home).toContain("can?.agenda");
    expect(home).toContain("can.quotes_create");
    expect(home).toContain("can?.operations_create");
  });

  it("abre os fluxos reais de criação sem sair do painel", () => {
    expect(home).toContain("QuickAddClientDialog");
    expect(home).toContain("CreateOperationDialog");
  });

  it("oferece nova tentativa quando o resumo falha", () => {
    expect(home).toContain("isError");
    expect(home).toContain("Tentar novamente");
  });

  it("mantém Comunidade, Academy, Notícias e gamificação fora do painel", () => {
    for (const term of ["/comunidade", "/academy", "/noticias", "gamification"]) {
      expect(home.toLowerCase().includes(term)).toBe(false);
    }
  });

  it("navega sempre pelos caminhos contextuais do painel", () => {
    expect(home).toContain("useAdminNav");
    expect(home).not.toMatch(/to="\/gestao\//);
  });

  it("abre ou ativa abas internas do workspace", () => {
    expect(home).toContain("openOrActivateTab");
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
    expect(reservas).toMatch(/setTimeout\(\(\) => patch\(\{ q:/);
    expect(reservas).toContain("300");
  });

  it("guarda busca, filtros, ordenação e página na URL", () => {
    expect(reservas).toContain("useSearchParams");
    for (const key of ['params.get("q")', 'params.get("status")', 'params.get("sort")', 'params.get("page")', 'params.get("unread")']) {
      expect(reservas).toContain(key);
    }
  });

  it("permite ordenar e filtrar somente não lidas", () => {
    expect(reservas).toContain("TRAVEL_FILES_SORTS");
    expect(reservas).toContain("unreadOnly");
  });

  it("oferece nova tentativa quando a lista falha", () => {
    expect(reservas).toContain("Não foi possível carregar as reservas");
    expect(reservas).toContain("refetch()");
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

  it("ver valores não autoriza alterar valores", () => {
    expect(processo).toContain('can("reservations.financial.manage")');
    expect(processo).toContain("readOnly={!canFinancialManage}");
  });
});
