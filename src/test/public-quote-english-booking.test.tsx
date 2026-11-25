import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }));
import { BookingCartProvider, useBookingCart } from "@/components/quote/booking/BookingCartContext";
import { BookingCartDialog } from "@/components/quote/booking/BookingCartDialog";
import { Button } from "@/components/ui/button";
import { translateQuote } from "@/i18n/publicMaterials/quote";
import type { Quote } from "@/types/quote";

const quote = { id: "english-confirmation-test", booking_requests_enabled: true, has_linked_client: true, currency: "BRL", show_detailed_prices: true, public_access_code: "test-code", sections: [], choice_groups: [], services: [{ id: "air", service_type: "flight", amount: 2722, selection_mode: "required", service_data: { airline: "Azul Linhas Aéreas", departure_date: "2027-09-10", return_date: "2027-09-14" } }] } as unknown as Quote;
function Controls() {
  const cart = useBookingCart();
  return <Button onClick={cart.openCart}>Open test cart</Button>;
}
function Harness({ locale = "en-US" }: { locale?: string }) {
  return <BookingCartProvider quote={quote} locale={locale} agencySlugOverride="test-agency" accessCodeOverride="test-code"><Controls /><BookingCartDialog /></BookingCartProvider>;
}
beforeEach(() => { invoke.mockReset(); localStorage.clear(); });
afterEach(cleanup);

describe("English public booking feedback (mocked service only, no real submissions)", () => {
  it("requires agreement before invoking the existing request contract, then reads back success", async () => {
    invoke.mockResolvedValue({ data: { protocol: "TEST-EN", file_number: 7 }, error: null });
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open test cart" }));
    const t = translateQuote("en-US");
    const send = screen.getByRole("button", { name: t("sendBookingRequest") });
    expect(send).toBeDisabled();
    expect(invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: t("acceptBookingDisclaimer") }));
    expect(send).toBeEnabled();
    fireEvent.click(send);
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const [name, args] = invoke.mock.calls[0];
    expect(name).toBe("submit-booking-request");
    expect(args.body.selected_service_ids).toEqual(["air"]);
    expect(args.body.disclaimer_accepted).toBe(true);
    expect(args.body.client_name).toBe("");
    await waitFor(() => expect(screen.getByRole("heading", { name: t("requestSentToAgency") })).toBeInTheDocument());
    expect(screen.getByText("Azul Linhas Aéreas")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: t("close") })[0]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("does not leak Portuguese server errors into English feedback", async () => {
    invoke.mockResolvedValue({ data: { error: "Não foi possível processar a solicitação." }, error: null });
    render(<Harness />);
    const t = translateQuote("en-US");
    fireEvent.click(screen.getByRole("button", { name: "Open test cart" }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: t("sendBookingRequest") }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(t("couldNotSendRequest")));
    expect(screen.queryByRole("heading", { name: t("requestSentToAgency") })).not.toBeInTheDocument();
  });
});
