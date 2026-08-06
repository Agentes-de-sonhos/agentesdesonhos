import { describe, it, expect } from "vitest";
import {
  parseDriveFolderUrl,
  isSupportedMimeType,
  materialTypeFromMime,
  summarizeImportOutcomes,
  formatFileSize,
} from "@/lib/materials/driveFolder";

describe("parseDriveFolderUrl", () => {
  it("aceita link padrão de pasta", () => {
    const r = parseDriveFolderUrl("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnO?usp=sharing");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.folderId).toBe("1AbCdEfGhIjKlMnO");
      expect(r.normalizedUrl).toBe("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnO");
    }
  });

  it("aceita link com ?id=", () => {
    const r = parseDriveFolderUrl("https://drive.google.com/open?id=1AbCdEfGhIjKlMnO");
    expect(r.ok).toBe(true);
  });

  it("aceita o ID puro", () => {
    const r = parseDriveFolderUrl("1AbCdEfGhIjKlMnO");
    expect(r.ok).toBe(true);
  });

  it("rejeita domínio fora do Google Drive", () => {
    const r = parseDriveFolderUrl("https://dropbox.com/folders/abc123456789");
    expect(r.ok).toBe(false);
  });

  it("rejeita link sem ID de pasta", () => {
    const r = parseDriveFolderUrl("https://drive.google.com/drive/my-drive");
    expect(r.ok).toBe(false);
  });

  it("rejeita valor vazio", () => {
    expect(parseDriveFolderUrl("").ok).toBe(false);
  });
});

describe("tipos suportados", () => {
  it("aceita imagens e pdf", () => {
    ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"].forEach((m) =>
      expect(isSupportedMimeType(m)).toBe(true),
    );
  });

  it("rejeita pastas, vídeos e docs do Google", () => {
    ["application/vnd.google-apps.folder", "video/mp4", "application/vnd.google-apps.document", null].forEach((m) =>
      expect(isSupportedMimeType(m as string)).toBe(false),
    );
  });

  it("mapeia material_type", () => {
    expect(materialTypeFromMime("image/png")).toBe("Imagem");
    expect(materialTypeFromMime("application/pdf")).toBe("PDF");
  });
});

describe("resultado da importação", () => {
  it("resume adicionados, existentes, ignorados e falhas", () => {
    const summary = summarizeImportOutcomes([
      { fileId: "a", fileName: "a.png", status: "added" },
      { fileId: "a", fileName: "a.png", status: "existing" },
      { fileId: "b", fileName: "b.mp4", status: "ignored" },
      { fileId: "c", fileName: "c.pdf", status: "failed" },
    ]);
    expect(summary).toEqual({ totalFound: 4, added: 1, existing: 1, ignored: 1, failed: 1 });
  });

  it("formata tamanhos", () => {
    expect(formatFileSize(null)).toBe("—");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});