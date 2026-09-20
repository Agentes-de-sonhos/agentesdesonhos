import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  COMMUNITY_REPORT_REASONS,
  COMMUNITY_REPORT_STATUS_LABELS,
  MAX_REPORT_DETAILS,
  canTransitionReport,
  filterHiddenPosts,
  isActiveReportStatus,
  isAllowedReportReason,
  reportReasonLabel,
  reportStatusMessage,
  sanitizeReportDetails,
} from "@/lib/communityReports";

const read = (path: string) => readFileSync(path, "utf8");

const migration = read("drizzle/migrations/0009_community_phase4_reports_hidden_posts.sql");
const hiddenHook = read("src/hooks/useCommunityHiddenPosts.ts");
const reportsHook = read("src/hooks/useCommunityReports.ts");
const reportDialog = read("src/components/community/ReportContentDialog.tsx");
const hideButton = read("src/components/community/HidePostButton.tsx");
const postCard = read("src/components/community/PostCard.tsx");
const comments = read("src/components/community/PostCommentsSection.tsx");
const dashboardFeed = read("src/components/dashboard/CommunitySocialFeed.tsx");
const feedHook = read("src/hooks/useCommunityFeed.ts");
const search = read("src/components/community/CommunitySearchOverlay.tsx");
const myReports = read("src/pages/MinhasDenuncias.tsx");
const adminReports = read("src/components/admin/AdminCommunityReportsManager.tsx");
const adminCommunity = read("src/components/admin/AdminCommunityManager.tsx");
const app = read("src/App.tsx");
const agencyAdminArea = read("src/components/whitelabel/admin/AgencyAdminArea.tsx");

describe("motivos de denúncia", () => {
  it("expõe exatamente os 14 motivos em português", () => {
    expect(COMMUNITY_REPORT_REASONS).toHaveLength(14);
    expect(COMMUNITY_REPORT_REASONS.map((item) => item.label)).toEqual([
      "Assédio",
      "Fraude",
      "Spam",
      "Desinformação",
      "Discurso de ódio",
      "Ameaça",
      "Automutilação",
      "Conteúdo explícito",
      "Organizações perigosas ou extremistas",
      "Conteúdo sexual",
      "Conta falsa",
      "Exploração infantil",
      "Produtos e serviços restritos",
      "Imagens íntimas sem consentimento",
    ]);
  });

  it("aceita somente motivos permitidos e rotula desconhecidos", () => {
    expect(isAllowedReportReason("spam")).toBe(true);
    expect(isAllowedReportReason("qualquer_coisa")).toBe(false);
    expect(reportReasonLabel("spam")).toBe("Spam");
    expect(reportReasonLabel("qualquer_coisa")).toBe("Outro motivo");
  });

  it("valida os mesmos motivos no banco", () => {
    for (const item of COMMUNITY_REPORT_REASONS) {
      expect(migration).toContain(`'${item.value}'`);
    }
  });
});

describe("detalhes opcionais", () => {
  it("limpa marcação, espaços e respeita o limite", () => {
    expect(sanitizeReportDetails("  <b>abuso</b>   grave ")).toBe("abuso grave");
    expect(sanitizeReportDetails("   ")).toBeNull();
    expect(sanitizeReportDetails("a".repeat(MAX_REPORT_DETAILS + 50))?.length).toBe(
      MAX_REPORT_DETAILS,
    );
  });

  it("aplica o mesmo limite no banco", () => {
    expect(migration).toContain(String(MAX_REPORT_DETAILS));
  });
});

describe("estados e transições administrativas", () => {
  it("nomeia os quatro estados mínimos", () => {
    expect(Object.keys(COMMUNITY_REPORT_STATUS_LABELS)).toEqual([
      "pending",
      "in_review",
      "resolved_action",
      "closed_no_action",
    ]);
  });

  it("considera ativas somente pendente e em análise", () => {
    expect(isActiveReportStatus("pending")).toBe(true);
    expect(isActiveReportStatus("in_review")).toBe(true);
    expect(isActiveReportStatus("resolved_action")).toBe(false);
    expect(isActiveReportStatus("closed_no_action")).toBe(false);
  });

  it("permite apenas transições válidas", () => {
    expect(canTransitionReport("pending", "in_review")).toBe(true);
    expect(canTransitionReport("pending", "resolved_action")).toBe(true);
    expect(canTransitionReport("in_review", "closed_no_action")).toBe(true);
    expect(canTransitionReport("pending", "pending")).toBe(false);
    expect(canTransitionReport("in_review", "pending")).toBe(false);
    expect(canTransitionReport("resolved_action", "in_review")).toBe(false);
    expect(canTransitionReport("closed_no_action", "resolved_action")).toBe(false);
  });

  it("endurece as mesmas regras no banco", () => {
    expect(migration).toContain("enforce_community_report_update");
    expect(migration).toMatch(/reporter_id|target_kind/);
    expect(migration).toContain("review_started_at");
    expect(migration).toContain("closed_at");
  });
});

