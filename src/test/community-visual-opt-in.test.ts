import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("Comunidade — ajustes visuais e opt-in por agência", () => {
  it("mantém a busca mobile embutida somente no cabeçalho da Comunidade do dashboard", () => {
    expect(read("src/pages/Dashboard.tsx")).not.toContain("<MobileTopBar");
    const feed = read("src/components/dashboard/CommunitySocialFeed.tsx");
    expect(feed).toContain("<MobileTopBar embedded />");
    expect(feed).toContain("data-dashboard-online-users");
  });

  it("reutiliza launcher, compositor e cabeçalho compartilhados", () => {
    expect(read("src/components/dashboard/CommunitySocialFeed.tsx")).toContain("<CommunityComposerLauncher");
    expect(read("src/components/community/CommunityFeedSection.tsx")).toContain("<CommunityComposerLauncher");
    expect(read("src/components/dashboard/CommunitySocialFeed.tsx")).toContain("<CommunityPostHeader");
    expect(read("src/components/community/PostCard.tsx")).toContain("<CommunityPostHeader");
  });

  it("mantém compositor mobile branco, fullscreen e com ações secundárias agrupadas", () => {
    const dialog = read("src/components/community/PostComposerDialog.tsx");
    const form = read("src/components/community/CreatePostForm.tsx");
    expect(dialog).toContain("h-[100dvh]");
    expect(dialog).toContain("bg-background");
    expect(dialog).toContain('<DialogTitle className="sr-only">');
    expect(form).toContain('aria-label="Mais opções"');
    expect(form).toContain("safe-area-inset-bottom");
  });

  it("desativa a experiência por padrão e protege a rota white-label", () => {
    expect(read("src/contexts/TeamSessionContext.tsx")).toContain("community_experience_enabled: false");
    const gate = read("src/components/whitelabel/admin/AgencyCommunityGate.tsx");
    expect(gate).toContain("!siteLab && !community.community_experience_enabled");
    expect(read("src/components/whitelabel/admin/AgencyAdminSidebar.tsx")).toContain("community.community_experience_enabled");
  });

  it("usa migração aditiva com default false e salvamento isolado", () => {
    const migration = read("drizzle/migrations/0010_agency_community_experience_opt_in.sql");
    expect(migration).toContain("community_experience_enabled boolean NOT NULL DEFAULT false");
    expect(migration).toContain("agency_community_experience_save");
    expect(migration).not.toMatch(/UPDATE\s+public\.agency_community_settings\s+SET\s+community_experience_enabled\s*=\s*true/i);
  });

  it("não adiciona Comunidade ao site público nem ao dashboard de fornecedores", () => {
    expect(read("src/components/whitelabel/AgencySiteLayout.tsx")).not.toContain("Community");
    expect(read("src/components/layout/DashboardLayout.tsx")).toContain("SupplierDashboardLayout");
  });
});
