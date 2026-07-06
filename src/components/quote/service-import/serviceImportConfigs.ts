import type { SmartImportField, GenericServiceKey } from "./GenericServiceSmartImport";

/** Normalize date strings (DD/MM/YYYY, "25 Set 2024", ISO) to YYYY-MM-DD. */
const MONTH_MAP: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12,
  feb: 2, apr: 4, may: 5, aug: 8,
};
const pad2 = (n: number) => String(n).padStart(2, "0");
function normalizeDate(raw: any): string {
  if (!raw || typeof raw !== "string") return "";
  const s = raw.trim();
  const yearHint = new Date().getFullYear();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s);
  if (m) {
    let y = Number(m[3]); if (y < 100) y += 2000;
    return `${y}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;
  }
  m = /^(\d{1,2})[\/\-.](\d{1,2})$/.exec(s);
  if (m) return `${yearHint}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;
  m = /^(\d{1,2})[\s\-\/]+([A-Za-zçÇ]{3,})\.?(?:[\s\-\/]+(\d{2,4}))?$/.exec(s);
  if (m) {
    const day = Number(m[1]);
    const monKey = m[2].toLowerCase().slice(0, 3).replace("ç", "c");
    const mo = MONTH_MAP[monKey];
    if (mo) {
      let y = m[3] ? Number(m[3]) : yearHint; if (y < 100) y += 2000;
      return `${y}-${pad2(mo)}-${pad2(day)}`;
    }
  }
  return "";
}

