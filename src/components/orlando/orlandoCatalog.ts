// Gerado a partir de Ingressos_Orlando_Lovable.json (versão 1.0.0). Sem preços.
export const ORLANDO_CATALOG_VERSION = "1.0.0";
export type OrlandoCategory = "theme_park" | "day_experience" | "water_park" | "short_attraction" | "show" | "sport" | "special_event";
export interface OrlandoExperience { id: string; name: string; group: string; category: OrlandoCategory; description: string }
export const ORLANDO_SECTION = {
  "title": "Parques e experiências em Orlando",
  "subtitle": "Explore as possibilidades e escolha o que você quer viver na sua viagem.",
  "cta_title": "Gostou? Monte sua seleção de parques e atrações.",
  "cta_description": "Você escolhe as experiências, e nossa equipe prepara o orçamento.",
  "cta_label": "Solicitar meus ingressos"
};
export const ORLANDO_CARDS: { id: string; title: string; description: string }[] = [
  {
    "id": "disney",
    "title": "Walt Disney World Resort",
    "description": "Quatro parques para viver histórias, explorar mundos e criar memórias em família."
  },
  {
    "id": "universal",
    "title": "Universal Orlando Resort",
    "description": "Cinema, aventuras e universos imersivos para diferentes estilos de viajante."
  },
  {
    "id": "united-parks",
    "title": "United Parks & Resorts",
    "description": "Montanhas-russas, vida marinha e parques aquáticos em Orlando e Tampa."
  },
  {
    "id": "legoland",
    "title": "LEGOLAND Florida Resort",
    "description": "Diversão inspirada no universo LEGO, com atrações para explorar em família."
  },
  {
    "id": "ksc",
    "title": "Kennedy Space Center",
    "description": "Uma viagem pela exploração espacial, com histórias e experiências que aproximam você do espaço."
  },
  {
    "id": "icon",
    "title": "ICON Park",
    "description": "Roda-gigante, aquário e encontros com figuras de cera para complementar seus passeios."
  },
  {
    "id": "cirque",
    "title": "Cirque du Soleil",
    "description": "Uma noite de espetáculo, arte e acrobacias para tornar a viagem ainda mais especial."
  },
  {
    "id": "blue-man",
    "title": "Blue Man Group",
    "description": "Música, humor e criatividade em uma experiência de entretenimento diferente."
  },
  {
    "id": "magic",
    "title": "Orlando Magic",
    "description": "Viva a atmosfera de uma partida de basquete da NBA em Orlando."
  }
];
export const ORLANDO_GROUPS: { id: string; name: string }[] = [
  {
    "id": "disney",
    "name": "Walt Disney World Resort"
  },
  {
    "id": "universal",
    "name": "Universal Orlando Resort"
  },
  {
    "id": "united-parks",
    "name": "United Parks & Resorts"
  },
  {
    "id": "legoland",
    "name": "LEGOLAND Florida Resort"
  },
  {
    "id": "ksc",
    "name": "Kennedy Space Center"
  },
  {
    "id": "icon",
    "name": "ICON Park"
  },
  {
    "id": "cirque",
    "name": "Cirque du Soleil"
  },
  {
    "id": "blue-man",
    "name": "Blue Man Group"
  },
  {
    "id": "magic",
    "name": "Orlando Magic"
  }
];
export const ORLANDO_CATALOG: OrlandoExperience[] = [
  {
    "id": "magic-kingdom",
    "name": "Magic Kingdom Park",
    "group": "disney",
    "category": "theme_park",
    "description": "Contos de fadas, personagens e atrações clássicas em um parque cheio de magia."
  },
  {
    "id": "epcot",
    "name": "EPCOT",
    "group": "disney",
    "category": "theme_park",
    "description": "Culturas do mundo, descobertas e experiências que misturam imaginação e inovação."
  },
  {
    "id": "hollywood-studios",
    "name": "Disney’s Hollywood Studios",
    "group": "disney",
    "category": "theme_park",
    "description": "Entre nos mundos do cinema e viva aventuras inspiradas em histórias marcantes."
  },
  {
    "id": "animal-kingdom",
    "name": "Disney’s Animal Kingdom Theme Park",
    "group": "disney",
    "category": "theme_park",
    "description": "Natureza, animais e aventuras em cenários que convidam à exploração."
  },
  {
    "id": "universal-studios",
    "name": "Universal Studios Florida",
    "group": "universal",
    "category": "theme_park",
    "description": "Filmes e séries ganham vida em atrações e experiências imersivas."
  },
  {
    "id": "islands-of-adventure",
    "name": "Universal Islands of Adventure",
    "group": "universal",
    "category": "theme_park",
    "description": "Aventuras, personagens e atrações para quem quer emoção e fantasia."
  },
  {
    "id": "epic-universe",
    "name": "Universal Epic Universe",
    "group": "universal",
    "category": "theme_park",
    "description": "Explore diferentes mundos imersivos em uma jornada de descobertas e aventuras."
  },
  {
    "id": "seaworld",
    "name": "SeaWorld Orlando",
    "group": "united-parks",
    "category": "theme_park",
    "description": "Montanhas-russas, vida marinha e entretenimento em um dia de descobertas."
  },
  {
    "id": "busch-gardens",
    "name": "Busch Gardens Tampa Bay",
    "group": "united-parks",
    "category": "theme_park",
    "description": "Montanhas-russas e experiências com animais em um passeio até Tampa."
  },
  {
    "id": "discovery-cove",
    "name": "Discovery Cove",
    "group": "united-parks",
    "category": "day_experience",
    "description": "Um dia de lazer em ambientes aquáticos e paisagens tropicais."
  },
  {
    "id": "legoland-florida",
    "name": "LEGOLAND Florida Theme Park",
    "group": "legoland",
    "category": "theme_park",
    "description": "Atrações, construções e diversão inspiradas nas peças LEGO."
  },
  {
    "id": "kennedy-space-center",
    "name": "Kennedy Space Center Visitor Complex",
    "group": "ksc",
    "category": "day_experience",
    "description": "Conheça histórias, veículos e experiências ligadas à exploração espacial."
  },
  {
    "id": "typhoon-lagoon",
    "name": "Disney’s Typhoon Lagoon Water Park",
    "group": "disney",
    "category": "water_park",
    "description": "Diversão aquática em um cenário tropical para incluir um dia de lazer."
  },
  {
    "id": "blizzard-beach",
    "name": "Disney’s Blizzard Beach Water Park",
    "group": "disney",
    "category": "water_park",
    "description": "Toboáguas e atrações aquáticas em um cenário inspirado em uma estação de esqui."
  },
  {
    "id": "volcano-bay",
    "name": "Universal Volcano Bay",
    "group": "universal",
    "category": "water_park",
    "description": "Atrações aquáticas e paisagens tropicais ao redor de um grande vulcão."
  },
  {
    "id": "aquatica",
    "name": "Aquatica Orlando",
    "group": "united-parks",
    "category": "water_park",
    "description": "Piscinas, toboáguas e atrações aquáticas para diferentes ritmos de diversão."
  },
  {
    "id": "orlando-eye",
    "name": "The Orlando Eye",
    "group": "icon",
    "category": "short_attraction",
    "description": "Veja Orlando de outra perspectiva em um passeio de roda-gigante."
  },
  {
    "id": "madame-tussauds",
    "name": "Madame Tussauds Orlando",
    "group": "icon",
    "category": "short_attraction",
    "description": "Encontre figuras de cera de personalidades e aproveite cenários para fotos."
  },
  {
    "id": "sea-life-orlando",
    "name": "SEA LIFE Orlando Aquarium",
    "group": "icon",
    "category": "short_attraction",
    "description": "Explore ambientes aquáticos e descubra a vida marinha de perto."
  },
  {
    "id": "drawn-to-life",
    "name": "Drawn to Life — Cirque du Soleil e Disney",
    "group": "cirque",
    "category": "show",
    "description": "Uma experiência de palco que une acrobacias e o universo da animação Disney."
  },
  {
    "id": "blue-man-orlando",
    "name": "Blue Man Group Orlando",
    "group": "blue-man",
    "category": "show",
    "description": "Um espetáculo de música, humor e criatividade no ICON Park."
  },
  {
    "id": "orlando-magic",
    "name": "Orlando Magic — NBA",
    "group": "magic",
    "category": "sport",
    "description": "Sinta a energia de uma partida de basquete em Orlando."
  },
  {
    "id": "disney-halloween",
    "name": "Mickey’s Not-So-Scary Halloween Party",
    "group": "disney",
    "category": "special_event",
    "description": "Halloween na Disney com uma experiência festiva em noites selecionadas."
  },
  {
    "id": "universal-halloween",
    "name": "Halloween Horror Nights",
    "group": "universal",
    "category": "special_event",
    "description": "Uma experiência noturna de terror em noites selecionadas."
  },
  {
    "id": "seaworld-halloween",
    "name": "Howl-O-Scream — SeaWorld Orlando",
    "group": "united-parks",
    "category": "special_event",
    "description": "Uma experiência noturna de terror para quem busca sustos e emoção."
  },
  {
    "id": "disney-christmas",
    "name": "Mickey’s Very Merry Christmas Party",
    "group": "disney",
    "category": "special_event",
    "description": "Celebre o Natal em uma festa especial no Magic Kingdom."
  },
  {
    "id": "jollywood-nights",
    "name": "Disney Jollywood Nights",
    "group": "disney",
    "category": "special_event",
    "description": "Uma festa de fim de ano no Disney’s Hollywood Studios."
  },
  {
    "id": "disney-after-hours",
    "name": "Disney After Hours",
    "group": "disney",
    "category": "special_event",
    "description": "Tenho interesse em visitar um parque em um evento fora do horário regular."
  }
];
