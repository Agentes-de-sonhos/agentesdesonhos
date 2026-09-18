import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandCloudLoader } from "@/components/shared/BrandCloudLoader";
import styles from "@/components/shared/BrandCloudLoader.module.css";

describe("BrandCloudLoader", () => {
  it("expõe estado e nome acessível configurável", () => {
    render(<BrandCloudLoader label="Carregando roteiro" />);

    expect(screen.getByRole("status", { name: "Carregando roteiro" })).toBeInTheDocument();
  });

  it("mantém a nuvem parada e anima apenas o traço sobreposto", () => {
    const { container } = render(<BrandCloudLoader />);
    const paths = container.querySelectorAll("path");

    expect(paths).toHaveLength(2);
    expect(paths[0]).not.toHaveClass(styles.trace);
    expect(paths[1]).toHaveClass(styles.trace);
    expect(container.querySelector("svg")).not.toHaveClass("animate-spin");
  });

  it("aumenta o tamanho visual para cerca de 57px mantendo a centralização", () => {
    const { container } = render(<BrandCloudLoader />);
    const wrapper = container.firstElementChild as HTMLElement;
    const svg = container.querySelector("svg");

    expect(svg).toHaveClass("h-[57px]", "w-[57px]");
    expect(wrapper).toHaveClass("items-center", "justify-center");
  });

  it("usa contorno suave na base direita, sem bico, cauda ou balão de fala", () => {
    const { container } = render(<BrandCloudLoader />);
    const tracePath = container.querySelectorAll("path")[1];
    const d = tracePath.getAttribute("d") ?? "";

    // O arco direito termina na mesma altura da base (y=21) onde o path começa,
    // fechando de forma contínua — sem segmento vertical de fechamento.
    expect(d).toMatch(/A5\.5 5\.5 0 1 1 20\.5 21Z$/);
    expect(d).toMatch(/^M12\.5 21/);
    expect(d).not.toContain("0 11Z");
  });
});