import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  resolveAgencyBrowserTitle,
  useAgencyBrowserTitle,
} from "@/hooks/useAgencyBrowserTitle";

describe("títulos da aba dos sites white-label", () => {
  it.each([
    ["100limites.tur.br", "100 Limites Turismo"],
    ["www.100limites.tur.br", "100 Limites Turismo"],
    ["destinoscomaju.com.br", "Destinos com a Ju"],
    ["www.destinoscomaju.com.br", "Destinos com a Ju"],
    ["paraisoviagens.com", "Paraiso Viagens"],
    ["www.paraisoviagens.com", "Paraiso Viagens"],
    ["essyatur.com.br", "Essya Tur Viagens"],
    ["www.essyatur.com.br", "Essya Tur Viagens"],
  ])("resolve %s sem afetar o conteúdo", (hostname, title) => {
    expect(resolveAgencyBrowserTitle(hostname)).toBe(title);
  });

  it("não aplica título de outra agência a tenants sem configuração", () => {
    expect(resolveAgencyBrowserTitle("outraagencia.com.br")).toBeNull();
  });

  it("aplica e restaura o título ao navegar", () => {
    document.title = "Título anterior";
    const { unmount } = renderHook(() => useAgencyBrowserTitle("www.essyatur.com.br"));
    expect(document.title).toBe("Essya Tur Viagens");
    unmount();
    expect(document.title).toBe("Título anterior");
  });
});