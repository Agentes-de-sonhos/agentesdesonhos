import { describe, expect, it } from "vitest";
import {
  CROP_MASK_RATIO,
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  cropMaskSide,
  defaultCropState,
  initialZoomForMedia,
} from "@/lib/circularCrop";

describe("máscara circular do editor", () => {
  it("usa 85–90% da menor dimensão do palco (referência 384x320 → ~282)", () => {
    const side = cropMaskSide({ width: 384, height: 320 });
    expect(side).toBe(Math.round(320 * CROP_MASK_RATIO));
    expect(side / 320).toBeGreaterThanOrEqual(0.85);
    expect(side / 320).toBeLessThanOrEqual(0.9);
  });

  it("no mobile (palco estreito) a máscara acompanha a largura disponível", () => {
    const side = cropMaskSide({ width: 328, height: 320 });
    expect(side).toBe(Math.round(320 * CROP_MASK_RATIO));
    expect(side).toBeGreaterThan(280);
  });

  it("palco ainda não medido não produz máscara inválida", () => {
    expect(cropMaskSide({ width: 0, height: 0 })).toBe(0);
  });

  it("logotipo horizontal cabe inteiro no círculo (zoom inicial de contain)", () => {
    const maskSide = cropMaskSide({ width: 384, height: 360 });
    const zoom = initialZoomForMedia({
      mediaWidth: 384,
      mediaHeight: 120,
      maskSide,
      mode: "contain",
    });
    expect(zoom).toBeCloseTo(maskSide / 384, 5);
    // a maior dimensão do logo renderizado cabe dentro da máscara
    expect(384 * zoom).toBeLessThanOrEqual(maskSide + 1);
  });

  it("logotipo vertical também cabe inteiro, sem deformar (zoom uniforme)", () => {
    const maskSide = cropMaskSide({ width: 384, height: 360 });
    const zoom = initialZoomForMedia({
      mediaWidth: 120,
      mediaHeight: 360,
      maskSide,
      mode: "contain",
    });
    expect(360 * zoom).toBeLessThanOrEqual(maskSide + 1);
    expect(120 * zoom).toBeLessThanOrEqual(maskSide + 1);
  });

  it("foto do agente preenche o círculo (zoom inicial de cover)", () => {
    const maskSide = cropMaskSide({ width: 384, height: 360 });
    const zoom = initialZoomForMedia({
      mediaWidth: 480,
      mediaHeight: 320,
      maskSide,
      mode: "cover",
    });
    expect(320 * zoom).toBeGreaterThanOrEqual(maskSide - 1);
  });

  it("zoom mínimo permite conter o logotipo inteiro e o máximo permite aproximar", () => {
    expect(MIN_ZOOM).toBeLessThan(1);
    expect(MAX_ZOOM).toBeGreaterThanOrEqual(4);
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
  });

  it("centralizar restaura a posição e o zoom de enquadramento informado", () => {
    const state = defaultCropState(0.7);
    expect(state.crop).toEqual({ x: 0, y: 0 });
    expect(state.zoom).toBeCloseTo(0.7, 5);
    expect(defaultCropState().zoom).toBe(1);
  });

  it("nunca começa com o logotipo minúsculo: o zoom inicial usa a máscara efetiva", () => {
    const small = initialZoomForMedia({
      mediaWidth: 40,
      mediaHeight: 40,
      maskSide: cropMaskSide({ width: 384, height: 360 }),
      mode: "contain",
    });
    expect(small).toBeGreaterThan(1);
  });
});
