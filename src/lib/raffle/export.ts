import * as XLSX from "xlsx";
import type { RaffleParticipant } from "./types";

export interface WinnerRow {
  position: number;
  participant: RaffleParticipant;
  prize?: string | null;
  drawnAt?: string | null;
}

function winnerToRecord(w: WinnerRow): Record<string, string | number> {
  const p = w.participant;
  return {
    Posição: w.position,
    Nome: p.name ?? "",
    "Empresa/Agência": p.company ?? "",
    "E-mail": p.email ?? "",
    Telefone: p.phone ?? "",
    Cidade: p.city ?? "",
    Estado: p.state ?? "",
    País: p.country ?? "",
    "Tempo assistido (min)": p.watchedMinutes ?? "",
    Presente: p.attended === true ? "Sim" : p.attended === false ? "Não" : "",
    Prêmio: w.prize ?? "",
    "Sorteado em": w.drawnAt ?? "",
  };
}

/** CSV com BOM UTF-8 e separador ";" (Excel PT-BR) preservando acentuação. */
export function winnersToCsv(winners: WinnerRow[]): string {
  const records = winners.map(winnerToRecord);
  if (!records.length) return "";
  const headers = Object.keys(records[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(";"),
    ...records.map((r) => headers.map((h) => escape(r[h])).join(";")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportWinnersCsv(winners: WinnerRow[], filename = "vencedores.csv") {
  download(new Blob([winnersToCsv(winners)], { type: "text/csv;charset=utf-8;" }), filename);
}

export function exportWinnersXlsx(winners: WinnerRow[], filename = "vencedores.xlsx") {
  const ws = XLSX.utils.json_to_sheet(winners.map(winnerToRecord));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vencedores");
  XLSX.writeFile(wb, filename);
}