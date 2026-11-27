import { HelmetProvider } from "react-helmet-async";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { BAGAGEM_NA_MAO_PREVIEW_INFO } from "@/lib/adsBriefingPreview";
import type { PublicBlogList } from "@/hooks/usePublicBlog";
import AgencyBlogPage from "@/pages/whitelabel/AgencyBlogPage";

const empty: PublicBlogList = { featured: null, items: [], total: 0, page: 1, pages: 1, categories: [] };
const { hook } = vi.hoisted(() => ({ hook: vi.fn() }));
vi.mock("@/hooks/usePublicBlog", () => ({ usePublicBlogList: hook }));
afterEach(cleanup);

function view(hostname = "bagagemnamao.com.br", url = "/blog") {
  const info = { ...BAGAGEM_NA_MAO_PREVIEW_INFO, hostname };
  return render(<HelmetProvider><MemoryRouter initialEntries={[url]}><AgencyBlogPage info={info}/></MemoryRouter></HelmetProvider>);
}

describe("Blog da Bagagem na Mão", () => {
  it("mostra página em breve sem pesquisa quando não há artigos", () => {
    hook.mockReturnValue({ data: empty });
    view();
    expect(screen.getByRole("heading", { level: 1, name: "Em breve, novos conteúdos por aqui" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Buscar no blog" })).toBeNull();
  });
  it("não troca estados vazios das demais agências ou de buscas filtradas", () => {
    hook.mockReturnValue({ data: empty });
    const other = view("www.curtiviagens.com.br");
    expect(screen.getByText("Nenhum artigo encontrado.")).toBeInTheDocument();
    other.unmount();
    view("bagagemnamao.com.br", "/blog?busca=orlando");
    expect(screen.getByText("Nenhum artigo encontrado.")).toBeInTheDocument();
  });
  it("exibe artigos e busca quando já há publicação", () => {
    hook.mockReturnValue({ data: { ...empty, total: 1, items: [{ slug: "orlando", title: "Dicas de Orlando", excerpt: "Planeje sua viagem", category: null }] } });
    view("www.bagagemnamao.com.br");
    expect(screen.getByRole("link", { name: /Dicas de Orlando/ })).toHaveAttribute("href", "/blog/orlando");
    expect(screen.getByRole("textbox", { name: "Buscar no blog" })).toBeInTheDocument();
  });
});
