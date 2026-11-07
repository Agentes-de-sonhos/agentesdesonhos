/** Public SEO pilot: exact host + exact paths, never private documents. */
export const MUNDO_ORIGIN = "https://www.omundoemcores.com.br";
export const MUNDO_SITE_NAME = "O Mundo em Cores";
export const MUNDO_SEO_PAGES: Record<string, { title: string; description: string }> = {
  "/": { title: "O Mundo em Cores | Studio de Viagens", description: "Planeje sua viagem com a O Mundo em Cores: Disney, Universal Orlando e resorts no Brasil, com roteiros personalizados e atendimento de Vanessa Figueiredo." },
  "/oportunidades-novembro": { title: "Oportunidades de Novembro | O Mundo em Cores", description: "Confira as oportunidades de novembro da O Mundo em Cores: ofertas de viagens selecionadas e atendimento personalizado para planejar sua próxima viagem." },
  "/disney": { title: "Disney: parques, ingressos e hotéis | O Mundo em Cores", description: "Planeje sua viagem ao Walt Disney World com a O Mundo em Cores. Conheça parques, ingressos e hotéis Disney e solicite uma cotação personalizada." },
  "/universal": { title: "Universal Orlando: parques e hotéis | O Mundo em Cores", description: "Conheça parques, ingressos e hotéis da Universal Orlando Resort. Planeje sua viagem com atendimento personalizado da O Mundo em Cores." },
  "/resorts-brasil": { title: "Resorts no Brasil | O Mundo em Cores", description: "Explore resorts no Brasil e encontre opções para viajar em família ou a dois. Consulte hotéis e planeje sua hospedagem com a O Mundo em Cores." },
};
export function isMundoSeoHost(hostname: string = ""): boolean {
  return ["omundoemcores.com.br", "www.omundoemcores.com.br"].includes(hostname.trim().toLowerCase());
}
export function mundoSeoPage(hostname: string, pathname: string) {
  if (!isMundoSeoHost(hostname)) return null;
  const path = pathname.replace(/\/+$/, "") || "/";
  const page = MUNDO_SEO_PAGES[path];
  return page ? { ...page, canonical: `${MUNDO_ORIGIN}${path}` } : null;
}
