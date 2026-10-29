import { describe, expect, it } from "vitest";
import { CAPITAIS_DA_ITALIA } from "@/lib/circuits/capitaisDaItalia";
import { circuitNights, convertCircuitPrice, circuitDepartureDate, circuitRequestPayload, validCircuitContact, type CircuitContact } from "@/lib/circuits/presentation";
const contact: CircuitContact = { name: "Pessoa Teste", phone: "(11) 99999-9999", email: "teste@example.com", adults: 1, children: 0, notes: "", consent: true };
describe("regras do circuito", () => {
  it("deriva as seis noites reais, incluindo o retorno a Roma", () => {
    expect(CAPITAIS_DA_ITALIA.cities.map(city => circuitNights(CAPITAIS_DA_ITALIA, city))).toEqual([4, 1, 1, 0, 0]);
  });
  it("multiplica o preço original pela cotação recebida", () => expect(convertCircuitPrice(906, 6)).toBe(5436));
  it("não estima conversão sem cotação válida", () => { for (const rate of [undefined, 0, -1, NaN, Infinity]) expect(convertCircuitPrice(906, rate)).toBeUndefined(); });
  it("preserva a data escolhida e passageiros sem escolher o tenant no navegador", () => {
    const date = circuitDepartureDate("Novembro 2026", 1);
    expect(date).toBe("2026-11-01");
    const payload = circuitRequestPayload(CAPITAIS_DA_ITALIA, date, contact, "");
    expect(payload.details.data_inicio).toBe(date); expect(payload.details.adultos).toBe(1); expect(payload.details.criancas).toBe(0);
    expect(payload).not.toHaveProperty("user_id"); expect(payload).not.toHaveProperty("agency_id");
  });
  it("exige consentimento", () => { expect(validCircuitContact(contact)).toBe(true); expect(validCircuitContact({ ...contact, consent: false })).toBe(false); });
  it("exige pelo menos um adulto", () => expect(validCircuitContact({ ...contact, adults: 0 })).toBe(false));
  it("rejeita email inválido", () => expect(validCircuitContact({ ...contact, email: "inválido" })).toBe(false));
  it("exige WhatsApp com DDD", () => expect(validCircuitContact({ ...contact, phone: "99999-9999" })).toBe(false));
});
import { tourismRate as _tr, upcomingDepartures as _ud } from "@/lib/circuits/presentation";
describe("câmbio turismo e meses futuros", () => {
  it("aplica 4% sobre o comercial", () => { expect(_tr(6)).toBe(6.24); });
  it("oculta meses e domingos passados", () => {
    const r = _ud([{ month: "Outubro 2026", days: [4, 25] }, { month: "Novembro 2026", days: [1, 8] }], new Date(2026, 9, 29));
    expect(r).toEqual([{ month: "Novembro 2026", days: [1, 8] }]);
  });
});
