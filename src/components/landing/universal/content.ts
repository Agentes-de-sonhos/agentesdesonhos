// Conteúdo da landing Universal Orlando Resort. Fotos oficiais (universalorlando.com), com crédito.
import heroUsf from "@/assets/universal/hero-usf.webp.asset.json";
import heroIoa from "@/assets/universal/hero-ioa.webp.asset.json";
import heroEpic from "@/assets/universal/hero-epic.webp.asset.json";
import heroVb from "@/assets/universal/hero-vb.webp.asset.json";
import parkUsf from "@/assets/universal/park-usf.webp.asset.json";
import parkIoa from "@/assets/universal/park-ioa.webp.asset.json";
import parkEpic from "@/assets/universal/park-epic.webp.asset.json";
import parkVb from "@/assets/universal/park-vb.webp.asset.json";
import cwMain from "@/assets/universal/cw-main.webp.asset.json";
import evHhn from "@/assets/universal/ev-hhn.webp.asset.json";
import hHelios from "@/assets/universal/h-helios.webp.asset.json";
import hPortofino from "@/assets/universal/h-portofino.webp.asset.json";
import hHardrock from "@/assets/universal/h-hardrock.webp.asset.json";
import hRoyal from "@/assets/universal/h-royal.webp.asset.json";
import hSapphire from "@/assets/universal/h-sapphire.webp.asset.json";
import hAventura from "@/assets/universal/h-aventura.webp.asset.json";
import hCabana from "@/assets/universal/h-cabana.webp.asset.json";
import hStella from "@/assets/universal/h-stella.webp.asset.json";
import hTerra from "@/assets/universal/h-terra.webp.asset.json";
import hSurfside from "@/assets/universal/h-surfside.webp.asset.json";
import hDockside from "@/assets/universal/h-dockside.webp.asset.json";
import logoUsf from "@/assets/orlando/parks/park-universal-studios.asset.json";
import logoIoa from "@/assets/orlando/parks/park-islands-of-adventure.asset.json";
import logoEpic from "@/assets/orlando/parks/park-epic-universe.asset.json";
import logoVb from "@/assets/orlando/parks/park-volcano-bay.asset.json";
import logoUniversal from "@/assets/orlando/universal.asset.json";

export const UNIVERSAL_PHOTO_CREDIT = "Fotos: Universal Orlando Resort (divulgação oficial).";

export const UNIVERSAL_HERO = [
  { park: "Universal Studios Florida", logo: logoUsf.url, image: heroUsf.url, alt: "Casal caminhando pelo Beco Diagonal", kicker: "Universal Studios Florida", title: "Entre nos filmes que você ama", subtitle: "O Beco Diagonal de Harry Potter, os Minions, Velozes & Furiosos e atrações que colocam você dentro do cinema." },
  { park: "Universal Islands of Adventure", logo: logoIoa.url, image: heroIoa.url, alt: "Jurassic World VelociCoaster", kicker: "Universal Islands of Adventure", title: "Aventuras lendárias em cada ilha", subtitle: "Hogsmeade, o Castelo de Hogwarts, a VelociCoaster e montanhas-russas que estão entre as mais emocionantes de Orlando.", focal: "center 30%" },
  { park: "Universal Epic Universe", logo: logoEpic.url, image: heroEpic.url, alt: "Celestial Park no Universal Epic Universe", kicker: "Universal Epic Universe", title: "Uma nova era de parques temáticos", subtitle: "Super Nintendo World, o Ministério da Magia, Como Treinar o Seu Dragão e Dark Universe em um só parque." },
  { park: "Universal Volcano Bay", logo: logoVb.url, image: heroVb.url, alt: "Vulcão Krakatau no Universal Volcano Bay", kicker: "Universal Volcano Bay", title: "Um paraíso aquático aos pés do vulcão", subtitle: "Toboáguas, rio lento, piscina de ondas e a pulseira TapuTapu para curtir com menos filas." },
];

