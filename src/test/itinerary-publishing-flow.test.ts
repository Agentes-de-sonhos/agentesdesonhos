import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/CriarRoteiro.tsx", "utf8");
const editor = readFileSync("src/components/itinerary/ItineraryEditor.tsx", "utf8");
const stepCard = readFileSync("src/components/quote/QuoteStepCard.tsx", "utf8");
const guide = readFileSync("src/components/quote/QuoteStepsGuide.tsx", "utf8");

describe("fluxo visual de revisão e publicação do roteiro", () => {
  it("usa o status oficial e apresenta quatro etapas somente antes da publicação", () => {
    expect(page).toContain('const isPublished = currentItinerary?.status === "published"');
    expect(page).toContain('short: "Revisar e editar"');
    expect(page).toContain('short: "Aprovar atividades"');
    expect(page).toContain('short: "Configurar roteiro"');
    expect(page).toContain('...(!isPublished ? [{ step: 4, short: "Publicar roteiro"');
    expect(page).toContain('actions={!isPublished ? (');
    expect(page).toContain('disabled={publishReviewOpen || isProcessingAction || updateItineraryStatus.isPending}');
  });

  it("oculta ações públicas e modelo no rascunho e as libera após publicação", () => {
    expect(page).toContain('{isPublished && <PublicShareBar');
    expect(page).toContain('{isPublished && (');
    expect(page).toContain('Salvar como modelo');
    expect(page).toContain('onGeneratePDF={() => handleActionClick("pdf")}');
    expect(page).toContain('buildProjectPublicUrl({');
  });

  it("mantém orientação acessível por clique e layout responsivo", () => {
    expect(page).toContain('ariaLabel="Etapas de revisão e publicação do roteiro"');
    expect(guide).toContain("PopoverContent");
    expect(guide).toContain("aria-expanded={open}");
    expect(guide).toContain('steps.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"');
  });

  it("numera a revisão e remove apenas o número interno da configuração", () => {
    expect(editor).toContain('Revisar e editar roteiro');
    expect(editor).toContain('aria-hidden="true">1</span>');
    expect(editor).toContain('bg-sky-500');
    expect(page).toContain('hideStep');
    expect(stepCard).toContain('!hideStep');
  });

  it("posiciona a aprovação global no Dia 1 com fallback vazio e loading", () => {
    expect(editor).toContain('day.dayNumber === 1 && !allApproved');
    expect(editor).toContain('days.length === 0 && !allApproved');
    expect(editor).toContain('Aprovar todas as atividades');
    expect(editor).toContain('disabled={isApprovingAll}');
    expect(page).toContain('onApproveAll={() => setApproveAllConfirmOpen(true)}');
    expect(page).toContain('for (const day of currentItinerary.days)');
  });

  it("preserva confirmação e só muda a interface após recarregar o status salvo", () => {
    expect(page).toContain('<AlertDialog open={approveAllConfirmOpen}');
    expect(page).toContain('await handlePublish(pendingPublishId)');
    expect(page).toContain('await loadItinerary(pendingPublishId)');
    expect(page.indexOf('await handlePublish(pendingPublishId)')).toBeLessThan(page.indexOf('await loadItinerary(pendingPublishId)'));
  });
});