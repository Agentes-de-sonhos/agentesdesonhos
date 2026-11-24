import { describe, it, expect } from "vitest";
import { findHotelOptions, totalWithHotelChoice, hotelPriceDelta } from "@/lib/quoteHotelChoice";
const h = (id: string, amount: number, extra: any = {}) => ({ id, service_type: "hotel", amount, service_data: { check_in: "2027-09-10", check_out: "2027-09-14" }, ...extra });
const flight = { id: "f", service_type: "flight", amount: 1000 };
describe("escolha de hospedagem", () => {
  it("hotéis da mesma estadia viram opções", () => {
    expect(findHotelOptions([flight, h("a", 500), h("b", 700)]).map((s) => s.id)).toEqual(["a", "b"]);
  });
  it("hotéis de estadias diferentes não viram opções", () => {
    expect(findHotelOptions([h("a", 500), { ...h("b", 700), service_data: { check_in: "2027-09-14", check_out: "2027-09-16" } }])).toEqual([]);
  });
  it("total soma só o hotel escolhido", () => {
    const list = [flight, h("a", 500), h("b", 700)];
    expect(totalWithHotelChoice(list, findHotelOptions(list), "b")).toBe(1700);
  });
  it("diferença é + para mais caro e − para mais barato", () => {
    expect(hotelPriceDelta(h("b", 700), h("a", 500))).toBe(200);
    expect(hotelPriceDelta(h("a", 500), h("b", 700))).toBe(-200);
  });
  it("grupo de escolha alternativo define as opções", () => {
    const list = [h("a", 1, { choice_group_id: "g" }), h("b", 2, { choice_group_id: "g" }), h("c", 3)];
    expect(findHotelOptions(list, [{ id: "g", group_type: "alternative" }]).map((s) => s.id)).toEqual(["a", "b"]);
  });
});
