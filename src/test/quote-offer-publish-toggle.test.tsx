import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const state = vi.hoisted(() => ({ offer: null as null | { id: string; display_channels: string[] } }));
vi.mock("@/hooks/useOffers", () => ({ useOffersEnabled: () => ({ enabled: true }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.offer }) }) }) }) } }));
vi.mock("@/components/offers/OfferChannelPicker", () => ({ OfferChannelPicker: ({ value }: { value: string[] }) => <output data-testid="channels">{value.join(",")}</output> }));
import { QuoteOfferPublishToggle } from "@/components/quote/QuoteOfferPublishToggle";

function mount(optIn: boolean | null = false, optOut = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><QuoteOfferPublishToggle quoteId="quote-1" optIn={optIn} optOut={optOut} channels={["ofertas"]} /></QueryClientProvider>);
}

describe("legacy offer publishing preference", () => {
  beforeEach(() => { state.offer = null; });
  it("keeps new quotes off by default", () => {
    mount();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByTestId("channels")).toBeNull();
  });
  it.each([false, null])("shows an existing offer even when the new opt-in field is %s", async (optIn) => {
    state.offer = { id: "offer-1", display_channels: ["novembro"] };
    mount(optIn);
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
    expect(screen.getByTestId("channels")).toHaveTextContent("novembro");
  });
  it("honors explicit opt-out even when an old offer exists", async () => {
    state.offer = { id: "offer-1", display_channels: ["novembro"] };
    mount(false, true);
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false"));
    expect(screen.queryByTestId("channels")).toBeNull();
  });
});
