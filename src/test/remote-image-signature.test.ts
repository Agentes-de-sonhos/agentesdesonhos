import { describe, it, expect } from "vitest";
import {
  sniffImageType,
  normalizeRemoteImageUrl,
  sha256Hex,
  extensionForContentType,
} from "../../supabase/functions/_shared/remote-image-fetch.ts";

const withPad = (head: number[]) => new Uint8Array([...head, ...Array(16).fill(0)]);

describe("assinatura real da imagem (magic bytes)", () => {
  it("reconhece JPEG, PNG, GIF, WEBP e AVIF", () => {
    expect(sniffImageType(withPad([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(withPad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffImageType(withPad([...[0x47, 0x49, 0x46, 0x38, 0x39, 0x61]]))).toBe("image/gif");
    const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
    expect(sniffImageType(withPad([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")]))).toBe("image/webp");
    expect(sniffImageType(withPad([0, 0, 0, 0x20, ...ascii("ftyp"), ...ascii("avif")]))).toBe("image/avif");
  });

  it("rejeita conteúdo não-imagem mesmo com header image/* falsificado", () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><html><body>oops</body></html>");
    expect(sniffImageType(html)).toBeNull();
    expect(sniffImageType(new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull(); // EXE
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull(); // truncado
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(sniffImageType(svg)).toBeNull();
  });

  it("extensão segue o tipo detectado", () => {
    expect(extensionForContentType("image/avif")).toBe("avif");
    expect(extensionForContentType("image/webp")).toBe("webp");
    expect(extensionForContentType("image/jpeg")).toBe("jpg");
  });
});

describe("identidade determinística da importação por URL", () => {
  it("normaliza a URL de origem de forma canônica", () => {
    expect(normalizeRemoteImageUrl("HTTPS://CDN.Example.com/a.jpg#frag")).toBe("https://cdn.example.com/a.jpg");
    expect(normalizeRemoteImageUrl("https://cdn.example.com/a.jpg/")).toBe("https://cdn.example.com/a.jpg");
    expect(normalizeRemoteImageUrl("https://cdn.example.com/a.jpg?w=2")).toBe("https://cdn.example.com/a.jpg?w=2");
  });

  it("mesma URL ⇒ mesmo hash (arquivo url-<hash> reaproveitado)", async () => {
    const a = await sha256Hex(normalizeRemoteImageUrl("https://cdn.example.com/a.jpg#x"));
    const b = await sha256Hex(normalizeRemoteImageUrl("https://CDN.example.com/a.jpg"));
    const c = await sha256Hex(normalizeRemoteImageUrl("https://cdn.example.com/b.jpg"));
    expect(a).toHaveLength(64);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
