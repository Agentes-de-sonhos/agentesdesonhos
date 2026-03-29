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

function toIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDate(raw: any): string {
  if (raw == null || raw === "") return "";

  if (raw instanceof Date || (typeof raw === "object" && typeof raw.getFullYear === "function")) {
    return toIsoDate(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
  }

  if (typeof raw === "number") {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) {
      return toIsoDate(parsed.y, parsed.m, parsed.d);
    }
  }

  const str = String(raw).trim();
  if (!str) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);

  const normalized = str.split(/[ T]/)[0];
  const parts = normalized.split("/");
  if (parts.length === 3) {
    let [day, month, year] = parts;
    if (year.length === 2) year = `20${year}`;
    return toIsoDate(Number(year), Number(month), Number(day));
  }

  return "";
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

function extractAirportCode(raw: string): string {
  if (!raw) return "";
  const str = raw.trim().toUpperCase();
  const match = str.match(/^([A-Z]{3})\b/);
  if (match) return match[1];
  return str.split(/[\s(]/)[0] || str;
}

function detectFormat(header: any[]): "13" | "14" | "15" {
  const colCount = header.filter((c) => c != null && String(c).trim() !== "").length;
  // Check if any header contains "cia"
  const hasCia = header.some((c) => String(c || "").toLowerCase().includes("cia"));
  // Check if any header contains "disp"
  const hasDisp = header.some((c) => String(c || "").toLowerCase().includes("disp"));
  if (hasCia && hasDisp) return "15";
  if (hasCia) return "14";
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

    if (fmt === "15") {
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
      price_text: "",
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
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
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
