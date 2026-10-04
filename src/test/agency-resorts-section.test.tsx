import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AgencyResortsSection } from "@/components/resorts-brasil/AgencyResortsSection";

describe("AgencyResortsSection", () => {
  it("abre na Bahia com até 6 cards e troca ao clicar no estado", () => {
    render(<AgencyResortsSection allHref="/resorts-brasil" resortHref={(s) => `/resorts-brasil/${s}`} />);
    expect(screen.getByText(/mostrando 6 de 13/)).toBeTruthy();
    expect(screen.getAllByRole("listitem").length).toBe(6);
    fireEvent.click(screen.getByRole("button", { name: /^Alagoas, 7 resorts/ }));
    expect(screen.getByText(/mostrando 6 de 7/)).toBeTruthy();
    const links = screen.getAllByRole("link", { name: /Ver página do/ });
    expect(links[0].getAttribute("href")).toMatch(/^\/resorts-brasil\//);
  });
});
