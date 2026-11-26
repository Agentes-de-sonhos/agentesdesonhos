import { render, screen, within } from "@testing-library/react";
import { it, expect } from "vitest";
import { CircuitTimeline } from "@/components/whitelabel/CircuitTimeline";
import { LESTE_EUROPEU_PREMIUM_2027 as circuit } from "@/lib/circuits/lesteEuropeuPremium2027";
import { LESTE_EUROPEU_PREMIUM_2026 as otherCircuit } from "@/lib/circuits/lesteEuropeuPremium2026";

it("places the IMM archive photo only on the included cathedral visit", () => {
  const { rerender } = render(<CircuitTimeline days={circuit.itinerary} />);
  const image = within(screen.getByRole("article", {name:"Dia 2"})).getByRole("img", {name:/Catedral de Santo Estêvão/});
  expect(image.getAttribute("src")).toContain("imm-catedral-santo-estevao");
  expect(screen.getByText(/Foto: Acervo IMM Viagens/)).toBeTruthy();
  expect(screen.getAllByRole("img")).toHaveLength(1);
  rerender(<CircuitTimeline days={otherCircuit.itinerary} />);
  expect(screen.queryByRole("img", {name:/Catedral de Santo Estêvão/})).toBeNull();
});
