/**
 * Base de PORTOS DE EMBARQUE de cruzeiros usada pelos sites white label.
 *
 * O projeto não possui uma API de portos (Google Places não retorna terminais
 * de cruzeiro de forma confiável e a base própria `public.cities` só tem
 * cidades). Esta é uma base curada e pesquisável por:
 *  - nome do porto/terminal ("Porto de Santos", "Port Canaveral");
 *  - cidade de embarque ("Santos", "Miami");
 *  - região relacionada ("Orlando" encontra Port Canaveral, "Costa brasileira").
 *
 * Mantenha os registros reais — nunca preencha com dados ilustrativos.
 */

export interface CruisePort {
  /** Nome usual do porto/terminal. */
  name: string;
  city: string;
  country: string;
  /** Região/roteiro em que o embarque se encaixa. */
  region: string;
  /** Termos alternativos de busca (cidades próximas, grafias, aeroportos). */
  aliases?: string[];
}

export const CRUISE_PORTS: CruisePort[] = [
  // ----------------------------- Brasil -----------------------------
  { name: "Porto de Santos", city: "Santos", country: "Brasil", region: "Costa brasileira", aliases: ["São Paulo", "Terminal Marítimo de Passageiros Giusfredo Santini", "Concais", "GRU", "CGH"] },
  { name: "Píer Mauá", city: "Rio de Janeiro", country: "Brasil", region: "Costa brasileira", aliases: ["Porto do Rio de Janeiro", "GIG", "SDU"] },
  { name: "Porto de Salvador", city: "Salvador", country: "Brasil", region: "Nordeste do Brasil", aliases: ["Bahia", "SSA"] },
  { name: "Porto de Maceió", city: "Maceió", country: "Brasil", region: "Nordeste do Brasil", aliases: ["Alagoas", "MCZ"] },
  { name: "Porto de Recife", city: "Recife", country: "Brasil", region: "Nordeste do Brasil", aliases: ["Pernambuco", "REC"] },
  { name: "Porto de Natal", city: "Natal", country: "Brasil", region: "Nordeste do Brasil", aliases: ["Rio Grande do Norte", "NAT"] },
  { name: "Porto de Fortaleza", city: "Fortaleza", country: "Brasil", region: "Nordeste do Brasil", aliases: ["Ceará", "Mucuripe", "FOR"] },
  { name: "Porto de Ilhéus", city: "Ilhéus", country: "Brasil", region: "Costa brasileira", aliases: ["Bahia", "IOS"] },
  { name: "Porto de Búzios", city: "Armação dos Búzios", country: "Brasil", region: "Costa brasileira", aliases: ["Buzios", "Região dos Lagos"] },
  { name: "Porto de Ilha Grande", city: "Angra dos Reis", country: "Brasil", region: "Costa brasileira", aliases: ["Angra", "Costa Verde"] },
  { name: "Porto de Itajaí", city: "Itajaí", country: "Brasil", region: "Sul do Brasil", aliases: ["Santa Catarina", "Balneário Camboriú", "NVT"] },
  { name: "Porto de Manaus", city: "Manaus", country: "Brasil", region: "Amazônia", aliases: ["Amazonas", "Rio Negro", "MAO"] },
  { name: "Porto de Santarém", city: "Santarém", country: "Brasil", region: "Amazônia", aliases: ["Pará", "STM"] },
  { name: "Porto de Belém", city: "Belém", country: "Brasil", region: "Amazônia", aliases: ["Pará", "BEL"] },
  { name: "Porto de Paranaguá", city: "Paranaguá", country: "Brasil", region: "Sul do Brasil", aliases: ["Curitiba", "Paraná"] },
  { name: "Porto de Rio Grande", city: "Rio Grande", country: "Brasil", region: "Sul do Brasil", aliases: ["Rio Grande do Sul"] },

  // -------------------- Estados Unidos / Canadá ----------------------
  { name: "PortMiami", city: "Miami", country: "Estados Unidos", region: "Caribe", aliases: ["Porto de Miami", "MIA", "Flórida", "Florida"] },
  { name: "Port Everglades", city: "Fort Lauderdale", country: "Estados Unidos", region: "Caribe", aliases: ["Porto Everglades", "FLL", "Flórida", "Florida"] },
  { name: "Port Canaveral", city: "Cape Canaveral", country: "Estados Unidos", region: "Caribe", aliases: ["Porto Canaveral", "Orlando", "Cocoa Beach", "MCO", "Flórida", "Florida", "Disney Cruise Line"] },
  { name: "Port of Tampa", city: "Tampa", country: "Estados Unidos", region: "Caribe", aliases: ["Porto de Tampa", "TPA", "Flórida", "Florida"] },
  { name: "Port of Jacksonville (JAXPORT)", city: "Jacksonville", country: "Estados Unidos", region: "Caribe", aliases: ["JAX", "Flórida", "Florida"] },
  { name: "Port of Palm Beach", city: "West Palm Beach", country: "Estados Unidos", region: "Caribe", aliases: ["PBI", "Flórida", "Florida"] },
  { name: "Manhattan Cruise Terminal", city: "Nova York", country: "Estados Unidos", region: "Costa Leste dos EUA", aliases: ["New York", "NYC", "JFK", "EWR", "Brooklyn Cruise Terminal"] },
  { name: "Cape Liberty Cruise Port", city: "Bayonne", country: "Estados Unidos", region: "Costa Leste dos EUA", aliases: ["Nova York", "New Jersey", "EWR"] },
  { name: "Port of Baltimore", city: "Baltimore", country: "Estados Unidos", region: "Costa Leste dos EUA", aliases: ["BWI", "Maryland"] },
  { name: "Port of Boston (Flynn Cruiseport)", city: "Boston", country: "Estados Unidos", region: "Costa Leste dos EUA", aliases: ["BOS", "Massachusetts", "Nova Inglaterra"] },
  { name: "Port of Charleston", city: "Charleston", country: "Estados Unidos", region: "Costa Leste dos EUA", aliases: ["CHS", "Carolina do Sul"] },
  { name: "Port of New Orleans", city: "Nova Orleans", country: "Estados Unidos", region: "Caribe", aliases: ["New Orleans", "MSY", "Louisiana"] },
  { name: "Port of Galveston", city: "Galveston", country: "Estados Unidos", region: "Caribe", aliases: ["Houston", "HOU", "IAH", "Texas"] },
  { name: "Port of Los Angeles (World Cruise Center)", city: "Los Angeles", country: "Estados Unidos", region: "Riviera Mexicana", aliases: ["San Pedro", "LAX", "Califórnia", "California"] },
  { name: "Port of Long Beach", city: "Long Beach", country: "Estados Unidos", region: "Riviera Mexicana", aliases: ["LGB", "Los Angeles", "Califórnia"] },
  { name: "Port of San Diego", city: "San Diego", country: "Estados Unidos", region: "Riviera Mexicana", aliases: ["SAN", "Califórnia"] },
  { name: "Port of San Francisco", city: "São Francisco", country: "Estados Unidos", region: "Costa Oeste dos EUA", aliases: ["San Francisco", "SFO", "Califórnia"] },
  { name: "Port of Seattle", city: "Seattle", country: "Estados Unidos", region: "Alasca", aliases: ["SEA", "Washington"] },
  { name: "Port of Whittier", city: "Whittier", country: "Estados Unidos", region: "Alasca", aliases: ["Anchorage", "ANC"] },
  { name: "Port of Seward", city: "Seward", country: "Estados Unidos", region: "Alasca", aliases: ["Anchorage", "ANC"] },
  { name: "Port of Juneau", city: "Juneau", country: "Estados Unidos", region: "Alasca", aliases: ["JNU"] },
  { name: "Honolulu Harbor", city: "Honolulu", country: "Estados Unidos", region: "Havaí", aliases: ["Hawaii", "Havai", "HNL"] },
  { name: "Canada Place Cruise Terminal", city: "Vancouver", country: "Canadá", region: "Alasca", aliases: ["YVR", "Colúmbia Britânica"] },
  { name: "Port of Quebec", city: "Quebec", country: "Canadá", region: "Canadá e Nova Inglaterra", aliases: ["Québec", "YQB"] },
  { name: "Port of Montreal", city: "Montreal", country: "Canadá", region: "Canadá e Nova Inglaterra", aliases: ["YUL"] },
  { name: "Port of Halifax", city: "Halifax", country: "Canadá", region: "Canadá e Nova Inglaterra", aliases: ["YHZ", "Nova Escócia"] },

  // ----------------------- Caribe e México --------------------------
  { name: "Port of Cozumel", city: "Cozumel", country: "México", region: "Caribe", aliases: ["Riviera Maya", "Cancún", "CUN", "CZM"] },
  { name: "Puerto Costa Maya", city: "Mahahual", country: "México", region: "Caribe", aliases: ["Costa Maya", "Quintana Roo"] },
  { name: "Puerto Vallarta Cruise Port", city: "Puerto Vallarta", country: "México", region: "Riviera Mexicana", aliases: ["PVR", "Jalisco"] },
  { name: "Port of Ensenada", city: "Ensenada", country: "México", region: "Riviera Mexicana", aliases: ["Baja California"] },
  { name: "Cabo San Lucas Cruise Port", city: "Cabo San Lucas", country: "México", region: "Riviera Mexicana", aliases: ["Los Cabos", "SJD"] },
  { name: "Port of Nassau", city: "Nassau", country: "Bahamas", region: "Caribe", aliases: ["NAS", "Bahamas"] },
  { name: "Freeport Harbour", city: "Freeport", country: "Bahamas", region: "Caribe", aliases: ["Grand Bahama", "FPO"] },
  { name: "Port of San Juan", city: "San Juan", country: "Porto Rico", region: "Caribe", aliases: ["Puerto Rico", "Porto Rico", "SJU"] },
  { name: "Port Zante", city: "Basseterre", country: "São Cristóvão e Nevis", region: "Caribe", aliases: ["St. Kitts", "Saint Kitts"] },
  { name: "Bridgetown Cruise Terminal", city: "Bridgetown", country: "Barbados", region: "Caribe", aliases: ["BGI", "Barbados"] },
  { name: "Port of Castries", city: "Castries", country: "Santa Lúcia", region: "Caribe", aliases: ["St. Lucia", "Saint Lucia", "UVF"] },
  { name: "Port of Philipsburg", city: "Philipsburg", country: "Sint Maarten", region: "Caribe", aliases: ["St. Maarten", "Saint Martin", "SXM"] },
  { name: "Port of Charlotte Amalie", city: "Charlotte Amalie", country: "Ilhas Virgens Americanas", region: "Caribe", aliases: ["St. Thomas", "Saint Thomas", "STT"] },
  { name: "Port of Oranjestad", city: "Oranjestad", country: "Aruba", region: "Caribe", aliases: ["AUA", "Aruba"] },
  { name: "Port of Willemstad", city: "Willemstad", country: "Curaçao", region: "Caribe", aliases: ["CUR", "Curacao"] },
  { name: "Port of Fort-de-France", city: "Fort-de-France", country: "Martinica", region: "Caribe", aliases: ["Martinique", "FDF"] },
  { name: "Port of Pointe-à-Pitre", city: "Pointe-à-Pitre", country: "Guadalupe", region: "Caribe", aliases: ["Guadeloupe", "PTP"] },
  { name: "Port of Roatán", city: "Roatán", country: "Honduras", region: "Caribe", aliases: ["Roatan", "Mahogany Bay", "RTB"] },
  { name: "Port of Belize City", city: "Belize City", country: "Belize", region: "Caribe", aliases: ["BZE"] },
  { name: "Port of Colón (Colón 2000)", city: "Colón", country: "Panamá", region: "Canal do Panamá", aliases: ["Colon", "Panamá", "Panama"] },
  { name: "Port of Cartagena", city: "Cartagena", country: "Colômbia", region: "Caribe", aliases: ["Cartagena das Índias", "CTG"] },
  { name: "Port of La Romana", city: "La Romana", country: "República Dominicana", region: "Caribe", aliases: ["Casa de Campo", "LRM"] },
  { name: "Amber Cove", city: "Puerto Plata", country: "República Dominicana", region: "Caribe", aliases: ["POP", "Puerto Plata"] },
  { name: "Port of Montego Bay", city: "Montego Bay", country: "Jamaica", region: "Caribe", aliases: ["MBJ", "Jamaica"] },
  { name: "Port of Falmouth", city: "Falmouth", country: "Jamaica", region: "Caribe", aliases: ["Jamaica"] },
  { name: "Port of George Town", city: "George Town", country: "Ilhas Cayman", region: "Caribe", aliases: ["Grand Cayman", "GCM"] },

  // ------------------------ América do Sul --------------------------
  { name: "Puerto de Buenos Aires (Terminal Quinquela Martín)", city: "Buenos Aires", country: "Argentina", region: "América do Sul", aliases: ["EZE", "AEP", "Benito Quinquela"] },
  { name: "Puerto de Ushuaia", city: "Ushuaia", country: "Argentina", region: "Antártica e Patagônia", aliases: ["USH", "Terra do Fogo", "Antártida"] },
  { name: "Puerto de Montevideo", city: "Montevidéu", country: "Uruguai", region: "América do Sul", aliases: ["Montevideo", "MVD"] },
  { name: "Puerto de Punta del Este", city: "Punta del Este", country: "Uruguai", region: "América do Sul", aliases: ["PDP"] },
  { name: "Puerto de Valparaíso", city: "Valparaíso", country: "Chile", region: "América do Sul", aliases: ["Santiago", "SCL", "Valparaiso"] },
  { name: "Puerto de San Antonio", city: "San Antonio", country: "Chile", region: "América do Sul", aliases: ["Santiago", "SCL"] },
  { name: "Puerto de Punta Arenas", city: "Punta Arenas", country: "Chile", region: "Antártica e Patagônia", aliases: ["PUQ", "Patagônia"] },
  { name: "Puerto del Callao", city: "Lima", country: "Peru", region: "América do Sul", aliases: ["Callao", "LIM"] },
  { name: "Puerto de Guayaquil", city: "Guayaquil", country: "Equador", region: "Galápagos", aliases: ["GYE", "Galapagos"] },
  { name: "Puerto Baquerizo Moreno", city: "San Cristóbal", country: "Equador", region: "Galápagos", aliases: ["Galápagos", "Galapagos", "SCY"] },

  // ------------------------ Europa e Mediterrâneo -------------------
  { name: "Port of Barcelona", city: "Barcelona", country: "Espanha", region: "Mediterrâneo", aliases: ["Puerto de Barcelona", "BCN", "Catalunha"] },
  { name: "Port of Palma de Mallorca", city: "Palma de Maiorca", country: "Espanha", region: "Mediterrâneo", aliases: ["Palma de Mallorca", "PMI", "Baleares"] },
  { name: "Port of Málaga", city: "Málaga", country: "Espanha", region: "Mediterrâneo", aliases: ["Malaga", "AGP", "Andaluzia"] },
  { name: "Port of Valencia", city: "Valência", country: "Espanha", region: "Mediterrâneo", aliases: ["Valencia", "VLC"] },
  { name: "Port of Santa Cruz de Tenerife", city: "Santa Cruz de Tenerife", country: "Espanha", region: "Ilhas Canárias", aliases: ["Tenerife", "TFS", "Canárias"] },
  { name: "Port of Las Palmas", city: "Las Palmas de Gran Canaria", country: "Espanha", region: "Ilhas Canárias", aliases: ["Gran Canaria", "LPA", "Canárias"] },
  { name: "Port of Lisbon", city: "Lisboa", country: "Portugal", region: "Europa Atlântica", aliases: ["Porto de Lisboa", "LIS", "Santa Apolónia"] },
  { name: "Port of Funchal", city: "Funchal", country: "Portugal", region: "Europa Atlântica", aliases: ["Madeira", "FNC"] },
  { name: "Port of Civitavecchia", city: "Civitavecchia", country: "Itália", region: "Mediterrâneo", aliases: ["Roma", "Rome", "FCO", "Porto de Roma"] },
  { name: "Port of Genoa", city: "Gênova", country: "Itália", region: "Mediterrâneo", aliases: ["Genova", "Genoa", "GOA"] },
  { name: "Port of Savona", city: "Savona", country: "Itália", region: "Mediterrâneo", aliases: ["Costa Cruzeiros", "Gênova"] },
  { name: "Port of Venice", city: "Veneza", country: "Itália", region: "Mediterrâneo", aliases: ["Venezia", "Venice", "VCE", "Marghera"] },
  { name: "Port of Naples", city: "Nápoles", country: "Itália", region: "Mediterrâneo", aliases: ["Napoli", "Naples", "NAP", "Costa Amalfitana"] },
  { name: "Port of Bari", city: "Bari", country: "Itália", region: "Mediterrâneo", aliases: ["BRI", "Adriático"] },
  { name: "Port of Palermo", city: "Palermo", country: "Itália", region: "Mediterrâneo", aliases: ["Sicília", "PMO"] },
  { name: "Port of Trieste", city: "Trieste", country: "Itália", region: "Mediterrâneo", aliases: ["TRS", "Adriático"] },
  { name: "Port of Marseille", city: "Marselha", country: "França", region: "Mediterrâneo", aliases: ["Marseille", "MRS", "Provença"] },
  { name: "Port of Nice / Villefranche", city: "Nice", country: "França", region: "Mediterrâneo", aliases: ["Villefranche-sur-Mer", "NCE", "Riviera Francesa"] },
  { name: "Port Hercule", city: "Mônaco", country: "Mônaco", region: "Mediterrâneo", aliases: ["Monaco", "Monte Carlo"] },
  { name: "Port of Piraeus", city: "Atenas", country: "Grécia", region: "Mediterrâneo", aliases: ["Pireu", "Piraeus", "Athens", "ATH", "Ilhas Gregas"] },
  { name: "Port of Santorini", city: "Santorini", country: "Grécia", region: "Ilhas Gregas", aliases: ["Thira", "JTR"] },
  { name: "Port of Mykonos", city: "Mykonos", country: "Grécia", region: "Ilhas Gregas", aliases: ["JMK"] },
  { name: "Port of Corfu", city: "Corfu", country: "Grécia", region: "Ilhas Gregas", aliases: ["Kérkyra", "CFU"] },
  { name: "Port of Dubrovnik", city: "Dubrovnik", country: "Croácia", region: "Mediterrâneo", aliases: ["DBV", "Adriático"] },
  { name: "Port of Split", city: "Split", country: "Croácia", region: "Mediterrâneo", aliases: ["SPU", "Adriático"] },
  { name: "Port of Kotor", city: "Kotor", country: "Montenegro", region: "Mediterrâneo", aliases: ["TIV", "Adriático"] },
  { name: "Port of Valletta", city: "Valletta", country: "Malta", region: "Mediterrâneo", aliases: ["MLA", "Malta"] },
  { name: "Port of Istanbul (Galataport)", city: "Istambul", country: "Turquia", region: "Mediterrâneo", aliases: ["Istanbul", "IST", "Galataport"] },
  { name: "Port of Kuşadası", city: "Kuşadası", country: "Turquia", region: "Mediterrâneo", aliases: ["Kusadasi", "Éfeso", "ADB"] },
  { name: "Port of Southampton", city: "Southampton", country: "Reino Unido", region: "Norte da Europa", aliases: ["Londres", "London", "LHR", "SOU"] },
  { name: "Port of Dover", city: "Dover", country: "Reino Unido", region: "Norte da Europa", aliases: ["Londres", "London"] },
  { name: "Port of Amsterdam", city: "Amsterdã", country: "Países Baixos", region: "Norte da Europa", aliases: ["Amsterdam", "AMS", "Holanda"] },
  { name: "Port of Rotterdam", city: "Roterdã", country: "Países Baixos", region: "Norte da Europa", aliases: ["Rotterdam", "RTM"] },
  { name: "Port of Hamburg", city: "Hamburgo", country: "Alemanha", region: "Norte da Europa", aliases: ["Hamburg", "HAM"] },
  { name: "Port of Kiel", city: "Kiel", country: "Alemanha", region: "Báltico", aliases: ["Báltico", "Baltic"] },
  { name: "Port of Warnemünde", city: "Rostock", country: "Alemanha", region: "Báltico", aliases: ["Warnemunde", "Berlim", "Berlin"] },
  { name: "Port of Copenhagen", city: "Copenhague", country: "Dinamarca", region: "Báltico", aliases: ["Copenhagen", "CPH"] },
  { name: "Port of Stockholm", city: "Estocolmo", country: "Suécia", region: "Báltico", aliases: ["Stockholm", "ARN"] },
  { name: "Port of Helsinki", city: "Helsinque", country: "Finlândia", region: "Báltico", aliases: ["Helsinki", "HEL"] },
  { name: "Port of Tallinn", city: "Tallinn", country: "Estônia", region: "Báltico", aliases: ["TLL"] },
  { name: "Port of Oslo", city: "Oslo", country: "Noruega", region: "Fiordes noruegueses", aliases: ["OSL", "Fiordes"] },
  { name: "Port of Bergen", city: "Bergen", country: "Noruega", region: "Fiordes noruegueses", aliases: ["BGO", "Fiordes"] },
  { name: "Port of Reykjavík", city: "Reykjavík", country: "Islândia", region: "Atlântico Norte", aliases: ["Reykjavik", "KEF", "Islândia"] },

  // ---------------------- Ásia, Oceania, África ---------------------
  { name: "Port Rashid Cruise Terminal", city: "Dubai", country: "Emirados Árabes Unidos", region: "Golfo Árabe", aliases: ["DXB", "Emirados"] },
  { name: "Abu Dhabi Cruise Terminal", city: "Abu Dhabi", country: "Emirados Árabes Unidos", region: "Golfo Árabe", aliases: ["AUH"] },
  { name: "Marina Bay Cruise Centre", city: "Singapura", country: "Singapura", region: "Sudeste Asiático", aliases: ["Singapore", "SIN"] },
  { name: "Port of Hong Kong (Kai Tak)", city: "Hong Kong", country: "China", region: "Ásia", aliases: ["HKG", "Kai Tak"] },
  { name: "Port of Shanghai (Wusongkou)", city: "Xangai", country: "China", region: "Ásia", aliases: ["Shanghai", "PVG"] },
  { name: "Port of Yokohama", city: "Yokohama", country: "Japão", region: "Ásia", aliases: ["Tóquio", "Tokyo", "HND", "NRT"] },
  { name: "Port of Sydney (Overseas Passenger Terminal)", city: "Sydney", country: "Austrália", region: "Oceania", aliases: ["SYD", "Circular Quay"] },
  { name: "Port of Melbourne", city: "Melbourne", country: "Austrália", region: "Oceania", aliases: ["MEL", "Station Pier"] },
  { name: "Port of Auckland", city: "Auckland", country: "Nova Zelândia", region: "Oceania", aliases: ["AKL"] },
  { name: "Port of Cape Town", city: "Cidade do Cabo", country: "África do Sul", region: "África", aliases: ["Cape Town", "CPT"] },
  { name: "Port of Durban", city: "Durban", country: "África do Sul", region: "África", aliases: ["DUR"] },
  { name: "Port of Mombasa", city: "Mombasa", country: "Quênia", region: "África", aliases: ["MBA"] },
  { name: "Port Louis Cruise Terminal", city: "Port Louis", country: "Maurício", region: "Oceano Índico", aliases: ["Mauritius", "MRU", "Ilhas Maurício"] },
];

