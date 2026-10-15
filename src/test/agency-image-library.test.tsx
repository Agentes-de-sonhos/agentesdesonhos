import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const upsert = vi.fn(async () => ({ error: null as any }));
const rows = [
  { id: "1", url: "https://cdn.example.com/a/Praia.JPG?w=800", name: "Praia", folder_id: null, source: "manual", created_at: "2026-01-01" },
  { id: "2", url: "https://cdn.example.com/b/hotel.jpg", name: "Hotel", folder_id: "f1", source: "service_link", created_at: "2026-01-01" },
];
const scope = { user: "11111111-1111-1111-1111-111111111111", agency: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: scope.user } } } }) },
    rpc: async () => ({ data: scope.agency, error: null }),
    from: (table: string) => ({
      upsert,
      select: () => ({
        order: () =>
          table === "agency_image_folders"
            ? Promise.resolve({ data: [{ id: "f1", name: "Hotéis" }], error: null })
            : { limit: () => Promise.resolve({ data: rows, error: null }) },
      }),
    }),
  },
}));

import {
  __resetLibraryProvenance, filterLibraryImages, getPendingLibraryRetries, isLibraryEligibleUrl,
  noteLinkImage, normalizeLibraryUrl, registerLinkImagesAfterSave, retryPendingLibraryRegistrations,
} from "@/lib/agencyImageLibrary";
import { AgencyLibraryPicker, LibraryThumb } from "@/components/image-library/AgencyLibraryPicker";

