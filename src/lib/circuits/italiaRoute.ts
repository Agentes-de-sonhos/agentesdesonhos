// Programa Curti 31847, dias 3, 8, 10 e 12. Coordenadas aproximadas
// dos centros urbanos, exceto o término (aeroporto de Brindisi).
export const ITALIA_ROUTE_STOPS = [
  { city: "Roma", coords: [12.4964, 41.9028], label: [16, -11], anchor: "start", status: "Início" },
  { city: "Nápoles", coords: [14.2681, 40.8518], label: [-13, -12], anchor: "end", status: "Conexão ferroviária" },
  { city: "Sorrento", coords: [14.3758, 40.6263], label: [0, 30], anchor: "middle", status: "" },
  { city: "Bari", coords: [16.8719, 41.1171], label: [7, -16], anchor: "middle", status: "" },
  { city: "Brindisi", coords: [17.947, 40.6576], label: [18, -17], anchor: "start", status: "Término · aeroporto" },
  { city: "Lecce", coords: [18.1724, 40.3515], label: [-13, 18], anchor: "end", status: "" },
] as const;

export const ITALIA_ROUTE_LEGS = [
  { from: "Roma", to: "Nápoles", mode: "train" },
  { from: "Nápoles", to: "Sorrento", mode: "transfer" },
  { from: "Sorrento", to: "Nápoles", mode: "transfer" },
  { from: "Nápoles", to: "Bari", mode: "train" },
  { from: "Bari", to: "Lecce", mode: "train" },
  { from: "Lecce", to: "Brindisi", mode: "transfer" },
] as const;
