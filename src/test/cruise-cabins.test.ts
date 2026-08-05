import { describe, it, expect } from "vitest";
import {
  normalizeCruiseCabins,
  ensureSingleBase,
  baseCabinPrice,
  cabinOptionLabel,
  parseShipVideoUrl,
} from "@/lib/cruiseCabins";
import { getRoomPaymentSimulation } from "@/lib/servicePayment";

describe("normalização legacy", () => {
  it("cria uma opção base a partir de cabin_type + price", () => {
    const cabins = normalizeCruiseCabins({ cabin_type: "interna", price: 15326 });
    expect(cabins).toHaveLength(1);
    expect(cabins[0].cabin_type).toBe("interna");
    expect(cabins[0].price).toBe(15326);
    expect(cabins[0].is_base).toBe(true);
  });

  it("usa amount quando price não existe", () => {
    const cabins = normalizeCruiseCabins({ cabin_type: "varanda" }, 24486);
    expect(cabins[0].price).toBe(24486);
  });

  it("retorna vazio quando não há nada", () => {
    expect(normalizeCruiseCabins({})).toEqual([]);
    expect(normalizeCruiseCabins(null)).toEqual([]);
  });
});

describe("múltiplas cabines e opção base", () => {
  const data = {
    cabin_type: "interna",
    price: 15326,
    cabins: [
      { cabin_type: "interna", price: 15326, is_base: true },
      { cabin_type: "varanda", price: 24486 },
    ],
  };

  it("normaliza duas alternativas com exatamente uma base", () => {
    const cabins = normalizeCruiseCabins(data);
    expect(cabins).toHaveLength(2);
    expect(cabins.filter((c) => c.is_base)).toHaveLength(1);
    expect(cabins[0].id).toBeTruthy();
  });

  it("não soma os valores: total considera apenas a base", () => {
    const cabins = normalizeCruiseCabins(data);
    expect(baseCabinPrice(cabins)).toBe(15326);
    const soma = cabins.reduce((a, c) => a + c.price, 0);
    expect(soma).toBe(39812);
    expect(baseCabinPrice(cabins)).not.toBe(soma);
  });

  it("troca a base sem duplicar marcações", () => {
    const cabins = ensureSingleBase(normalizeCruiseCabins(data), 1);
    expect(cabins.filter((c) => c.is_base)).toHaveLength(1);
    expect(baseCabinPrice(cabins)).toBe(24486);
  });

  it("rotula tipos conhecidos e personalizados", () => {
    expect(cabinOptionLabel({ cabin_type: "varanda" })).toBe("Varanda");
    expect(cabinOptionLabel({ cabin_type: "outro", custom_label: "Yacht Club" })).toBe("Yacht Club");
    expect(cabinOptionLabel({ cabin_type: "externa" })).toBe("Externa / Vista para o mar");
  });
});

describe("cálculo de pagamento por opção", () => {
  const quote = { payment_display_mode: "installments", installments_count: 12 };

  it("reaproveita as condições do orçamento em cada cabine", () => {
    const cabins = normalizeCruiseCabins({
      cabins: [
        { cabin_type: "interna", price: 15326, is_base: true },
        { cabin_type: "varanda", price: 24486 },
      ],
    });
    const sims = cabins.map((c) => getRoomPaymentSimulation(c.price, {}, quote));
    expect(sims[0].installmentsCount).toBe(12);
    expect(sims[0].installmentValue!).toBeCloseTo(15326 / 12, 2);
    expect(sims[1].installmentValue!).toBeCloseTo(2040.5, 2);
  });

  it("respeita a condição customizada do serviço", () => {
    const service = { is_custom_payment: true, payment_type: "installments", installments: 12, payment_method: "Cartão de Crédito" };
    const sim = getRoomPaymentSimulation(15326.04, service, quote);
    expect(sim.installmentsCount).toBe(12);
    expect(sim.installmentValue!).toBeCloseTo(1277.17, 2);
    expect(sim.method).toBe("Cartão de Crédito");
  });
});

describe("URL de vídeo do navio", () => {
  it("aceita YouTube em formatos válidos", () => {
    expect(parseShipVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
    expect(parseShipVideoUrl("https://youtu.be/dQw4w9WgXcQ")?.provider).toBe("youtube");
    expect(parseShipVideoUrl("youtube.com/shorts/dQw4w9WgXcQ")?.embedUrl).toContain("/embed/dQw4w9WgXcQ");
  });

  it("aceita Vimeo com e sem hash", () => {
    expect(parseShipVideoUrl("https://vimeo.com/123456789")).toEqual({
      provider: "vimeo",
      embedUrl: "https://player.vimeo.com/video/123456789",
    });
    expect(parseShipVideoUrl("https://vimeo.com/123456789/abc123")?.embedUrl).toBe(
      "https://player.vimeo.com/video/123456789?h=abc123",
    );
  });

  it("rejeita URLs inválidas e HTML arbitrário", () => {
    expect(parseShipVideoUrl("")).toBeNull();
    expect(parseShipVideoUrl(undefined)).toBeNull();
    expect(parseShipVideoUrl("https://exemplo.com/video.mp4")).toBeNull();
    expect(parseShipVideoUrl('<iframe src="https://youtube.com/embed/x"></iframe>')).toBeNull();
    expect(parseShipVideoUrl("javascript:alert(1)")).toBeNull();
    expect(parseShipVideoUrl("https://vimeo.com/abc")).toBeNull();
  });
});