beforeEach(() => { localStorage.clear(); scope.agency = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"; __resetLibraryProvenance(); upsert.mockClear(); upsert.mockResolvedValue({ error: null }); });

describe("biblioteca de imagens — regras", () => {
  it("normaliza só com trim, preservando case e parâmetros", () => {
    expect(normalizeLibraryUrl("  https://x.com/A/B.jpg?W=1&h=2  ")).toBe("https://x.com/A/B.jpg?W=1&h=2");
    expect(normalizeLibraryUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeLibraryUrl("data:image/png;base64,AAA")).toBeNull();
    expect(normalizeLibraryUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejeita Google Places, URLs assinadas e temporárias", () => {
    expect(isLibraryEligibleUrl("gplace://abc/0")).toBe(false);
    expect(isLibraryEligibleUrl("https://maps.googleapis.com/maps/api/place/photo?x=1")).toBe(false);
    expect(isLibraryEligibleUrl("https://p.supabase.co/storage/v1/object/sign/b/x.jpg?token=abc")).toBe(false);
    expect(isLibraryEligibleUrl("https://s3.aws.com/x.jpg?X-Amz-Signature=1")).toBe(false);
    expect(isLibraryEligibleUrl("https://cdn.example.com/x.jpg")).toBe(true);
  });

  it("não registra nada sem salvar (colar/cancelar) nem fotos sem origem link", async () => {
    noteLinkImage("https://bucket/quote-images/url-1.webp", "https://cdn.example.com/x.jpg");
    // upload / Google / biblioteca não têm proveniência de link
    const r = await registerLinkImagesAfterSave(["https://bucket/upload.webp", "gplace://p/0"]);
    expect(r.registered).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("após salvar, registra a URL externa original com dedupe por agência+URL", async () => {
    noteLinkImage("https://bucket/quote-images/url-1.webp", " https://cdn.example.com/Fotos/Praia-Azul.jpg?v=2 ");
    const r = await registerLinkImagesAfterSave(["https://bucket/quote-images/url-1.webp"]);
    expect(r.registered).toBe(1);
    const call = (upsert.mock.calls as any[])[0];
    expect(call[0]).toEqual([{ url: "https://cdn.example.com/Fotos/Praia-Azul.jpg?v=2", name: "Praia Azul", source: "service_link" }]);
    expect(call[1]).toEqual({ onConflict: "agency_id,url", ignoreDuplicates: true });
  });

  it("falha após salvar persiste fila por agência+usuário, sobrevive ao reload e limpa ao registrar", async () => {
    upsert.mockResolvedValueOnce({ error: { message: "x" } });
    noteLinkImage("https://bucket/s.webp", "https://cdn.example.com/s.jpg");
    const r = await registerLinkImagesAfterSave(["https://bucket/s.webp"]);
    expect(r.failed).toBe(1);
    const key = `ads:image-library-retry:v1:${scope.agency}:${scope.user}`;
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual([{ url: "https://cdn.example.com/s.jpg", name: "cdn.example.com" }]);
    __resetLibraryProvenance(); // "reload": memória zerada, fila continua
    expect(await getPendingLibraryRetries()).toBe(1);
    expect(await retryPendingLibraryRegistrations()).toBe(true);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("fila da agência A nunca é reenviada na agência B; itens sensíveis na leitura são descartados", async () => {
    const keyA = `ads:image-library-retry:v1:${scope.agency}:${scope.user}`;
    localStorage.setItem(keyA, JSON.stringify([{ url: "https://cdn.example.com/a.jpg", name: "A" }, { url: "javascript:x" }, { url: "https://maps.googleapis.com/p?x=1" }]));
    expect(await getPendingLibraryRetries()).toBe(1);
    scope.agency = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    expect(await getPendingLibraryRetries()).toBe(0);
    expect(await retryPendingLibraryRegistrations()).toBe(true);
    expect(upsert).not.toHaveBeenCalled();
    expect(localStorage.getItem(keyA)).not.toBeNull();
  });

  it("sem save não há fila (colar e cancelar não persiste nada)", async () => {
    noteLinkImage("https://bucket/z.webp", "https://cdn.example.com/z.jpg");
    expect(Object.keys(localStorage).filter((k) => k.includes("retry"))).toEqual([]);
  });

  it("filtra por nome e pasta (Sem pasta)", () => {
    expect(filterLibraryImages(rows as any, "", "none").map((i) => i.id)).toEqual(["1"]);
    expect(filterLibraryImages(rows as any, "", "f1").map((i) => i.id)).toEqual(["2"]);
    expect(filterLibraryImages(rows as any, "pra", "all").map((i) => i.id)).toEqual(["1"]);
  });
});

describe("servidor e integração", () => {
  const sql = readFileSync("drizzle/migrations/0049_agency_image_library.sql", "utf8");
  it("isolamento pela agência dona (owner/colaborador), pasta excluída mantém imagens", () => {
    expect(sql).toContain("public.wallet_agency_owner(auth.uid())");
    expect(sql).toContain("UNIQUE (agency_id, url)");
    expect(sql).toContain("ON DELETE SET NULL");
    expect(sql).toContain("NEW.agency_id := _agency");
    expect(sql).toContain("invalid folder");
    expect(sql).not.toMatch(/TO anon/);
    const perms = readFileSync("drizzle/migrations/0050_agency_image_library_team_permissions.sql", "utf8");
    expect(perms).toMatch(/WHEN 'delete' THEN public.can_team\('quotes.delete'\) OR public.can_team\('wallet.delete'\)/);
    expect(perms).toMatch(/FOR DELETE[\s\S]{0,160}image_library_can\('delete'\)/);
    expect(perms).toMatch(/images update[\s\S]{0,160}image_library_can\('edit'\)/);
  });
  it("registro só no sucesso do salvamento do serviço; biblioteca não tem FK com serviços", () => {
    const q = readFileSync("src/hooks/useQuotes.ts", "utf8");
    expect(q.match(/onSuccess: \(_data, vars\)[\s\S]{0,300}syncLinkImagesToLibrary\(vars\.image_urls\)/g)?.length).toBe(2);
    expect(sql).not.toMatch(/quote_services|trip_services/);
  });
});

describe("UI", () => {
  const wrap = (ui: React.ReactNode) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>
  );

  it("imagem quebrada mostra 'Imagem indisponível'", () => {
    render(<LibraryThumb url="https://cdn.example.com/broken.jpg" alt="X" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("Imagem indisponível")).toBeTruthy();
  });

  it("seleção respeita o limite e copia a URL ao serviço", async () => {
    const onAdd = vi.fn();
    render(wrap(<AgencyLibraryPicker existingUrls={[]} maxSelectable={1} onAdd={onAdd} />));
    fireEvent.click(screen.getByRole("button", { name: "Biblioteca da agência" }));
    await waitFor(() => screen.getByRole("button", { name: "Selecionar Praia" }));
    fireEvent.click(screen.getByRole("button", { name: "Selecionar Praia" }));
    fireEvent.click(screen.getByRole("button", { name: "Selecionar Hotel" }));
    fireEvent.click(screen.getByRole("button", { name: /Adicionar ao serviço/ }));
    expect(onAdd).toHaveBeenCalledWith(["https://cdn.example.com/b/hotel.jpg"]);
  });
});
