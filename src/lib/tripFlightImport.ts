/**
 * Converte o resultado bruto do extrator `import-airfare-document` no formato
 * completo da passagem aérea da Carteira Digital (TripFlightData).
 * Só preenche o que veio do documento; o restante fica vazio para revisão.
 */
import type { TripFlightData, TripFlightPassenger, TripFlightSegment } from "@/types/trip";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

const MONTHS: Record<string, string> = {
  jan: "01", fev: "02", feb: "02", mar: "03", abr: "04", apr: "04", mai: "05", may: "05", jun: "06",
  jul: "07", ago: "08", aug: "08", set: "09", sep: "09", out: "10", oct: "10", nov: "11", dez: "12", dec: "12",
};

/** Aceita YYYY-MM-DD ou DD/MM/YYYY; datas sem ano ficam vazias (nunca inventar ano). */
export function normalizeImportDate(raw: unknown): string {
  const s = str(raw);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = /^(\d{1,2})\s*([A-Za-zç]{3})[a-z]*\.?\s*(\d{4})$/i.exec(s);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  return "";
}

const normalizeTime = (raw: unknown) => {
  const m = /(\d{1,2}):(\d{2})/.exec(str(raw));
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
};

const paxType = (raw: unknown): TripFlightPassenger["passenger_type"] => {
  const t = str(raw).toLowerCase();
  if (/^(chd|crian|child)/.test(t)) return "crianca";
  if (/^(inf|beb|baby)/.test(t)) return "bebe";
  return "adulto";
};

const flightStatus = (raw: unknown, hasTicket: boolean): TripFlightData["flight_status"] => {
  const t = str(raw).toLowerCase();
  if (t.startsWith("emit")) return "emitido";
  if (t.startsWith("pend")) return "pendente";
  if (t.startsWith("conf")) return "confirmado";
  return hasTicket ? "emitido" : "confirmado";
};

