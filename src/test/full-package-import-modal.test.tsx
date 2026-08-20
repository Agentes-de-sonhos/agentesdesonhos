import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const invokeMock = vi.fn();
const uploadMock = vi.fn(async () => ({ error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
    storage: { from: () => ({ upload: uploadMock }) },
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

const extractPdfTextMock = vi.fn(async () => `--- Página 1 ---\n${"Hotel Ibis Paris 10 Jul 2026 ".repeat(60)}`);
vi.mock("@/lib/pdfText", () => ({ extractPdfText: () => extractPdfTextMock() }));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { FullPackageImportModal } from "@/components/quote/full-package-import/FullPackageImportModal";

function pdfFile(name = "pacote.pdf") {
  return new File([new Uint8Array([37, 80, 68, 70])], name, { type: "application/pdf" });
}

const successBody = {
  success: true,
  import_id: "imp-1",
  source_kind: "pdf",
  expected_types: ["hotel"],
  expected_missing: [],
  unexpected_extra: [],
  blocks: [
    {
      id: "blk_0",
      type: "hotel",
      confidence: 0.9,
      label: "Hotel Ibis Paris",
      raw_excerpt: "",
      missing_fields: [],
      unexpected: false,
      data: { nome_hotel: "Hotel Ibis Paris", check_in: "2026-07-10", check_out: "2026-07-14", valor_total: 1000 },
    },
  ],
  trip_meta: {},
  warnings: [],
};

async function openAndStart(user: ReturnType<typeof userEvent.setup>) {
  render(
    <FullPackageImportModal open onOpenChange={() => {}} onConfirmService={async () => {}} />,
  );
  await user.click(screen.getByLabelText(/Hospedagem/i, { selector: "button" }).closest("label") ? screen.getByText("Hospedagem") : screen.getByText("Hospedagem"));
  await user.click(screen.getByRole("button", { name: /Avançar/i }));
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, pdfFile());
  await user.click(screen.getByRole("button", { name: /Analisar com IA/i }));
}

describe("FullPackageImportModal — timeout, cancelamento e payload", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    uploadMock.mockClear();
    extractPdfTextMock.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("PDF com texto suficiente: envia texto e NÃO envia base64", async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValue({ data: successBody, error: null });
    await openAndStart(user);

    await waitFor(() => expect(invokeMock).toHaveBeenCalled());
    const body = invokeMock.mock.calls[0][1].body;
    expect(body.fileBase64).toBeUndefined();
    expect(String(body.text).length).toBeGreaterThan(800);
    expect(invokeMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    // sucesso avança para o resumo
    await waitFor(() => expect(screen.getByText(/Hotel Ibis Paris/i)).toBeTruthy());
  });

  it("PDF com texto insuficiente: gera base64 como fallback", async () => {
    const user = userEvent.setup();
    extractPdfTextMock.mockResolvedValueOnce("--- Página 1 ---\n   ");
    invokeMock.mockResolvedValue({ data: successBody, error: null });
    await openAndStart(user);

    await waitFor(() => expect(invokeMock).toHaveBeenCalled());
    const body = invokeMock.mock.calls[0][1].body;
    expect(typeof body.fileBase64).toBe("string");
    expect(body.fileBase64.length).toBeGreaterThan(0);
  });

  it("cancelamento encerra o loading sem gravar resultado", async () => {
    const user = userEvent.setup();
    invokeMock.mockImplementation((_name: string, opts: any) =>
      new Promise((_resolve, reject) => {
        opts.signal.addEventListener("abort", () =>
          reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
        );
      }),
    );
    await openAndStart(user);

    const cancelButtons = await waitFor(() => screen.getAllByRole("button", { name: /Cancelar importação/i }));
    await user.click(cancelButtons[0]);

    await waitFor(() => expect(screen.getByRole("button", { name: /Analisar com IA/i })).toBeTruthy());
    expect(screen.getByText(/Importação cancelada/i)).toBeTruthy();
    expect(screen.queryByText(/Hotel Ibis Paris/i)).toBeNull();
  });

  it("erro do backend (504) volta ao passo de origem com mensagem de timeout", async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        context: {
          json: async () => ({
            success: false,
            error_type: "ai_timeout",
            error_message: "A análise ultrapassou o tempo esperado. Tente novamente ou use um PDF menor.",
          }),
        },
      },
    });
    await openAndStart(user);

    await waitFor(() => expect(screen.getByRole("button", { name: /Analisar com IA/i })).toBeTruthy());
    expect(screen.getByText(/ultrapassou o tempo esperado/i)).toBeTruthy();
  });
});

describe("FullPackageImportModal — timeout do cliente (90s)", () => {
  it("encerra o loading e permite tentar novamente", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    invokeMock.mockReset();
    invokeMock.mockImplementation((_name: string, opts: any) =>
      new Promise((_resolve, reject) => {
        opts.signal.addEventListener("abort", () =>
          reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
        );
      }),
    );
    await openAndStart(user);
    await vi.advanceTimersByTimeAsync(21_000);
    expect(screen.getByText(/demorando um pouco mais que o normal/i)).toBeTruthy();
    await vi.advanceTimersByTimeAsync(70_000);
    await vi.waitFor(() => expect(screen.getByRole("button", { name: /Analisar com IA/i })).toBeTruthy());
    expect(screen.getByText(/ultrapassou o tempo esperado/i)).toBeTruthy();
    vi.useRealTimers();
  });
});
