import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, AlertCircle, Trash2, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAirports } from "@/hooks/useAirports";
import * as XLSX from "xlsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface ParsedBlock {
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  arrival_date: string;
  arrival_time: string;
  return_departure_date: string;
  return_departure_time: string;
  return_arrival_date: string;
  return_arrival_time: string;
  airline: string;
  block_code: string;
  price: string;
  currency: string;
  price_text: string;
  deadline: string;
  seats_available: string;
  operator: string;
}

const DATE_COLUMN_INDEXES = new Set([1, 4, 7, 10]);
const TIME_COLUMN_INDEXES = new Set([2, 5, 8, 11]);

function toIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Validates a date is logically possible (e.g. rejects 31/02).
 * Returns true if valid.
 */
function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/**
 * Robust date parser that ALWAYS assumes DD/MM/YYYY (Brazilian format).
 * Never uses Date.parse or locale-based inference.
 * Never reinterprets as MM/DD.
 */
function parseDate(raw: any): string {
  if (raw == null || raw === "") return "";

  // Handle Excel serial numbers (safest path — no timezone issues)
  if (typeof raw === "number") {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && isValidDate(parsed.y, parsed.m, parsed.d)) {
      return toIsoDate(parsed.y, parsed.m, parsed.d);
    }
    return "";
  }

  // Handle JS Date objects — use UTC methods to avoid timezone shift
  if (raw instanceof Date || (typeof raw === "object" && typeof raw.getFullYear === "function")) {
    const y = raw.getUTCFullYear();
    const m = raw.getUTCMonth() + 1;
    const d = raw.getUTCDate();
    if (isValidDate(y, m, d)) {
      return toIsoDate(y, m, d);
    }
    return "";
  }

  const str = String(raw).trim();
  if (!str) return "";

  // Already ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split("-").map(Number);
    if (isValidDate(y, m, d)) return toIsoDate(y, m, d);
    return "";
  }

  // Parse DD/MM/YY or DD/MM/YYYY — ALWAYS Brazilian format, NEVER MM/DD
  const normalized = str
    .split(/[ T]/)[0]
    .replace(/[.\-]/g, "/")
    .replace(/[^\d/]/g, "");

  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (match[3].length === 2) year = 2000 + year;

    if (isValidDate(year, month, day)) {
      return toIsoDate(year, month, day);
    }
    // Log invalid date for debugging
    console.warn(`Data inválida rejeitada: ${str} (dia=${day}, mês=${month}, ano=${year})`);
    return "";
  }

  return "";
}

function getCellDisplayValue(cell?: XLSX.CellObject): string | number | Date {
  if (!cell) return "";

  if (cell.w != null && String(cell.w).trim() !== "") {
    return String(cell.w).trim();
  }

  if (typeof cell.v === "boolean") {
    return String(cell.v);
  }

  return cell.v ?? "";
}

function getSheetRows(sheet: XLSX.WorkSheet): any[][] {
  const ref = sheet["!ref"];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  const rows: any[][] = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
    const row: any[] = [];

    for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      const cell = sheet[address];

      row[colIndex] = DATE_COLUMN_INDEXES.has(colIndex) || TIME_COLUMN_INDEXES.has(colIndex)
        ? getCellDisplayValue(cell)
        : (cell?.v ?? "");
    }

    rows.push(row);
  }

  return rows;
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ===== EXCEL FORMAT PARSER =====
// Supports multiple formats:
// 13-col: A-M (no Cia Aérea, no Disp) → col 12 = Operadora
// 14-col: A-N (has Cia Aérea) → col 12 = Cia, col 13 = Operadora
// 15-col: A-O (full) → col 12 = Cia, col 13 = Disp, col 14 = Operadora
// 16-col RCA: A-P → col 12 = Cia, col 13 = Empresa/Operadora, col 14 = Tarifa, col 15 = Lugares