export function parsedAirfareToTripFlightData(raw: any): TripFlightData {
  const voos: any[] = Array.isArray(raw?.voos) ? raw.voos : [];
  const resumo = raw?.resumo || {};
  const reserva = raw?.reserva || {};
  const passageiros: any[] = Array.isArray(raw?.passageiros) ? raw.passageiros : [];

  const total = voos.length;
  const segments: TripFlightSegment[] = voos.map((v, i) => ({
    origin_airport: str(v.origem_codigo).toUpperCase(),
    origin_city: str(v.origem_nome),
    destination_airport: str(v.destino_codigo).toUpperCase(),
    destination_city: str(v.destino_nome),
    ...(v.origem_aeroporto ? { origin_airport_name: str(v.origem_aeroporto) } : {}),
    ...(v.destino_aeroporto ? { destination_airport_name: str(v.destino_aeroporto) } : {}),
    flight_date: normalizeImportDate(v.data_saida),
    departure_time: normalizeTime(v.hora_saida),
    arrival_time: normalizeTime(v.hora_chegada),
    flight_number: str(v.numero_voo),
    airline: str(v.companhia_aerea),
    terminal: str(v.terminal_saida),
    gate: str(v.portao),
    segment_type: total <= 1 ? "ida" : i === 0 ? "ida" : i === total - 1 ? "volta" : "conexao",
  }));

  const ordemToIdx = new Map<number, number>();
  voos.forEach((v, i) => ordemToIdx.set(typeof v.ordem === "number" ? v.ordem : i + 1, i));

  const passengers: TripFlightPassenger[] = passageiros.map((p) => {
    const seats: string[] = (Array.isArray(p.assentos) ? p.assentos : [])
      .map((a: any) => {
        const seat = str(a?.assento);
        if (!seat) return "";
        const idx = ordemToIdx.get(a?.trecho_ordem);
        const seg = idx != null ? segments[idx] : undefined;
        return seg && total > 1 ? `${seat} (${seg.origin_airport}→${seg.destination_airport})` : seat;
      })
      .filter(Boolean);
    const ticket = str(p.bilhete);
    const doc = str(p.documento);
    const notes = [
      ticket && doc ? `Documento: ${doc}` : "",
      str(p.fidelidade) && `Fidelidade: ${str(p.fidelidade)}`,
      str(p.observacoes),
    ].filter(Boolean).join(" • ");
    return {
      name: str(p.nome),
      passenger_type: paxType(p.tipo),
      // Campo "document" exibido como "Nº do Bilhete (E-ticket)".
      document: ticket || doc,
      seat: seats.join(", "),
      notes,
    };
  });

  const airlines = Array.from(new Set(segments.map((s) => s.airline).filter(Boolean))).join(" / ");
  const first = segments[0];
  const last = segments[total - 1];
  const tripType: TripFlightData["trip_type"] =
    resumo.tipo_tarifa === "RT" ? "ida_volta"
    : resumo.tipo_tarifa === "OW" ? "ida"
    : resumo.tipo_tarifa === "MT" ? "multi_trechos"
    : total >= 2 && first?.origin_airport && first.origin_airport === last?.destination_airport ? "ida_volta"
    : total > 1 ? "multi_trechos" : "ida";

  // Destino principal: em ida e volta, o destino do último trecho de ida.
  let destination = last?.destination_city || "";
  if (tripType === "ida_volta" && total >= 2) {
    const back = segments.findIndex((s) => s.destination_airport === first.origin_airport);
    const outLast = segments[Math.max(0, back - 1)];
    destination = outLast?.destination_city || destination;
    if (back > 0) segments.forEach((s, i) => { s.segment_type = i < back ? (i === 0 ? "ida" : "conexao") : "volta"; });
  }

  // Bagagem: texto do documento primeiro; senão derivado dos indicadores por voo.
  const anyChecked = voos.some((v) => v.bagagem_despachada === true || (typeof v.quantidade_bagagem_despachada === "number" && v.quantidade_bagagem_despachada > 0));
  const noneChecked = voos.length > 0 && voos.every((v) => v.bagagem_despachada === false);
  const anyCarry = voos.some((v) => v.bagagem_mao === true);
  const baggageTexts = Array.from(new Set(voos.map((v) => str(v.bagagem_texto)).filter(Boolean)));

  const hasTicket = passageiros.some((p) => !!str(p?.bilhete));
  const boardingNotes = [str(reserva.orientacoes_embarque), ...(Array.isArray(raw?.observacoes) ? raw.observacoes.map(str) : [])]
    .filter(Boolean).join("\n");

  const checkinStatus = str(reserva.checkin_status).toLowerCase().startsWith("real") ? "realizado" : "pendente";

  return {
    main_airline: airlines,
    origin_city: first?.origin_city || str(resumo.origem_inicial),
    destination_city: destination || str(resumo.destino_final),
    trip_type: tripType,
    locator_code: str(reserva.localizador).replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
    flight_status: flightStatus(reserva.status_emissao, hasTicket),
    segments,
    passengers,
    carry_on: str(reserva.bagagem_mao) || (anyCarry ? "Bagagem de mão inclusa" : ""),
    checked_baggage: str(reserva.bagagem_despachada) || (anyChecked ? "Inclui bagagem despachada" : noneChecked ? "Não inclui bagagem despachada" : ""),
    extra_baggage: str(reserva.bagagem_extra),
    baggage_rules: str(reserva.regras_bagagem),
    baggage_notes: baggageTexts.join(" • "),
    checkin_url: str(reserva.checkin_url),
    checkin_status: checkinStatus,
    checkin_open_date: str(reserva.checkin_abertura),
    checkin_notes: str(reserva.checkin_observacoes),
    recommended_arrival: str(reserva.antecedencia_aeroporto),
    boarding_terminal: str(reserva.terminal_embarque) || first?.terminal || "",
    required_documents: str(reserva.documentos_obrigatorios),
    immigration_rules: str(reserva.regras_imigracao),
    boarding_notes: boardingNotes,
    airline: airlines,
    departure_date: first?.flight_date || "",
    return_date: last?.flight_date || first?.flight_date || "",
    notes: boardingNotes,
  };
}

/** Sobrepõe localizador, passageiros, bilhetes, bagagem, check-in e embarque do documento + arquivo enviado. */
export function mergeFullAirfareDefaults(base: any, raw: any, file?: File | null) {
  const out: any = { ...base };
  if (raw && typeof raw === "object") {
    const full: any = parsedAirfareToTripFlightData(raw);
    for (const [k, v] of Object.entries(full)) {
      if (k === "segments") continue;
      if (Array.isArray(v) ? v.length > 0 : !!v) out[k] = v;
    }
    out.segments = (base.segments || []).map((s: any) => {
      const m = full.segments.find((f: any) => f.flight_number && f.flight_number.replace(/\s/g, "") === (s.flight_number || "").replace(/\s/g, ""));
      return m ? { ...s, terminal: s.terminal || m.terminal, gate: s.gate || m.gate } : s;
    });
  }
  if (file) out.__importedFiles = [file];
  return out;
}