function normalize(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export interface CruisePortSuggestion {
  /** Valor gravado no formulário: "Porto de Santos — Santos, Brasil". */
  value: string;
  primary: string;
  secondary: string;
}

interface IndexedPort extends CruisePort {
  _search: string;
}

let indexed: IndexedPort[] | null = null;

function index(): IndexedPort[] {
  if (!indexed) {
    indexed = CRUISE_PORTS.map((port) => ({
      ...port,
      _search: normalize(
        [port.name, port.city, port.country, port.region, ...(port.aliases ?? [])].join(" "),
      ),
    }));
  }
  return indexed;
}

/** Busca por cidade, nome do porto, região ou alias (aeroporto/cidade próxima). */
export function searchCruisePorts(query: string, limit = 8): CruisePortSuggestion[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: { port: IndexedPort; score: number }[] = [];

  for (const port of index()) {
    if (!tokens.every((token) => port._search.includes(token))) continue;
    let score = 0;
    const city = normalize(port.city);
    const name = normalize(port.name);
    if (city === q || name === q) score += 1000;
    else if (city.startsWith(q)) score += 500;
    else if (name.startsWith(q)) score += 400;
    else if (normalize(port.region).startsWith(q)) score += 200;
    else if ((port.aliases ?? []).some((alias) => normalize(alias) === q)) score += 300;
    scored.push({ port, score });
  }

  scored.sort((a, b) => b.score - a.score || a.port.name.localeCompare(b.port.name));
  return scored.slice(0, limit).map(({ port }) => ({
    value: `${port.name} — ${port.city}, ${port.country}`,
    primary: port.name,
    secondary: `${port.city}, ${port.country} · ${port.region}`,
  }));
}