export const UNIVERSAL_PARKS = [
  { id: "universal-studios", name: "Universal Studios Florida", logo: logoUsf.url, image: parkUsf.url, alt: "Minions no Universal Studios Florida", description: "O parque do cinema e da TV. Caminhe pela Londres e pelo Beco Diagonal do mundo de Harry Potter, divirta-se com os Minions e viva atrações inspiradas em grandes sucessos de Hollywood.", highlights: ["Beco Diagonal", "Minion Land", "Velozes & Furiosos"] },
  { id: "islands-of-adventure", name: "Universal Islands of Adventure", logo: logoIoa.url, image: parkIoa.url, alt: "Hogwarts Express na estação de Hogsmeade", description: "Ilhas temáticas com super-heróis, dinossauros e magia. Embarque no Hogwarts Express entre os dois parques, visite Hogsmeade e encare montanhas-russas icônicas.", highlights: ["Hogsmeade", "VelociCoaster", "Hagrid's"] },
  { id: "epic-universe", name: "Universal Epic Universe", logo: logoEpic.url, image: parkEpic.url, alt: "Super Nintendo World no Epic Universe", description: "O parque mais novo da Universal, com mundos imersivos ao redor do Celestial Park: Super Nintendo World, Wizarding World of Harry Potter – Ministry of Magic, Isle of Berk e Dark Universe.", highlights: ["Super Nintendo World", "Ministry of Magic", "Isle of Berk"] },
  { id: "volcano-bay", name: "Universal Volcano Bay", logo: logoVb.url, image: parkVb.url, alt: "Praia de Waturi e vulcão Krakatau", description: "Parque aquático com temática polinésia. Toboáguas radicais, rio lento, praia com ondas e áreas para crianças, com o sistema TapuTapu que reduz o tempo em filas.", highlights: ["Krakatau", "Waturi Beach", "TapuTapu"] },
];

export const UNIVERSAL_CITYWALK = {
  logo: logoUniversal.url,
  image: cwMain.url,
  alt: "Universal CityWalk à noite",
  title: "Universal CityWalk: o dia continua depois dos parques",
  paragraphs: [
    "Entre os parques e os hotéis, o CityWalk reúne restaurantes, bares, lojas, música ao vivo e entretenimento, com entrada gratuita.",
    "É o lugar ideal para almoçar entre um parque e outro ou encerrar a noite com um bom jantar.",
  ],
  items: [
    ["Gastronomia", "Restaurantes temáticos, doces e opções para todas as idades."],
    ["Vida noturna", "Bares, música ao vivo e karaokê."],
    ["Entretenimento", "Cinema, minigolfe e experiências para grupos."],
    ["Compras", "Lojas oficiais Universal e marcas variadas."],
  ] as [string, string][],
};

export const UNIVERSAL_EVENTS = [
  { title: "Halloween Horror Nights", period: "Setembro a novembro", image: evHhn.url, alt: "Halloween Horror Nights", description: "O famoso evento noturno de terror da Universal, com casas mal-assombradas, zonas de sustos e shows. Indicado para adultos e adolescentes.", separateTicket: true },
  { title: "Festas de fim de ano", period: "Novembro a dezembro", description: "Grinchmas, decoração natalina no mundo de Harry Potter e o desfile de fim de ano com balões da Macy's transformam os parques no fim do ano.", separateTicket: false },
  { title: "Universal Mardi Gras", period: "Fevereiro a abril", description: "Desfile com carros alegóricos, colares, gastronomia inspirada em Nova Orleans e shows em noites selecionadas.", separateTicket: false },
];

export const UNIVERSAL_HOTELS = [
  { name: "Loews Portofino Bay Hotel", category: "Signature Collection", image: hPortofino.url, description: "Inspirado em uma vila costeira italiana, com Universal Express Unlimited incluído." },
  { name: "Hard Rock Hotel", category: "Signature Collection", image: hHardrock.url, description: "Estilo rock'n'roll a poucos passos dos parques, com Universal Express Unlimited incluído." },
  { name: "Loews Royal Pacific Resort", category: "Signature Collection", image: hRoyal.url, description: "Atmosfera tropical do Pacífico Sul, com Universal Express Unlimited incluído." },
  { name: "Universal Helios Grand Hotel", category: "Premium", image: hHelios.url, description: "Conectado ao Universal Epic Universe, com acesso exclusivo ao parque." },
  { name: "Loews Sapphire Falls Resort", category: "Premium", image: hSapphire.url, description: "Inspirado no Caribe, com piscina ampla e cascatas." },
  { name: "Universal Aventura Hotel", category: "Prime Value", image: hAventura.url, description: "Moderno, com rooftop e vista para os parques." },
  { name: "Universal Cabana Bay Beach Resort", category: "Prime Value", image: hCabana.url, description: "Clima retrô dos anos 50 e 60, ótimo para famílias." },
  { name: "Universal Stella Nova Resort", category: "Econômica", image: hStella.url, description: "Visual moderno e próximo ao Epic Universe." },
  { name: "Universal Terra Luna Resort", category: "Econômica", image: hTerra.url, description: "Opção econômica com design contemporâneo." },
  { name: "Universal Endless Summer Resort – Surfside Inn and Suites", category: "Econômica", image: hSurfside.url, description: "Tema de praia com suítes para famílias." },
  { name: "Universal Endless Summer Resort – Dockside Inn and Suites", category: "Econômica", image: hDockside.url, description: "Clima de verão, piscinas e ótimo custo-benefício." },
];
