import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";
import {
  validateString,
  validateEnum,
  validateNumber,
  validateStringArray,
  sanitizeText,
  detectPromptInjection,
  whitelistKeys,
  validationError,
} from "../_shared/input-validator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_TRIP_TYPES = ["casal", "familia", "familia_crianca_pequena", "familia_adolescentes", "grupo_amigos", "solo", "lua_de_mel", "melhor_idade", "corporativo"];
const ALLOWED_BUDGET_LEVELS = ["economico", "conforto", "luxo"];
const ALLOWED_INTERESTS = ["gastronomia", "vinhos", "cultura_historia", "religioso", "aventura", "natureza", "praia", "neve_esqui", "luxo", "compras", "vida_noturna", "parques_tematicos", "bem_estar_spa", "instagramaveis", "esportes"];
const ALLOWED_PACES = ["leve", "moderado", "intenso"];
const ALLOWED_BODY_KEYS = ["origin", "destination", "startDate", "endDate", "travelersCount", "adultsCount", "childrenCount", "tripType", "budgetLevel", "interests", "travelPace", "additionalPreferences", "outboundFlight", "returnFlight", "arrivalInfo", "departureInfo", "extraDestinations"];
const ALLOWED_DEST_KIND = ["principal", "secundario", "bate_volta", "conexao", "extensao"];
const ALLOWED_TRANSPORT = ["aviao", "carro", "trem", "onibus", "transfer", "cruzeiro", "outro"];
const DEST_KIND_LABELS: Record<string, string> = {
  principal: "destino principal / cidade base",
  secundario: "destino secundário",
  bate_volta: "bate-volta (sem pernoite — manter hospedagem na cidade base)",
  conexao: "conexão / pernoite curto",
  extensao: "extensão da viagem",
};
const TRANSPORT_LABELS: Record<string, string> = {
  aviao: "avião", carro: "carro", trem: "trem", onibus: "ônibus",
  transfer: "transfer privativo", cruzeiro: "cruzeiro", outro: "outro",
};
const ALLOWED_PREF_KEYS = ["dietaryRestrictions", "localOrTouristy", "exclusiveOrPopular", "mobilityLimitations", "serviceContext"];
const ALLOWED_FLIGHT_KEYS = ["period"];
const ALLOWED_FLIGHT_PERIODS = ["manha", "tarde", "noite"];
const ALLOWED_JOURNEY_KEYS = ["transport", "period"];
const ALLOWED_JOURNEY_PERIODS = ["madrugada", "manha", "tarde", "noite"];

const tripTypeLabels: Record<string, string> = {
  casal: "viagem de casal",
  familia: "viagem em família",
  familia_crianca_pequena: "viagem em família com crianças pequenas (até 5 anos)",
  familia_adolescentes: "viagem em família com adolescentes",
  grupo_amigos: "viagem em grupo de amigos",
  solo: "viagem solo",
  lua_de_mel: "lua de mel",
  melhor_idade: "viagem para melhor idade (60+)",
  corporativo: "viagem corporativa",
};

const budgetLabels: Record<string, string> = {
  economico: "econômico (hotéis 3 estrelas, restaurantes acessíveis)",
  conforto: "conforto (hotéis 4 estrelas, restaurantes de qualidade)",
  luxo: "luxo (hotéis 5 estrelas, experiências premium)",
};

const interestLabels: Record<string, string> = {
  gastronomia: "gastronomia e culinária local",
  vinhos: "vinhos e vinícolas",
  cultura_historia: "cultura, história e museus",
  religioso: "turismo religioso e espiritual",
  aventura: "aventura e esportes radicais",
  natureza: "natureza e ecoturismo",
  praia: "praia e relaxamento",
  neve_esqui: "neve e esqui",
  luxo: "experiências de luxo e premium",
  compras: "compras e shopping",
  vida_noturna: "vida noturna, bares e baladas",
  parques_tematicos: "parques temáticos e diversão",
  bem_estar_spa: "bem-estar, spa e relaxamento",
  instagramaveis: "lugares instagramáveis e fotogênicos",
  esportes: "esportes (estádios icônicos, jogos ao vivo, arenas, tours esportivos, museus do esporte)",
};