function num(v: any): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d,.-]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function joinMeta(p: Record<string, any>, extra: string[] = []): string {
  const notes: string[] = [...extra];
  if (p.fornecedor) notes.push(`Fornecedor: ${p.fornecedor}`);
  if (p.codigo_reserva) notes.push(`Reserva: ${p.codigo_reserva}`);
  if (p.localizador && p.localizador !== p.codigo_reserva) notes.push(`Localizador: ${p.localizador}`);
  if (p.link_reserva) notes.push(`Link: ${p.link_reserva}`);
  if (p.moeda && typeof p.valor_total === "number" && p.moeda.toUpperCase() !== "BRL") {
    notes.push(`Total em ${p.moeda}: ${p.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  }
  if (typeof p.cambio === "number" && p.moeda) {
    const dt = p.data_cambio ? ` (${p.data_cambio})` : "";
    notes.push(`Câmbio: ${p.moeda} 1,00 = R$ ${p.cambio.toLocaleString("pt-BR", { minimumFractionDigits: 4 })}${dt}`);
  }
  if (p.politica_cancelamento) {
    notes.push("", "Política de cancelamento:", p.politica_cancelamento);
  }
  if (Array.isArray(p.observacoes) && p.observacoes.length) {
    notes.push("", "Observações:");
    p.observacoes.forEach((o: string) => notes.push(`• ${o}`));
  }
  return notes.join("\n");
}

export interface ServiceImportConfig {
  serviceLabel: string;
  fields: SmartImportField[];
  mapToInitialData: (parsed: Record<string, any>) => { service_data: Record<string, any>; amount: number };
}

export const SERVICE_IMPORT_CONFIGS: Record<GenericServiceKey, ServiceImportConfig> = {
  transfer: {
    serviceLabel: "transfer",
    fields: [
      { key: "empresa", label: "Empresa", placeholder: "Wemoov, TourTransfer..." },
      { key: "tipo_transfer", label: "Tipo (arrival | departure | round_trip)", placeholder: "arrival" },
      { key: "categoria", label: "Categoria (regular | private)", placeholder: "private" },
      { key: "origem", label: "Origem" },
      { key: "destino", label: "Destino" },
      { key: "trajeto", label: "Trajeto", full: true, placeholder: "Ex: Aeroporto CDG ↔ Hotel Marriott" },
      { key: "data", label: "Data", type: "date", placeholder: "AAAA-MM-DD" },
      { key: "hora", label: "Hora", type: "time", placeholder: "HH:mm" },
      { key: "data_volta", label: "Data volta (ida/volta)", type: "date" },
      { key: "hora_volta", label: "Hora volta", type: "time" },
      { key: "passageiros", label: "Passageiros", type: "number" },
      { key: "veiculo", label: "Veículo", placeholder: "Sedan, Van..." },
      { key: "moeda", label: "Moeda", placeholder: "BRL / USD / EUR" },
      { key: "valor_total", label: "Valor total (moeda original)", type: "number" },
      { key: "valor_total_brl", label: "Valor total em R$", type: "number" },
    ],
    mapToInitialData: (p) => {
      const mode = (p.tipo_transfer || "").toLowerCase();
      let transfer_type: "arrival" | "departure" | "round_trip" = "arrival";
      if (mode.includes("round") || mode.includes("ida e volta") || mode.includes("ida/volta") || mode.includes("volta")) transfer_type = "round_trip";
      else if (mode.includes("depart") || mode.includes("saída") || mode.includes("saida")) transfer_type = "departure";
      const location = p.trajeto || [p.origem, p.destino].filter(Boolean).join(" ↔ ");
      const price = typeof p.valor_total_brl === "number" ? p.valor_total_brl : num(p.valor_total);
      return {
        service_data: {
          company_name: p.empresa || "",
          transfer_type, // round_trip behavior handled by user editing the chooser in form
          service_category: (p.categoria || "").toLowerCase().includes("priv") ? "private" : (p.categoria ? "regular" : null),
          location,
          date: normalizeDate(p.data),
          arrival_date: normalizeDate(p.data),
          departure_date: normalizeDate(p.data_volta),
          price,
        },
        amount: price,
      };
    },
  },

  attraction: {
    serviceLabel: "ingresso/atração",
    fields: [
      { key: "nome_produto", label: "Nome do produto", full: true, placeholder: "Universal, Disney, City Tour..." },
      { key: "tipo_ingresso", label: "Tipo de ingresso", placeholder: "Park Hopper, Skip the Line..." },
      { key: "cidade", label: "Cidade" },
      { key: "data", label: "Data", type: "date" },
      { key: "hora", label: "Hora", type: "time" },
      { key: "duracao", label: "Duração", placeholder: "Ex: 4h, dia inteiro" },
      { key: "quantidade_adultos", label: "Adultos", type: "number" },
      { key: "quantidade_criancas", label: "Crianças", type: "number" },
      { key: "valor_adulto", label: "Valor adulto", type: "number" },
      { key: "valor_crianca", label: "Valor criança", type: "number" },
      { key: "ponto_encontro", label: "Ponto de encontro", full: true },
      { key: "moeda", label: "Moeda" },
      { key: "valor_total", label: "Valor total (moeda original)", type: "number" },
      { key: "valor_total_brl", label: "Valor total em R$", type: "number" },
      { key: "inclusos", label: "Inclusos (1 por linha)", type: "list", full: true },
      { key: "nao_inclusos", label: "Não inclusos (1 por linha)", type: "list", full: true },
    ],
    mapToInitialData: (p) => {
      const adult_price = num(p.valor_adulto);
      const child_price = num(p.valor_crianca);
      const totalFromAi = typeof p.valor_total_brl === "number" ? p.valor_total_brl : num(p.valor_total);
      const extraNotes: string[] = [];
      if (Array.isArray(p.inclusos) && p.inclusos.length) {
        extraNotes.push("Inclusos:"); p.inclusos.forEach((i: string) => extraNotes.push(`• ${i}`));
      }
      if (Array.isArray(p.nao_inclusos) && p.nao_inclusos.length) {
        extraNotes.push("", "Não inclusos:"); p.nao_inclusos.forEach((i: string) => extraNotes.push(`• ${i}`));
      }
      if (p.duracao) extraNotes.push(`Duração: ${p.duracao}`);
      if (p.hora) extraNotes.push(`Horário: ${p.hora}`);
      if (p.ponto_encontro) extraNotes.push(`Ponto de encontro: ${p.ponto_encontro}`);
      if (p.cidade) extraNotes.push(`Cidade: ${p.cidade}`);
      return {
        service_data: {
          product_name: p.nome_produto || "",
          name: p.nome_produto || "",
          ticket_type: p.tipo_ingresso || "",
          date: normalizeDate(p.data),
          adult_price,
          child_price,
          price: totalFromAi || (adult_price + child_price),
          notes: joinMeta(p, extraNotes),
        },
        amount: totalFromAi || (adult_price + child_price),
      };
    },
  },

  insurance: {
    serviceLabel: "seguro viagem",
    fields: [
      { key: "seguradora", label: "Seguradora", placeholder: "Assist Card, Travel Ace..." },
      { key: "plano", label: "Plano" },
      { key: "cobertura", label: "Cobertura", placeholder: "USD 60.000..." },
      { key: "destino_cobertura", label: "Destino da cobertura", placeholder: "Mundo todo, Europa..." },
      { key: "data_inicio", label: "Data início", type: "date" },
      { key: "data_fim", label: "Data fim", type: "date" },
      { key: "dias", label: "Dias", type: "number" },
      { key: "quantidade_passageiros", label: "Passageiros", type: "number" },
      { key: "valor_por_pessoa", label: "Valor por pessoa", type: "number" },
      { key: "apolice", label: "Apólice" },
      { key: "moeda", label: "Moeda" },
      { key: "valor_total", label: "Valor total (moeda original)", type: "number" },
      { key: "valor_total_brl", label: "Valor total em R$", type: "number" },
      { key: "coberturas_detalhadas", label: "Coberturas detalhadas (1 por linha)", type: "list", full: true },
    ],
    mapToInitialData: (p) => {
      const perPerson = num(p.valor_por_pessoa);
      const total = typeof p.valor_total_brl === "number" ? p.valor_total_brl : num(p.valor_total);
      const isUnit = perPerson > 0;
      const price = isUnit ? perPerson : total;
      const extraNotes: string[] = [];
      if (p.plano) extraNotes.push(`Plano: ${p.plano}`);
      if (p.destino_cobertura) extraNotes.push(`Destino: ${p.destino_cobertura}`);
      if (p.apolice) extraNotes.push(`Apólice: ${p.apolice}`);
      if (p.dias) extraNotes.push(`Dias: ${p.dias}`);
      if (Array.isArray(p.coberturas_detalhadas) && p.coberturas_detalhadas.length) {
        extraNotes.push("", "Coberturas:");
        p.coberturas_detalhadas.forEach((c: string) => extraNotes.push(`• ${c}`));
      }
      return {
        service_data: {
          provider: p.seguradora || "",
          start_date: normalizeDate(p.data_inicio),
          end_date: normalizeDate(p.data_fim),
          coverage: p.cobertura || "",
          price,
          is_unit_price: isUnit,
          notes: joinMeta(p, extraNotes),
        },
        amount: total || (isUnit ? perPerson : 0),
      };
    },
  },

  cruise: {
    serviceLabel: "cruzeiro",
    fields: [
      { key: "companhia", label: "Companhia", placeholder: "MSC, Costa, Royal Caribbean..." },
      { key: "nome_navio", label: "Navio" },
      { key: "rota", label: "Rota", full: true, placeholder: "Ex: Santos → Búzios → Ilha Grande" },
      { key: "porto_embarque", label: "Porto embarque" },
      { key: "porto_desembarque", label: "Porto desembarque" },
      { key: "data_embarque", label: "Data embarque", type: "date" },
      { key: "data_desembarque", label: "Data desembarque", type: "date" },
      { key: "noites", label: "Noites", type: "number" },
      { key: "tipo_cabine", label: "Tipo de cabine (interna|externa|varanda|suite)", placeholder: "varanda" },
      { key: "numero_cabine", label: "Número da cabine" },
      { key: "regime", label: "Regime", placeholder: "Pensão completa..." },
      { key: "passageiros", label: "Passageiros", type: "number" },
      { key: "taxas_portuarias", label: "Taxas portuárias", type: "number" },
      { key: "moeda", label: "Moeda" },
      { key: "valor_total", label: "Valor total (moeda original)", type: "number" },
      { key: "valor_total_brl", label: "Valor total em R$", type: "number" },
      { key: "portos_visitados", label: "Portos visitados (1 por linha)", type: "list", full: true },
      { key: "itinerario", label: "Itinerário do cruzeiro (dia a dia)", type: "cruise_itinerary", full: true } as any,
    ],
    mapToInitialData: (p) => {
      const total = typeof p.valor_total_brl === "number" ? p.valor_total_brl : num(p.valor_total);
      const cabin = (p.tipo_cabine || "").toLowerCase();
      let cabin_type = "";
      if (cabin.includes("intern")) cabin_type = "interna";
      else if (cabin.includes("varan")) cabin_type = "varanda";
      else if (cabin.includes("suit")) cabin_type = "suite";
      else if (cabin.includes("extern") || cabin.includes("ocean") || cabin.includes("vista")) cabin_type = "externa";
      const extraNotes: string[] = [];
      if (p.companhia) extraNotes.push(`Companhia: ${p.companhia}`);
      if (p.numero_cabine) extraNotes.push(`Cabine nº ${p.numero_cabine}`);
      if (p.regime) extraNotes.push(`Regime: ${p.regime}`);
      if (p.porto_embarque) extraNotes.push(`Embarque: ${p.porto_embarque}`);
      if (p.porto_desembarque) extraNotes.push(`Desembarque: ${p.porto_desembarque}`);
      if (typeof p.noites === "number") extraNotes.push(`${p.noites} noites`);
      if (typeof p.taxas_portuarias === "number") extraNotes.push(`Taxas portuárias: R$ ${p.taxas_portuarias.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
      if (Array.isArray(p.portos_visitados) && p.portos_visitados.length) {
        extraNotes.push("", "Portos visitados:");
        p.portos_visitados.forEach((c: string) => extraNotes.push(`• ${c}`));
      }

      // Normaliza itinerário extraído pela IA.
      // Aceita formato estruturado: [{ data, porto/local, chegada, saida, tipo, observacoes }].
      // Campos não identificados ficam em branco (nunca inventamos dados).
      const rawIt = Array.isArray(p.itinerario) ? p.itinerario : [];
      const itinerary = rawIt
        .map((s: any) => {
          if (!s || typeof s !== "object") return null;
          const port = String(s.porto || s.local || s.port || "").trim();
          const rawType = String(s.tipo || s.stop_type || "").toLowerCase();
          let stop_type: "embarque" | "porto" | "navegacao" | "desembarque" = "porto";
          if (rawType.includes("embarq")) stop_type = "embarque";
          else if (rawType.includes("desemb")) stop_type = "desembarque";
          else if (rawType.includes("naveg") || rawType.includes("mar")) stop_type = "navegacao";
          else if (!port && /naveg/i.test(String(s.observacoes || ""))) stop_type = "navegacao";
          const date = String(s.data || s.date || "").trim();
          const arrival = String(s.chegada || s.arrival_time || "").trim();
          const departure = String(s.saida || s.departure_time || "").trim();
          const notes = String(s.observacoes || s.notes || s.descricao || "").trim();
          if (!port && !date && !arrival && !departure && !notes && stop_type !== "navegacao") return null;
          return {
            date,
            port: port || (stop_type === "navegacao" ? "Navegação" : ""),
            arrival_time: arrival,
            departure_time: departure,
            stop_type,
            notes,
            description: notes,
          };
        })
        .filter(Boolean);

      return {
        service_data: {
          ship_name: p.nome_navio || "",
          route: p.rota || [p.porto_embarque, ...(Array.isArray(p.portos_visitados) ? p.portos_visitados : []), p.porto_desembarque].filter(Boolean).join(" → "),
          start_date: normalizeDate(p.data_embarque),
          end_date: normalizeDate(p.data_desembarque),
          cabin_type,
          price: total,
          notes: joinMeta(p, extraNotes),
          itinerary,
        },
        amount: total,
      };
    },
  },

  circuit: {
    serviceLabel: "circuito",
    fields: [
      { key: "nome_circuito", label: "Nome do circuito", full: true, placeholder: "Ex: Circuito Itália Clássica" },
      { key: "operadora", label: "Operadora" },
      { key: "duracao", label: "Duração", placeholder: "10 dias / 9 noites" },
      { key: "data_inicio", label: "Data início", type: "date" },
      { key: "data_fim", label: "Data fim", type: "date" },
      { key: "passageiros", label: "Passageiros", type: "number" },
      { key: "moeda", label: "Moeda" },
      { key: "valor_total", label: "Valor total (moeda original)", type: "number" },
      { key: "valor_total_brl", label: "Valor total em R$", type: "number" },
      { key: "cidades", label: "Cidades (1 por linha)", type: "list", full: true },
      { key: "itinerario", label: "Itinerário detalhado", type: "textarea", full: true },
      { key: "inclusos", label: "Inclusos (1 por linha)", type: "list", full: true },
      { key: "nao_inclusos", label: "Não inclusos (1 por linha)", type: "list", full: true },
      { key: "hoteis_previstos", label: "Hotéis previstos (1 por linha)", type: "list", full: true },
    ],
    mapToInitialData: (p) => {
      const total = typeof p.valor_total_brl === "number" ? p.valor_total_brl : num(p.valor_total);
      const itinerarioBase = p.itinerario || "";
      const cidadesLine = Array.isArray(p.cidades) && p.cidades.length ? `Cidades: ${p.cidades.join(" → ")}\n\n` : "";
      const itinerario = `${cidadesLine}${itinerarioBase}`.trim();
      const extraNotes: string[] = [];
      if (p.operadora) extraNotes.push(`Operadora: ${p.operadora}`);
      if (p.data_inicio) extraNotes.push(`Início: ${normalizeDate(p.data_inicio) || p.data_inicio}`);
      if (p.data_fim) extraNotes.push(`Fim: ${normalizeDate(p.data_fim) || p.data_fim}`);
      if (Array.isArray(p.hoteis_previstos) && p.hoteis_previstos.length) {
        extraNotes.push("", "Hotéis previstos:");
        p.hoteis_previstos.forEach((h: string) => extraNotes.push(`• ${h}`));
      }
      if (Array.isArray(p.inclusos) && p.inclusos.length) {
        extraNotes.push("", "Inclusos:");
        p.inclusos.forEach((i: string) => extraNotes.push(`• ${i}`));
      }
      if (Array.isArray(p.nao_inclusos) && p.nao_inclusos.length) {
        extraNotes.push("", "Não inclusos:");
        p.nao_inclusos.forEach((i: string) => extraNotes.push(`• ${i}`));
      }
      return {
        service_data: {
          circuit_name: p.nome_circuito || "",
          duration: p.duracao || "",
          itinerary: itinerario,
          price: total,
          notes: joinMeta(p, extraNotes),
        },
        amount: total,
      };
    },
  },

  other: {
    serviceLabel: "outros serviços",
    fields: [
      { key: "titulo", label: "Título do serviço", full: true, placeholder: "Chip Internacional, Estacionamento..." },
      { key: "empresa", label: "Empresa" },
      { key: "data", label: "Data", type: "date" },
      { key: "moeda", label: "Moeda" },
      { key: "valor_total", label: "Valor total (moeda original)", type: "number" },
      { key: "valor_total_brl", label: "Valor total em R$", type: "number" },
      { key: "descricao", label: "Descrição", type: "textarea", full: true },
    ],
    mapToInitialData: (p) => {
      const total = typeof p.valor_total_brl === "number" ? p.valor_total_brl : num(p.valor_total);
      const description = [p.descricao, joinMeta(p)].filter(Boolean).join("\n\n").trim();
      return {
        service_data: {
          custom_title: p.titulo || "",
          company_name: p.empresa || "",
          description,
          price: total,
        },
        amount: total,
      };
    },
  },

  rail_transport: {
    serviceLabel: "transporte ferroviário",
    fields: [
      { key: "operadora", label: "Operadora ferroviária", placeholder: "SNCF, Trenitalia, Eurostar, Renfe..." },
      { key: "tipo_transporte", label: "Tipo (high_speed | regional | night | panoramic | other)", placeholder: "high_speed" },
      { key: "classe", label: "Classe (economy | second | first | executive | sleeper)", placeholder: "second" },
      { key: "cidade_origem", label: "Cidade de origem" },
      { key: "estacao_origem", label: "Estação de origem", placeholder: "Ex: Paris Gare du Nord" },
      { key: "cidade_destino", label: "Cidade de destino" },
      { key: "estacao_destino", label: "Estação de destino" },
      { key: "data_viagem", label: "Data da viagem", type: "date" },
      { key: "horario_saida", label: "Horário de saída", type: "time" },
      { key: "horario_chegada", label: "Horário de chegada", type: "time" },
      { key: "adultos", label: "Adultos", type: "number" },
      { key: "criancas", label: "Crianças", type: "number" },
      { key: "valor_adulto", label: "Valor adulto", type: "number" },
      { key: "valor_crianca", label: "Valor criança", type: "number" },
      { key: "moeda", label: "Moeda" },
      { key: "valor_total", label: "Valor total (moeda original)", type: "number" },
      { key: "valor_total_brl", label: "Valor total em R$", type: "number" },
      { key: "descricao_cliente", label: "Descrição para o cliente", type: "textarea", full: true },
      { key: "inclusos", label: "O que está incluso (1 por linha)", type: "list", full: true },
    ],
    mapToInitialData: (p) => {
      const adults = typeof p.adultos === "number" ? p.adultos : num(p.adultos) || 1;
      const kids = typeof p.criancas === "number" ? p.criancas : num(p.criancas) || 0;
      const adult_price = num(p.valor_adulto);
      const child_price = num(p.valor_crianca);
      const totalFromAi = typeof p.valor_total_brl === "number" ? p.valor_total_brl : num(p.valor_total);
      const computed = adults * adult_price + kids * child_price;
      const total = totalFromAi || computed;

      const rawType = String(p.tipo_transporte || "").toLowerCase();
      let rail_type: "high_speed" | "regional" | "night" | "panoramic" | "other" = "high_speed";
      if (rawType.includes("region")) rail_type = "regional";
      else if (rawType.includes("night") || rawType.includes("notur") || rawType.includes("sleep") || rawType.includes("couch")) rail_type = "night";
      else if (rawType.includes("panor") || rawType.includes("glacier") || rawType.includes("bernina")) rail_type = "panoramic";
      else if (rawType.includes("other") || rawType.includes("outr")) rail_type = "other";
      else if (rawType.includes("high") || rawType.includes("alta") || rawType.includes("tgv") || rawType.includes("ave") || rawType.includes("frecc") || rawType.includes("eurostar") || rawType.includes("ice") || rawType.includes("italo")) rail_type = "high_speed";

      const rawClass = String(p.classe || "").toLowerCase();
      let travel_class: "economy" | "second" | "first" | "executive" | "sleeper" = "economy";
      if (rawClass.includes("sleep") || rawClass.includes("couch") || rawClass.includes("cabine") || rawClass.includes("leito")) travel_class = "sleeper";
      else if (rawClass.includes("exec") || rawClass.includes("business")) travel_class = "executive";
      else if (rawClass.includes("first") || rawClass.includes("1") || rawClass.includes("primeir") || rawClass.includes("premier")) travel_class = "first";
      else if (rawClass.includes("second") || rawClass.includes("2") || rawClass.includes("segund") || rawClass.includes("standard")) travel_class = "second";
      else if (rawClass.includes("econ")) travel_class = "economy";

      const inclusos = Array.isArray(p.inclusos) ? p.inclusos.filter(Boolean) : [];
      const whats_included = inclusos.length ? inclusos.map((i: string) => `• ${i}`).join("\n") : "";

      const extraNotes: string[] = [];
      if (p.moeda && typeof p.valor_total === "number") {
        extraNotes.push(`Total em ${p.moeda}: ${p.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
      }
      const notes = joinMeta(p, extraNotes);

      return {
        service_data: {
          operator: p.operadora || "",
          rail_type,
          travel_class,
          origin_city: p.cidade_origem || "",
          origin_station: p.estacao_origem || "",
          destination_city: p.cidade_destino || "",
          destination_station: p.estacao_destino || "",
          travel_date: normalizeDate(p.data_viagem),
          departure_time: p.horario_saida || "",
          arrival_time: p.horario_chegada || "",
          adults_count: adults,
          children_count: kids,
          adult_price,
          child_price,
          price: total,
          description: p.descricao_cliente || "",
          whats_included,
          notes,
          features: {
            wifi: p.wifi === true,
            power_outlets: p.tomadas === true,
            meal_included: p.refeicao_inclusa === true,
            assigned_seat: p.assento_marcado === true,
            private_cabin: p.cabine_privativa === true,
            panoramic_view: p.vista_panoramica === true,
          },
        },
        amount: total,
      };
    },
  },
};