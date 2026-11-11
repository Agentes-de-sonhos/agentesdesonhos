import { expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { Trip, TripService } from "@/types/trip";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { FormattedText } from "@/components/ui/formatted-text";
import { renderHotelPdf, renderFlightPdf } from "@/components/trip/tripPdfServices";
const note = '<p>Chegue <strong>30 minutos antes</strong></p><img src="x" onerror="alert(1)"><script>alert(2)</script>';
it("renderiza formatação pública sem tags literais nem código ativo", () => {
  const { container } = render(<FormattedText>{note}</FormattedText>);
  expect(container.querySelector("strong")?.textContent).toBe("30 minutos antes");
  expect(container.textContent).not.toContain("<p>");
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelector("img")?.hasAttribute("onerror")).toBe(false);
});
it.each(["hotel", "flight"])("PDF %s mantém notas formatadas e sanitizadas", (type) => {
  const service = { service_type: type, service_data: { hotel_name: "Teste", special_requests: note, boarding_notes: note }, attachments: [] } as unknown as TripService;
  const rendered = (type === "hotel" ? renderHotelPdf : renderFlightPdf)(service, { images: [], locale: "pt-BR" });
  expect(rendered.body).toContain("<strong>30 minutos antes</strong>");
  expect(rendered.body).not.toContain("&lt;p&gt;");
  expect(rendered.body).not.toMatch(/onerror=|<script/);
});
it.each(["attraction", "insurance", "cruise", "train", "other"])("PDF %s sanitiza orientações do editor rico", async (type) => {
  const { buildTripPdfHtml } = await import("@/components/trip/TripPDF");
  const html = buildTripPdfHtml({
    trip: { client_name: "Teste", destination: "Teste", start_date: "2026-11-11", end_date: "2026-11-12", services: [{ id: "synthetic", service_type: type, service_data: { usage_instructions: note, agency_tips: note, boarding_notes: note, description: note } }] } as unknown as Trip,
    profile: { name: "Teste" } as unknown as AgentProfile,
    locale: "pt-BR", resolveImg: () => null, documentUrl: () => "",
    modules: { show_signature: false, show_whatsapp: false }, signature: null,
    generatedAt: new Date("2026-11-11T12:00:00Z"),
  });
  expect(html).toContain("<strong>30 minutos antes</strong>");
  expect(html).not.toContain("&lt;p&gt;");
  expect(html).not.toMatch(/onerror=|<script/);
});
