import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { OfferChannelPicker } from "@/components/offers/OfferChannelPicker";
import { PinkFridayHome, PinkFridayPageContent } from "@/components/campaign/PinkFriday";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { isPinkFridayAgency, pinkFridayMode, PINK_FRIDAY_LIVE_ENABLED, selectPinkFridayOffers } from "@/lib/pinkFriday";
import type { PublicOffer } from "@/lib/offers";

const mock = vi.hoisted(() => ({ usePublicOffers: vi.fn() }));
vi.mock("@/pages/whitelabel/AgencyOffersPage", () => mock);
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const ju = "destinoscomaju.com.br";
const www = `www.${ju}`;
const mundo = "omundoemcores.com.br";
const info = { hostname: www, agency_name: "Destinos com a Ju" } as AgencyDomainInfo;
const makeOffer = (n: number, channels?: string[], category = "praias") => ({
  slug: `oferta-${n}`, title: `Oferta ${n}`, image_only: true, campaign_category: category, channels,
}) as PublicOffer;

beforeEach(() => mock.usePublicOffers.mockReturnValue({ data: [], isLoading: false }));

describe("Pink Friday", () => {
  it("habilita a campanha apenas nos dois domínios exatos da Ju", () => {
    expect(PINK_FRIDAY_LIVE_ENABLED).toBe(true);
    expect(pinkFridayMode(ju, ju)).toBe("live");
    expect(pinkFridayMode(ju, ju, "", false)).toBeNull();
    expect(pinkFridayMode(ju, ju, "", true)).toBe("live");
    expect(pinkFridayMode(www, ju, "", true)).toBe("live");
    expect(pinkFridayMode(ju, www, `?__agency_host=${mundo}`, true)).toBe("live");
    expect(pinkFridayMode(mundo, ju, "", true)).toBeNull();
    expect(pinkFridayMode(ju, mundo, `?__agency_host=${ju}`, true)).toBeNull();
    expect(pinkFridayMode(ju, `${ju}.outro.com.br`, "", true)).toBeNull();
    expect(pinkFridayMode(ju, "sites.agentesdesonhos.com.br", "", true)).toBeNull();
    expect(isPinkFridayAgency("sub.destinoscomaju.com.br")).toBe(false);
  });

  it("restringe a prévia local a uma seleção explícita da agência", () => {
    expect(pinkFridayMode(ju, "localhost", `?__agency_host=${www}`)).toBe("preview");
    expect(pinkFridayMode(ju, "127.0.0.1", `?__agency_host=${ju}`)).toBe("preview");
    expect(pinkFridayMode(ju, "localhost")).toBeNull();
    expect(pinkFridayMode(ju, "localhost", `?__agency_host=${mundo}`)).toBeNull();
    expect(pinkFridayMode(ju, "preview--project.lovable.app", `?__agency_host=${ju}`)).toBeNull();
  });

  it("preserva os canais antigos e só seleciona ofertas atribuídas à campanha", () => {
    const pink = makeOffer(1, ["pink-friday"]);
    expect(selectPinkFridayOffers([makeOffer(2), makeOffer(3, ["ofertas", "novembro"]), pink])).toEqual([pink]);
  });

  it("limita a home a quatro ofertas e leva à campanha da própria agência", () => {
    mock.usePublicOffers.mockReturnValue({ data: Array.from({ length: 6 }, (_, i) => makeOffer(i + 1, ["pink-friday"])), isLoading: false });
    render(<PinkFridayHome hostname={www} preview={false} />);
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Ver campanha" })).toHaveAttribute("href", "/pink-friday");
    expect(mock.usePublicOffers).toHaveBeenCalledWith(www, true);
  });

  it("não usa ofertas do cache nem pede consulta para a prévia", () => {
    mock.usePublicOffers.mockReturnValue({ data: [makeOffer(1, ["pink-friday"])], isLoading: false });
    render(<PinkFridayPageContent info={info} preview onRequest={vi.fn()} />);
    expect(screen.getByText("Prévia de layout. Nenhuma oferta foi cadastrada.")).toBeVisible();
    expect(screen.getByAltText("Bangalôs sobre o mar")).toBeVisible();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(mock.usePublicOffers).toHaveBeenCalledWith(www, false);
  });

  it("mostra a seção e a página sem inventar ofertas quando o catálogo está vazio", () => {
    render(<><PinkFridayHome hostname={www} preview={false} /><PinkFridayPageContent info={info} preview={false} onRequest={vi.fn()} /></>);
    expect(screen.getByRole("link", { name: "Ver campanha" })).toHaveAttribute("href", "/pink-friday");
    expect(screen.getByText("As ofertas da Pink Friday serão divulgadas aqui.")).toBeVisible();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("filtra por categoria e direciona a solicitação com a oferta certa", () => {
    const onRequest = vi.fn();
    mock.usePublicOffers.mockReturnValue({ data: [makeOffer(1, ["pink-friday"]), makeOffer(2, ["pink-friday"], "cruzeiros"), makeOffer(3, ["novembro"])], isLoading: false });
    render(<PinkFridayPageContent info={info} preview={false} onRequest={onRequest} />);
    expect(screen.getByAltText("Bangalôs sobre o mar")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cruzeiros" }));
    const article = screen.getByRole("article");
    expect(within(article).getByText("Oferta 2")).toBeVisible();
    expect(screen.queryByText("Oferta 1")).not.toBeInTheDocument();
    fireEvent.click(within(article).getByRole("button", { name: "Solicitar orçamento" }));
    expect(onRequest).toHaveBeenCalledWith(expect.objectContaining({ id: "oferta-2" }));
  });

  it("só oferece o canal no painel habilitado para a Ju", () => {
    const onChange = vi.fn();
    const { rerender } = render(<OfferChannelPicker value={["ofertas"]} onChange={onChange} />);
    expect(screen.queryByRole("checkbox", { name: "Pink Friday" })).not.toBeInTheDocument();
    rerender(<OfferChannelPicker value={["ofertas"]} onChange={onChange} allowPinkFriday />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Pink Friday" }));
    expect(onChange).toHaveBeenCalledWith(["ofertas", "pink-friday"]);
  });
});
