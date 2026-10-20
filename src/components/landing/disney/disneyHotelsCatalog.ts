/**
 * 31 registros atuais de hospedagem Disney nas cinco categorias oficiais (pt-BR) + Lakeshore Lodge (futuro, separado).
 * Textos originais baseados em fontes oficiais Disney (revisão 20/10/2026). Sem notas, avaliações ou fotos:
 * as imagens oficiais localizadas não têm licença de reutilização verificada, então NÃO são exibidas.
 * Endereços oficiais alimentam a busca do mapa; nenhuma coordenada é inventada.
 */
export type DisneyHotelCategory = "Econômica" | "Moderada" | "Deluxe" | "Villas Deluxe" | "Acampamento";
export type DisneyLodgingKind = "hotel" | "villa" | "camping";

export const DISNEY_HOTEL_TABS = ["Todos", "Econômica", "Moderada", "Deluxe", "Villas Deluxe", "Acampamento"] as const;
export const OFFICIAL_CATEGORY_LABEL: Record<DisneyHotelCategory, string> = {
  "Econômica": "Hotéis Resort categoria Econômica",
  "Moderada": "Hotéis Resort categoria Moderada",
  "Deluxe": "Hotéis Resort categoria Deluxe",
  "Villas Deluxe": "Villas categoria Deluxe",
  "Acampamento": "Acampamentos",
};
export const KIND_LABEL: Record<DisneyLodgingKind, string> = { hotel: "Hotel", villa: "Villas", camping: "Camping" };

export interface DisneyHotel {
  slug: string;
  name: string;
  category: DisneyHotelCategory;
  kind: DisneyLodgingKind;
  /** Complexo ao qual pertence, quando compartilha serviços. */
  parent?: string;
  paragraphs: [string, string, string];
  highlights: string[];
  transport: string;
  address: string;
  sources: string[];
  /** Aviso de obras visto na revisão; confirmar impacto por data. */
  notice?: string;
  status: "open" | "future";
  opening?: string;
}

const LBV = "Lake Buena Vista, FL";
const REFORM = "Na revisão de 20/10/2026 a página oficial indicava obras/reformas. Confirmamos o impacto para as suas datas.";
const R = (p: string) => `https://disneyworld.disney.go.com/resorts/${p}/`;
const EU = (p: string) => `https://www.disneyworld.eu/resorts/${p}/`;

