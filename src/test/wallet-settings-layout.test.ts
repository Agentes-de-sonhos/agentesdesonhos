import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const wallet = readFileSync("src/pages/TripWallet.tsx", "utf8");
const modal = readFileSync("src/components/wallet/WalletSettingsModal.tsx", "utf8");
const initial = readFileSync("src/components/wallet/WalletInitialSettings.tsx", "utf8");
const access = readFileSync("src/components/wallet/WalletAccessSettings.tsx", "utf8");
const itinerary = readFileSync("src/components/wallet/TripItineraryV2.tsx", "utf8");

describe("editor compacto da Carteira Digital", () => {
  it("abre carteiras existentes com os blocos recolhidos e somente três blocos principais", () => {
    expect(wallet).toContain("useState({ add: false, services: false })");
    expect(wallet).toContain('title="Adicionar serviços"');
    expect(wallet).toContain('title="Organizar serviços"');
    expect(wallet).toContain('title="Configurar carteira digital"');
    expect(wallet).not.toContain('<AccordionItem value="summary"');
    expect(wallet).not.toContain('<AccordionItem value="access"');
    expect(wallet).not.toContain('<AccordionItem value="signature"');
  });

  it("preserva todas as operações da lista de serviços", () => {
    for (const handler of ["onDeleteService", "onEditService", "onReplaceVoucher", "onRemoveVoucher", "onAddAttachment", "onRemoveAttachment", "onUploadServiceImage", "onRemoveServiceImage", "onReorder"]) {
      expect(wallet).toContain(handler);
    }
  });

  it("mostra as quatro etapas gerais sem criar publicação automática", () => {
    expect(wallet).toContain('short: "Adicionar serviços"');
    expect(wallet).toContain('short: "Organizar serviços"');
    expect(wallet).toContain('short: "Configurar carteira"');
    expect(wallet).toContain('short: "Publicar"');
    expect(wallet).toContain("O link público atual está disponível para compartilhamento.");
  });
});

describe("modal de configurações da Carteira Digital", () => {
  it("tem quatro passos, navegação responsiva e conteúdo rolável", () => {
    for (const step of ['key: "initial"', 'key: "access"', 'key: "itinerary"', 'key: "advanced"']) expect(modal).toContain(step);
    expect(modal).toContain("w-[96vw] max-w-5xl");
    expect(modal).toContain("overflow-x-hidden overflow-y-auto");
    expect(modal).toContain("Concluir");
  });

  it("mantém os oito dados principais e a grade 1/2/3 colunas", () => {
    for (const label of ["Cliente", "Título da carteira", "Foto de capa", "Destino", "Período", "Quantidade de serviços", "Quantidade de documentos", "Status"]) expect(initial).toContain(`label=\"${label}\"`);
    expect(initial).toContain("grid-cols-1 sm:grid-cols-2 lg:grid-cols-3");
    expect(initial).toContain("start_date");
    expect(initial).not.toContain("wallet_cover_url");
  });

  it("expõe acesso e compartilhamento diretamente sem ShareTripModal", () => {
    expect(access).toContain("PublicLinkActions");
    expect(access).toContain("buildCarteiraLink");
    expect(access).not.toContain("ShareTripModal");
    expect(access).toContain("onRegeneratePassword");
  });

  it("mostra a seleção de roteiro diretamente quando não há vínculo", () => {
    expect(itinerary).toContain("<AttachItineraryContent");
    expect(itinerary).not.toContain("<AttachItineraryDialog");
    expect(wallet).toContain("inlineSelector hideUseDefaultAction");
  });
});