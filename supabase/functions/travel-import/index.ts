import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DetectedService {
  type: string;
  data: Record<string, any>;
  confidence: number;
}

function parseFlights(text: string): DetectedService[] {
  const services: DetectedService[] = [];
  
  // Split text into blocks by double newlines or clear separators
  const lines = text.split('\n').map(l => l.trim());
  
  // Find flight numbers
  const flightMatches = [...text.matchAll(/\b([A-Z]{2})\s?(\d{3,4})\b/gi)];
  
  if (flightMatches.length === 0) return [];

  // For each flight number, try to extract surrounding context
  for (const match of flightMatches) {
    const flightNumber = (match[1] + match[2]).toUpperCase();
    const matchIndex = match.index || 0;
    
    // Get context around this flight number (500 chars before and after)
    const contextStart = Math.max(0, matchIndex - 300);
    const contextEnd = Math.min(text.length, matchIndex + 500);
    const context = text.substring(contextStart, contextEnd);
    
    // Detect airport codes
    const airportMatches = [...context.matchAll(/\(([A-Z]{3})\)/g)];
    const airports = airportMatches.map(m => m[1]);
    
    // Also try arrow pattern: GRU → MCO, GRU -> MCO, GRU - MCO
    const arrowMatch = context.match(/([A-Z]{3})\s*[→\->–]+\s*([A-Z]{3})/);
    if (arrowMatch && airports.length < 2) {
      if (!airports.includes(arrowMatch[1])) airports.unshift(arrowMatch[1]);
      if (!airports.includes(arrowMatch[2])) airports.push(arrowMatch[2]);
    }
    
    // Detect times
    const timeMatches = [...context.matchAll(/\b(\d{1,2}:\d{2})\b/g)];
    const times = timeMatches.map(m => m[1]);
    
    // Detect dates
    const datePatterns = [
      ...context.matchAll(/\b(\d{1,2})\s+(Jan(?:uary|eiro)?|Feb(?:ruary|ereiro)?|Mar(?:ch|ço)?|Apr(?:il)?|Abr(?:il)?|May|Mai(?:o)?|Jun(?:e|ho)?|Jul(?:y|ho)?|Aug(?:ust)?|Ago(?:sto)?|Sep(?:tember)?|Set(?:embro)?|Oct(?:ober)?|Out(?:ubro)?|Nov(?:ember|embro)?|Dec(?:ember)?|Dez(?:embro)?)\s*(\d{4})?\b/gi),
      ...context.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g),
    ];
    
    // Detect airline name (line before or containing flight number)
    let airline = '';
    const flightLine = lines.find(l => l.match(new RegExp(flightNumber.replace(/(\d)/, '\\s?$1'), 'i')));
    if (flightLine) {
      // Try to extract airline name from the same line
      const airlineMatch = flightLine.match(/^([A-Za-zÀ-ÿ\s]+?)(?:\s+[A-Z]{2}\s?\d{3,4})/);
      if (airlineMatch) airline = airlineMatch[1].trim();
    }
    // Also check for common airline keywords nearby
    if (!airline) {
      const airlineKeywords = context.match(/(?:LATAM|GOL|Azul|TAP|American|United|Delta|Emirates|Qatar|British|Air France|Lufthansa|KLM|Iberia|Copa|Avianca|JetBlue|Southwest|Turkish|Singapore|Cathay|Swiss|Austrian|SAS|Norwegian|Ryanair|EasyJet|Vueling)/i);
      if (airlineKeywords) airline = airlineKeywords[0];
    }

    const flightData: Record<string, any> = {
      airline,
      flight_number: flightNumber,
      origin_airport: airports[0] || '',
      destination_airport: airports[1] || '',
      departure_time: times[0] || '',
      arrival_time: times[1] || '',
    };

    // Detect city names near airport codes
    if (airports[0]) {
      const cityMatch = context.match(new RegExp(`([A-Za-zÀ-ÿ\\s]+?)\\s*\\(${airports[0]}\\)`));
      if (cityMatch) flightData.origin_city = cityMatch[1].trim();
    }
    if (airports[1]) {
      const cityMatch = context.match(new RegExp(`([A-Za-zÀ-ÿ\\s]+?)\\s*\\(${airports[1]}\\)`));
      if (cityMatch) flightData.destination_city = cityMatch[1].trim();
    }

    services.push({ type: 'flight', data: flightData, confidence: airports.length >= 2 ? 0.9 : 0.6 });
  }

  return services;
}

