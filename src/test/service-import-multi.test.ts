import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractParsedServices,
  serviceItemHasUsefulData,
  sortServiceItemsChronologically,
} from "@/lib/serviceImportList";

const EDGE = readFileSync(
  join(process.cwd(), "supabase/functions/import-generic-service-document/index.ts"),
  "utf8",
);
const FORMS = readFileSync(join(process.cwd(), "src/components/quote/ServiceForms.tsx"), "utf8");
const IMPORT_UI = readFileSync(
  join(process.cwd(), "src/components/quote/service-import/GenericServiceSmartImport.tsx"),
  "utf8",
);

describe("importação de serviços — vários itens no mesmo documento", () => {
  it("mantém compatibilidade com a resposta singular antiga", () => {
    const body = { success: true, data: { nome_atracao: "Universal Studios", data_visita: "2026-07-10" } };
    const list = extractParsedServices(body);
    expect(list).toHaveLength(1);
    expect(list[0].nome_atracao).toBe("Universal Studios");
  });

  it("lê três ingressos diferentes de uma resposta em lista", () => {
    const body = {
      success: true,
      items: [
        { nome_atracao: "Universal", data_visita: "2026-07-12" },
        { nome_atracao: "Disney", data_visita: "2026-07-10" },
        { nome_atracao: "SeaWorld" },
      ],
    };
    const list = extractParsedServices(body);
    expect(list.map((i) => i.nome_atracao)).toEqual(["Disney", "Universal", "SeaWorld"]);
  });

  it("aceita o array em itens/servicos dentro de data", () => {
    expect(extractParsedServices({ success: true, data: { itens: [{ nome: "A" }, { nome: "B" }] } })).toHaveLength(2);
    expect(extractParsedServices({ success: true, servicos: [{ nome: "A" }] })).toHaveLength(1);
  });

  it("descarta itens sem dados úteis sem perder os válidos", () => {
    const body = { success: true, items: [{ nome: "Válido" }, {}, { observacoes: ["nada"] }] };
    const list = extractParsedServices(body);
    expect(list).toHaveLength(1);
    expect(list[0].nome).toBe("Válido");
  });

  it("usa partial_data quando não há sucesso", () => {
    expect(extractParsedServices({ success: false, partial_data: { nome: "Roma City Tour" } })).toHaveLength(1);
    expect(extractParsedServices({ success: false, partial_data: {} })).toHaveLength(0);
  });

  it("ordena por data e preserva a ordem dos itens sem data", () => {
    const sorted = sortServiceItemsChronologically([
      { nome: "sem data 1" },
      { nome: "B", data: "2026-02-01" },
      { nome: "sem data 2" },
      { nome: "A", data: "2026-01-01" },
    ]);
    expect(sorted.map((i) => i.nome)).toEqual(["A", "B", "sem data 1", "sem data 2"]);
  });

  it("ignora metadados ao avaliar dados úteis", () => {
    expect(serviceItemHasUsefulData({ confianca_extracao: 0.9 })).toBe(false);
    expect(serviceItemHasUsefulData({ observacoes: ["x"] })).toBe(false);
    expect(serviceItemHasUsefulData({ valor_total: 0 })).toBe(true);
    expect(serviceItemHasUsefulData(null)).toBe(false);
  });
});

describe("edge function import-generic-service-document", () => {
  it("declara o array itens no schema da ferramenta", () => {
    expect(EDGE).toContain("itens:");
    expect(EDGE).toContain('required: ["itens"]');
  });

  it("instrui a IA a separar serviços diferentes", () => {
    expect(EDGE).toMatch(/UM ITEM POR SERVIÇO/i);
  });

  it("faz apenas UMA chamada de IA e devolve lista + campo singular", () => {
    expect((EDGE.match(/ai\.gateway\.lovable\.dev/g) || []).length).toBe(1);
    expect(EDGE).toContain("items_count");
    expect(EDGE).toContain("data: first");
  });
});

describe("integração com o formulário de serviços", () => {
  it("libera adição em lote para todos os tipos importáveis", () => {
    expect(FORMS).not.toContain("serviceType === 'hotel' && onSubmitMany");
    expect(FORMS).toContain("...(onSubmitMany ? { onSubmitMany } : {})");
  });

  it("liga onConfirmMany no importador genérico", () => {
    expect(FORMS).toContain("onConfirmMany: async (items)");
  });

  it("aplica o item em revisão quando não há adição em lote", () => {
    expect(IMPORT_UI).toContain("const canAddMany = !!onConfirmMany");
    expect(IMPORT_UI).toContain("mapToInitialData(current)");
  });
});
