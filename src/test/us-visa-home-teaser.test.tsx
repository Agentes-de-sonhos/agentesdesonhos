import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/agencyContextLink", () => ({ agencySiteHref: (path: string) => path }));
vi.mock("@/hooks/useUsVisaPublicInfo", () => ({
  useUsVisaPublicInfo: () => ({ isLoading: false, data: {
    mrv_fee_usd: 185,
    interview_wait_times: {
      "Sao Paulo": { months: 2.5, display_pt: "2 meses e meio" },
      "Rio De Janeiro": { months: 0.5, display_pt: "Menos de 15 dias" },
    },
    wait_times_source_updated_at: "2026-09-17",
  } }),
}));
import { UsVisaHomeTeaser } from "@/components/whitelabel/UsVisaHomeTeaser";

describe("quadro de consulados da home", () => {
  it("segue a referência com título, cinco cidades, espera e fonte no rodapé", () => {
    render(<UsVisaHomeTeaser />);
    expect(screen.getByRole("heading", { name: "Consulte o tempo de espera" })).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByText("2 meses e meio")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Rio de Janeiro" }));
    expect(screen.getByRole("heading", { name: "Rio de Janeiro" })).toBeTruthy();
    expect(screen.getByText("Menos de 15 dias")).toBeTruthy();
    expect(screen.getByText("Menor espera entre as 5 cidades")).toBeTruthy();
    expect(screen.getByText("· Atualizado em 17/09/2026.")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Recife" }));
    expect(screen.getByText("Indisponível")).toBeTruthy();
    expect(screen.queryByText("Menor espera entre as 5 cidades")).toBeNull();
  });
});