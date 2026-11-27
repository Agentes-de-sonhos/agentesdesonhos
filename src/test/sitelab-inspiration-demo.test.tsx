import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SITELAB_DEMO_HOSTNAME, isSiteLabDemoHost } from "@/lib/sitelabModels";
import { AgencyInspirationDialog } from "@/components/whitelabel/AgencyInspirationDialog";

const submit = vi.fn();
const reset = vi.fn();
const hookValue = { state: "idle" as const, error: null, submit, reset };

vi.mock("@/hooks/useAgencySiteRequest", () => ({
  useAgencySiteRequest: () => hookValue,
}));

function fill() {
  fireEvent.change(screen.getByLabelText("Primeiro nome"), { target: { value: "Ana" } });
  fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "11988887777" } });
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@email.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
}

beforeEach(() => submit.mockReset());

describe("helper central do Site Lab", () => {
  it("reconhece apenas o hostname sintético", () => {
    expect(isSiteLabDemoHost(SITELAB_DEMO_HOSTNAME)).toBe(true);
    expect(isSiteLabDemoHost("100limites.tur.br")).toBe(false);
  });
});

describe("captação de inspirações — Site Lab", () => {
  it("não chama o endpoint e mostra o sucesso demonstrativo", async () => {
    render(
      <AgencyInspirationDialog
        open
        onOpenChange={() => {}}
        hostname={SITELAB_DEMO_HOSTNAME}
        agencyName="SiteLab Base"
      />,
    );
    expect(screen.getByText("Demonstração: nenhum dado será enviado.")).toBeTruthy();
    fill();
    await waitFor(() =>
      expect(screen.getByText("Pronto! Você receberá nossas próximas inspirações.")).toBeTruthy(),
    );
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("captação de inspirações — agência real", () => {
  it("grava antes de redirecionar", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign },
      writable: true,
    });
    submit.mockResolvedValue({ success: true });

    render(
      <AgencyInspirationDialog
        open
        onOpenChange={() => {}}
        hostname="100limites.tur.br"
        agencyName="100 Limites"
        groupUrl="https://chat.whatsapp.com/ABC123"
      />,
    );
    expect(screen.queryByText("Demonstração: nenhum dado será enviado.")).toBeNull();
    fill();
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://chat.whatsapp.com/ABC123"));
  });

  it("não redireciona quando a gravação falha", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign },
      writable: true,
    });
    submit.mockResolvedValue({ error: true });

    render(
      <AgencyInspirationDialog
        open
        onOpenChange={() => {}}
        hostname="100limites.tur.br"
        agencyName="100 Limites"
        groupUrl="https://chat.whatsapp.com/ABC123"
      />,
    );
    fill();
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("grupo da Bagagem na Mão", () => {
  const openDialog = () => render(
    <AgencyInspirationDialog open onOpenChange={() => {}} hostname="bagagemnamao.com.br"
      agencyName="Bagagem na Mão" requireCrmGroupAccess />,
  );

  it("só mostra o convite depois da confirmação do CRM e aguarda clique do visitante", async () => {
    const invite = "https://chat.whatsapp.com/ABC123";
    submit.mockResolvedValue({ success: true, group_access_url: invite });
    openDialog();
    expect(screen.queryByRole("link", { name: "Abrir grupo no WhatsApp" })).toBeNull();
    fill();
    const link = await screen.findByRole("link", { name: "Abrir grupo no WhatsApp" });
    expect(link).toHaveAttribute("href", invite);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ consent: true, service_key: "inspiracoes" }), { confirmBagagemGroup: true });
  });

  it("não libera o grupo com sucesso genérico, sem confirmação do CRM", async () => {
    submit.mockResolvedValue({ success: true });
    openDialog();
    fill();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível confirmar");
    expect(screen.queryByRole("link", { name: "Abrir grupo no WhatsApp" })).toBeNull();
  });
});