export const DISNEY_HOTELS: DisneyHotel[] = [
  // ——— Econômica (5)
  { slug: "all-star-movies", name: "Disney's All-Star Movies Resort", category: "Econômica", kind: "hotel", status: "open",
    paragraphs: [
      "O All-Star Movies leva o universo dos filmes Disney para a hospedagem, com personagens e cenários em grandes proporções. Referências a Toy Story e 101 Dálmatas aparecem nas áreas externas.",
      "A piscina principal tem inspiração em Fantasia, e a Duck Pond Pool remete a The Mighty Ducks. O World Premiere Food Court reúne opções para as refeições; sessões de cinema ao ar livre acontecem em noites selecionadas.",
      "O resort fica na área do Disney's Animal Kingdom e usa a rede de ônibus Disney, com parada diante do Cinema Hall. Há Wi-Fi e lavanderias de autoatendimento; serviços e horários devem ser conferidos para a estadia.",
    ],
    highlights: ["Decoração de filmes", "Duas piscinas", "Área infantil aquática", "Praça de alimentação", "Cinema em noites selecionadas", "Ônibus Disney"],
    transport: "Ônibus Disney (parada diante do Cinema Hall).", address: `1901 West Buena Vista Drive, ${LBV} 32830-8412`,
    sources: [R("all-star-movies-resort"), R("all-star-movies-resort") + "amenities/"], notice: REFORM },
  { slug: "all-star-music", name: "Disney's All-Star Music Resort", category: "Econômica", kind: "hotel", status: "open",
    paragraphs: [
      "O All-Star Music transforma estilos musicais em ambientação de férias. Jazz, country, rock, calypso e musicais da Broadway inspiram a decoração, com instrumentos e elementos cenográficos em cada área.",
      "As piscinas em formato de guitarra e piano reforçam o tema. O Intermission Food Court oferece refeições rápidas, e o catálogo inclui suítes familiares como alternativa aos quartos convencionais, conforme grupo e disponibilidade.",
      "Na área do Disney's Animal Kingdom, o hotel tem parada de ônibus diante do Melody Hall. A rede Disney conecta o resort aos parques e outros destinos, podendo exigir conexão. Wi-Fi e lavanderias completam a estrutura.",
    ],
    highlights: ["Tema musical", "Piscinas guitarra e piano", "Suítes familiares", "Praça de alimentação", "Ônibus Disney", "Lavanderia"],
    transport: "Ônibus Disney (parada diante do Melody Hall).", address: `1801 West Buena Vista Drive, ${LBV} 32830-8436`,
    sources: [R("all-star-music-resort"), R("all-star-music-resort") + "amenities/"] },
  { slug: "all-star-sports", name: "Disney's All-Star Sports Resort", category: "Econômica", kind: "hotel", status: "open",
    paragraphs: [
      "Beisebol, basquete, futebol americano, surfe e tênis fazem parte da identidade do All-Star Sports. A decoração combina referências esportivas em grande escala com personagens Disney.",
      "A Surfboard Bay tem pranchas gigantes como cenário, e a Grand Slam Pool reproduz um campo de beisebol. Há piscina infantil próxima. O End Zone Food Court reúne massas, hambúrgueres e pizzas.",
      "O hotel fica na área do Disney's Animal Kingdom e usa ônibus Disney, com parada diante do Stadium Hall. A rede atende os parques e Disney Springs, com eventuais conexões. Wi-Fi e estacionamento constam entre as comodidades.",
    ],
    highlights: ["Tema esportivo", "Duas piscinas", "Piscina infantil", "End Zone Food Court", "Ônibus Disney", "Wi-Fi"],
    transport: "Ônibus Disney (parada diante do Stadium Hall).", address: `1701 West Buena Vista Drive, ${LBV} 32830-8401`,
    sources: [R("all-star-sports-resort"), R("all-star-sports-resort") + "amenities/"] },
  { slug: "art-of-animation", name: "Disney's Art of Animation Resort", category: "Econômica", kind: "hotel", status: "open",
    paragraphs: [
      "O Art of Animation aproxima a hospedagem das histórias de Procurando Nemo, Carros, O Rei Leão e A Pequena Sereia, com pátios cenográficos e diferentes tipos de acomodação.",
      "A Big Blue Pool é inspirada em Nemo; outras piscinas seguem os temas de Carros e A Pequena Sereia. O Landscape of Flavors atende as refeições. As suítes familiares têm sala, kitchenette e dois banheiros — características que não valem para todos os quartos.",
      "O Disney Skyliner conecta o hotel ao EPCOT e ao Disney's Hollywood Studios, e ônibus complementam os trajetos, com parada fora do Animation Hall. Há Wi-Fi e lavanderias próximas às piscinas.",
    ],
    highlights: ["Quatro universos de animação", "Suítes familiares", "Três piscinas", "Disney Skyliner", "Praça de alimentação", "Lavanderia"],
    transport: "Disney Skyliner (EPCOT e Hollywood Studios) e ônibus.", address: `1850 Animation Way, ${LBV} 32830-8400`,
    sources: [R("art-of-animation-resort"), R("art-of-animation-resort") + "amenities/"], notice: REFORM },
  { slug: "pop-century", name: "Disney's Pop Century Resort", category: "Econômica", kind: "hotel", status: "open",
    paragraphs: [
      "O Pop Century revisita a cultura popular das décadas de 1950 a 1990. Brinquedos, danças e objetos marcantes aparecem em versões gigantes nas áreas externas, num clima nostálgico e descontraído.",
      "A Hippy Dippy Pool traz referências aos anos 1960; Bowling Pool e Computer Pool completam as piscinas. O Everything POP combina compras e alimentação rápida antes ou depois dos parques.",
      "O Disney Skyliner atende EPCOT e Disney's Hollywood Studios, e ônibus complementam a mobilidade. Wi-Fi e lavanderias ajudam na rotina, sem transformar serviços extras em itens incluídos na diária.",
    ],
    highlights: ["Cultura pop", "Três piscinas", "Disney Skyliner", "Everything POP", "Wi-Fi", "Lavanderias"],
    transport: "Disney Skyliner (EPCOT e Hollywood Studios) e ônibus.", address: `1050 Century Drive, ${LBV} 32830-8433`,
    sources: [EU("pop-century-resort"), EU("pop-century-resort") + "amenities/"], notice: REFORM },

  // ——— Moderada (4)
  { slug: "caribbean-beach", name: "Disney's Caribbean Beach Resort", category: "Moderada", kind: "hotel", status: "open",
    paragraphs: [
      "O Caribbean Beach propõe uma hospedagem com cores e paisagismo inspirados no Caribe. As áreas fazem referência a Barbados, Jamaica, Martinica, Trinidad e Aruba.",
      "Old Port Royale concentra recepção, lojas e alimentação. A piscina principal tem ambientação de fortaleza, entrada gradual e toboáguas, além de uma área aquática infantil com tema de naufrágio.",
      "O Disney Skyliner liga o resort ao EPCOT e ao Disney's Hollywood Studios, e ônibus complementam os trajetos. Rotas, conexões e operação precisam ser conferidas no período da viagem.",
    ],
    highlights: ["Tema caribenho", "Disney Skyliner", "Piscina com toboáguas", "Área aquática infantil", "Old Port Royale", "Compras e alimentação"],
    transport: "Disney Skyliner (EPCOT e Hollywood Studios) e ônibus.", address: `1114 Cayman Way, ${LBV} 32830-8411`,
    sources: [R("caribbean-beach-resort"), R("caribbean-beach-resort") + "amenities/"], notice: REFORM },
  { slug: "coronado-springs", name: "Disney's Coronado Springs Resort", category: "Moderada", kind: "hotel", status: "open",
    paragraphs: [
      "O Coronado Springs combina referências espanholas, mexicanas e do sudoeste americano em torno do Lago Dorado. A Gran Destino Tower faz parte do resort — não é um hotel separado.",
      "O Dig Site reúne piscina, toboágua e uma grande pirâmide cenográfica. Há academias e o Three Bridges Bar & Grill no centro do lago. O acesso ao Chronos Club depende da acomodação contratada.",
      "Os deslocamentos Disney são feitos por ônibus, com parada principal junto à Gran Destino Tower e outras nas áreas Casitas, Ranchos e Cabanas. Operação e conexões a confirmar durante a estadia.",
    ],
    highlights: ["Lago Dorado", "Gran Destino Tower", "Piscina com toboágua", "Academias", "Restaurantes", "Ônibus Disney"],
    transport: "Ônibus Disney com várias paradas no resort.", address: `1001 West Buena Vista Drive, ${LBV} 32830-8403`,
    sources: [R("coronado-springs-resort"), R("coronado-springs-resort") + "amenities/"], notice: REFORM },
  { slug: "port-orleans-french-quarter", name: "Disney's Port Orleans Resort - French Quarter", category: "Moderada", kind: "hotel", status: "open",
    paragraphs: [
      "O French Quarter recria o bairro histórico de Nova Orleans, com varandas de ferro, ruas cenográficas e elementos de Mardi Gras, às margens do Sassagoula River.",
      "A piscina tem uma serpente marinha como parte do toboágua, além de hidromassagem. O Scat Cat's Club tem música em noites selecionadas. Passeios de carruagem são cobrados à parte, conforme disponibilidade.",
      "Barcos ligam o resort a Disney Springs; para os parques, há ônibus Disney. Dá para caminhar até o Port Orleans - Riverside, que tem identidade e reservas próprias.",
    ],
    highlights: ["Nova Orleans", "Piscina com toboágua", "Scat Cat's Club", "Barco para Disney Springs", "Ônibus Disney", "Passeio ribeirinho"],
    transport: "Barco para Disney Springs; ônibus para os parques.", address: `2201 Orleans Drive, ${LBV} 32830-8424`,
    sources: [R("port-orleans-resort-french-quarter"), R("port-orleans-resort-french-quarter") + "amenities/"], notice: REFORM },
  { slug: "port-orleans-riverside", name: "Disney's Port Orleans Resort - Riverside", category: "Moderada", kind: "hotel", status: "open",
    paragraphs: [
      "O Riverside traz duas interpretações da Louisiana rural: as construções de Magnolia Bend e as casas de Alligator Bayou. Caminhos ao longo do Sassagoula River levam a pé até o French Quarter.",
      "Ol' Man Island reúne piscina e toboágua num cenário de antigo moinho. O Riverside Mill Food Court atende refeições rápidas. As Royal Guest Rooms são categoria específica, identificada na cotação.",
      "Barcos atendem Disney Springs, e ônibus Disney levam aos parques. Lavanderias de autoatendimento ficam junto às piscinas menores.",
    ],
    highlights: ["Paisagem da Louisiana", "Piscina com toboágua", "Royal Guest Rooms (categoria específica)", "Riverside Mill", "Barco para Disney Springs", "Ônibus Disney"],
    transport: "Barco para Disney Springs; ônibus para os parques.", address: `1251 Riverside Drive, ${LBV} 32830-8514`,
    sources: [EU("port-orleans-resort-riverside"), R("port-orleans-resort-riverside") + "amenities/"],
    notice: "Aviso oficial: reformas de quartos em diferentes áreas de maio de 2025 a agosto de 2027; pode haver barulho ou obras visíveis. Confirmamos o impacto por data e categoria." },

  // ——— Deluxe (8)
  { slug: "animal-kingdom-lodge", name: "Disney's Animal Kingdom Lodge", category: "Deluxe", kind: "hotel", status: "open",
    paragraphs: [
      "O Animal Kingdom Lodge traz referências arquitetônicas e artísticas africanas. Os edifícios envolvem áreas de savana com diferentes espécies — o que não significa vista para os animais em todas as acomodações.",
      "A Uzima Pool tem entrada gradual, toboágua e áreas de descanso, além de piscina infantil e hidromassagens. A gastronomia é destaque, com opções como o Jiko – The Cooking Place.",
      "O deslocamento usa ônibus Disney, com parada próxima à entrada. Há Wi-Fi e lavanderia de autoatendimento, úteis em estadias com vários dias de parques.",
    ],
    highlights: ["Savanas com animais", "Uzima Pool com toboágua", "Piscina infantil", "Jiko – The Cooking Place", "Wi-Fi", "Lavanderia"],
    transport: "Ônibus Disney.", address: `2901 Osceola Parkway, ${LBV} 32830-8410`,
    sources: [R("animal-kingdom-lodge"), R("animal-kingdom-lodge") + "amenities/"], notice: REFORM },
  { slug: "beach-club", name: "Disney's Beach Club Resort", category: "Deluxe", kind: "hotel", status: "open",
    paragraphs: [
      "O Beach Club combina arquitetura do litoral da Nova Inglaterra com um clima descontraído à beira do Crescent Lake. Dá para caminhar até o EPCOT.",
      "O Stormalong Bay, compartilhado com o Yacht Club, reúne piscinas, rio de correnteza e toboágua de navio naufragado. Há o Beaches & Cream Soda Shop e o Ship Shape Health Club.",
      "Além da caminhada ao EPCOT, há barco para o Disney's Hollywood Studios e ônibus. A estação do Skyliner fica no International Gateway do EPCOT, acessível a pé — não dentro do hotel.",
    ],
    highlights: ["Stormalong Bay", "Rio de correnteza", "Beaches & Cream", "Academia", "A pé até o EPCOT", "Barco ao Hollywood Studios"],
    transport: "A pé ao EPCOT; barco ao Hollywood Studios; Skyliner no International Gateway; ônibus.", address: `1800 Epcot Resorts Boulevard, ${LBV} 32830-8443`,
    sources: [R("beach-club-resort"), R("beach-club-resort") + "amenities/"], notice: REFORM },
  { slug: "boardwalk-inn", name: "Disney's BoardWalk Inn", category: "Deluxe", kind: "hotel", status: "open",
    paragraphs: [
      "O BoardWalk Inn recria a atmosfera dos balneários de Atlantic City do início do século XX. Às margens do Crescent Lake, integra-se ao BoardWalk, com restaurantes e entretenimento à beira d'água.",
      "A Luna Park Pool tem toboágua inspirado em parque de diversões. Entre as opções gastronômicas está o Flying Fish. Academia, Wi-Fi e lavanderia completam a estrutura.",
      "Dá para caminhar até o EPCOT e o Disney's Hollywood Studios. Ônibus atendem outros destinos. O Skyliner fica no International Gateway do EPCOT, a pé, sem estação própria do hotel.",
    ],
    highlights: ["Calçadão BoardWalk", "Luna Park Pool", "Flying Fish", "Academia", "A pé ao EPCOT e Hollywood Studios", "Wi-Fi"],
    transport: "A pé ao EPCOT e Hollywood Studios; Skyliner no International Gateway; ônibus.", address: `2100 Epcot Resorts Blvd, ${LBV} 32830-8442`,
    sources: [EU("boardwalk-inn"), R("boardwalk-inn") + "amenities/"], notice: REFORM },
  { slug: "contemporary", name: "Disney's Contemporary Resort", category: "Deluxe", kind: "hotel", status: "open",
    paragraphs: [
      "O Contemporary é reconhecido pela torre moderna atravessada pelo monorail. O conjunto inclui o Garden Wing e um mural de Mary Blair, perto do Magic Kingdom.",
      "Duas piscinas ficam junto ao Bay Lake, com toboágua, hidromassagens e área aquática infantil; a Bay Pool é mais tranquila. O California Grill é destaque gastronômico.",
      "O Magic Kingdom pode ser alcançado a pé ou de monorail. Para o EPCOT, o monorail exige baldeação. Ônibus complementam os outros trajetos.",
    ],
    highlights: ["Torre com monorail", "Duas piscinas", "Toboágua", "California Grill", "A pé ao Magic Kingdom", "Monorail"],
    transport: "A pé ou monorail ao Magic Kingdom; monorail ao EPCOT com baldeação; ônibus.", address: `4600 North World Drive, ${LBV} 32830-8413`,
    sources: [R("contemporary-resort"), R("contemporary-resort") + "amenities/"], notice: REFORM },
  { slug: "grand-floridian", name: "Disney's Grand Floridian Resort & Spa", category: "Deluxe", kind: "hotel", status: "open",
    paragraphs: [
      "O Grand Floridian combina referências vitorianas e dos antigos hotéis de Palm Beach junto à Seven Seas Lagoon, com caráter clássico e perto do Magic Kingdom.",
      "A Beach Pool tem entrada gradual e toboágua; a Courtyard Pool é outra opção. Restaurantes como Narcoossee's e Grand Floridian Café, o lounge Enchanted Rose, academia e spa têm condições próprias.",
      "O Magic Kingdom é acessível a pé, de monorail ou barco. Para o EPCOT, o monorail exige baldeação. Ônibus atendem outros destinos.",
    ],
    highlights: ["Estilo vitoriano", "Beach Pool com toboágua", "Courtyard Pool", "Restaurantes e lounge", "Spa (cobrado à parte)", "Monorail e barco"],
    transport: "A pé, monorail ou barco ao Magic Kingdom; monorail ao EPCOT com baldeação; ônibus.", address: `4401 Floridian Way, ${LBV} 32830-8451`,
    sources: [R("grand-floridian-resort-and-spa"), R("grand-floridian-resort-and-spa") + "amenities/"], notice: REFORM },
  { slug: "polynesian-village", name: "Disney's Polynesian Village Resort", category: "Deluxe", kind: "hotel", status: "open",
    paragraphs: [
      "O Polynesian Village se inspira nas ilhas do Pacífico Sul, com vegetação tropical junto à Seven Seas Lagoon. Inaugurado com o Walt Disney World, mantém essa identidade nos espaços comuns.",
      "As piscinas Lava e Oasis são as opções de lazer, e a programação pode incluir cinema ao ar livre e atividades junto à fogueira, conforme calendário. Wi-Fi e lavanderia completam os serviços.",
      "Há monorail e barco para o Magic Kingdom. O monorail ao EPCOT exige baldeação, e ônibus atendem outros destinos.",
    ],
    highlights: ["Pacífico Sul", "Lava Pool", "Oasis Pool", "Programação recreativa", "Monorail e barco", "Wi-Fi"],
    transport: "Monorail e barco ao Magic Kingdom; monorail ao EPCOT com baldeação; ônibus.", address: `1600 Seven Seas Drive, ${LBV} 32830-8423`,
    sources: [R("polynesian-resort"), R("polynesian-resort") + "amenities/", R("polynesian-resort") + "recreation/"], notice: REFORM },
  { slug: "wilderness-lodge", name: "Disney's Wilderness Lodge", category: "Deluxe", kind: "hotel", status: "open",
    paragraphs: [
      "O Wilderness Lodge se inspira nos grandes hotéis dos parques nacionais do noroeste americano: madeira, lareira monumental e áreas arborizadas à beira do Bay Lake.",
      "A Copper Creek Springs Pool tem toboágua, hidromassagens e área infantil; a Boulder Ridge Cove Pool tem entrada gradual. Geyser Point Bar & Grill e Story Book Dining at Artist Point with Snow White trazem experiências distintas.",
      "Barcos ligam o resort ao Magic Kingdom, com ligações também a Contemporary e Fort Wilderness, conforme operação. Ônibus complementam, e há Wi-Fi.",
    ],
    highlights: ["Estilo parque nacional", "Copper Creek Springs Pool", "Boulder Ridge Cove Pool", "Geyser Point", "Barco ao Magic Kingdom", "Wi-Fi"],
    transport: "Barco ao Magic Kingdom; ônibus.", address: `901 Timberline Drive, ${LBV} 32830-8426`,
    sources: [R("wilderness-lodge-resort"), R("wilderness-lodge-resort") + "amenities/"], notice: REFORM },
  { slug: "yacht-club", name: "Disney's Yacht Club Resort", category: "Deluxe", kind: "hotel", status: "open",
    paragraphs: [
      "O Yacht Club adota a estética dos clubes náuticos da Nova Inglaterra, com decoração marítima junto ao Crescent Lake e acesso a pé ao EPCOT.",
      "O Stormalong Bay, compartilhado com o Beach Club, reúne piscinas, rio de correnteza e toboágua de naufrágio. O Yachtsman Steakhouse é destaque, e o Ship Shape Health Club atende quem quer treinar.",
      "Há barcos para o Disney's Hollywood Studios e ônibus. A estação do Skyliner fica no International Gateway do EPCOT, a pé. Quartos que aceitam cães são específicos e têm condições próprias.",
    ],
    highlights: ["Estilo náutico", "Stormalong Bay", "Yachtsman Steakhouse", "Academia", "A pé ao EPCOT", "Barco ao Hollywood Studios"],
    transport: "A pé ao EPCOT; barco ao Hollywood Studios; Skyliner no International Gateway; ônibus.", address: `1700 Epcot Resorts Boulevard, ${LBV} 32830-8407`,
    sources: [R("yacht-club-resort"), R("yacht-club-resort") + "amenities/"], notice: REFORM },

  // ——— Villas Deluxe (13)
  { slug: "bay-lake-tower", name: "Bay Lake Tower at Disney's Contemporary Resort", category: "Villas Deluxe", kind: "villa", parent: "Disney's Contemporary Resort", status: "open",
    paragraphs: [
      "Às margens do Bay Lake, esta torre combina arquitetura contemporânea com a conveniência de chegar a pé ao Magic Kingdom. A Sky Way Bridge a liga ao Contemporary.",
      "Há studios e villas de vários quartos. Kitchenette ou cozinha completa dependem da acomodação escolhida — nem todos os tipos têm cozinha e lavanderia.",
      "A Bay Cove Pool tem toboágua, hidromassagem e área infantil. O monorail do Contemporary atende o Magic Kingdom e chega ao EPCOT com baldeação. Restaurantes como o California Grill são pagos à parte.",
    ],
    highlights: ["A pé ao Magic Kingdom", "Studios e villas", "Bay Cove Pool", "Monorail", "California Grill no complexo"],
    transport: "A pé ao Magic Kingdom; monorail via Contemporary (EPCOT com baldeação); ônibus.", address: `4600 North World Drive, ${LBV} 32830-8413`,
    sources: [R("bay-lake-tower-at-contemporary")] },
  { slug: "boulder-ridge-villas", name: "Boulder Ridge Villas at Disney's Wilderness Lodge", category: "Villas Deluxe", kind: "villa", parent: "Disney's Wilderness Lodge", status: "open",
    paragraphs: [
      "O Boulder Ridge reinterpreta os hotéis ferroviários do oeste americano do século XIX. Integra o complexo Wilderness Lodge, com ambientes arborizados e decoração rústica.",
      "Studios e villas oferecem diferentes configurações. Lazer e alimentação são compartilhados com o complexo; cozinha e número de quartos dependem da categoria reservada.",
      "Os hóspedes usam a Boulder Ridge Cove Pool e a Copper Creek Springs Pool. Há barco para o Magic Kingdom e ônibus. A refeição com personagens do Artist Point é paga à parte.",
    ],
    highlights: ["Estilo ferroviário do oeste", "Studios e villas", "Duas áreas de piscina", "Barco ao Magic Kingdom", "Serviços do Wilderness Lodge"],
    transport: "Barco ao Magic Kingdom; ônibus.", address: `901 Timberline Drive, ${LBV} 32830-8426`,
    sources: [R("boulder-ridge-villas-at-wilderness-lodge")] },
  { slug: "copper-creek-villas", name: "Copper Creek Villas & Cabins at Disney's Wilderness Lodge", category: "Villas Deluxe", kind: "villa", parent: "Disney's Wilderness Lodge", status: "open",
    paragraphs: [
      "O Copper Creek traz referências do noroeste americano para acomodações dentro do Wilderness Lodge, com materiais de aparência natural e proximidade com o lago.",
      "A seleção reúne studios, villas e cabanas à beira d'água. As cabanas têm deck e hidromassagem privativa — recursos que não valem para todas as unidades.",
      "O lazer inclui as piscinas Copper Creek Springs e Boulder Ridge Cove. O Geyser Point é uma das opções de alimentação, pago à parte. Transporte por barco e ônibus, conforme operação.",
    ],
    highlights: ["Studios e villas", "Cabanas à beira d'água", "Duas áreas de piscina", "Geyser Point", "Barco e ônibus"],
    transport: "Barco e ônibus; confirmar itinerário no aplicativo.", address: `901 Timberline Drive, ${LBV} 32830-8426`,
    sources: [R("copper-creek-villas-and-cabins")] },
  { slug: "animal-kingdom-villas-jambo", name: "Disney's Animal Kingdom Villas - Jambo House", category: "Villas Deluxe", kind: "villa", parent: "Disney's Animal Kingdom Lodge", status: "open",
    paragraphs: [
      "Jambo House reúne studios e villas no complexo de inspiração africana do Animal Kingdom Lodge. A vista da savana depende da categoria e não é garantida.",
      "Studios têm kitchenette; villas com quartos separados têm estrutura doméstica mais completa. São inventário separado dos quartos convencionais do Lodge, mesmo compartilhando serviços.",
      "A Uzima Pool tem entrada gradual e toboágua, e há restaurantes de diferentes propostas. O transporte é por ônibus — a proximidade com o parque não significa acesso a pé.",
    ],
    highlights: ["Savanas com animais", "Studios e villas", "Uzima Pool", "Restaurantes do complexo", "Ônibus Disney"],
    transport: "Ônibus Disney.", address: `2901 Osceola Parkway, ${LBV} 32830-8410`,
    sources: [R("animal-kingdom-villas-jambo")] },
  { slug: "animal-kingdom-villas-kidani", name: "Disney's Animal Kingdom Villas - Kidani Village", category: "Villas Deluxe", kind: "villa", parent: "Disney's Animal Kingdom Lodge", status: "open",
    paragraphs: [
      "Kidani Village oferece uma estadia de inspiração africana junto às savanas do complexo Animal Kingdom Lodge. Vista da savana exige a categoria apropriada.",
      "Há studios e villas, com equipamentos de cozinha que variam por unidade. O restaurante Sanaa, com janelas para a área dos animais, é destaque e pago à parte.",
      "A Samawati Springs Pool tem entrada gradual, toboágua e hidromassagens; a Uwanja Camp é a área aquática infantil. Os deslocamentos são por ônibus.",
    ],
    highlights: ["Savanas com animais", "Samawati Springs Pool", "Uwanja Camp", "Restaurante Sanaa", "Ônibus Disney"],
    transport: "Ônibus Disney.", address: `3701 Osceola Parkway, ${LBV} 32830-8445`,
    sources: [R("animal-kingdom-villas-kidani")] },
  { slug: "beach-club-villas", name: "Disney's Beach Club Villas", category: "Villas Deluxe", kind: "villa", parent: "Disney's Beach Club Resort", status: "open",
    paragraphs: [
      "As Beach Club Villas adotam o estilo das cidades costeiras da Nova Inglaterra, com acesso a pé ao EPCOT e serviços compartilhados com Beach Club e Yacht Club.",
      "Studios e villas atendem diferentes configurações de viagem. Kitchenette ou cozinha completa, assim como os ambientes, acompanham a categoria reservada.",
      "O Stormalong Bay é o destaque de lazer, com rio de correnteza e toboágua. Há barco para o Hollywood Studios, e o Skyliner fica no International Gateway do EPCOT.",
    ],
    highlights: ["A pé ao EPCOT", "Studios e villas", "Stormalong Bay", "Barco ao Hollywood Studios", "Restaurantes do complexo"],
    transport: "A pé ao EPCOT; barco ao Hollywood Studios; ônibus.", address: `1800 Epcot Resorts Boulevard, ${LBV} 32830-8443`,
    sources: [R("beach-club-villas")] },
  { slug: "boardwalk-villas", name: "Disney's BoardWalk Villas", category: "Villas Deluxe", kind: "villa", parent: "Disney's BoardWalk Inn", status: "open",
    paragraphs: [
      "O BoardWalk Villas remete aos calçadões de Atlantic City na virada do século XX, junto ao passeio à beira d'água do Disney's BoardWalk.",
      "Studios e villas dividem os serviços com o BoardWalk Inn, mas são inventários distintos. Equipamentos de cozinha variam conforme a acomodação.",
      "Há piscina com toboágua e outras piscinas. Dá para caminhar até EPCOT e Hollywood Studios, além de barco e ônibus. O Flying Fish é pago à parte.",
    ],
    highlights: ["Calçadão BoardWalk", "Studios e villas", "Piscina com toboágua", "A pé ao EPCOT e Hollywood Studios", "Barco e ônibus"],
    transport: "A pé ao EPCOT e Hollywood Studios; barco e ônibus.", address: `2100 Epcot Resorts Blvd, ${LBV} 32830-8442`,
    sources: [R("boardwalk-villas")] },
  { slug: "old-key-west", name: "Disney's Old Key West Resort", category: "Villas Deluxe", kind: "villa", status: "open",
    paragraphs: [
      "O Old Key West recria o clima descontraído das Florida Keys, com vegetação tropical, canais e golfe no entorno, numa implantação espalhada como uma pequena comunidade.",
      "Studios têm kitchenette; villas com quartos separados têm cozinha, sala e lavanderia na unidade. A composição depende da categoria escolhida.",
      "Há piscina com toboágua em forma de castelo de areia, piscinas tranquilas e academia. O Olivia's Cafe é pago à parte. Barcos levam a Disney Springs e ônibus atendem os demais destinos.",
    ],
    highlights: ["Clima Florida Keys", "Studios e villas", "Piscina castelo de areia", "Academia", "Barco para Disney Springs"],
    transport: "Barco para Disney Springs; ônibus com várias paradas.", address: `1510 North Cove Road, ${LBV} 32830-8421`,
    sources: [R("old-key-west-resort"), R("old-key-west-resort") + "amenities/"] },
  { slug: "polynesian-villas", name: "Disney's Polynesian Villas & Bungalows", category: "Villas Deluxe", kind: "villa", parent: "Disney's Polynesian Village Resort", status: "open",
    paragraphs: [
      "As Polynesian Villas & Bungalows levam a inspiração do Pacífico Sul às acomodações do complexo Polynesian. A Island Tower faz parte deste inventário, não é um hotel à parte.",
      "Há studios, villas e bungalows. Piscina privativa é atributo dos bungalows, não de todas as unidades. A Island Tower tem jardins elevados e áreas próprias de lazer.",
      "Destaques: Cove Pool e a área infantil Moana's Voyage. Monorail ou barco ao Magic Kingdom; o monorail ao EPCOT exige baldeação.",
    ],
    highlights: ["Studios, villas e bungalows", "Island Tower", "Cove Pool", "Moana's Voyage", "Monorail e barco"],
    transport: "Monorail/barco ao Magic Kingdom; monorail ao EPCOT com baldeação; ônibus.", address: `1600 Seven Seas Drive, ${LBV} 32830-8423`,
    sources: [R("polynesian-villas-bungalows")] },
  { slug: "riviera", name: "Disney's Riviera Resort", category: "Villas Deluxe", kind: "villa", status: "open",
    paragraphs: [
      "O Riviera combina referências europeias e mediterrâneas com arte inspirada em personagens Disney, entre jardins, fontes e áreas à beira d'água.",
      "Há Tower Studios, Deluxe Studios e villas, com equipamentos e tamanhos diferentes. Cozinha completa e lavanderia ficam nas villas apropriadas, não em qualquer studio.",
      "Riviera Pool com toboágua, Beau Soleil Pool e a área infantil S'il Vous Play completam o lazer. O Topolino's Terrace é pago à parte. O Skyliner leva ao EPCOT e ao Hollywood Studios.",
    ],
    highlights: ["Estilo mediterrâneo", "Studios e villas", "Riviera Pool", "Topolino's Terrace", "Disney Skyliner"],
    transport: "Disney Skyliner (EPCOT e Hollywood Studios); ônibus.", address: `1080 Esplanade Avenue, ${LBV} 32830`,
    sources: [R("riviera-resort"), R("riviera-resort") + "amenities/", R("riviera-resort") + "recreation/"] },
  { slug: "saratoga-springs", name: "Disney's Saratoga Springs Resort & Spa", category: "Villas Deluxe", kind: "villa", status: "open",
    paragraphs: [
      "O Saratoga Springs se inspira na tradição de corridas de cavalos e estações de águas da cidade nova-iorquina, com arquitetura vitoriana e jardins perto do Lake Buena Vista.",
      "Além de studios e villas, há Treehouse Villas elevadas num bosque. Equipamentos variam por categoria; lavanderia na unidade vale para villas com quartos separados e Treehouse Villas.",
      "As piscinas High Rock Spring e Paddock têm atrações aquáticas, e há academia. Barcos ligam a Disney Springs; ônibus atendem outros destinos. Golfe é cobrado à parte.",
    ],
    highlights: ["Estilo vitoriano", "Studios, villas e Treehouse Villas", "Piscinas com toboágua", "Academia", "Barco para Disney Springs"],
    transport: "Barco para Disney Springs; ônibus, inclusive interno às Treehouse Villas.", address: `1960 Broadway, ${LBV} 32830-8446`,
    sources: [R("saratoga-springs-resort-and-spa"), R("saratoga-springs-resort-and-spa") + "amenities/"] },
  { slug: "cabins-fort-wilderness", name: "The Cabins at Disney's Fort Wilderness Resort - A Disney Vacation Club Resort", category: "Villas Deluxe", kind: "villa", parent: "Disney's Fort Wilderness Resort", status: "open",
    paragraphs: [
      "As novas cabanas do Fort Wilderness são unidades separadas, cercadas por pinheiros e ciprestes, com grandes janelas integrando o interior à natureza.",
      "As unidades têm cozinha completa. O complexo oferece trilhas e recreação, mas carrinho de golfe, passeios e experiências especiais têm cobrança própria.",
      "A Meadow Swimmin' Pool tem toboágua e hidromassagem; a Wilderness Swimmin' Pool é mais tranquila. O Hoop-Dee-Doo é jantar-espetáculo pago. Transporte por barco e ônibus.",
    ],
    highlights: ["Cabanas independentes", "Cozinha completa", "Piscinas", "Trilhas", "Barco e ônibus"],
    transport: "Barco e ônibus; conferir ponto de embarque conforme a cabana.", address: `4510 North Fort Wilderness Trail, ${LBV} 32830`,
    sources: [R("dvc-cabins-at-fort-wilderness-resort")] },
  { slug: "villas-grand-floridian", name: "The Villas at Disney's Grand Floridian Resort & Spa", category: "Villas Deluxe", kind: "villa", parent: "Disney's Grand Floridian Resort & Spa", status: "open",
    paragraphs: [
      "As Villas do Grand Floridian compartilham o estilo vitoriano do complexo à beira da Seven Seas Lagoon, como inventário próprio, distinto dos quartos do hotel principal.",
      "Studios e villas têm configurações e equipamentos diferentes; a categoria define cozinha e ambientes. Lazer e alimentação são compartilhados.",
      "A Beach Pool tem toboágua e entrada gradual; há Courtyard Pool e academia. Spa e refeições são cobrados à parte. Magic Kingdom a pé, de monorail ou barco.",
    ],
    highlights: ["Estilo vitoriano", "Studios e villas", "Beach Pool", "Academia", "Monorail e barco"],
    transport: "A pé, monorail ou barco ao Magic Kingdom; ônibus.", address: `4401 Floridian Way, ${LBV} 32830-8451`,
    sources: [EU("villas-at-grand-floridian-resort-and-spa")] },

  // ——— Acampamento (1)
  { slug: "campsites-fort-wilderness", name: "The Campsites at Disney's Fort Wilderness Resort", category: "Acampamento", kind: "camping", parent: "Disney's Fort Wilderness Resort", status: "open",
    paragraphs: [
      "O camping do Fort Wilderness fica numa área arborizada do Walt Disney World. É diferente das cabanas: reservar o espaço não inclui barraca, trailer ou motorhome.",
      "Há terrenos para equipamentos de diferentes portes, com água, energia, mesa de piquenique e churrasqueira. Ligação de esgoto não vale para todas as categorias.",
      "O complexo tem piscinas e recreação ao ar livre. Carrinhos de golfe, passeios a cavalo e outras atividades têm valores próprios. Transporte por ônibus e barco, com trajetos internos.",
    ],
    highlights: ["Terrenos para barraca/trailer", "Água e energia", "Mesa e churrasqueira", "Piscinas", "Ônibus e barco"],
    transport: "Ônibus e barco; percurso interno conforme o terreno.", address: `4510 North Fort Wilderness Trail, ${LBV} 32830-8415`,
    sources: [R("campsites-at-fort-wilderness-resort")] },
];

