/**
 * Testes de COMPORTAMENTO do carrinho inline do orçamento público.
 *
 * Cobrem: clique inline (adicionar/remover/trocar), limite de múltipla
 * escolha, escolha única obrigatória, serviços incluídos, contador efetivo,
 * payload enviado ao backend, animação "voou para o carrinho" (cleanup e
 * movimento reduzido), abertura do mesmo modal pelo carrinho fixo e pelo CTA
 * pós-condições, estado vazio, ocultação de valores, persistência em
 * localStorage e remoção definitiva da vitrine duplicada.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: any[]) => invoke(...args) } },
}));

import {
  BookingCartProvider,
  useBookingCart,
} from "@/components/quote/booking/BookingCartContext";
import { BookingCartCta } from "@/components/quote/booking/BookingCartCta";
import { BookingCartDialog } from "@/components/quote/booking/BookingCartDialog";
import { BookingCartLauncher } from "@/components/quote/booking/BookingCartLauncher";
import { InlineBookingAction } from "@/components/quote/booking/InlineBookingAction";
import {
  BOOKING_CART_TARGET_ATTR,
  BOOKING_FLY_ATTR,
  clearBookingFlyBubbles,
  findCartTarget,
  flyToCart,
  prefersReducedMotion,
} from "@/lib/bookingCartFly";
import { showcaseStorageKey } from "@/lib/quoteBookingShowcase";

const svc = (id: string, extra: any = {}) =>
  ({
    id,
    service_type: "hotel",
    amount: 100,
    selection_mode: "optional",
    option_label: id,
    service_data: { hotel_name: `Hotel ${id}` },
    ...extra,
  }) as any;

const quoteOf = (services: any[], groups: any[] = [], extra: any = {}) =>
  ({
    id: "q1",
    destination: "Orlando",
    booking_requests_enabled: true,
    public_access_code: "CODE123",
    services,
    sections: [],
    choice_groups: groups,
    ...extra,
  }) as any;

function Harness({ quote }: { quote: any }) {
  return (
    <BookingCartProvider quote={quote} agencySlugOverride="agencia" accessCodeOverride="CODE123">
      <Probe />
      {(quote.services as any[]).map((s: any) => (
        <div key={s.id} data-service-row={s.id}>
          <InlineBookingAction service={s} />
        </div>
      ))}
      <BookingCartCta />
      <BookingCartLauncher />
      <BookingCartDialog />
    </BookingCartProvider>
  );
}

function Probe() {
  const cart = useBookingCart();
  return (
    <div>
      <span data-testid="count">{cart.count}</span>
      <span data-testid="effective">{cart.effectiveIds.join(",")}</span>
      <span data-testid="notice">{cart.blockedNotice || ""}</span>
      <span data-testid="error">{cart.validationError || ""}</span>
    </div>
  );
}

/** DOMRect não existe no jsdom: usamos o mesmo contrato de leitura. */
const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect;

const addButton = (id: string) =>
  document.querySelector<HTMLButtonElement>(`[data-booking-inline-action][data-service-id="${id}"]`)!;

beforeEach(() => {
  invoke.mockReset();
  invoke.mockResolvedValue({ data: { protocol: "PR-1", file_number: 7 }, error: null });
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  clearBookingFlyBubbles();
});

