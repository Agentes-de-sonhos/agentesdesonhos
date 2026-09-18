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
});