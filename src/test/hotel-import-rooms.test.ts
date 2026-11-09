(globalThis as any).DOMMatrix ||= class {};
import { expect, test } from "vitest";
const { parsedHotelToHotelData } = await import("@/components/quote/hotel-import/HotelSmartImport");
test("2 quartos 4 adultos", () => {
  const d = parsedHotelToHotelData({ quantidade_quartos: 2, hospedes_adultos: 4, valor_total_brl: 2727.44 } as any);
  expect(d.rooms!.length).toBe(2);
  expect(d.rooms!.map(r => r.adults)).toEqual([2, 2]);
  expect(d.rooms!.reduce((s, r) => s + r.total_price, 0)).toBeCloseTo(2727.44);
});
