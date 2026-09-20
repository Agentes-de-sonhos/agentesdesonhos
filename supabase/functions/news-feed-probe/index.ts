// Diagnóstico temporário: verifica quais feeds públicos respondem da rede das Edge Functions.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

serve(async (req) => {
  const { searchParams } = new URL(req.url);
  const urls = (searchParams.get("urls") || "").split("|").filter(Boolean);
  const out: unknown[] = [];
  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      });
      const body = await res.text();
      out.push({ url: u, status: res.status, items: (body.match(/<item/g) || []).length, head: body.slice(0, 120) });
    } catch (e) {
      out.push({ url: u, error: (e as Error).message });
    }
  }
  return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
});
