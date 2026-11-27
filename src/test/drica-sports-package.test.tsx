import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AgencySportsEventsSection } from "@/components/whitelabel/AgencySportsEventsSection";

it("hides only the Sul-Americana offer when opted out", () => {
  const onRequest = vi.fn();
  const { rerender } = render(<AgencySportsEventsSection container="" onRequest={onRequest} hideSulAmericana2026 />);
  expect(screen.queryByRole("button", { name: /Ir para Final da Sul-Americana/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Próximo pacote" }));
  fireEvent.click(screen.getByRole("button", { name: /Ver pacote Clássicos Londrinos/ }));
  expect(onRequest).toHaveBeenCalledWith(expect.objectContaining({ key: "classicos-londrinos-2027" }));
  rerender(<AgencySportsEventsSection container="" onRequest={onRequest} />);
  expect(screen.getByRole("button", { name: /Ir para Final da Sul-Americana/ })).toBeInTheDocument();
});