/** Futuro — fora do catálogo atual de 31. */
export const DISNEY_FUTURE_HOTELS: DisneyHotel[] = [
  { slug: "lakeshore-lodge", name: "Disney's Lakeshore Lodge", category: "Deluxe", kind: "hotel", status: "future", opening: "01/07/2027 (anunciado)",
    paragraphs: [
      "O Lakeshore Lodge é um novo hotel Deluxe anunciado pela Disney à beira do Bay Lake.",
      "A inauguração anunciada é 01/07/2027. Detalhes de acomodações e serviços serão confirmados conforme a Disney divulgar.",
      "Se você pensa em viajar a partir dessa data, podemos acompanhar a abertura das reservas.",
    ],
    highlights: ["Futuro hotel Deluxe", "Inauguração anunciada para 01/07/2027"],
    transport: "A divulgar pela Disney.", address: `Bay Lake, ${LBV}`,
    sources: ["https://disneyworld.disney.go.com/pt-br/disneys-lakeshore-lodge/"] },
];

const BY_SLUG = new Map([...DISNEY_HOTELS, ...DISNEY_FUTURE_HOTELS].map((h) => [h.slug, h]));
export const getDisneyHotel = (slug: string): DisneyHotel | null => BY_SLUG.get(slug) ?? null;
export const relatedDisneyHotels = (h: DisneyHotel, n = 3) =>
  DISNEY_HOTELS.filter((x) => x.slug !== h.slug && (x.category === h.category || (h.parent && (x.parent === h.parent || x.name === h.parent)))).slice(0, n);
