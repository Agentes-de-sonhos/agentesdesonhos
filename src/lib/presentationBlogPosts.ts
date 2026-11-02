import orlando from "@/assets/orlando/editorial/disney-castle.webp.asset.json";
import heroVarenna from "@/assets/whitelabel/destinos-com-a-ju/hero-varenna-lago-como.webp.asset.json";
import cruzeiro from "@/assets/whitelabel/destino-cruzeiro.jpg";

export interface PresentationBlogPost { slug: string; title: string; text: string; image: string }

/** Artigos ilustrativos locais por host de prévia (nenhum registro real de blog). */
const POSTS_BY_HOST: Record<string, PresentationBlogPost[]> = {
  "briefing-20-v1.preview.local": [
    { slug: "orlando-com-criancas", title: "Orlando com crianças: roteiro dia a dia", text: "Como organizar parques, pausas e deslocamentos para a família aproveitar cada dia com tranquilidade.", image: orlando.url },
    { slug: "europa-no-seu-ritmo", title: "Europa no seu ritmo", text: "Cidades, paisagens e tempo livre combinados em um roteiro pensado para o seu perfil.", image: heroVarenna.url },
    { slug: "como-escolher-o-cruzeiro-ideal", title: "Como escolher o cruzeiro ideal", text: "Navio, cabine e itinerário: o que observar antes de decidir a sua viagem pelo mar.", image: cruzeiro },
  ],
};

export function presentationBlogPosts(hostname: string): PresentationBlogPost[] | null {
  return POSTS_BY_HOST[hostname] ?? null;
}