describe("ação inline nos cards do orçamento", () => {
  it("adiciona e remove um serviço opcional, atualizando o contador", () => {
    render(<Harness quote={quoteOf([svc("a"), svc("b")])} />);
    expect(screen.getByTestId("count").textContent).toBe("0");

    fireEvent.click(addButton("a"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(addButton("a").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("effective").textContent).toBe("a");

    fireEvent.click(addButton("a"));
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(addButton("a").getAttribute("aria-pressed")).toBe("false");
  });

  it("expõe aria-label e tooltip acessíveis", () => {
    render(<Harness quote={quoteOf([svc("a")])} />);
    expect(addButton("a").getAttribute("aria-label")).toBe("Adicionar à solicitação de reserva");
    expect(addButton("a").getAttribute("title")).toBe("Adicionar à solicitação de reserva");
    expect(addButton("a").className).toContain("h-[52px]");
    expect(addButton("a").className).toContain("w-[52px]");
    expect(addButton("a").className).toContain("bg-primary");
    // carrinho branco + bolha do "+"
    expect(addButton("a").querySelector("svg.lucide-shopping-cart")).toBeTruthy();
    expect(addButton("a").querySelector("span.bg-card svg")).toBeTruthy();
  });

  it("estado selecionado usa cor semântica de sucesso com check", () => {
    render(<Harness quote={quoteOf([svc("a")])} />);
    fireEvent.click(addButton("a"));
    const btn = addButton("a");
    expect(btn.className).toContain("bg-success");
    expect(btn.querySelector("svg.lucide-check")).toBeTruthy();
    expect(btn.getAttribute("aria-label")).toContain("remover");
  });

  it("serviço incluído aparece como não interativo", () => {
    render(<Harness quote={quoteOf([svc("req", { selection_mode: "required" })])} />);
    const el = document.querySelector('[data-booking-inline-action="locked"]')!;
    expect(el.tagName).not.toBe("BUTTON");
    expect(el.textContent).toContain("Incluído");
    expect((el as HTMLElement).className).not.toContain("bg-primary");
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("escolha única obrigatória troca automaticamente e não esvazia", () => {
    const groups = [
      { id: "g", title: "Hotel", group_type: "alternative", min_select: 1, max_select: 1 },
    ];
    render(
      <Harness
        quote={quoteOf(
          [
            svc("a", { selection_mode: "alternative", choice_group_id: "g" }),
            svc("b", { selection_mode: "alternative", choice_group_id: "g" }),
          ],
          groups,
        )}
      />,
    );
    fireEvent.click(addButton("a"));
    expect(screen.getByTestId("effective").textContent).toBe("a");
    fireEvent.click(addButton("b"));
    expect(screen.getByTestId("effective").textContent).toBe("b");
    // clicar de novo na selecionada não pode esvaziar o conjunto obrigatório
    fireEvent.click(addButton("b"));
    expect(screen.getByTestId("effective").textContent).toBe("b");
  });

  it("escolha única opcional permite remover", () => {
    const groups = [
      { id: "g", title: "Hotel", group_type: "alternative", min_select: 0, max_select: 1 },
    ];
    render(
      <Harness
        quote={quoteOf(
          [
            svc("a", { selection_mode: "alternative", choice_group_id: "g" }),
            svc("b", { selection_mode: "alternative", choice_group_id: "g" }),
          ],
          groups,
        )}
      />,
    );
    fireEvent.click(addButton("a"));
    fireEvent.click(addButton("a"));
    expect(screen.getByTestId("effective").textContent).toBe("");
  });

  it("múltipla escolha no limite informa e não descarta item silenciosamente", () => {
    const groups = [
      { id: "g", title: "Extras", group_type: "free", min_select: 0, max_select: 2 },
    ];
    render(
      <Harness
        quote={quoteOf(
          [
            svc("a", { selection_mode: "free", choice_group_id: "g" }),
            svc("b", { selection_mode: "free", choice_group_id: "g" }),
            svc("c", { selection_mode: "free", choice_group_id: "g" }),
          ],
          groups,
        )}
      />,
    );
    fireEvent.click(addButton("a"));
    fireEvent.click(addButton("b"));
    fireEvent.click(addButton("c"));
    expect(screen.getByTestId("effective").textContent).toBe("a,b");
    expect(screen.getByTestId("notice").textContent).not.toBe("");
  });

  it("persiste a seleção em localStorage e retoma na remontagem", () => {
    const quote = quoteOf([svc("a"), svc("b")]);
    const view = render(<Harness quote={quote} />);
    fireEvent.click(addButton("a"));
    expect(localStorage.getItem(showcaseStorageKey("q1"))).toContain("a");
    view.unmount();

    render(<Harness quote={quote} />);
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(addButton("a").getAttribute("aria-pressed")).toBe("true");
  });
});

describe("carrinho persistente e modal amplo", () => {
  it("carrinho fixo e CTA pós-condições abrem o mesmo modal", async () => {
    render(<Harness quote={quoteOf([svc("a")])} />);
    expect(document.querySelector("[data-booking-cart-dialog]")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Ver meu carrinho/i }));
    await waitFor(() =>
      expect(document.querySelectorAll("[data-booking-cart-dialog]").length).toBe(1),
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Continuar escolhendo/i })[0]);
    await waitFor(() => expect(document.querySelector("[data-booking-cart-dialog]")).toBeNull());

    fireEvent.click(
      screen.getAllByRole("button", { name: /Abrir minha solicitação de reserva/i })[0],
    );
    await waitFor(() =>
      expect(document.querySelectorAll("[data-booking-cart-dialog]").length).toBe(1),
    );
  });

  it("carrinho continua acessível com zero itens e mostra estado vazio", async () => {
    render(<Harness quote={quoteOf([svc("a")])} />);
    fireEvent.click(screen.getByRole("button", { name: /Ver meu carrinho/i }));
    expect(await screen.findByText(/Sua seleção está vazia/i)).toBeTruthy();
  });

  it("remove um item de dentro do modal", async () => {
    render(<Harness quote={quoteOf([svc("a"), svc("b")])} />);
    fireEvent.click(addButton("a"));
    fireEvent.click(screen.getByRole("button", { name: /Ver meu carrinho/i }));
    const removeBtn = await screen.findByRole("button", { name: /Remover .* da solicitação/i });
    fireEvent.click(removeBtn);
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("oculta valores individuais em pacote com valor fechado", async () => {
    render(
      <Harness
        quote={quoteOf([svc("a", { amount: 1234, selection_mode: "required" })], [], {
          pricing_mode: "package",
          investment_summary_layout: "consolidated",
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Ver meu carrinho/i }));
    await screen.findByText(/Minha solicitação de reserva/i);
    expect(document.body.textContent).not.toContain("1.234");
  });

  it("envia exatamente os serviços escolhidos pelo fluxo existente", async () => {
    render(<Harness quote={quoteOf([svc("a"), svc("b")])} />);
    fireEvent.click(addButton("a"));
    fireEvent.click(screen.getByRole("button", { name: /Ver meu carrinho/i }));

    fireEvent.change(await screen.findByLabelText(/Nome completo/i), {
      target: { value: "Maria Teste" },
    });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: "maria@teste.com" } });
    fireEvent.click(screen.getByLabelText(/Aceito o aviso/i));
    fireEvent.click(screen.getByRole("button", { name: /Enviar solicitação de reserva/i }));

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const [fn, opts] = invoke.mock.calls[0];
    expect(fn).toBe("submit-booking-request");
    expect(opts.body.selected_service_ids).toEqual(["a"]);
    expect(opts.body.code).toBe("CODE123");
    expect(opts.body.disclaimer_accepted).toBe(true);
    expect(typeof opts.body.idempotency_key).toBe("string");
    expect((await screen.findAllByText(/Solicitação enviada/i)).length).toBeGreaterThan(0);
  });
});