describe("ocultar publicação", () => {
  it("remove os ids ocultos sem alterar o restante da lista", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(filterHiddenPosts(items, [])).toEqual(items);
    expect(filterHiddenPosts(items, ["b"]).map((item) => item.id)).toEqual(["a", "c"]);
  });

  it("persiste por usuário e oferece desfazer", () => {
    expect(hiddenHook).toContain("community_hidden_posts");
    expect(hiddenHook).toContain("Desfazer");
    expect(hiddenHook).toContain("unhidePost");
  });

  it("não permite ocultar a própria publicação", () => {
    expect(hideButton).toContain("currentUserId");
    expect(hideButton).toMatch(/authorId/);
    expect(migration).toContain("community_hidden_posts");
  });

  it("filtra as ocultas no servidor, no feed e na busca, sem buracos", () => {
    expect(feedHook).toContain("hiddenIds");
    expect(feedHook).toContain('.not("id", "in"');
    expect(search).toContain("hiddenIds");
  });
});

describe("integração nos dois feeds", () => {
  it("usa o X de ocultar e a denúncia na Comunidade e no dashboard", () => {
    for (const source of [postCard, dashboardFeed]) {
      expect(source).toContain("HidePostButton");
      expect(source).toContain("ReportContentDialog");
      expect(source).toContain("ConnectMenuItem");
      expect(source).toContain("Denunciar publicação");
    }
  });

  it("oferece seguir/parar de seguir e denunciar em comentários de outros", () => {
    expect(comments).toContain("PostFollowMenuItem");
    expect(comments).toContain("Denunciar comentário");
    expect(comments).toContain('targetKind="comment"');
  });

  it("mantém o fluxo de denúncia em três etapas com confirmação do motivo", () => {
    expect(reportDialog).toContain("Você selecionou o seguinte motivo");
    expect(reportDialog).toContain("Quero receber atualizações");
  });
});

describe("segurança das denúncias", () => {
  it("garante um único alvo por registro e unicidade da denúncia ativa", () => {
    expect(migration).toContain("community_reports");
    expect(migration).toMatch(/target_kind/);
    expect(migration).toMatch(/unique/i);
    expect(migration).toContain("in_review");
  });

  it("aplica RLS: criação própria, leitura própria e fila só para admin", () => {
    expect(migration).toContain("enable row level security");
    expect(migration.toLowerCase()).toContain("has_role");
    expect(migration).toContain("can_view_community_post");
  });

  it("trata duplicata ativa como erro amigável no envio", () => {
    expect(reportsHook).toContain("23505");
  });

  it("nunca remove conteúdo automaticamente", () => {
    expect(reportsHook).toContain("removeContent");
    expect(adminReports).toContain("Remover conteúdo");
    expect(adminReports).toContain("Resolver mantendo conteúdo");
  });
});

describe("notificações e acompanhamento", () => {
  it("notifica somente quem pediu atualizações, sem duplicar", () => {
    expect(migration).toContain("wants_updates");
    expect(migration).toContain("report_status");
    expect(migration.toLowerCase()).toContain("on conflict do nothing");
  });

  it("mostra apenas o status, sem notas internas nem moderadores", () => {
    expect(reportStatusMessage("in_review")).toBe("Sua denúncia entrou em análise.");
    expect(reportStatusMessage("resolved_action")).toBe("Sua denúncia foi concluída com ação.");
    expect(reportStatusMessage("closed_no_action")).toBe("Sua denúncia foi encerrada sem ação.");
    expect(reportStatusMessage("pending")).toBe("Sua denúncia foi registrada.");
  });

  it("disponibiliza a área Minhas denúncias com motivo, tipo, data e status", () => {
    expect(myReports).toContain("useMyCommunityReports");
    expect(myReports).toContain("Minhas denúncias");
    expect(app).toContain("/comunidade/minhas-denuncias");
  });
});

describe("central administrativa", () => {
  it("adiciona a aba Denúncias com filtros e observações internas", () => {
    expect(adminCommunity).toContain("AdminCommunityReportsManager");
    expect(adminCommunity).toContain("Denúncias");
    expect(adminReports).toContain("Motivo");
    expect(adminReports).toContain("Observações internas");
    expect(adminReports).toContain("Iniciar análise");
    expect(adminReports).toContain("Encerrar sem ação");
  });

  it("confirma toda ação administrativa", () => {
    expect(adminReports).toContain("AlertDialog");
    expect(adminReports).toContain("Confirmar");
  });
});

describe("isolamento dos white-labels", () => {
  it("não expõe denúncias da Comunidade na administração das agências", () => {
    expect(agencyAdminArea).not.toContain("community_reports");
    expect(agencyAdminArea).not.toContain("AdminCommunityReportsManager");
  });
});
