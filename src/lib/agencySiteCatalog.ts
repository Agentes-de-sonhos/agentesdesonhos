/**
 * CATÁLOGO MESTRE das seções e módulos dos sites White Label.
 *
 * Fonte ÚNICA de referência: cada bloco disponível na engine compartilhada
 * (`AgencySiteHome`) está registrado aqui com chave interna estável, nome em
 * português, classificação, descrição de uso e ordem de apresentação no
 * laboratório (`/sitelab-base`).
 *
 * Regras:
 *  - registrar um novo item aqui é suficiente para que ele apareça no SiteLab
 *    (a ordem/ativação do perfil `siteLabBase` é DERIVADA deste arquivo);
 *  - nenhum tenant real herda nada daqui: agências continuam definidas pelos
 *    seus próprios perfis/hostnames.
 */
import type { AgencySectionKey, AgencySectionOverride } from "@/lib/agencySiteConfig";

/** Classificação de uso de cada bloco na montagem de um novo site. */
export type AgencyCatalogClass =
  | "recomendada"
  | "opcional"
  | "especializada"
  | "alternativa";

export const CATALOG_CLASS_LABEL: Record<AgencyCatalogClass, string> = {
  recomendada: "Recomendada",
  opcional: "Opcional",
  especializada: "Especializada",
  alternativa: "Alternativa",
};

export interface AgencyCatalogEntry {
  /** Chave interna estável (igual à seção da engine quando aplicável). */
  key: string;
  name: string;
  classification: AgencyCatalogClass;
  /** Quando usar este bloco em um site novo. */
  when: string;
  /** Âncora dentro da página (ou rota, para áreas fora da home). */
  anchor: string;
  /** Bloco fixo do template: não passa pelo loop de seções configuráveis. */
  fixed?: boolean;
}

/**
 * Catálogo na ORDEM de apresentação do SiteLab. A posição no array é a ordem.
 */
export const SITE_CATALOG: AgencyCatalogEntry[] = [
  { key: "hero", name: "Hero e carrossel de banners", classification: "recomendada", when: "Abertura de todo site: 1 a 5 banners com a promessa principal.", anchor: "#topo", fixed: true },
  { key: "requests", name: "Central de Solicitações", classification: "recomendada", when: "Captação principal: o visitante escolhe o serviço e envia o pedido.", anchor: "#cotacao", fixed: true },
  { key: "signature", name: "Assinatura editorial", classification: "recomendada", when: "Frase de posicionamento curta, para sites com linguagem editorial.", anchor: "#assinatura" },
  { key: "offers", name: "Ofertas em destaque", classification: "alternativa", when: "Somente quando a agência mantém uma vitrine de ofertas publicada.", anchor: "#ofertas" },
  { key: "destinations", name: "Descoberta e inspirações de destinos", classification: "recomendada", when: "Repertório visual de destinos, sem preço nem promessa comercial.", anchor: "#destinos" },
  { key: "highlights", name: "Destaques e curadoria", classification: "recomendada", when: "Três portas de entrada rápidas para iniciar o atendimento.", anchor: "#destaques" },
  { key: "modules", name: "Módulos temáticos e campanhas", classification: "recomendada", when: "Temas que a agência atende de perto (grupos, cruzeiros, parques...).", anchor: "#campanhas" },
  { key: "about", name: "Apresentação da agência", classification: "recomendada", when: "Quem planeja a viagem: trajetória, cidade e atendimento.", anchor: "#sobre" },
  { key: "differentials", name: "Diferenciais", classification: "recomendada", when: "O que sustenta a experiência do primeiro contato ao retorno.", anchor: "#diferenciais" },
  { key: "concierge", name: "Atendimento e consultoria humana", classification: "opcional", when: "Explicita o valor da consultoria diante de uma reserva impessoal.", anchor: "#atendimento" },
  { key: "dmc", name: "Seção B2B / DMC", classification: "especializada", when: "Apenas para agências com operação receptiva ou serviços para agentes.", anchor: "#dmc-agencias" },
  { key: "credentials", name: "Credenciais e conexões", classification: "opcional", when: "Somente com associações, selos ou redes reais e verificáveis.", anchor: "#credenciais" },
  { key: "team", name: "Equipe e consultores", classification: "opcional", when: "Quando existe equipe real a apresentar, com nomes e funções.", anchor: "#equipe" },
  { key: "testimonials", name: "Depoimentos", classification: "opcional", when: "Somente com depoimentos reais autorizados pelos clientes.", anchor: "#depoimentos" },
  { key: "faq", name: "Perguntas frequentes", classification: "recomendada", when: "Reduz dúvidas antes da solicitação e melhora a leitura por buscadores.", anchor: "#faq" },
  { key: "newsletter", name: "Newsletter e inspirações", classification: "opcional", when: "Captação leve para quem ainda não tem viagem definida.", anchor: "#novidades" },
  { key: "cta-footer", name: "CTA final e rodapé", classification: "recomendada", when: "Fechamento com contato, canais e links institucionais.", anchor: "#rodape", fixed: true },
  { key: "client-area", name: "Área do Cliente", classification: "recomendada", when: "Onde o cliente acompanha orçamento, roteiro, carteira e documentos.", anchor: "/sitelab-base/area-do-cliente", fixed: true },
];

