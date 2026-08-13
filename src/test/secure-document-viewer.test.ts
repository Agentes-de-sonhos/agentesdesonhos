vi.mock("@/lib/secureVoucher", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/secureVoucher")>();
  return { ...actual, getPublicVoucherUrl: vi.fn(async () => "https://proj.supabase.co/signed/legacy.pdf") };
});

import { getPublicVoucherUrl } from "@/lib/secureVoucher";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchSecureDocument,
  downloadSecureDocument,
  fileNameFromDisposition,
  resolveDocumentKind,
  revokeObjectUrl,
  SECURE_DOCUMENT_ERROR,
} from "@/lib/secureDocumentFetch";

const SUPABASE_URL = "https://proj.supabase.co";

const created: string[] = [];
const revoked: string[] = [];

function mockBlobUrls() {
  URL.createObjectURL = (b: Blob) => {
    const u = `blob:local/${created.length}-${b.type || "bin"}`;
    created.push(u);
    return u;
  };
  URL.revokeObjectURL = (u: string) => revoked.push(u);
}

function mockFetch(body: BodyInit, init?: ResponseInit) {
  const spy = vi.fn(async (...args: unknown[]) => {
    void args;
    return new Response(body, init);
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

beforeEach(() => {
  created.length = 0;
  revoked.length = 0;
  mockBlobUrls();
  vi.stubEnv("VITE_SUPABASE_URL", SUPABASE_URL);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const source = {
  filePath: "user-1/voucher.pdf",
  fileName: "voucher.pdf",
  mode: "public" as const,
  shareToken: "a".repeat(32),
};

describe("fetchSecureDocument", () => {
  it("PDF: retorna blob URL local e nunca a URL do Supabase", async () => {
    const spy = mockFetch(new Blob(["%PDF-1.4"], { type: "application/pdf" }), {
      status: 200,
      headers: { "content-type": "application/pdf" },
    });
    const doc = await fetchSecureDocument(source);
    expect(doc.objectUrl.startsWith("blob:")).toBe(true);
    expect(doc.objectUrl).not.toContain("supabase.co");
    expect(doc.kind).toBe("pdf");
    // o endpoint seguro é usado apenas internamente no fetch
    expect(String((spy.mock.calls[0] as unknown[])[0])).toContain("/functions/v1/serve-voucher");
  });

  it("imagem: usa blob URL e detecta o tipo pelo content-type", async () => {
    mockFetch(new Blob(["img"], { type: "image/png" }), {
      status: 200,
      headers: { "content-type": "image/png" },
    });
    const doc = await fetchSecureDocument({ ...source, filePath: "user-1/foto", fileName: "foto" });
    expect(doc.kind).toBe("image");
    expect(doc.objectUrl.startsWith("blob:")).toBe(true);
  });

  it("formato não visualizável recebe kind file", async () => {
    mockFetch(new Blob(["x"], { type: "application/octet-stream" }), { status: 200 });
    const doc = await fetchSecureDocument({ ...source, fileName: "planilha.zip" });
    expect(doc.kind).toBe("file");
  });

  it("403/404 gera mensagem amigável", async () => {
    mockFetch("nope", { status: 403 });
    await expect(fetchSecureDocument(source)).rejects.toThrow(SECURE_DOCUMENT_ERROR);
    mockFetch("nope", { status: 404 });
    await expect(fetchSecureDocument(source)).rejects.toThrow(SECURE_DOCUMENT_ERROR);
  });

  it("sem shareToken não monta URL e falha amigavelmente", async () => {
    mockFetch(new Blob(["x"]), { status: 200 });
    await expect(
      fetchSecureDocument({ ...source, shareToken: undefined, slug: undefined, password: undefined }),
    ).rejects.toThrow(SECURE_DOCUMENT_ERROR);
  });

  it("acesso público por shareToken usa o proxy serve-voucher (caminho rápido)", async () => {
    const spy = mockFetch(new Blob(["%PDF"], { type: "application/pdf" }), { status: 200 });
    await fetchSecureDocument(source);
    expect(String((spy.mock.calls[0] as unknown[])[0])).toContain("serve-voucher");
    expect(getPublicVoucherUrl).not.toHaveBeenCalled();
  });

  it("fallback slug/senha usa URL assinada apenas internamente", async () => {
    const spy = mockFetch(new Blob(["%PDF"], { type: "application/pdf" }), { status: 200 });
    const doc = await fetchSecureDocument({
      filePath: "user-1/voucher.pdf",
      fileName: "voucher.pdf",
      mode: "public",
      slug: "minha-agencia",
      password: "1234",
    });
    expect(getPublicVoucherUrl).toHaveBeenCalledWith("user-1/voucher.pdf", {
      slug: "minha-agencia",
      share_token: undefined,
      password: "1234",
    });
    expect(String((spy.mock.calls[0] as unknown[])[0])).toContain("/signed/legacy.pdf");
    // a URL assinada nunca é exposta para navegação
    expect(doc.objectUrl.startsWith("blob:")).toBe(true);
  });
});

describe("downloadSecureDocument", () => {
  it("baixa via anchor temporário, preserva o nome e não navega", async () => {
    vi.useFakeTimers();
    mockFetch(new Blob(["%PDF"], { type: "application/pdf" }), { status: 200 });
    const clicks: { href: string; download: string }[] = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLAnchorElement;
      if (tag === "a") {
        el.click = () => clicks.push({ href: el.href, download: el.download });
      }
      return el;
    });

    await downloadSecureDocument(source);
    expect(clicks).toHaveLength(1);
    expect(clicks[0].download).toBe("voucher.pdf");
    expect(clicks[0].href).not.toContain("supabase.co");
    expect(clicks[0].href.startsWith("blob:")).toBe(true);

    vi.advanceTimersByTime(11_000);
    expect(revoked).toContain(created[0]);
  });
});

describe("helpers", () => {
  it("revokeObjectUrl só libera blob URLs", () => {
    revokeObjectUrl("https://proj.supabase.co/x");
    revokeObjectUrl("blob:local/9");
    expect(revoked).toEqual(["blob:local/9"]);
  });

  it("extrai nome do content-disposition", () => {
    expect(fileNameFromDisposition('inline; filename="voucher final.pdf"')).toBe("voucher final.pdf");
    expect(fileNameFromDisposition("inline; filename*=UTF-8''passagem%20a%C3%A9rea.pdf")).toBe(
      "passagem aérea.pdf",
    );
    expect(fileNameFromDisposition(null)).toBeNull();
  });

  it("resolveDocumentKind prioriza content-type e cai no nome", () => {
    expect(resolveDocumentKind("x.bin", "application/pdf")).toBe("pdf");
    expect(resolveDocumentKind("foto.jpg", null)).toBe("image");
    expect(resolveDocumentKind("arquivo", null)).toBe("file");
  });
});