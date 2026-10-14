import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { agencySiteHref } from "@/lib/agencyContextLink";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import beach from "@/assets/whitelabel/100-limites/destino-fernando-noronha.jpg.asset.json";
import portugal from "@/assets/whitelabel/100-limites/pt-sintra.jpg";
import { XCARET_IMAGES } from "@/components/landing/xcaret/content";

/** Local-only editorial continuity; no blog or offers records are created. */
export function AgencyPresentationPages({ page, info }: { page: string; info: AgencyDomainInfo }) {
  const posts = [
    { slug: "orlando-no-seu-ritmo", title: "Orlando no ritmo da sua família", text: "Parques, pausas e dias livres para aproveitar cada experiência.", image: XCARET_IMAGES.xelHa.src },
    { slug: "portugal-para-descobrir", title: "Portugal: cidades e paisagens para descobrir", text: "Uma inspiração para combinar cultura, gastronomia e tempo livre.", image: portugal },
    { slug: "ferias-a-beira-mar", title: "Férias à beira-mar", text: "O descanso também merece um lugar especial no seu roteiro.", image: beach.url },
  ];
  const offers = page === "ofertas";
  const post = posts.find(item => page === `blog/${item.slug}`);
  const profile = resolveSiteProfile(info.hostname);
  if (post) return <article className="mx-auto max-w-4xl px-5 py-16"><p className="text-sm text-muted-foreground">Artigo ilustrativo — exemplo de apresentação</p><h1 className="mt-4 text-4xl font-semibold">{post.title}</h1><img src={post.image} alt={post.title} className="mt-8 aspect-video w-full rounded-md object-cover" /><p className="mt-8 text-lg leading-8">{post.text} Cada viajante tem prioridades diferentes. A proposta é organizar o tempo entre descobertas, descanso e momentos que façam sentido para quem vai viajar.</p><p className="mt-5 leading-8">Compartilhe suas ideias, suas datas e o ritmo desejado. Destinos, hospedagens e experiências podem ser comparados com cuidado antes de definir o planejamento.</p><Button asChild variant="outline" className="mt-8"><a href={agencySiteHref("/blog")}>Voltar ao blog</a></Button></article>;
  if (page.startsWith("politicas") || page === "termosdeuso" || page === "area-do-cliente") return <section className="mx-auto max-w-4xl px-5 py-16"><h1 className="text-3xl font-semibold">{page === "area-do-cliente" ? "Área do Cliente" : "Informações legais"}</h1><p className="mt-6 text-muted-foreground">Esta área permanece ligada aos mecanismos reais da agência. A apresentação não consulta clientes, documentos ou dados privados. Informações legais e condições serão validadas antes da publicação.</p></section>;
  return <section className="mx-auto max-w-6xl px-5 py-16"><p className="text-sm text-muted-foreground">{offers ? "Seleção ilustrativa — sem ofertas ou preços vigentes" : "Conteúdo editorial ilustrativo — sem posts reais"}</p><h1 className="mt-3 text-4xl font-semibold">{offers ? "Inspirações e oportunidades" : `Blog ${info.agency_name}`}</h1><div className="mt-10 grid gap-6 md:grid-cols-3">{posts.map(item => <Card key={item.slug} className="overflow-hidden"><img src={item.image} alt={item.title} className="aspect-[4/3] w-full object-cover" /><div className="p-6"><h2 className="text-xl font-semibold">{item.title}</h2><p className="mt-3 leading-relaxed text-muted-foreground">{item.text}</p><p className="mt-4 text-xs text-muted-foreground">Exemplo de apresentação</p><Button asChild variant="outline" className="mt-5"><a href={agencySiteHref(offers ? "/#cotacao" : `/blog/${item.slug}`)}>{offers ? "Conhecer possibilidades" : "Ler inspiração"}</a></Button></div></Card>)}</div><p className="mt-10 text-sm text-muted-foreground">{profile.footer?.legalName} · {profile.footer?.cnpj}</p></section>;
}