const BY_KEY = new Map(SITE_CATALOG.map((e) => [e.key, e] as const));

export function catalogEntry(key: string): AgencyCatalogEntry | null {
  return BY_KEY.get(key) ?? null;
}

/** Chaves de seção configuráveis (excluindo blocos fixos do template). */
export function catalogSectionKeys(): AgencySectionKey[] {
  return SITE_CATALOG.filter((e) => !e.fixed).map((e) => e.key as AgencySectionKey);
}

/**
 * Overrides do SiteLab DERIVADOS do catálogo: todas as seções ligadas, na ordem
 * declarada acima. Registrar um item novo no catálogo já o inclui aqui.
 */
export function sitelabSectionOverrides(): Partial<
  Record<AgencySectionKey, AgencySectionOverride>
> {
  const out: Partial<Record<AgencySectionKey, AgencySectionOverride>> = {};
  SITE_CATALOG.forEach((entry, index) => {
    if (entry.fixed) return;
    out[entry.key as AgencySectionKey] = { enabled: true, order: index };
  });
  return out;
}

/* ----------------------------- MÓDULOS TEMÁTICOS ---------------------------- */

export interface AgencyModuleCatalogEntry {
  key: string;
  name: string;
  classification: AgencyCatalogClass;
  when: string;
}

/** Todos os temas de módulo já disponíveis na engine (referência de seleção). */
export const MODULE_CATALOG: AgencyModuleCatalogEntry[] = [
  { key: "roteiros-sob-medida", name: "Roteiros sob medida", classification: "recomendada", when: "Base de qualquer agência consultiva." },
  { key: "grupos-acompanhados", name: "Grupos e viagens acompanhadas", classification: "opcional", when: "Para quem organiza saídas em grupo." },
  { key: "cultura-historia", name: "Viagens culturais e históricas", classification: "opcional", when: "Público interessado em cidades, museus e história." },
  { key: "natureza-paisagens", name: "Natureza e grandes paisagens", classification: "opcional", when: "Trilhas, fiordes, safáris e cenários marcantes." },
  { key: "gastronomia", name: "Gastronomia e vinhos", classification: "opcional", when: "Mesas, mercados e vinícolas no roteiro." },
  { key: "hospedagem-selecionada", name: "Hospedagens selecionadas", classification: "recomendada", when: "Quando a curadoria de hotéis é um diferencial." },
  { key: "aereo-seguro", name: "Aéreo e seguro viagem", classification: "recomendada", when: "Serviços avulsos de alta demanda." },
  { key: "cruzeiros", name: "Cruzeiros", classification: "opcional", when: "Agências com volume em navios e expedições." },
  { key: "resorts", name: "Resorts e all inclusive", classification: "opcional", when: "Descanso com tudo incluído." },
  { key: "circuitos", name: "Circuitos e multidestinos", classification: "opcional", when: "Vários destinos em uma só viagem." },
  { key: "orlando-parques", name: "Orlando, parques e ingressos", classification: "especializada", when: "Especialistas em parques e atrações." },
  { key: "lua-de-mel", name: "Lua de mel e celebrações", classification: "opcional", when: "Casais e datas marcantes." },
  { key: "familia", name: "Viagens em família", classification: "opcional", when: "Roteiros para diferentes idades." },
];
