import { describe, it, expect } from "vitest";
import { collectServiceDocuments, formatDocumentSize, getDocumentKind } from "@/lib/serviceDocuments";

describe("collectServiceDocuments", () => {
  it("returns empty list when there are no documents", () => {
    expect(collectServiceDocuments({ service_type: "hotel", service_data: {} })).toEqual([]);
    expect(collectServiceDocuments(null)).toEqual([]);
  });

  it("handles a single legacy voucher PDF (hospedagem)", () => {
    const docs = collectServiceDocuments({
      service_type: "hotel",
      voucher_url: "user/abc/Hotel Italia Monica Celia.pdf",
      voucher_name: "Hotel Italia Monica Celia.pdf",
      service_data: {},
    });
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ kind: "pdf", ext: "PDF", name: "Hotel Italia Monica Celia.pdf" });
  });

  it("handles multiple formats (passagem)", () => {
    const docs = collectServiceDocuments({
      service_type: "flight",
      attachments: [
        { url: "u/a/bilhete.pdf", name: "bilhete.pdf" },
        { url: "u/a/assento.png", name: "assento.png" },
        { url: "u/a/lista.xlsx", name: "lista.xlsx" },
        { url: "u/a/termo.docx", name: "termo.docx" },
      ],
      service_data: {},
    });
    expect(docs.map((d) => d.kind)).toEqual(["pdf", "image", "sheet", "doc"]);
  });

  it("dedupes the same file present in several legacy fields (transfer)", () => {
    const docs = collectServiceDocuments({
      service_type: "transfer",
      voucher_url: "u/a/voucher.pdf",
      attachments: [{ url: "https://x.co/storage/v1/object/vouchers/u/a/voucher.pdf?token=1", name: "voucher.pdf" }],
      service_data: {
        document_url: "u/a/voucher.pdf",
        attachment_url: "u/a/voucher.pdf?download=1",
        document_urls: ["u/a/voucher.pdf", "u/a/extra.pdf"],
      },
    });
    expect(docs.map((d) => d.name)).toEqual(["voucher.pdf", "extra.pdf"]);
  });

  it("keeps long names intact", () => {
    const long = `${"nome-muito-longo-".repeat(10)}final.pdf`;
    const docs = collectServiceDocuments({ attachments: [{ url: `u/${long}`, name: long }] });
    expect(docs[0].name).toBe(long);
  });

  it("falls back to the path basename when there is no name metadata", () => {
    const docs = collectServiceDocuments({ service_data: { file_url: "u/a/2026%2Fseguro.pdf" } });
    expect(docs[0].name).toBe("2026/seguro.pdf");
    expect(docs[0].size).toBeNull();
  });

  it("names unknown files generically and ignores unavailable entries", () => {
    const docs = collectServiceDocuments({
      attachments: [{ url: "  " }, { name: "sem-url.pdf" }, { url: "u/a/arquivo" }],
    });
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ kind: "file", ext: null });
  });

  it("supports string arrays and size metadata", () => {
    const docs = collectServiceDocuments({
      files: [{ file_url: "u/a/ing.pdf", file_name: "ingresso.pdf", file_size: 2048 }],
      service_data: { attachments: ["u/a/mapa.jpg"] },
    });
    expect(docs[0].size).toBe("2 KB");
    expect(docs[1].kind).toBe("image");
  });
});

describe("helpers", () => {
  it("formats sizes only when valid", () => {
    expect(formatDocumentSize(undefined)).toBeNull();
    expect(formatDocumentSize(0)).toBeNull();
    expect(formatDocumentSize(1536)).toBe("2 KB");
    expect(formatDocumentSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
  it("detects kinds", () => {
    expect(getDocumentKind("a.PDF")).toBe("pdf");
    expect(getDocumentKind("a.csv")).toBe("sheet");
    expect(getDocumentKind("a")).toBe("file");
  });
});
