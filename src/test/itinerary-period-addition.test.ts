import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const editor = readFileSync("src/components/itinerary/ItineraryEditor.tsx", "utf8");
const aiActions = readFileSync("src/components/itinerary/ActivityAIActions.tsx", "utf8");

describe("adição de atividades por período", () => {
  it("remove a entrada geral do dia e oferece um botão acessível em cada período", () => {
    expect(editor).not.toContain('title="Adicionar atividade"\n                        aria-label="Adicionar atividade"');
    expect(editor).toContain('manha: "Adicionar atividade pela manhã"');
    expect(editor).toContain('tarde: "Adicionar atividade pela tarde"');
    expect(editor).toContain('noite: "Adicionar atividade pela noite"');
    expect(editor).toContain("aria-label={periodAddLabels[period]}");
  });

  it("mantém um único placeholder local por dia e período, depois das atividades", () => {
    expect(editor).toContain("const [pendingSlots, setPendingSlots] = useState<Set<string>>");
    expect(editor).toContain("current.has(key) ? current : new Set(current).add(key)");
    expect(editor.indexOf("periodActivities.map((activity)")).toBeLessThan(editor.indexOf("pendingSlots.has(slotKey"));
    expect(aiActions).toContain("Nenhuma atividade definida");
    expect(aiActions).toContain("onDismiss");
  });

  it("reutiliza o cadastro manual e fixa o período escolhido sem payload temporário", () => {
    expect(editor).toContain("openManualActivity(day.id!, period)");
    expect(editor).toContain('value={addingTarget?.period ?? "manha"} disabled');
    expect(editor).toContain("onAddActivity(addingTarget.dayId");
    expect(editor).toContain("period: addingTarget.period");
    expect(editor).not.toContain("onAddActivity(day.id!, { title: \"\"");
  });

  it("preserva o contexto da IA e bloqueia solicitações simultâneas", () => {
    for (const contextField of ["dayNumber: day.dayNumber", "date: day.date", "period,"]) {
      expect(aiActions).toContain(contextField);
    }
    expect(aiActions).toContain("alternativesRequestRef.current");
    expect(aiActions).toContain("disabled={loading}");
  });
});