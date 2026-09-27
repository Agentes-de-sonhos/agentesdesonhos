import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
}
  it("exige hotel e datas antes de abrir o formulário", () => {
    render(<XcaretBookingBar hostname="www.destinoscomaju.com.br" agencyName="Destinos com a Ju" />);
    fireEvent.click(screen.getByRole("button", { name: /Consultar disponibilidade/i }));
    expect(screen.getByText(/Escolha um hotel/i)).toBeTruthy();
    expect(screen.getByText(/Informe a data de entrada/i)).toBeTruthy();
  });
});