const paceLabels: Record<string, string> = {
  leve: "leve (poucas atividades por dia, bastante tempo livre para descansar)",
  moderado: "moderado (equilíbrio entre passeios e descanso)",
  intenso: "intenso (aproveitar ao máximo cada momento do dia)",
};

serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const rateCheck = await checkRateLimit(clientIP, 'generate-itinerary', 10, 60);
  if (!rateCheck.allowed) {
    return rateLimitResponse(corsHeaders, rateCheck.retryAfterMs);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido ou expirado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const { data: hasAccess, error: accessError } = await supabase.rpc("has_feature_access", {
      _user_id: userId, _feature: "itinerary",
    });
    if (accessError) {
      console.error("has_feature_access error:", accessError.message);
      return new Response(JSON.stringify({ error: "Erro ao validar acesso ao recurso." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Seu plano atual não inclui a criação de roteiros.", upgrade_required: true }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detecta o plano para aplicar limites adequados (Start = 2/dia via daily_feature_usage)
    const { data: userPlan } = await supabase.rpc("get_user_plan", { _user_id: userId });
    const isStart = userPlan === "start";

    if (isStart) {
      // Limite diário de 2 roteiros para o plano Start (BRT)
      const now = new Date();
      const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const today = brt.toISOString().split("T")[0];

      const { data: usageRow } = await supabase
        .from("daily_feature_usage")
        .select("usage_count")
        .eq("user_id", userId)
        .eq("feature", "itinerary")
        .eq("usage_date", today)
        .maybeSingle();

      const usageCount = usageRow?.usage_count ?? 0;
      if (usageCount >= 2) {
        return new Response(JSON.stringify({
          error: "Limite diário de 2 roteiros por IA atingido. Tente novamente amanhã ou faça upgrade.",
          daily_limit_exceeded: true,
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: canUse } = await supabase.rpc("check_ai_usage", { _user_id: userId });
      if (!canUse) {
        return new Response(JSON.stringify({ error: "Cota mensal de IA esgotada.", quota_exceeded: true }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- INPUT VALIDATION ---
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return validationError("Corpo da requisição inválido.", corsHeaders);
    }

    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return validationError("Corpo da requisição inválido.", corsHeaders);
    }

    // Whitelist fields
    const body = whitelistKeys<Record<string, unknown>>(rawBody, ALLOWED_BODY_KEYS);

    // Validate destination (1-200 chars, injection check)
    const destCheck = validateString(body.destination, "Destino", 1, 200);
    if (!destCheck.valid) return validationError(destCheck.error, corsHeaders);
    const destination = destCheck.value;

    // Validate origin (optional)
    let origin: string | undefined;
    if (body.origin !== undefined && body.origin !== null && body.origin !== "") {
      const oCheck = validateString(body.origin, "Origem", 1, 200);
      if (!oCheck.valid) return validationError(oCheck.error, corsHeaders);
      origin = oCheck.value;
    }

    // Validate dates
    if (typeof body.startDate !== "string" || typeof body.endDate !== "string") {
      return validationError("Datas de início e fim são obrigatórias.", corsHeaders);
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.startDate as string) || !dateRegex.test(body.endDate as string)) {
      return validationError("Formato de data inválido. Use AAAA-MM-DD.", corsHeaders);
    }
    const startDate = body.startDate as string;
    const endDate = body.endDate as string;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return validationError("Datas inválidas.", corsHeaders);
    }
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days < 1 || days > 30) {
      return validationError("Duração da viagem deve ser entre 1 e 30 dias.", corsHeaders);
    }

    // Validate travelersCount
    const tcCheck = validateNumber(body.travelersCount, "Número de viajantes", 1, 50);
    if (!tcCheck.valid) return validationError(tcCheck.error, corsHeaders);
    const travelersCount = tcCheck.value;

    // Validate adults/children (optional)
    let adultsCount: number | undefined;
    let childrenCount: number | undefined;
    if (body.adultsCount !== undefined) {
      const aCheck = validateNumber(body.adultsCount, "Adultos", 1, 50);
      if (!aCheck.valid) return validationError(aCheck.error, corsHeaders);
      adultsCount = aCheck.value;
    }
    if (body.childrenCount !== undefined) {
      const cCheck = validateNumber(body.childrenCount, "Crianças", 0, 50);
      if (!cCheck.valid) return validationError(cCheck.error, corsHeaders);
      childrenCount = cCheck.value;
    }

    // Validate tripType
    const ttCheck = validateEnum(body.tripType, "Tipo de viagem", ALLOWED_TRIP_TYPES);
    if (!ttCheck.valid) return validationError(ttCheck.error, corsHeaders);
    const tripType = ttCheck.value;

    // Validate budgetLevel
    const blCheck = validateEnum(body.budgetLevel, "Nível de orçamento", ALLOWED_BUDGET_LEVELS);
    if (!blCheck.valid) return validationError(blCheck.error, corsHeaders);
    const budgetLevel = blCheck.value;

    // Validate interests (optional array)
    let interests: string[] = [];
    if (body.interests !== undefined) {
      const intCheck = validateStringArray(body.interests, "Interesses", ALLOWED_INTERESTS, 14);
      if (!intCheck.valid) return validationError(intCheck.error, corsHeaders);
      interests = intCheck.value;
    }

    // Validate travelPace (optional)
    let travelPace: string | undefined;
    if (body.travelPace !== undefined) {
      const paceCheck = validateEnum(body.travelPace, "Ritmo de viagem", ALLOWED_PACES);
      if (!paceCheck.valid) return validationError(paceCheck.error, corsHeaders);
      travelPace = paceCheck.value;
    }

    // Validate additionalPreferences (optional, whitelist + sanitize)
    const rawPrefs = whitelistKeys<Record<string, unknown>>(body.additionalPreferences, ALLOWED_PREF_KEYS);
    const prefs: Record<string, string | undefined> = {};
    if (rawPrefs.dietaryRestrictions) {
      const drCheck = validateString(rawPrefs.dietaryRestrictions, "Restrições alimentares", 0, 300);
      if (!drCheck.valid) return validationError(drCheck.error, corsHeaders);
      prefs.dietaryRestrictions = drCheck.value;
    }
    if (rawPrefs.localOrTouristy) {
      const ltCheck = validateEnum(rawPrefs.localOrTouristy, "Preferência local/turístico", ["local", "touristy", "mix"]);
      if (!ltCheck.valid) return validationError(ltCheck.error, corsHeaders);
      prefs.localOrTouristy = ltCheck.value;
    }
    if (rawPrefs.exclusiveOrPopular) {
      const epCheck = validateEnum(rawPrefs.exclusiveOrPopular, "Preferência exclusivo/popular", ["exclusive", "popular", "mix"]);
      if (!epCheck.valid) return validationError(epCheck.error, corsHeaders);
      prefs.exclusiveOrPopular = epCheck.value;
    }
    if (rawPrefs.mobilityLimitations) {
      const mlCheck = validateString(rawPrefs.mobilityLimitations, "Limitações de mobilidade", 0, 500);
      if (!mlCheck.valid) return validationError(mlCheck.error, corsHeaders);
      prefs.mobilityLimitations = mlCheck.value;
    }
    if (rawPrefs.serviceContext) {
      const scCheck = validateString(rawPrefs.serviceContext, "Contexto de serviços", 0, 5000);
      if (!scCheck.valid) return validationError(scCheck.error, corsHeaders);
      prefs.serviceContext = scCheck.value;
    }

    // Validate flight info (optional, period only)
    function validateFlightPeriod(raw: unknown): string | undefined {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
      const f = whitelistKeys<Record<string, unknown>>(raw, ALLOWED_FLIGHT_KEYS);
      if (typeof f.period === "string" && ALLOWED_FLIGHT_PERIODS.includes(f.period)) {
        return f.period;
      }
      return undefined;
    }
    function validateJourney(raw: unknown): { transport: string; period: string } | undefined {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
      const j = whitelistKeys<Record<string, unknown>>(raw, ALLOWED_JOURNEY_KEYS);
      const transport = typeof j.transport === "string" && ALLOWED_TRANSPORT.includes(j.transport) ? j.transport : undefined;
      const period = typeof j.period === "string" && ALLOWED_JOURNEY_PERIODS.includes(j.period) ? j.period : undefined;
      if (!transport || !period) return undefined;
      return { transport, period };
    }
    // Backward-compat: accept old outbound/returnFlight if present
    const legacyOutbound = validateFlightPeriod(body.outboundFlight);
    const legacyReturn = validateFlightPeriod(body.returnFlight);
    const arrivalInfo = validateJourney(body.arrivalInfo)
      ?? (legacyOutbound ? { transport: "aviao", period: legacyOutbound } : undefined);
    const departureInfo = validateJourney(body.departureInfo)
      ?? (legacyReturn ? { transport: "aviao", period: legacyReturn } : undefined);

    const journeyPeriodLabel: Record<string, string> = {
      madrugada: "madrugada", manha: "manhã", tarde: "tarde", noite: "noite",
    };

    const arrivalRules: Record<string, string> = {
      madrugada: "Chegada na MADRUGADA: o viajante chega muito cedo. Permita programação leve durante o Dia 1, mas reserve a manhã para descanso/check-in.",
      manha: "Chegada pela MANHÃ: inicie a programação preferencialmente na TARDE ou NOITE do Dia 1 (manhã reservada para deslocamento e check-in).",
      tarde: "Chegada à TARDE: o Dia 1 deve ter APENAS atividades leves à noite (jantar local) ou ficar livre.",
      noite: "Chegada à NOITE: NÃO programe atividades relevantes no Dia 1 (apenas check-in e descanso).",
    };
    const departureRules: Record<string, string> = {
      madrugada: "Saída na MADRUGADA: encerre a programação no DIA ANTERIOR. NÃO adicione atividades no último dia (apenas check-out e deslocamento).",
      manha: "Saída pela MANHÃ: NÃO programe atividades relevantes no último dia (apenas check-out).",
      tarde: "Saída à TARDE: permita APENAS atividades leves pela manhã no último dia.",
      noite: "Saída à NOITE: programação parcial durante o dia no último dia, evitando atividades longas próximas ao embarque.",
    };
    const transportNotes: Record<string, string> = {
      aviao: "Avião: considere deslocamento aeroportuário, check-in e tempo de embarque (chegar 2-3h antes em voos internacionais, 1-2h em domésticos).",
      carro: "Carro: viagem flexível, permita paradas e horários mais livres. O viajante pode ajustar deslocamentos com facilidade.",
      onibus: "Ônibus: deslocamentos longos e mais cansativos. No dia da chegada/saída, programe atividades mais leves.",
      trem: "Trem: estações geralmente centrais, deslocamentos urbanos rápidos. Tempo de embarque curto.",
      transfer: "Transfer privativo: deslocamento confortável e direto. Boa flexibilidade de horários.",
      cruzeiro: "Cruzeiro: considere embarque/desembarque portuário (check-in pode levar 2-4h, desembarque costuma ser pela manhã).",
      outro: "Meio de transporte alternativo: trate com flexibilidade e bom senso logístico.",
    };

    const journeyLines: string[] = [];
    const journeyRules: string[] = [];
    if (arrivalInfo) {
      journeyLines.push(`- CHEGADA ao destino: ${TRANSPORT_LABELS[arrivalInfo.transport]} no período da ${journeyPeriodLabel[arrivalInfo.period]}`);
      journeyRules.push("- " + arrivalRules[arrivalInfo.period]);
      journeyRules.push("- " + transportNotes[arrivalInfo.transport]);
    }
    if (departureInfo) {
      journeyLines.push(`- SAÍDA / RETORNO do destino: ${TRANSPORT_LABELS[departureInfo.transport]} no período da ${journeyPeriodLabel[departureInfo.period]}`);
      journeyRules.push("- " + departureRules[departureInfo.period]);
      if (departureInfo.transport !== arrivalInfo?.transport) {
        journeyRules.push("- " + transportNotes[departureInfo.transport]);
      }
    }

    const flightsText = journeyLines.length > 0
      ? `\n\nINFORMAÇÕES DE CHEGADA E RETORNO (use OBRIGATORIAMENTE):\n${journeyLines.join("\n")}\n\nREGRAS DE AJUSTE LOGÍSTICO (siga rigorosamente):\n${journeyRules.join("\n")}`
      : "";

    // --- MULTI-DESTINATIONS ---
    type ExtraDest = { city: string; kind: string; nights: number; transportFromPrevious: string; notes?: string };
    const extraDestinations: ExtraDest[] = [];
    if (Array.isArray(body.extraDestinations)) {
      for (const raw of body.extraDestinations.slice(0, 8)) {
        if (!raw || typeof raw !== "object") continue;
        const r = raw as Record<string, unknown>;
        const city = typeof r.city === "string" ? sanitizeText(r.city).slice(0, 200) : "";
        if (!city) continue;
        const kind = typeof r.kind === "string" && ALLOWED_DEST_KIND.includes(r.kind) ? r.kind : "secundario";
        const transport = typeof r.transportFromPrevious === "string" && ALLOWED_TRANSPORT.includes(r.transportFromPrevious)
          ? r.transportFromPrevious : "aviao";
        const nights = typeof r.nights === "number" && r.nights >= 0 && r.nights <= 30 ? Math.floor(r.nights) : 0;
        const notes = typeof r.notes === "string" ? sanitizeText(r.notes).slice(0, 500) : undefined;
        extraDestinations.push({ city, kind, nights, transportFromPrevious: transport, notes });
      }
    }

    let multiDestText = "";
    if (extraDestinations.length > 0) {
      const lines = [
        `1. ${destination} — destino principal / cidade base`,
      ];
      extraDestinations.forEach((d, i) => {
        const transp = TRANSPORT_LABELS[d.transportFromPrevious] || d.transportFromPrevious;
        const kindLbl = DEST_KIND_LABELS[d.kind] || d.kind;
        const nightsTxt = d.nights > 0 ? `, ${d.nights} noite(s)` : "";
        const notesTxt = d.notes ? ` — Obs: ${d.notes}` : "";
        lines.push(`${i + 2}. ${d.city} — ${kindLbl}${nightsTxt} (deslocamento desde o destino anterior: ${transp})${notesTxt}`);
      });
      multiDestText = `\n\nROTEIRO MULTI-DESTINOS — siga RIGOROSAMENTE a ordem e a logística:\n${lines.join("\n")}\n\nREGRAS PARA MÚLTIPLOS DESTINOS:\n- Distribua os dias do roteiro respeitando as noites informadas em cada destino.\n- No dia de deslocamento entre cidades, programe atividades LEVES (não sugira passeios pesados).\n- Bate-volta: NÃO troca a hospedagem; o viajante volta a dormir na cidade base.\n- Extensão: trate como nova etapa, com hospedagem própria no novo destino.\n- Conexão/pernoite curto: programe apenas algo leve ou descanso.\n- NUNCA sugira atividades em duas cidades distantes no mesmo dia/horário.\n- Considere o tempo de deslocamento informado (avião, carro, trem etc.) ao montar o dia da troca de cidade.\n- Indique no título da atividade do dia de transição algo como "Deslocamento <cidade A> → <cidade B>".`;
    }

    // --- BUILD AI REQUEST ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Erro de configuração do servidor." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build interest string
    const interestsList = interests.map((i) => interestLabels[i] || i).filter(Boolean);
    const interestsText = interestsList.length > 0
      ? `\n- Interesses prioritários: ${interestsList.join(", ")}` : "";

    const hasGastronomia = interests.includes("gastronomia");
    const hasEsportes = interests.includes("esportes");

    const gastronomyRules = `\n\nREGRAS GASTRONÔMICAS (siga rigorosamente):
- CAFÉ DA MANHÃ: assuma que será no hotel (NÃO sugira atividade de café da manhã, exceto se for uma experiência icônica do destino — ex: café em padaria histórica em Paris, dim sum em Hong Kong).
- ALMOÇO: na maioria dos dias, a atividade do período da TARDE (ou início dela) deve incluir ou ser um restaurante coerente com a região visitada naquele dia/manhã. Use restaurantes reais, conhecidos, do bairro/região da atividade da manhã para evitar grandes deslocamentos.
- JANTAR: na maioria dos dias, a atividade da NOITE deve ser um restaurante ou experiência gastronômica relevante (rooftop, wine bar, food market, bistrô local). Combine com o perfil do viajante e o nível de orçamento.
- Almoço e jantar NÃO precisam aparecer 100% dos dias, mas devem ser FREQUENTES — principalmente em viagens urbanas e internacionais. Em dias de aventura/natureza/deslocamento longo, é aceitável omitir.
- EVITE: restaurantes genéricos, repetição do mesmo tipo de cozinha em dias seguidos, ou sugestões logisticamente incoerentes (jantar do outro lado da cidade depois de passeio noturno).
- Sempre que possível, mencione 1 prato típico/recomendado do local no campo description.
${hasGastronomia ? `
- INTERESSE GASTRONOMIA SELECIONADO — INTENSIFIQUE: quase todos os almoços e jantares devem ser experiências gastronômicas marcantes. Inclua mercados municipais, cafés icônicos, wine bars, rooftops, street food famosa, bistrôs tradicionais. Se o orçamento for "luxo", considere restaurantes premiados (Michelin, 50 Best) quando existirem no destino. Use a manhã ocasionalmente para experiências como tour gastronômico, padaria histórica ou aula de culinária.` : ""}`;

    const sportsRules = hasEsportes ? `\n\nREGRAS DE ESPORTES (interesse selecionado):
- Inclua experiências esportivas relevantes para o destino: estádios icônicos, tours, museus, partidas ao vivo quando houver temporada.
- Adapte ao destino: futebol europeu (Camp Nou, Bernabéu, Wembley, San Siro, Allianz), NBA/NFL/MLB/NHL nos EUA, Maracanã/Vila Belmiro no Brasil, Fórmula 1 quando houver GP, sumô no Japão, etc.
- Combine quando fizer sentido: jantar em sports bar famoso, restaurante temático esportivo, ou refeição próxima ao estádio no dia da experiência.
- Não force esporte em destinos onde não há relevância turística esportiva clara (ex: ilha de relaxamento) — nesses casos, sugira no máximo 1 experiência leve ou ignore o interesse.` : "";

    const paceText = travelPace ? `\n- Ritmo da viagem: ${paceLabels[travelPace] || travelPace}` : "";

    const additionalLines: string[] = [];
    if (prefs.dietaryRestrictions) {
      additionalLines.push(`- Restrições alimentares: ${prefs.dietaryRestrictions}. Sugira restaurantes adequados.`);
    }
    if (prefs.localOrTouristy === "local") {
      additionalLines.push("- Priorizar experiências locais e autênticas, fora dos circuitos turísticos tradicionais.");
    } else if (prefs.localOrTouristy === "touristy") {
      additionalLines.push("- Priorizar pontos turísticos clássicos e mais conhecidos.");
    }
    if (prefs.exclusiveOrPopular === "exclusive") {
      additionalLines.push("- Priorizar locais exclusivos, reservados e menos lotados.");
    } else if (prefs.exclusiveOrPopular === "popular") {
      additionalLines.push("- Incluir locais populares e movimentados com grande apelo.");
    }
    if (prefs.mobilityLimitations) {
      additionalLines.push(`- IMPORTANTE — Limitações de mobilidade: ${prefs.mobilityLimitations}. Evite atividades incompatíveis e garanta acessibilidade.`);
    }
    const additionalText = additionalLines.length > 0
      ? "\n\nPREFERÊNCIAS ADICIONAIS:\n" + additionalLines.join("\n") : "";

    const serviceContextText = prefs.serviceContext
      ? "\n\n" + prefs.serviceContext + "\n\nIMPORTANTE: NÃO sugira atividades que conflitem com os serviços listados acima. Preencha apenas os períodos livres com sugestões complementares."
      : "";

    const profileRules = buildProfileRules(tripType);

    const datesInfo: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      datesInfo.push(`Dia ${i + 1}: ${d.toISOString().split('T')[0]}`);
    }

    const systemPrompt = `Você é um especialista em turismo e roteiros de viagem, contratado para auxiliar agentes de viagem a criar roteiros altamente personalizados para seus clientes.

REGRAS FUNDAMENTAIS:
- Cada dia deve ter exatamente 3 atividades: manhã, tarde e noite
- PRIORIZE os interesses selecionados pelo agente na distribuição das atividades
- Adapte RIGOROSAMENTE ao perfil do viajante — nunca sugira atividades incompatíveis
- Ajuste o número e a intensidade das atividades conforme o ritmo escolhido
- Inclua estimativas realistas de duração e custo
- Sugira locais específicos, conhecidos e de qualidade no destino
- Considere logística e deslocamento entre atividades — atividades do mesmo dia devem estar geograficamente próximas (mesmo bairro/região sempre que possível)
- Para ritmo "leve", sugira atividades mais curtas e com intervalos entre elas
- Para ritmo "intenso", maximize o aproveitamento de cada período do dia
- Estas são SUGESTÕES para o agente validar e ajustar — seja criativo mas realista
- O resultado deve parecer um roteiro profissional feito por um especialista em turismo, NÃO uma lista genérica
${gastronomyRules}${sportsRules}

${profileRules}`;

    const travelersDesc = (adultsCount !== undefined || childrenCount !== undefined)
      ? `${adultsCount ?? travelersCount} adulto(s)${childrenCount ? ` e ${childrenCount} criança(s)` : ""}`
      : `${travelersCount} pessoa(s)`;
    const originLine = origin ? `\n- Cidade de origem: ${origin}` : "";

    const userPrompt = `Crie um roteiro completo para:${originLine}
- Destino: ${destination}
- Período: ${days} dias (${startDate} a ${endDate})
- Viajantes: ${travelersDesc}
- Tipo de viagem: ${tripTypeLabels[tripType] || tripType}
- Nível de orçamento: ${budgetLabels[budgetLevel] || budgetLevel}${interestsText}${paceText}${additionalText}${serviceContextText}${flightsText}${multiDestText}

Datas dos dias: ${datesInfo.join(', ')}

Use a função generate_itinerary para retornar o roteiro completo.`;

    console.log(`[${traceId}] Calling AI for destination:`, destination, "days:", days, "user:", userId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_itinerary",
              description: "Gera um roteiro de viagem completo com atividades para cada dia.",
              parameters: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    description: "Lista de dias do roteiro",
                    items: {
                      type: "object",
                      properties: {
                        dayNumber: { type: "number", description: "Número do dia (1, 2, 3...)" },
                        date: { type: "string", description: "Data no formato YYYY-MM-DD" },
                        activities: {
                          type: "array",
                          description: "Exatamente 3 atividades: manhã, tarde e noite",
                          items: {
                            type: "object",
                            properties: {
                              period: { type: "string", enum: ["manha", "tarde", "noite"], description: "Período do dia" },
                              title: { type: "string", description: "Título da atividade" },
                              description: { type: "string", description: "Descrição detalhada e personalizada" },
                              location: { type: "string", description: "Nome do local específico" },
                              estimatedDuration: { type: "string", description: "Duração estimada (ex: 2 horas)" },
                              estimatedCost: { type: "string", description: "Custo estimado (ex: R$ 50 por pessoa)" },
                            },
                            required: ["period", "title", "description", "location", "estimatedDuration", "estimatedCost"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["dayNumber", "date", "activities"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["days"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_itinerary" } },
      }),
    });

    if (!response.ok) {
      const errStatus = response.status;
      console.error("AI gateway error:", errStatus);
      if (errStatus === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (errStatus === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Entre em contato com o suporte." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim().length === 0) {
      console.error("AI gateway returned empty response");
      return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse AI response");
      return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let itinerary;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      try {
        const args = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        itinerary = args;
      } catch {
        console.error("Failed to parse tool call arguments");
        return new Response(JSON.stringify({ error: "Erro ao processar roteiro. Tente novamente." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        console.error("Empty AI response content");
        return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        itinerary = JSON.parse(content.trim());
      } catch {
        try {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          const jsonString = jsonMatch ? jsonMatch[1] : content;
          itinerary = JSON.parse(jsonString.trim());
        } catch {
          console.error("Failed to parse AI content");
          return new Response(JSON.stringify({ error: "Erro ao processar roteiro. Tente novamente." }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    if (!itinerary?.days || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
      console.error("Invalid itinerary structure");
      return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Successfully generated itinerary with", itinerary.days.length, "days");

    return new Response(JSON.stringify(itinerary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(`[${traceId}] generate-itinerary error:`, e);
    return new Response(JSON.stringify({ success: false, error: "Não foi possível processar sua solicitação. Tente novamente.", code: "GENERIC_ERROR" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildProfileRules(tripType: string): string {
  const rules: Record<string, string> = {
    familia_crianca_pequena: `REGRAS PARA FAMÍLIA COM CRIANÇAS PEQUENAS:
- Evite atividades de longa duração ou que exijam muito esforço físico
- Priorize locais com infraestrutura para crianças (trocador, cadeirão, etc.)
- Inclua parques, aquários, zoológicos ou atividades interativas
- Sugira restaurantes family-friendly
- Considere horários de soneca e alimentação`,
    familia_adolescentes: `REGRAS PARA FAMÍLIA COM ADOLESCENTES:
- Inclua atividades dinâmicas e interativas que engajam adolescentes
- Considere experiências tecnológicas, parques radicais ou esportes
- Equilibre atividades culturais com diversão
- Sugira locais "instagramáveis" que agradem teens`,
    melhor_idade: `REGRAS PARA MELHOR IDADE (60+):
- Evite atividades que exijam grande esforço físico ou longas caminhadas
- Priorize conforto, acessibilidade e ritmo tranquilo
- Sugira restaurantes com boa estrutura e conforto
- Considere passeios panorâmicos e experiências culturais
- Evite atividades radicais ou aventureiras`,
    lua_de_mel: `REGRAS PARA LUA DE MEL:
- Priorize experiências românticas e exclusivas
- Sugira restaurantes sofisticados com ambiente intimista
- Inclua spas, passeios de barco, pôr-do-sol em mirantes
- Evite atividades em grupo ou locais muito lotados
- Considere jantares privativos e experiências surpresa`,
    corporativo: `REGRAS PARA VIAGEM CORPORATIVA:
- Considere horários de reuniões e compromissos profissionais
- Sugira restaurantes adequados para jantares de negócios
- Inclua opções de entretenimento para networking
- Priorize locais de fácil acesso e com boa infraestrutura`,
    solo: `REGRAS PARA VIAGEM SOLO:
- Sugira atividades que funcionem bem para uma pessoa
- Inclua locais sociais onde seja fácil conhecer outros viajantes
- Considere segurança e praticidade
- Priorize experiências imersivas e autênticas`,
  };

  return rules[tripType] || "";
}
