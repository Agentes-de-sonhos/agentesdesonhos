import { createTranslator } from "./locale";

export const tPublicFlight = createTranslator({
  "pt-BR": {
    copy: "Copiar localizador", copied: "Localizador copiado", copyError: "Não foi possível copiar. Selecione o código para copiar.",
    ticket: "Nº do bilhete", documents: "Documentos da viagem", openPdf: "Abrir passagem em PDF",
    baggage: "Bagagem", duration: "Duração", noSegments: "Detalhes dos voos não informados", loyalty: "Fidelidade",
  },
  "it-IT": {
    copy: "Copia codice di prenotazione", copied: "Codice copiato", copyError: "Impossibile copiare. Seleziona il codice per copiarlo.",
    ticket: "Nº del biglietto", documents: "Documenti di viaggio", openPdf: "Apri biglietto in PDF",
    baggage: "Bagaglio", duration: "Durata", noSegments: "Dettagli dei voli non indicati", loyalty: "Programma fedeltà",
  },
});