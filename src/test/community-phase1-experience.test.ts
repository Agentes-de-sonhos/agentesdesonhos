import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isPostTextClamped, POST_TEXT_CLAMP_CHARS } from "@/components/community/PostTextContent";
import { POST_GRID_MAX_VISIBLE } from "@/components/community/PostMediaGrid";

const read = (path: string) => readFileSync(path, "utf8");

const textContent = read("src/components/community/PostTextContent.tsx");
const mediaGrid = read("src/components/community/PostMediaGrid.tsx");
const lightbox = read("src/components/community/PostLightbox.tsx");
const dashboardFeed = read("src/components/dashboard/CommunitySocialFeed.tsx");
const fullPageCard = read("src/components/community/PostCard.tsx");
const bottomNav = read("src/components/layout/MobileBottomNav.tsx");
const topBar = read("src/components/layout/MobileTopBar.tsx");
const dashboardLayout = read("src/components/layout/DashboardLayout.tsx");
const agencyAdminArea = read("src/components/whitelabel/admin/AgencyAdminArea.tsx");

describe("truncamento e expansão do texto da publicação", () => {
  it("não trunca textos curtos", () => {
    expect(isPostTextClamped("Bom dia, pessoal!")).toBe(false);
    expect(isPostTextClamped("")).toBe(false);
  });

  it("trunca textos longos ou com mais de 3 linhas", () => {
    expect(isPostTextClamped("a".repeat(POST_TEXT_CLAMP_CHARS + 1))).toBe(true);
    expect(isPostTextClamped("l1\nl2\nl3\nl4")).toBe(true);
  });

  it("aplica line-clamp-3 e oferece ação mais/menos", () => {
    expect(textContent).toContain("line-clamp-3");
    expect(textContent).toContain("mais");
    expect(textContent).toContain("menos");
    expect(textContent).toContain("aria-expanded");
  });
});

describe("grade de fotos das publicações", () => {
  it("mostra no máximo quatro fotos com overlay +N", () => {
    expect(POST_GRID_MAX_VISIBLE).toBe(4);
    expect(mediaGrid).toContain("data-post-media-overlay");
    expect(mediaGrid).toContain("+{remaining}");
  });

  it("tem layouts distintos para 1, 2, 3 e 4 fotos", () => {
    expect(mediaGrid).toContain('data-post-media-grid="1"');
    expect(mediaGrid).toContain('data-post-media-grid="2"');
    expect(mediaGrid).toContain('data-post-media-grid="3"');
    expect(mediaGrid).toContain("grid-cols-2");
    expect(mediaGrid).toContain("col-span-2 row-span-2");
    expect(mediaGrid).toContain("object-contain");
  });
});

describe("galeria em tela cheia", () => {
  it("navega por gesto, setas, teclado e mostra indicador", () => {
    expect(lightbox).toContain("onTouchStart");
    expect(lightbox).toContain("onTouchEnd");
    expect(lightbox).toContain('aria-label="Imagem anterior"');
    expect(lightbox).toContain('aria-label="Próxima imagem"');
    expect(lightbox).toContain('event.key === "Escape"');
    expect(lightbox).toContain('event.key === "ArrowRight"');
    expect(lightbox).toContain("data-post-lightbox-indicator");
    expect(lightbox).toContain('aria-label="Fechar galeria"');
  });

  it("usa fundo escuro, object-contain e fica acima da barra inferior", () => {
    expect(lightbox).toContain("bg-foreground/95");
    expect(lightbox).toContain("object-contain");
    expect(lightbox).toContain("z-[120]");
  });
});

describe("cards compartilhados entre dashboard e página completa", () => {
  it("os dois contextos usam a mesma grade, texto e galeria", () => {
    for (const source of [dashboardFeed, fullPageCard]) {
      expect(source).toContain("PostMediaGrid");
      expect(source).toContain("PostLightbox");
      expect(source).toContain("PostTextContent");
    }
  });

  it("exibe contadores de curtidas e comentários", () => {
    for (const source of [dashboardFeed, fullPageCard]) {
      expect(source).toContain("data-post-counters");
      expect(source).toContain("curtidas");
      expect(source).toContain("comentários");
    }
  });

  it("preserva curtir, comentar e feed infinito no dashboard", () => {
    expect(dashboardFeed).toContain("toggleLike");
    expect(dashboardFeed).toContain("fetchNextPage");
    expect(dashboardFeed).toContain("IntersectionObserver");
    expect(dashboardFeed).toContain("Carregar mais");
  });
});

describe("navegação mobile do Agentes de Sonhos", () => {
  it("tem exatamente cinco itens na ordem definida", () => {
    const labels = [...bottomNav.matchAll(/label: "([^"]+)" \}/g)].map((m) => m[1]);
    expect(labels.slice(0, 5)).toEqual(["Início", "Minha Rede", "Publicação", "Gestão", "Menu"]);
  });

  it("Gestão abre atalhos de Clientes, Oportunidades e Operações", () => {
    expect(bottomNav).toContain("/gestao-clientes/clientes");
    expect(bottomNav).toContain("/gestao-clientes/funil");
    expect(bottomNav).toContain("/gestao-clientes/operacoes");
    expect(bottomNav).toContain("canAccessRoute(item.path, can)");
  });

  it("Publicação reutiliza o compositor existente e Menu abre a gaveta atual", () => {
    expect(bottomNav).toContain("PostComposerDialog");
    expect(bottomNav).toContain("MobileDrawerMenu");
    expect(bottomNav).toContain("env(safe-area-inset-bottom");
  });

  it("é usada apenas pelo layout do Agentes de Sonhos", () => {
    expect(dashboardLayout).toContain("<MobileBottomNav />");
    expect(agencyAdminArea).not.toContain("MobileBottomNav");
    expect(agencyAdminArea).not.toContain("MobileTopBar");
  });
});

describe("cabeçalho mobile", () => {
  it("tem avatar, pesquisa e chat, somente no mobile", () => {
    expect(topBar).toContain('aria-label="Abrir meu perfil"');
    expect(topBar).toContain('aria-label="Pesquisar na comunidade"');
    expect(topBar).toContain('aria-label="Abrir chat"');
    expect(topBar).toContain("lg:hidden");
    expect(topBar).toContain("community-chat:open");
  });
});
