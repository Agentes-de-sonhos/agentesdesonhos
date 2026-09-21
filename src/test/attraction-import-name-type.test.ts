import { describe, it, expect } from "vitest";
import { extractParsedServices } from "@/lib/serviceImportList";
import {
  normalizeServiceItemFields,
  splitAttractionDescription,
} from "@/lib/serviceImportFieldAliases";
import { SERVICE_IMPORT_CONFIGS } from "@/components/quote/service-import/serviceImportConfigs";

const attraction = SERVICE_IMPORT_CONFIGS.attraction;

/** Resposta realista da IA: descrição combinada em aliases variados. */
const FIVE_LINE_BODY = {
  success: true,
  items_count: 5,
  items: [
    { descricao: "Walt Disney World - ingresso base de 4 dias", valor_total_brl: 19140 },
    { produto: "Universal Orlando - 2 dias Park-to-Park", valor_total_brl: 11320 },
    { name: "SeaWorld Orlando - 1 dia", valor_total_brl: 2810 },
    { title: "Combo SeaWorld + Busch Gardens", valor_total_brl: 4640 },
    { productName: "Discovery Cove - experiência com alimentação", valor_total_brl: 8620 },
  ],
};

describe("importação de ingressos — nome e tipo por linha", () => {
  it("cria 5 serviços na ordem original, com nome/tipo preenchidos e valores certos", () => {
    const items = extractParsedServices(FIVE_LINE_BODY, "attraction");
    expect(items).toHaveLength(5);

    const mapped = items.map((item) => ({
      nome: item.nome_produto,
      tipo: item.tipo_ingresso ?? "",
      data: attraction.mapToInitialData(item),
    }));

    expect(mapped.map((m) => m.nome)).toEqual([
      "Walt Disney World",
      "Universal Orlando",
      "SeaWorld Orlando",
      "Combo SeaWorld + Busch Gardens",
      "Discovery Cove",
    ]);
    expect(mapped.map((m) => m.tipo)).toEqual([
      "Ingresso base de 4 dias",
      "2 dias Park-to-Park",
      "1 dia",
      "Combo",
      "Experiência com alimentação",
    ]);

    // Nenhum nome vazio — nunca "Sem nome identificado" com descrição legível.
    for (const m of mapped) {
      expect(m.nome.trim().length).toBeGreaterThan(0);
      expect(m.data.service_data.product_name).toBe(m.nome);
      expect(m.data.service_data.name).toBe(m.nome);
      expect(m.data.service_data.ticket_type).toBe(m.tipo);
    }

    // Cada valor permanece vinculado à sua linha.
    expect(mapped.map((m) => m.data.amount)).toEqual([19140, 11320, 2810, 4640, 8620]);
    expect(mapped.map((m) => m.data.service_data.price)).toEqual([19140, 11320, 2810, 4640, 8620]);
  });

  it("documento com um único ingresso continua funcionando (sem regressão)", () => {
    const items = extractParsedServices(
      {
        success: true,
        data: {
          nome_produto: "Universal Orlando",
          tipo_ingresso: "2 dias Park-to-Park",
          valor_total_brl: 11320,
        },
      },
      "attraction",
    );
    expect(items).toHaveLength(1);
    expect(items[0].nome_produto).toBe("Universal Orlando");
    expect(items[0].tipo_ingresso).toBe("2 dias Park-to-Park");
    expect(attraction.mapToInitialData(items[0]).amount).toBe(11320);
  });

  it("documento com vários ingressos já nas chaves canônicas não é alterado", () => {
    const items = extractParsedServices(
      {
        success: true,
        items: [
          { nome_produto: "Busch Gardens - Tampa", tipo_ingresso: "1 dia", valor_total_brl: 1200 },
          { nome_produto: "LEGOLAND Florida", tipo_ingresso: "Park Hopper", valor_total_brl: 900 },
        ],
      },
      "attraction",
    );
    expect(items.map((i) => i.nome_produto)).toEqual(["Busch Gardens - Tampa", "LEGOLAND Florida"]);
    expect(items.map((i) => i.tipo_ingresso)).toEqual(["1 dia", "Park Hopper"]);
  });

  it("aliases de tipo de ingresso são reconhecidos sem quebrar o contrato", () => {
    const item: Record<string, unknown> = normalizeServiceItemFields("attraction", {
      park: "SeaWorld Orlando",
      ticketType: "1 dia",
      valor_total: 2810,
    });
    expect(item.nome_produto).toBe("SeaWorld Orlando");
    expect(item.tipo_ingresso).toBe("1 dia");
    expect(item.valor_total).toBe(2810);
    // Chaves originais preservadas.
    expect(item.park).toBe("SeaWorld Orlando");
  });

  it("sem delimitador confiável preserva a descrição completa no nome", () => {
    expect(splitAttractionDescription("Passeio de barco pelos canais")).toEqual({
      name: "Passeio de barco pelos canais",
      type: "",
    });
    expect(splitAttractionDescription("SeaWorld Orlando: 1 dia")).toEqual({
      name: "SeaWorld Orlando",
      type: "1 dia",
    });
    expect(splitAttractionDescription("Disney – Park Hopper Plus")).toEqual({
      name: "Disney",
      type: "Park Hopper Plus",
    });
  });

  it("outras categorias não ganham separação de nome/tipo", () => {
    const transfer: Record<string, unknown> = normalizeServiceItemFields("transfer", {
      operadora: "Wemoov - privativo",
      valor_total: 300,
    });
    expect(transfer.empresa).toBe("Wemoov - privativo");
    expect(transfer.tipo_ingresso).toBeUndefined();
  });

  it("entrada em PDF, imagem ou texto usa o mesmo normalizador", () => {
    for (const body of [
      { success: true, items: [{ descricao: "Discovery Cove - experiência com alimentação", valor_total_brl: 8620 }] },
      { success: true, itens: [{ descricao: "Discovery Cove - experiência com alimentação", valor_total_brl: 8620 }] },
      { success: true, data: { descricao: "Discovery Cove - experiência com alimentação", valor_total_brl: 8620 } },
    ]) {
      const [item] = extractParsedServices(body, "attraction");
      expect(item.nome_produto).toBe("Discovery Cove");
      expect(item.tipo_ingresso).toBe("Experiência com alimentação");
      expect(attraction.mapToInitialData(item).amount).toBe(8620);
    }
  });
});
