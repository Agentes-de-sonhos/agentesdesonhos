import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { XcaretBookingBar } from "@/components/landing/xcaret/XcaretBookingBar";

describe("XcaretBookingBar", () => {
  it("mostra hotel, período e viajantes", () => {
    render(<XcaretBookingBar hostname="www.destinoscomaju.com.br" agencyName="Destinos com a Ju" />);
    expect(screen.getByLabelText(/Hotel/)).toBeTruthy();
    expect(screen.getByText(/Entrada e saída/i)).toBeTruthy();
    expect(screen.getByLabelText(/Adultos/)).toBeTruthy();
    expect(screen.getByLabelText(/Crianças/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Consultar disponibilidade/i })).toBeTruthy();
  });
});