function parseHotels(text: string): DetectedService[] {
  const services: DetectedService[] = [];
  const hotelKeywords = /\b(hotel|resort|hostel|pousada|inn|lodge|suíte|suite|motel|airbnb|apart[\s-]?hotel)\b/gi;
  
  if (!hotelKeywords.test(text)) return [];
  
  // Reset regex
  hotelKeywords.lastIndex = 0;
  
  // Try to find hotel name
  const hotelNamePatterns = [
    /(?:Hotel|Resort|Hostel|Pousada|Inn|Lodge)\s*:?\s*([^\n,]+)/i,
    /([^\n,]+(?:Hotel|Resort|Hostel|Pousada|Inn|Lodge)[^\n,]*)/i,
  ];
  
  let hotelName = '';
  for (const pattern of hotelNamePatterns) {
    const match = text.match(pattern);
    if (match) { hotelName = match[1]?.trim() || match[0]?.trim() || ''; break; }
  }
  
  // Check-in / Check-out dates
  const checkinMatch = text.match(/check[\s-]?in\s*:?\s*([^\n,]+)/i);
  const checkoutMatch = text.match(/check[\s-]?out\s*:?\s*([^\n,]+)/i);
  
  // Room type
  const roomMatch = text.match(/(?:room|quarto|suíte|suite|tipo)\s*(?:type)?\s*:?\s*([^\n,]+)/i);
  
  // Reservation code
  const reservationMatch = text.match(/(?:reserva(?:tion)?|confirm(?:ation|ação)?|booking)\s*(?:code|number|código|número|#|nº)?\s*:?\s*([A-Z0-9-]+)/i);
  
  // City
  const cityMatch = text.match(/(?:city|cidade|local(?:ização)?|location)\s*:?\s*([^\n,]+)/i);

  const data: Record<string, any> = {
    hotel_name: hotelName,
    check_in: checkinMatch?.[1]?.trim() || '',
    check_out: checkoutMatch?.[1]?.trim() || '',
    room_type: roomMatch?.[1]?.trim() || '',
    reservation_code: reservationMatch?.[1]?.trim() || '',
    city: cityMatch?.[1]?.trim() || '',
  };

  services.push({ type: 'hotel', data, confidence: hotelName ? 0.8 : 0.5 });
  return services;
}

function parseTransfers(text: string): DetectedService[] {
  const services: DetectedService[] = [];
  const transferKeywords = /\b(transfer|shuttle|translado|traslado|pickup|pick[\s-]?up|drop[\s-]?off)\b/gi;
  
  if (!transferKeywords.test(text)) return [];
  
  // Origin → Destination
  const routeMatch = text.match(/(?:from|de|saída|pickup|pick[\s-]?up)\s*:?\s*([^\n→\->]+?)(?:\s*[→\->–]+\s*|\s+(?:to|para|até)\s+)([^\n,]+)/i);
  
  // Time
  const timeMatch = text.match(/(?:pickup|pick[\s-]?up|horário|time|hora)\s*:?\s*(\d{1,2}:\d{2})/i);
  
  // Date
  const dateMatch = text.match(/(?:date|data)\s*:?\s*([^\n,]+)/i);
  
  // Company
  const companyMatch = text.match(/(?:company|empresa|operator|operador)\s*:?\s*([^\n,]+)/i);

  const data: Record<string, any> = {
    origin_location: routeMatch?.[1]?.trim() || '',
    destination_location: routeMatch?.[2]?.trim() || '',
    time: timeMatch?.[1] || '',
    date: dateMatch?.[1]?.trim() || '',
    company_name: companyMatch?.[1]?.trim() || '',
  };

  services.push({ type: 'transfer', data, confidence: routeMatch ? 0.8 : 0.5 });
  return services;
}

function parseCarRentals(text: string): DetectedService[] {
  const services: DetectedService[] = [];
  const keywords = /\b(car\s*rental|rent[\s-]?a[\s-]?car|locação|locadora|aluguel\s*(?:de)?\s*(?:carro|veículo|auto)|hertz|avis|budget|enterprise|sixt|localiza|movida|unidas)\b/gi;
  
  if (!keywords.test(text)) return [];
  
  const companyMatch = text.match(/(?:Hertz|Avis|Budget|Enterprise|Sixt|Localiza|Movida|Unidas|National|Alamo|Dollar|Thrifty|Europcar)/i);
  const pickupMatch = text.match(/(?:pickup|pick[\s-]?up|retirada|coleta)\s*(?:location|local)?\s*:?\s*([^\n,]+)/i);
  const dropoffMatch = text.match(/(?:drop[\s-]?off|devolução|retorno)\s*(?:location|local)?\s*:?\s*([^\n,]+)/i);
  const reservationMatch = text.match(/(?:reserva(?:tion)?|confirm(?:ation|ação)?|booking)\s*(?:code|number|código|número|#|nº)?\s*:?\s*([A-Z0-9-]+)/i);

  const data: Record<string, any> = {
    rental_company: companyMatch?.[0] || '',
    pickup_location: pickupMatch?.[1]?.trim() || '',
    dropoff_location: dropoffMatch?.[1]?.trim() || '',
    reservation_code: reservationMatch?.[1]?.trim() || '',
  };

  services.push({ type: 'car_rental', data, confidence: 0.7 });
  return services;
}

function parseInsurance(text: string): DetectedService[] {
  const services: DetectedService[] = [];
  const keywords = /\b(seguro\s*viagem|travel\s*insurance|insurance\s*policy|apólice|policy\s*number|cobertura|coverage|assist[\s-]?card|travel\s*ace|allianz\s*travel|porto\s*seguro|gta|intermac|affinity|april|mondial|assist[\s-]?med)\b/gi;
  
  if (!keywords.test(text)) return [];
  
  const providerMatch = text.match(/(?:Assist[\s-]?Card|Travel\s*Ace|Allianz|Porto\s*Seguro|GTA|Intermac|Affinity|April|Mondial|Assist[\s-]?Med|Coris|ITA|Vital\s*Card)/i);
  const policyMatch = text.match(/(?:policy|apólice|número)\s*(?:number|nº|#)?\s*:?\s*([A-Z0-9-]+)/i);
  const startMatch = text.match(/(?:start|início|vigência|from|de)\s*:?\s*([^\n,]+)/i);
  const endMatch = text.match(/(?:end|fim|até|to|validade)\s*:?\s*([^\n,]+)/i);

  const data: Record<string, any> = {
    provider: providerMatch?.[0] || '',
    policy_number: policyMatch?.[1]?.trim() || '',
    start_date: startMatch?.[1]?.trim() || '',
    end_date: endMatch?.[1]?.trim() || '',
  };

  services.push({ type: 'insurance', data, confidence: 0.7 });
  return services;
}

function parseCruises(text: string): DetectedService[] {
  const services: DetectedService[] = [];
  const keywords = /\b(cruise|cruzeiro|navio|ship|embark|embarque|desembarque|disembark|msc|costa|royal\s*caribbean|norwegian|celebrity|carnival|princess|holland|cunard|disney\s*cruise)\b/gi;
  
  if (!keywords.test(text)) return [];
  
  const companyMatch = text.match(/(?:MSC|Costa|Royal\s*Caribbean|Norwegian|Celebrity|Carnival|Princess|Holland\s*America|Cunard|Disney\s*Cruise|Pullmantur|CVC\s*Cruzeiros)/i);
  const shipMatch = text.match(/(?:ship|navio|embarcação)\s*:?\s*([^\n,]+)/i);
  const embarkMatch = text.match(/(?:embark(?:ation)?|embarque)\s*:?\s*([^\n,]+)/i);
  const disembarkMatch = text.match(/(?:disembark(?:ation)?|desembarque)\s*:?\s*([^\n,]+)/i);
  const routeMatch = text.match(/(?:route|rota|itinerary|itinerário)\s*:?\s*([^\n]+)/i);

  const data: Record<string, any> = {
    cruise_company: companyMatch?.[0] || '',
    ship_name: shipMatch?.[1]?.trim() || '',
    embarkation_port: embarkMatch?.[1]?.trim() || '',
    disembarkation_port: disembarkMatch?.[1]?.trim() || '',
    route: routeMatch?.[1]?.trim() || '',
  };

  services.push({ type: 'cruise', data, confidence: 0.7 });
  return services;
}

function parseTrains(text: string): DetectedService[] {
  const services: DetectedService[] = [];
  const keywords = /\b(train|trem|rail|ferrovia|eurostar|tgv|renfe|trenitalia|departure\s*station|arrival\s*station|estação|platform|plataforma)\b/gi;
  
  if (!keywords.test(text)) return [];
  
  const trainNumberMatch = text.match(/(?:train|trem)\s*(?:number|nº|#)?\s*:?\s*([A-Z0-9-]+)/i);
  const originMatch = text.match(/(?:departure|origin|saída|partida|from|de)\s*(?:station|estação)?\s*:?\s*([^\n,→\->]+)/i);
  const destMatch = text.match(/(?:arrival|destination|chegada|to|para)\s*(?:station|estação)?\s*:?\s*([^\n,]+)/i);
  const timeMatch = text.match(/(?:departure|saída|partida)\s*(?:time|hora|horário)?\s*:?\s*(\d{1,2}:\d{2})/i);
  const companyMatch = text.match(/(?:Eurostar|TGV|Renfe|Trenitalia|SNCF|DB|Italo|Amtrak|Via\s*Rail|Thalys|AVE)/i);

  const data: Record<string, any> = {
    train_number: trainNumberMatch?.[1]?.trim() || '',
    origin_station: originMatch?.[1]?.trim() || '',
    destination_station: destMatch?.[1]?.trim() || '',
    departure_time: timeMatch?.[1] || '',
    train_company: companyMatch?.[0] || '',
  };

  services.push({ type: 'train', data, confidence: 0.7 });
  return services;
}

function parseAttractions(text: string): DetectedService[] {
  const services: DetectedService[] = [];
  const keywords = /\b(ticket|ingresso|admission|tour|activity|atividade|passeio|excursion|excursão|museu|museum|park|parque|show|espetáculo|reserv(?:ation|a)|booking)\b/gi;
  
  // Avoid matching if we already detected flights/hotels/etc more strongly
  const hasStrongerSignals = /\b(flight|hotel|transfer|car\s*rental|insurance|cruise|train)\b/gi.test(text);
  if (!keywords.test(text) || hasStrongerSignals) return [];
  
  const nameMatch = text.match(/(?:tour|passeio|activity|atividade|ticket|ingresso|admission)\s*:?\s*([^\n,]+)/i) 
    || text.match(/^([^\n]{5,60})$/m);
  const locationMatch = text.match(/(?:location|local|venue|local)\s*:?\s*([^\n,]+)/i);
  const dateMatch = text.match(/(?:date|data)\s*:?\s*([^\n,]+)/i);
  const timeMatch = text.match(/(?:time|hora|horário)\s*:?\s*(\d{1,2}:\d{2})/i);

  const data: Record<string, any> = {
    name: nameMatch?.[1]?.trim() || '',
    city: locationMatch?.[1]?.trim() || '',
    date: dateMatch?.[1]?.trim() || '',
    entry_time: timeMatch?.[1] || '',
  };

  services.push({ type: 'attraction', data, confidence: 0.5 });
  return services;
}

function parseAllServices(text: string): DetectedService[] {
  const allServices: DetectedService[] = [];
  
  // Try splitting by clear section breaks
  const sections = text.split(/\n{3,}|={3,}|-{3,}|\*{3,}/);
  
  // Parse the full text for each type
  allServices.push(...parseFlights(text));
  allServices.push(...parseHotels(text));
  allServices.push(...parseTransfers(text));
  allServices.push(...parseCarRentals(text));
  allServices.push(...parseInsurance(text));
  allServices.push(...parseCruises(text));
  allServices.push(...parseTrains(text));
  
  // Only parse attractions if nothing else was found
  if (allServices.length === 0) {
    allServices.push(...parseAttractions(text));
  }

  // Deduplicate flights by flight number
  const seen = new Set<string>();
  const deduplicated = allServices.filter(s => {
    const key = s.type === 'flight' ? `flight-${s.data.flight_number}` : `${s.type}-${JSON.stringify(s.data).substring(0, 100)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduplicated;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const text = body?.text;
    if (!text || typeof text !== 'string' || text.length < 10) {
      return new Response(JSON.stringify({ error: 'Text field is required (min 10 chars)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (text.length > 50000) {
      return new Response(JSON.stringify({ error: 'Text too long (max 50000 chars)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const services = parseAllServices(text);

    return new Response(JSON.stringify({ services }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error("travel-import error:", err);
    return new Response(JSON.stringify({ error: 'Erro ao importar dados de viagem.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