function extractAirportCode(raw: string): string {
  if (!raw) return "";
  const str = raw.trim().toUpperCase();
  const match = str.match(/^([A-Z]{3})\b/);
  if (match) return match[1];
  return str.split(/[\s(]/)[0] || str;
}

function detectFormat(header: any[]): "13" | "14" | "15" | "16-rca" {
  const colCount = header.filter((c) => c != null && String(c).trim() !== "").length;
  const lower = header.map((c) => String(c || "").toLowerCase());
  const hasCia = lower.some((c) => c.includes("cia") || c.includes("companhia"));
  const hasDisp = lower.some((c) => c.includes("disp"));
  const hasEmpresa = lower.some((c) => c.includes("empresa"));
  const hasTarifa = lower.some((c) => c.includes("tarifa") || c.includes("preço") || c.includes("preco"));
  const hasLugares = lower.some((c) => c.includes("lugar") || c.includes("assento"));

  // RCA layout: 16 cols with Cia + Empresa + Tarifa + Lugares
  if (hasCia && hasEmpresa && hasTarifa && hasLugares) return "16-rca";
  if (hasCia && hasEmpresa && hasLugares && colCount >= 16) return "16-rca";

  if (hasCia && hasDisp) return "15";
  if (hasCia) return "14";
  if (colCount >= 16) return "16-rca";
  if (colCount >= 15) return "15";
  if (colCount >= 14) return "14";
  return "13";
}

function parseExcelRows(rows: any[][]): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let startIdx = 0;
  if (rows.length > 0) {
    const firstCell = String(rows[0][0] || "").toLowerCase();
    if (firstCell.includes("origem") || firstCell.includes("partida") || firstCell.includes("coluna")) startIdx = 1;
    // Also detect RCA header "Aeroporto Ida"
    if (firstCell.includes("aeroporto")) startIdx = 1;
  }

  const header = rows[0] || [];
  const fmt = detectFormat(header);

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 4) continue;

    const origin = extractAirportCode(String(r[0] || ""));
    const rawDataIda = r[1];
    const horaSaida = String(r[2] || "").trim().replace(/h$/i, "");
    const destination = extractAirportCode(String(r[3] || ""));
    const rawDataChegadaIda = r[4];
    const horaChegadaIda = String(r[5] || "").trim().replace(/h$/i, "");
    const rawDataVolta = r[7];
    const horaSaidaVolta = String(r[8] || "").trim().replace(/h$/i, "");
    const rawDataChegadaVolta = r[10];
    const horaChegadaVolta = String(r[11] || "").trim().replace(/h$/i, "");

    let airline = "NÃO INFORMADO";
    let seats = "0";
    let operadora = "";
    let priceText = "";

    if (fmt === "16-rca") {
      // M(12)=Cia, N(13)=Empresa/Operadora, O(14)=Tarifa, P(15)=Lugares
      airline = String(r[12] || "").trim().toUpperCase() || "NÃO INFORMADO";
      operadora = String(r[13] || "").trim().toUpperCase();
      priceText = String(r[14] || "").trim();
      seats = String(r[15] || "0").trim();
    } else if (fmt === "15") {
      // M(12)=Cia, N(13)=Disp, O(14)=Operadora
      airline = String(r[12] || "").trim().toUpperCase() || "NÃO INFORMADO";
      seats = String(r[13] || "0").trim();
      operadora = String(r[14] || "").trim().toUpperCase();
    } else if (fmt === "14") {
      // M(12)=Cia, N(13)=Operadora
      airline = String(r[12] || "").trim().toUpperCase() || "NÃO INFORMADO";
      operadora = String(r[13] || "").trim().toUpperCase();
    } else {
      // M(12)=Operadora only
      operadora = String(r[12] || "").trim().toUpperCase();
    }

    if (!origin || !destination) continue;

    blocks.push({
      origin,
      destination,
      departure_date: parseDate(rawDataIda),
      departure_time: horaSaida,
      arrival_date: parseDate(rawDataChegadaIda),
      arrival_time: horaChegadaIda,
      return_departure_date: parseDate(rawDataVolta),
      return_departure_time: horaSaidaVolta,
      return_arrival_date: parseDate(rawDataChegadaVolta),
      return_arrival_time: horaChegadaVolta,
      airline,
      block_code: "",
      price: "",
      currency: "BRL",
      price_text: priceText,
      deadline: "",
      seats_available: seats,
      operator: operadora,
    });
  }
  return blocks;
}