describe("microinteração voou para o carrinho", () => {
  it("cria e remove a bolha sem deixar órfãos", () => {
    const target = document.createElement("div");
    target.setAttribute(BOOKING_CART_TARGET_ATTR, "desktop");
    document.body.appendChild(target);
    expect(findCartTarget()).toBe(target);

    const cleanupFly = flyToCart(rect(0, 0, 40, 40), rect(300, 600, 50, 50));
    expect(document.querySelectorAll(`[${BOOKING_FLY_ATTR}]`).length).toBe(1);
    cleanupFly();
    expect(document.querySelectorAll(`[${BOOKING_FLY_ATTR}]`).length).toBe(0);
    target.remove();
  });

  it("com prefers-reduced-motion não anima nada", () => {
    const fakeWin = { matchMedia: () => ({ matches: true }) } as any;
    expect(prefersReducedMotion(fakeWin)).toBe(true);
    flyToCart(rect(0, 0, 10, 10), rect(10, 10, 10, 10), { window: fakeWin });
    expect(document.querySelectorAll(`[${BOOKING_FLY_ATTR}]`).length).toBe(0);
  });

  it("usa coordenadas reais e não roda sem origem/destino", () => {
    expect(flyToCart(null, rect(1, 1, 1, 1))()).toBeUndefined();
    expect(document.querySelectorAll(`[${BOOKING_FLY_ATTR}]`).length).toBe(0);
  });
});

describe("remoção da vitrine duplicada", () => {
  it("os componentes da segunda vitrine e da barra larga não existem mais", () => {
    expect(existsSync("src/components/quote/QuoteBookingRequestPanel.tsx")).toBe(false);
    expect(existsSync("src/components/quote/booking/QuoteBookingShowcase.tsx")).toBe(false);
    expect(existsSync("src/components/quote/booking/MySelectionPanel.tsx")).toBe(false);
    expect(existsSync("src/components/quote/booking/BookingServiceCard.tsx")).toBe(false);
    expect(existsSync("src/components/quote/QuoteBookingWizardDialog.tsx")).toBe(false);
  });

  it("a página pública não renderiza o bloco 'Próximo passo — escolha o que deseja reservar'", () => {
    const page = readFileSync("src/pages/OrcamentoPublico.tsx", "utf8");
    expect(page).not.toContain("QuoteBookingRequestPanel");
    expect(page).not.toContain("Escolha o que deseja reservar");
    expect(page).toContain("<BookingCartCta />");
    expect(page).toContain("<BookingServiceActionRow service={service} />");
  });

  it("as regras puras da vitrine continuam disponíveis", () => {
    const rules = readFileSync("src/lib/quoteBookingShowcase.ts", "utf8");
    expect(rules).toContain("export function buildBookingShowcase");
    expect(rules).toContain("export function showcaseValidation");
  });
});
