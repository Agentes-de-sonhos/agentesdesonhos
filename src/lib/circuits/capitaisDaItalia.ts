import hero from "@/assets/circuits/capitais-italia-hero.jpg";
import type { CircuitTour } from "./types";

const SUNDAYS = (m: string, d: number[]) => ({ month: m, days: d });

/** Fonte: folheto Europamundo "Capitais da Itália" (ID 2600208). Exclusivo da Drica Viagens. */
export const CAPITAIS_DA_ITALIA: CircuitTour = {
  slug: "capitais-da-italia",
  profiles: ["dricaOfficial", "dricaPresentation"],
  enhancedPresentation: true,
  badge: "Circuito rodoviário · Saídas aos domingos",
  title: "Capitais da Itália",
  code: "2600208",
  operator: "Europamundo",
  duration: "7 dias / 6 noites",
  countries: ["Itália"],
  cities: ["Roma", "Florença", "Veneza", "Rávena", "Assis"],
  heroImage: hero,
  heroAlt: "Vista de Florença ao pôr do sol a partir do Piazzale Michelangelo",
  summary:
    "Roma, Florença e Veneza em uma semana, com passagem por Rávena e Assis. Ônibus com guia em português e espanhol, hotéis com café da manhã e visitas guiadas nas principais cidades.",
  currency: "EUR",
  fromPrice: 906,
  priceNote: "Preço por pessoa, a partir de. Valores sujeitos a disponibilidade e câmbio; consulte parcelamento em reais.",
  inclusions: [
    { icon: "hotel", title: "6 noites de hospedagem", text: "Hotéis previstos com café da manhã tipo buffet." },
    { icon: "tours", title: "Visitas panorâmicas", text: "Roma, Florença, Veneza e Assis com guia." },
    { icon: "transfer", title: "Traslado de chegada", text: "Recepção e traslado ao hotel em Roma." },
    { icon: "bus", title: "Circuito em ônibus", text: "Ônibus durante todo o roteiro, com seguro básico de viagem." },
    { icon: "guide", title: "Guia acompanhante", text: "Guia falando português e espanhol." },
    { icon: "meals", title: "Barco em Veneza", text: "Tronchetto / Praça de São Marcos / Tronchetto." },
  ],
  highlights: [
    "Traslado noturno ao bairro de Trastevere, em Roma",
    "Piazzale Michelangelo, em Florença",
    "Entrada na fábrica de cristal de Murano, em Veneza",
    "Entrada na Basílica de São Francisco, em Assis",
    "Mosaicos de Rávena: Gala Placídia e São Vital",
    "Coliseu, Fóruns Imperiais e Vaticano",
  ],
  hotels: [
    { city: "Roma", options: ["Hotéis previstos informados pela operadora"] },
    { city: "Florença", options: ["Hotéis previstos informados pela operadora"] },
    { city: "Veneza (região de Mestre)", overnightCity: "Veneza", options: ["Hotéis previstos informados pela operadora"] },
  ],
  hotelsNote: "A lista de hotéis previstos é enviada junto com a cotação.",
  itinerary: [
    { day: 1, overnightCity: "Roma", weekday: "Domingo", title: "Roma", description: "Bem-vindos! Traslado ao hotel e tempo livre. À tarde, as informações sobre o início do circuito ficam nos cartazes da recepção do hotel." },
    { day: 2, overnightCity: "Roma", weekday: "Segunda-feira", title: "Roma", meals: ["Café da manhã"], description: "Visita guiada de três horas combinando passeio a pé pela Roma Imperial e tour de ônibus: Arco de Constantino, exterior do Coliseu, Fóruns Imperiais, Circo Máximo, Termas de Caracala, Santa Maria Maior, Pirâmide Céstia e Castelo de Santo Ângelo. Término no Vaticano por volta das 11h, com visita opcional aos Museus Vaticanos e Capela Sistina. À noite, traslado ao bairro de Trastevere; retorno ao hotel por volta das 20h30." },
    { day: 3, overnightCity: "Roma", weekday: "Terça-feira", title: "Roma", meals: ["Café da manhã"], description: "Dia livre para continuar aproveitando a Cidade Eterna." },
    { day: 4, overnightCity: "Florença", weekday: "Quarta-feira", title: "Roma → Florença", meals: ["Café da manhã"], description: "Travessia dos Apeninos até Florença, direto ao Mirante Michelangelo. Depois, visita com guia local ao centro histórico: Duomo, Ponte Vecchio e Piazza della Signoria. Tempo livre." },
    { day: 5, overnightCity: "Veneza", weekday: "Quinta-feira", title: "Florença → Veneza", meals: ["Café da manhã"], description: "Saída cedo rumo ao norte. Em Veneza, traslado de barco ao centro e visita a pé pela Praça de São Marcos. Hospedagem na região de Mestre." },
    { day: 6, overnightCity: "Roma", weekday: "Sexta-feira", title: "Veneza → Rávena → Assis → Roma", meals: ["Café da manhã"], description: "Em Rávena, mausoléu de Gala Placídia e Basílica de São Vital. Em Assis, visita à Basílica de São Francisco com padre franciscano ou guia local. Chegada a Roma no fim do dia." },
    { day: 7, weekday: "Sábado", title: "Roma", meals: ["Café da manhã"], description: "Após o café da manhã, fim dos serviços." },
  ],
  departures: [
    SUNDAYS("Abril 2026", [5, 12, 19, 26]),
    SUNDAYS("Maio 2026", [3, 10, 17, 24, 31]),
    SUNDAYS("Junho 2026", [7, 14, 21, 28]),
    SUNDAYS("Julho 2026", [5, 12, 19, 26]),
    SUNDAYS("Agosto 2026", [2, 9, 16, 23, 30]),
    SUNDAYS("Setembro 2026", [6, 13, 20, 27]),
    SUNDAYS("Outubro 2026", [4, 11, 18, 25]),
    SUNDAYS("Novembro 2026", [1, 8, 15, 22, 29]),
    SUNDAYS("Dezembro 2026", [6, 13, 20, 27]),
    SUNDAYS("Janeiro 2027", [3, 10, 17, 24, 31]),
    SUNDAYS("Fevereiro 2027", [7, 14, 21, 28]),
    SUNDAYS("Março 2027", [7, 14, 21, 28]),
  ],
  departuresNote: "Todas as saídas são aos domingos, com início em Roma.",
  notes: [
    { title: "Seguro viagem", text: "O seguro básico incluído não atende ao Tratado de Schengen; é necessário contratar um seguro viagem." },
  ],
  faq: [
    { q: "Os voos internacionais estão incluídos?", a: "Não. O circuito começa e termina em Roma; a Drica pode cotar os voos junto com o pacote." },
    { q: "Preciso de seguro viagem?", a: "Sim. O seguro básico do circuito não atende às exigências de Schengen, então é preciso contratar um seguro viagem." },
    { q: "Os Museus Vaticanos estão incluídos?", a: "Não. A visita aos Museus Vaticanos e à Capela Sistina é opcional, oferecida pelo guia." },
    { q: "Em qual idioma é o guia?", a: "O guia acompanhante fala português e espanhol." },
  ],
};