export function FlightBlocksImporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"preview" | "done">("preview");
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
  const [importResult, setImportResult] = useState({ success: 0, errors: 0, skipped: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getAirport } = useAirports();

  const importMutation = useMutation({
    mutationFn: async (rows: ParsedBlock[]) => {
      let success = 0;
      let errors = 0;
      const existingKeys = new Set<string>();

      const { data: existing } = await supabase
        .from("air_blocks")
        .select("origin, destination, departure_date, departure_time, airline");

      if (existing) {
        for (const e of existing) {
          existingKeys.add(`${e.origin}|${e.destination}|${e.departure_date}|${e.departure_time}|${e.airline}`);
        }
      }

      let skipped = 0;
      for (const row of rows) {
        const key = `${row.origin}|${row.destination}|${row.departure_date}|${row.departure_time}|${row.airline}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }

        try {
          const { error } = await supabase.from("air_blocks").insert({
            origin: row.origin,
            destination: row.destination,
            departure_date: row.departure_date || null,
            departure_time: row.departure_time || null,
            arrival_date: row.arrival_date || null,
            arrival_time: row.arrival_time || null,
            return_date: row.return_departure_date || null,
            return_time: row.return_departure_time || null,
            return_departure_date: row.return_departure_date || null,
            return_departure_time: row.return_departure_time || null,
            return_arrival_date: row.return_arrival_date || null,
            return_arrival_time: row.return_arrival_time || null,
            airline: row.airline,
            seats_available: row.seats_available ? parseInt(row.seats_available) : null,
            deadline: row.deadline || null,
            block_code: row.block_code || null,
            operator: row.operator || null,
            price_text: row.price_text || null,
            price: row.price ? parseFloat(row.price) : null,
            currency: row.currency || "BRL",
          } as any);

          if (error) { errors++; console.error("Error importing block:", error); }
          else { success++; existingKeys.add(key); }
        } catch { errors++; }
      }
      return { success, errors, skipped };
    },
    onSuccess: (result) => {
      setImportResult(result);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["admin-flight-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["flight-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["air-blocks"] });
      toast({
        title: "Importação concluída!",
        description: `${result.success} importado(s)${result.skipped > 0 ? `, ${result.skipped} duplicado(s)` : ""}${result.errors > 0 ? `, ${result.errors} erro(s)` : ""}`,
      });
    },
    onError: () => {
      toast({ title: "Erro na importação", variant: "destructive" });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        // cellDates: false → dates stay as serial numbers, avoiding timezone shifts
        const workbook = XLSX.read(data, { type: "array", cellDates: false });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = getSheetRows(sheet);
        const blocks = parseExcelRows(rows);
        if (blocks.length === 0) {
          toast({ title: "Nenhum bloqueio encontrado no arquivo", variant: "destructive" });
          return;
        }
        setParsedBlocks(blocks);
        setStep("preview");
        setIsOpen(true);
        toast({ title: `${blocks.length} bloqueio(s) detectados no Excel` });
      } catch (err) {
        console.error("Error parsing Excel:", err);
        toast({ title: "Erro ao ler arquivo Excel", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateBlock = (index: number, field: keyof ParsedBlock, value: string) => {
    setParsedBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  };

  const removeBlock = (index: number) => {
    setParsedBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    const valid = parsedBlocks.filter((b) => b.origin && b.destination && b.airline);
    if (valid.length === 0) {
      toast({ title: "Nenhum bloqueio válido para importar", variant: "destructive" });
      return;
    }
    importMutation.mutate(valid);
  };

  const resetImporter = () => {
    setStep("preview");
    setParsedBlocks([]);
    setImportResult({ success: 0, errors: 0, skipped: 0 });
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetImporter, 300);
  };

  const AirportCell = ({ code, field, index }: { code: string; field: keyof ParsedBlock; index: number }) => {
    const info = getAirport(code);
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Input
            value={code}
            onChange={(e) => updateBlock(index, field, e.target.value.toUpperCase())}
            className="h-8 text-xs px-1 w-16 font-mono"
            maxLength={3}
          />
        </TooltipTrigger>
        {info && (
          <TooltipContent side="bottom">
            <p className="text-xs font-medium">{info.city}</p>
            <p className="text-xs text-muted-foreground">{info.name}</p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileUpload}
      />
      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Importar Excel
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Bloqueios Aéreos
            </DialogTitle>
            <DialogDescription>
              Revise os bloqueios detectados antes de importar.
            </DialogDescription>
          </DialogHeader>

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <Badge variant="secondary" className="mr-2">{parsedBlocks.length}</Badge>
                  bloqueio(s) detectado(s) — edite antes de salvar
                </p>
              </div>

              <TooltipProvider delayDuration={200}>
                <div className="max-h-[450px] overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Origem</TableHead>
                        <TableHead className="text-xs">Destino</TableHead>
                        <TableHead className="text-xs">Ida Saída</TableHead>
                        <TableHead className="text-xs">Ida Chegada</TableHead>
                        <TableHead className="text-xs">Volta Saída</TableHead>
                        <TableHead className="text-xs">Volta Chegada</TableHead>
                        <TableHead className="text-xs">Cia</TableHead>
                        <TableHead className="text-xs">Lug.</TableHead>
                        <TableHead className="w-[36px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedBlocks.map((block, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="p-1">
                            <AirportCell code={block.origin} field="origin" index={idx} />
                          </TableCell>
                          <TableCell className="p-1">
                            <AirportCell code={block.destination} field="destination" index={idx} />
                          </TableCell>
                          <TableCell className="p-1">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-muted-foreground">{formatDisplayDate(block.departure_date)}</span>
                              <Input value={block.departure_time} onChange={(e) => updateBlock(idx, "departure_time", e.target.value)} className="h-7 text-xs px-1 w-16" placeholder="hh:mm" />
                            </div>
                          </TableCell>
                          <TableCell className="p-1">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-muted-foreground">{formatDisplayDate(block.arrival_date)}</span>
                              <Input value={block.arrival_time} onChange={(e) => updateBlock(idx, "arrival_time", e.target.value)} className="h-7 text-xs px-1 w-16" placeholder="hh:mm" />
                            </div>
                          </TableCell>
                          <TableCell className="p-1">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-muted-foreground">{formatDisplayDate(block.return_departure_date)}</span>
                              <Input value={block.return_departure_time} onChange={(e) => updateBlock(idx, "return_departure_time", e.target.value)} className="h-7 text-xs px-1 w-16" placeholder="hh:mm" />
                            </div>
                          </TableCell>
                          <TableCell className="p-1">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-muted-foreground">{formatDisplayDate(block.return_arrival_date)}</span>
                              <Input value={block.return_arrival_time} onChange={(e) => updateBlock(idx, "return_arrival_time", e.target.value)} className="h-7 text-xs px-1 w-16" placeholder="hh:mm" />
                            </div>
                          </TableCell>
                          <TableCell className="p-1">
                            <Input value={block.airline} onChange={(e) => updateBlock(idx, "airline", e.target.value)} className="h-8 text-xs px-1 w-20" />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input value={block.seats_available} onChange={(e) => updateBlock(idx, "seats_available", e.target.value)} className="h-8 text-xs px-1 w-12 text-center" type="number" />
                          </TableCell>
                          <TableCell className="p-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeBlock(idx)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TooltipProvider>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button onClick={handleImport} disabled={importMutation.isPending}>
                  {importMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Importar {parsedBlocks.length} Bloqueio(s)
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center py-8">
              <div className="flex justify-center">
                {importResult.errors === 0 ? (
                  <Check className="h-16 w-16 text-primary" />
                ) : (
                  <AlertCircle className="h-16 w-16 text-destructive" />
                )}
              </div>
              <h3 className="text-xl font-semibold">Importação Concluída!</h3>
              <div className="flex justify-center gap-8">
                <div>
                  <p className="text-3xl font-bold text-primary">{importResult.success}</p>
                  <p className="text-sm text-muted-foreground">Importados</p>
                </div>
                {importResult.skipped > 0 && (
                  <div>
                    <p className="text-3xl font-bold text-warning">{importResult.skipped}</p>
                    <p className="text-sm text-muted-foreground">Duplicados</p>
                  </div>
                )}
                {importResult.errors > 0 && (
                  <div>
                    <p className="text-3xl font-bold text-destructive">{importResult.errors}</p>
                    <p className="text-sm text-muted-foreground">Erros</p>
                  </div>
                )}
              </div>
              <DialogFooter className="justify-center">
                <Button onClick={handleClose}>Fechar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
