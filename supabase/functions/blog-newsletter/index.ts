import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Envia um artigo publicado do blog por e-mail para clientes do CRM da agência,
 * filtrados por status. Remetente: domínio próprio da agência quando verificado
 * no Resend; senão o remetente da plataforma com o nome da agência.
 */
const STATUSES = ["lead", "em_negociacao", "cliente_ativo", "fidelizado"] as const;
const PLATFORM_FROM_EMAIL = "novidades@agentesdesonhos.com.br";
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function sign(id: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(Deno.env.get("BLOG_UNSUB_SECRET") ?? ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`unsub:${id}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function verifiedDomain(resendKey: string, host: string | null): Promise<string | null> {
  if (!host) return null;
  const bare = host.replace(/^www\./, "").toLowerCase();
  const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${resendKey}` } });
  if (!res.ok) return null;
  const list = ((await res.json())?.data ?? []) as { name: string; status: string }[];
  const hit = list.find((d) => d.status === "verified" && (d.name === bare || d.name.endsWith(`.${bare}`)));
  return hit?.name ?? null;
}

function page(msg: string) {
  // A plataforma força text/plain em GET; responde texto simples.
  return new Response(msg, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Descadastro público pelo link do e-mail.
  if (req.method === "GET") {
    const u = new URL(req.url);
    const c = u.searchParams.get("c") ?? "";
    const t = u.searchParams.get("t") ?? "";
    if (!/^[0-9a-f-]{36}$/.test(c) || t !== (await sign(c))) return page("Link inválido.");
    await admin.from("clients").update({ blog_email_opt_out: true }).eq("id", c);
    return page("Pronto! Você não receberá mais as novidades do blog por e-mail.");
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autorizado" }, 401);
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Não autorizado" }, 401);

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "send" ? "send" : "preview";
    const postId = String(body?.post_id ?? "");
    if (!/^[0-9a-f-]{36}$/.test(postId)) return json({ error: "Artigo inválido" }, 400);

    const { data: post } = await admin.from("site_blog_posts").select("id, agency_id, slug, status, published").eq("id", postId).maybeSingle();
    if (!post) return json({ error: "Artigo não encontrado" }, 404);
    const { data: canManage } = await userClient.rpc("blog_can_manage", { _agency_id: post.agency_id });
    if (!canManage) return json({ error: "Acesso negado" }, 403);
    if (post.status !== "published" || !post.published) return json({ error: "Publique o artigo antes de enviar." }, 400);

    const agencyId = post.agency_id as string;
    const [{ data: prof }, { data: dom }, { data: clients }, { data: sends }] = await Promise.all([
      admin.from("profiles").select("agency_name, name").eq("user_id", agencyId).maybeSingle(),
      admin.from("agency_public_domains").select("hostname, is_primary").eq("user_id", agencyId).eq("is_active", true).order("is_primary", { ascending: false }).limit(1),
      admin.from("clients").select("id, name, email, status").eq("user_id", agencyId).eq("blog_email_opt_out", false).not("email", "is", null),
      admin.from("blog_newsletter_sends").select("statuses, sent, created_at").eq("post_id", postId).order("created_at", { ascending: false }).limit(5),
    ]);
    const host = (dom?.[0]?.hostname as string | undefined) ?? null;
    const agencyName = (prof?.agency_name || prof?.name || "Sua agência de viagens").replace(/[<>"]/g, "");
    const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const domain = resendKey ? await verifiedDomain(resendKey, host) : null;
    const fromEmail = domain ? `novidades@${domain}` : PLATFORM_FROM_EMAIL;

    // Um e-mail por endereço (o primeiro cliente encontrado).
    const seen = new Set<string>();
    const valid = (clients ?? []).filter((c) => {
      const e = String(c.email ?? "").trim().toLowerCase();
      if (!EMAIL_RE.test(e) || seen.has(e)) return false;
      seen.add(e);
      return true;
    });
    const counts = Object.fromEntries(STATUSES.map((s) => [s, valid.filter((c) => (c.status ?? "lead") === s).length]));

    if (mode === "preview") {
      return json({ counts, sender: `${agencyName} <${fromEmail}>`, own_domain: !!domain, has_site: !!host, previous: sends ?? [] });
    }

    const statuses = Array.isArray(body?.statuses) ? body.statuses.filter((s: string) => (STATUSES as readonly string[]).includes(s)) : [];
    if (!statuses.length) return json({ error: "Escolha ao menos uma categoria de clientes." }, 400);
    if (!host) return json({ error: "A agência ainda não tem site ativo para o link do artigo." }, 400);
    if (!resendKey) return json({ error: "Envio de e-mails não configurado." }, 500);
    const targets = valid.filter((c) => statuses.includes(c.status ?? "lead"));
    if (!targets.length) return json({ error: "Nenhum cliente com e-mail nessas categorias." }, 400);
    if (targets.length > 500) return json({ error: "Limite de 500 destinatários por envio." }, 400);

    const { data: owner } = await admin.auth.admin.getUserById(agencyId);
    const replyTo = owner?.user?.email ?? undefined;
    const pub = post.published as { title?: string; excerpt?: string };
    const title = String(pub.title ?? "Novo artigo no blog");
    const subject = String(body?.subject ?? "").trim().slice(0, 150) || `Novo no blog: ${title}`;
    const link = `https://${host}/blog/${post.slug}`;
    const fnUrl = `${url}/functions/v1/blog-newsletter`;

    const emails = await Promise.all(targets.map(async (c) => {
      const first = String(c.name ?? "").trim().split(/\s+/)[0] ?? "";
      const unsub = `${fnUrl}?c=${c.id}&t=${await sign(c.id)}`;
      const html = `<div style="background:#f5f5f4;padding:24px 12px;font-family:Arial,sans-serif;color:#1c1917"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
<p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#78716c">Novidade no blog · ${esc(agencyName)}</p>
<p style="margin:0 0 16px">Olá${first ? `, ${esc(first)}` : ""}!</p>
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.3">${esc(title)}</h1>
${pub.excerpt ? `<p style="margin:0 0 24px;line-height:1.6;color:#44403c">${esc(String(pub.excerpt))}</p>` : ""}
<a href="${link}" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Ler artigo completo</a>
<p style="margin:32px 0 0;font-size:12px;color:#a8a29e">Você recebe este e-mail por ser cliente de ${esc(agencyName)}. <a href="${unsub}" style="color:#a8a29e">Não quero mais receber</a>.</p>
</div></div>`;
      return { from: `${agencyName} <${fromEmail}>`, to: [c.email], subject, html, reply_to: replyTo, headers: { "List-Unsubscribe": `<${unsub}>` } };
    }));

    let sent = 0, failed = 0;
    for (let i = 0; i < emails.length; i += 100) {
      const chunk = emails.slice(i, i + 100);
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify(chunk),
      });
      if (res.ok) sent += chunk.length;
      else { failed += chunk.length; console.error("resend batch", res.status, await res.text()); }
    }
    await admin.from("blog_newsletter_sends").insert({ agency_id: agencyId, post_id: postId, statuses, sender: fromEmail, recipients: targets.length, sent, failed, created_by: user.id });
    if (!sent) return json({ error: "Não foi possível enviar os e-mails agora. Tente novamente." }, 502);
    return json({ success: true, sent, failed });
  } catch (e) {
    console.error("blog-newsletter", e);
    return json({ error: "Não foi possível concluir o envio." }, 500);
  }
});
