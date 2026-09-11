import { describe, it, expect } from "vitest";
import {
  buildDuplicatedVoucherPath,
  createAssetCopyTracker,
  duplicateAttachmentList,
  duplicateUrlList,
  duplicateVoucherFile,
  isVoucherStoragePath,
  rollbackCopiedAssets,
  type StorageClientLike,
} from "@/lib/walletDuplicateAssets";

function makeClient(opts: { failCopyFor?: string[]; failDownload?: boolean } = {}) {
  const copies: { from: string; to: string }[] = [];
  const removed: string[] = [];
  const client: StorageClientLike = {
    storage: {
      from: () => ({
        copy: async (from: string, to: string) => {
          if (opts.failCopyFor?.includes(from)) return { error: new Error("copy failed") };
          copies.push({ from, to });
          return { error: null };
        },
        download: async () => (opts.failDownload
          ? { data: null, error: new Error("no file") }
          : { data: new Blob(["x"], { type: "application/pdf" }), error: null }),
        upload: async (to: string) => {
          copies.push({ from: "download-fallback", to });
          return { error: null };
        },
        remove: async (paths: string[]) => {
          removed.push(...paths);
          return { error: null };
        },
      }),
    },
  };
  return { client, copies, removed };
}

describe("caminhos de anexo", () => {
  it("reconhece somente caminhos internos do bucket", () => {
    expect(isVoucherStoragePath("user-1/trip-1/a.pdf")).toBe(true);
    expect(isVoucherStoragePath("https://cdn.site/x.pdf")).toBe(false);
    expect(isVoucherStoragePath("/user-1/a.pdf")).toBe(false);
    expect(isVoucherStoragePath("../secret.pdf")).toBe(false);
    expect(isVoucherStoragePath("semBarra.pdf")).toBe(false);
    expect(isVoucherStoragePath(null)).toBe(false);
  });

  it("gera caminho na pasta da nova carteira preservando extensão", () => {
    const path = buildDuplicatedVoucherPath("u1", "t2", "u1/t1/abc.PDF");
    expect(path.startsWith("u1/t2/")).toBe(true);
    expect(path.endsWith(".pdf")).toBe(true);
    expect(path).not.toContain("abc");
  });
});

describe("cópia de arquivos", () => {
  it("copia voucher para novo caminho independente", async () => {
    const { client, copies } = makeClient();
    const tracker = createAssetCopyTracker();
    const newPath = await duplicateVoucherFile(client, "u1/t1/v.pdf", "u1", "t2", tracker);
    expect(newPath).not.toBe("u1/t1/v.pdf");
    expect(copies).toEqual([{ from: "u1/t1/v.pdf", to: newPath }]);
    expect(tracker.copiedPaths).toEqual([newPath]);
  });

  it("usa download+upload quando copy falha", async () => {
    const { client, copies } = makeClient({ failCopyFor: ["u1/t1/v.pdf"] });
    const tracker = createAssetCopyTracker();
    const newPath = await duplicateVoucherFile(client, "u1/t1/v.pdf", "u1", "t2", tracker);
    expect(copies).toEqual([{ from: "download-fallback", to: newPath }]);
  });

  it("falha com mensagem clara quando o arquivo não pode ser copiado", async () => {
    const { client } = makeClient({ failCopyFor: ["u1/t1/v.pdf"], failDownload: true });
    const tracker = createAssetCopyTracker();
    await expect(
      duplicateVoucherFile(client, "u1/t1/v.pdf", "u1", "t2", tracker),
    ).rejects.toThrow(/anexos/i);
    expect(tracker.copiedPaths).toEqual([]);
  });

  it("mantém URLs externas sem duplicar arquivo", async () => {
    const { client, copies } = makeClient();
    const tracker = createAssetCopyTracker();
    const url = "https://cdn.site/doc.pdf";
    expect(await duplicateVoucherFile(client, url, "u1", "t2", tracker)).toBe(url);
    expect(copies).toEqual([]);
  });

  it("duplica lista de anexos preservando nome, ordem e metadados", async () => {
    const { client } = makeClient();
    const tracker = createAssetCopyTracker();
    const result = await duplicateAttachmentList(
      client,
      [
        { url: "u1/t1/a.pdf", name: "Voucher A", mime_type: "application/pdf" },
        { url: "u1/t1/b.jpg", name: "Foto B" },
        null,
        { name: "sem url" },
      ],
      "u1",
      "t2",
      tracker,
    );
    expect(result.map((a) => a.name)).toEqual(["Voucher A", "Foto B"]);
    expect(result[0].mime_type).toBe("application/pdf");
    expect(result[0].url).not.toBe("u1/t1/a.pdf");
    expect(result[1].url.endsWith(".jpg")).toBe(true);
    expect(tracker.copiedPaths).toHaveLength(2);
  });

  it("carteira sem anexos não copia nada", async () => {
    const { client, copies } = makeClient();
    const tracker = createAssetCopyTracker();
    expect(await duplicateAttachmentList(client, null, "u1", "t2", tracker)).toEqual([]);
    expect(await duplicateUrlList(client, undefined, "u1", "t2", tracker)).toBeNull();
    expect(copies).toEqual([]);
  });

  it("limpeza compensatória remove os arquivos já copiados", async () => {
    const { client, removed } = makeClient();
    const tracker = createAssetCopyTracker();
    await duplicateVoucherFile(client, "u1/t1/a.pdf", "u1", "t2", tracker);
    await duplicateVoucherFile(client, "u1/t1/b.pdf", "u1", "t2", tracker);
    const copied = [...tracker.copiedPaths];
    await rollbackCopiedAssets(client, tracker);
    expect(removed).toEqual(copied);
    expect(tracker.copiedPaths).toEqual([]);
  });
});
