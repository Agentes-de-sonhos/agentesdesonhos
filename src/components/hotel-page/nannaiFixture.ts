import p0 from "@/assets/hotel-nannai/p0.jpg";
import p1 from "@/assets/hotel-nannai/p1.jpg";
import p2 from "@/assets/hotel-nannai/p2.jpg";
import p3 from "@/assets/hotel-nannai/p3.jpg";
import p4 from "@/assets/hotel-nannai/p4.jpg";
import p5 from "@/assets/hotel-nannai/p5.jpg";
import p6 from "@/assets/hotel-nannai/p6.jpg";
import p7 from "@/assets/hotel-nannai/p7.jpg";
import p8 from "@/assets/hotel-nannai/p8.jpg";
import p9 from "@/assets/hotel-nannai/p9.jpg";
import type { HotelPageData } from "./types";

/**
 * Primeiro cadastro real (piloto). Fotos, nota, avaliação, endereço e
 * coordenadas importados uma única vez do Google em 03/10/2026; textos com base
 * no site oficial (nannai.com.br/muro-alto). Nenhuma chamada ao Google ocorre
 * ao abrir a página.
 */
export const NANNAI_MURO_ALTO: HotelPageData = {
  slug: "nannai",
  name: "Nannai Muro Alto",
  address: "Rodovia PE-09, Muro Alto",
  city: "Ipojuca",
  state: "Pernambuco",
  photos: [
    { url: p0, alt: "Bangalô com piscina privativa" },
    { url: p2, alt: "Nannai Muro Alto" },
    { url: p3, alt: "Nannai Muro Alto" },
    { url: p4, alt: "Nannai Muro Alto" },
    { url: p5, alt: "Nannai Muro Alto" },
    { url: p6, alt: "Nannai Muro Alto" },
    { url: p7, alt: "Nannai Muro Alto" },
    { url: p8, alt: "Nannai Muro Alto" },
    { url: p1, alt: "Nannai Muro Alto" },
    { url: p9, alt: "Nannai Muro Alto" },
  ],
  descriptionTitle: "Por que escolher o NANNAI Muro Alto?",
  description: [
    "O NANNAI Muro Alto é uma escolha para quem quer desacelerar à beira-mar, com privacidade, boa gastronomia e conforto. Em meio a jardins e arquitetura tropical, o resort oferece um cenário especialmente convidativo para viagens a dois e comemorações especiais.",
    "Seus bangalôs são parte da identidade do hotel, com opções de piscina privativa que tornam a própria acomodação um convite ao descanso. A gastronomia amplia a experiência, dos sabores regionais do TiaTê às tapas e aos drinques do Salero.",
    "Entre a praia de Muro Alto, as piscinas e o SPA by L’Occitane, o prazer está em escolher como aproveitar cada dia: um mergulho, uma refeição sem pressa ou uma pausa para cuidar de si.",
  ],
  amenities: [
    { icon: "pool", label: "Bangalôs com piscina privativa", description: "Opções de hospedagem para quem valoriza privacidade e quer aproveitar momentos de descanso na própria acomodação." },
    { icon: "beach", label: "À beira de Muro Alto", description: "Acesso à praia conhecida pela paisagem de arrecifes e piscinas naturais." },
    { icon: "restaurant", label: "Gastronomia com identidade", description: "Sabores brasileiros e internacionais, com experiências como o restaurante TiaTê e o bar de tapas Salero." },
    { icon: "spa", label: "SPA by L’Occitane", description: "Tratamentos e terapias para incluir momentos de bem-estar na viagem." },
    { icon: "leisure", label: "Espaço para viver no seu ritmo", description: "Uma proposta que combina lazer de resort com ambientes e acomodações voltados ao descanso e à privacidade." },
  ],
  scheduleNote: "Horários de check-in e check-out a confirmar com o hotel.",
  google: {
    rating: 4.8,
    totalReviews: 5162,
    reviewsUrl: "https://maps.google.com/?cid=266994676508101947",
    reviews: [
      {
        "author": "Renato Luz",
        "rating": 5,
        "text": "Experiência incrível no Nannai! Desde o atendimento até a comida e toda a estrutura, tudo foi excelente.\n\nUm ponto que gostamos muito é que, apesar de ter uma estrutura completa, o resort é compacto e muito bem planejado. Não é daqueles resorts enormes em que você precisa andar muito para chegar aos lugares. Tudo fica próximo, é fácil de acessar e, ao mesmo tempo, você tem tudo o que precisa para aproveitar a estadia.\n\nAtendimento impecável, comida excelente e um ambiente maravilhoso. Com certeza foi uma experiência que valeu muito a pena. Recomendo e voltaria sem pensar duas vezes!",
        "relativeTime": "Um mês atrás"
      },
      {
        "author": "Marcia Carneiro",
        "rating": 5,
        "text": "Uma experiência maravilhosa no Nannai!\nDesde a chegada, fomos recebidos com muita atenção, gentileza e cuidado. O atendimento de toda a equipe é excelente, sempre cordiais e atenciosos.\n\nAs acomodações são extremamente confortáveis, bem cuidadas e cheias de charme. Cada detalhe do hotel transmite aconchego e integração com a natureza. Os jardins são lindíssimos, os ambientes muito agradáveis e a praia torna tudo ainda mais especial.\n\nÉ um lugar que realmente proporciona descanso e bem-estar. Ficamos encantados com a hospitalidade e com o cuidado em cada detalhe. Uma experiência que deixa vontade de voltar! Parabéns a toda a equipe do Nannai!",
        "relativeTime": "4 semanas atrás"
      },
      {
        "author": "Fernanda Plaster Stuhr",
        "rating": 5,
        "text": "Ficamos alguns dias no resort e tivemos uma experiência maravilhosa. Um dos dias da nossa estadia foi o aniversário do meu esposo e a única coisa que senti falta, por se tratar de um hotel 5 estrelas, foi um mimo ou alguma lembrança por parte do resort. Já nos hospedamos em outros hotéis que fazem esse tipo de surpresa, o que torna a experiência ainda mais especial. É apenas um detalhe que gostaria de comentar e que, na minha opinião, faria toda a diferença.\n\nFora isso, não tenho do que reclamar. Voltaria com certeza! O lugar é extremamente aconchegante, os funcionários são muito educados, atenciosos e proativos. Estar cercado pela natureza deixa o ambiente ainda mais leve e tranquilo.\n\nNa minha opinião, o resort está localizado em uma das melhores praias da região. Fizemos passeios para conhecer outras praias, mas, sem dúvidas, a do próprio resort foi a nossa favorita.\n\nO café da manhã, o chá da tarde e o jantar, que já estão inclusos na hospedagem, estavam impecáveis. Havia uma enorme variedade de opções e tudo estava delicioso.\n\nOutro ponto que nos surpreendeu foi o atendimento durante o dia: enquanto estávamos nas espreguiçadeiras, os funcionários passavam frequentemente oferecendo mini porções, sorvetes e outras delícias, tudo sem custo adicional.\n\nAlém disso, o resort é muito bem equipado, com academia, spa, piscinas, espaço para crianças e uma excelente estrutura. É realmente um lugar para descansar, aproveitar e relaxar.\n\nCom certeza voltaremos e indicaremos para outras pessoas!",
        "relativeTime": "2 meses atrás"
      },
      {
        "author": "Cassiane Biondo",
        "rating": 5,
        "text": "Excelente Hospedagem com quartos confortáveis, para quem tem crianças o quarto é muito confortável, com banheira para o bebê e chaleira elétrica para aquecer o mamazinho.\nNão tem muito opção de diversão nas piscinas para crianças, mas ela são quentinhas, rasas e ótimas para a familia curtir junto.\nA praia é maravilhosa, com serviço do hotel a beira mar.\nA Comida do hotel é maravilhosa! Pratos excelentes e bem preparados.\nPerdi um objeto muito pequeno no hotel e em menos de 24h foi encontrado pela equipe, fiquei surpresa e agradeço pelo atendimento impecável que recebi. Até a próxima Nanai!",
        "relativeTime": "3 semanas atrás"
      },
      {
        "author": "Daniel Manso",
        "rating": 5,
        "text": "Um dos melhores do Brasil, recebem o hóspede como ninguém, conforto, organização e qualidade em tudo, sem contar a praia maravilhoso. Esta no top 3",
        "relativeTime": "4 semanas atrás"
      }
    ],
  },
  location: {
    lat: -8.4333252,
    lng: -34.9806039,
    mapsUrl: "https://maps.google.com/?cid=266994676508101947",
  },
};
