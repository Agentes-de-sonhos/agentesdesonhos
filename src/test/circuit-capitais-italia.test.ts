import { describe, it, expect } from "vitest";
import { findCircuit } from "@/lib/circuits";
describe("Capitais da Itália", () => {
  it("abre para a Drica", () => expect(findCircuit("capitais-da-italia", "dricaviagens.com.br")?.fromPrice).toBe(906));
  it("não abre para outras agências", () => {
    expect(findCircuit("capitais-da-italia", "www.destinoscomaju.com.br")).toBeUndefined();
    expect(findCircuit("capitais-da-italia", "bardelliviagens.com.br")).toBeUndefined();
  });
});
