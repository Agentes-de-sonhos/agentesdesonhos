import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ClipboardPaste, Loader2, Check, AlertCircle, Trash2, Search, FileSpreadsheet, Upload } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

function parseDate(raw: string): string {
  if (!raw) return "";
  const parts = raw.split("/");
  if (parts.length !== 3) return "";
  let [day, month, year] = parts;
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

/**
 * Parse a segment like "GRU 19/06/26 17:35h" or "GRU19/06/26 17:35h"
 */
function parseSegment(segment: string): { airport: string; date: string; time: string } {
  const trimmed = segment.trim();
  // Pattern: 3 letters + optional space + dd/mm/yy + space + hh:mmh
  const match = trimmed.match(/^([A-Z]{3})\s*(\d{2}\/\d{2}\/\d{2,4})\s+(\d{1,2}:\d{2})h?$/i);
  if (match) {
    return {
      airport: match[1].toUpperCase(),
      date: parseDate(match[2]),
      time: match[3],
    };
  }
  return { airport: "", date: "", time: "" };
}

// ===== TABLE FORMAT PARSER (Partida | Chegada | Cia Aérea | Disp) =====

function parseTableFormat(text: string): ParsedBlock[] {
  const allLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines = allLines.map(l => l.trim()).filter(l => l.length > 0);
  
  // Skip header if present
  let startIdx = 0;
  if (lines.length > 0 && /partida|chegada|cia|disp/i.test(lines[0])) {
    startIdx = 1;
  }

  const blocks: ParsedBlock[] = [];

  // Each block is 2 lines: line1 = ida, line2 = volta
  // Format per line: Partida<tab>Chegada<tab>Cia Aérea<tab>Disp
  // Line 1 (ida): has airline + disp values
  // Line 2 (volta): usually empty airline/disp cells
  for (let i = startIdx; i < lines.length; i += 2) {
    const line1 = lines[i];
    const line2 = i + 1 < lines.length ? lines[i + 1] : "";

    const cols1 = line1.split(/\t/);
    const cols2 = line2.split(/\t/);

    // Parse ida (outbound)
    const outDep = parseSegment(cols1[0] || "");
    const outArr = parseSegment(cols1[1] || "");
    const airline = (cols1[2] || "").trim();
    const seats = (cols1[3] || "").trim();

    // Parse volta (return)
    const retDep = parseSegment(cols2[0] || "");
    const retArr = parseSegment(cols2[1] || "");

    if (!outDep.airport && !outArr.airport) continue;

    const block: ParsedBlock = {
      origin: outDep.airport,
      destination: outArr.airport,
      departure_date: outDep.date,
      departure_time: outDep.time,
      arrival_date: outArr.date,
      arrival_time: outArr.time,
      return_departure_date: retDep.date,
      return_departure_time: retDep.time,
      return_arrival_date: retArr.date,
      return_arrival_time: retArr.time,
      airline,
      block_code: "",
      price: "",
      currency: "BRL",
      price_text: "",
      deadline: "",
      seats_available: seats.replace(/\D/g, "") || "0",
      operator: "",
    };

    if (parseInt(block.seats_available || "0") > 0) {
      blocks.push(block);
    }
  }

  return blocks;
}

// ===== LEGACY 5-LINE FORMAT PARSER =====

function parseFiveLines(
  line1: string, line2: string, line3: string, line4: string, line5: string
): ParsedBlock | null {
  const outDep = parseSegment(line1);
  const parts2 = line2.split(/\t+/);
  const returnDep = parseSegment(parts2[0] || "");
  const outArr = parseSegment(parts2[1] || parts2[0] || "");
  const parts3 = line3.split(/\t+/);
  const returnArr = parseSegment(parts3[0] || "");
  const airline = (parts3[1] || "").trim();
  const parts4 = line4.split(/\t+/);
  const blockCode = (parts4[0] || "").trim();
  const priceRaw = (parts4.slice(1).join(" ") || "").trim();
  let price = "";
  let currency = "BRL";
  let priceText = priceRaw;
  const priceMatch = priceRaw.match(/(BRL|USD|EUR|R\$|US\$)\s*([\d.,]+)/i);
  if (priceMatch) {
    const curr = priceMatch[1].toUpperCase();
    currency = curr === "R$" ? "BRL" : curr === "US$" ? "USD" : curr;
    price = priceMatch[2].replace(/\./g, "").replace(",", ".");
  }
  const parts5 = line5.split(/\t+/);
  let deadline = "";
  let seatsAvailable = "0";
  for (const part of parts5) {
    const deadlineMatch = part.trim().match(/^(\d{2}\/\d{2}\/\d{2,4})\s+(\d{1,2}:\d{2})h?$/i);
    if (deadlineMatch) deadline = parseDate(deadlineMatch[1]) + " " + deadlineMatch[2];
    if (/^\d+$/.test(part.trim())) seatsAvailable = part.trim();
  }
  const origin = outDep.airport;
  const destination = outArr.airport || returnDep.airport;
  if (!origin && !destination && !airline) return null;
  return {
    origin, destination,
    departure_date: outDep.date, departure_time: outDep.time,
    arrival_date: outArr.date, arrival_time: outArr.time,
    return_departure_date: returnDep.date, return_departure_time: returnDep.time,
    return_arrival_date: returnArr.date, return_arrival_time: returnArr.time,
    airline, block_code: blockCode, price, currency, price_text: priceText,
    deadline, seats_available: seatsAvailable, operator: "",
  };
}

function parseLegacyFormat(text: string): ParsedBlock[] {
  const allLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines = allLines.map(l => l.trim()).filter(l => l.length > 0);
  const blocks: ParsedBlock[] = [];
  for (let i = 0; i + 4 < lines.length; i += 5) {
    try {
      const block = parseFiveLines(lines[i], lines[i+1], lines[i+2], lines[i+3], lines[i+4]);
      if (block && parseInt(block.seats_available || "0") > 0) blocks.push(block);
    } catch (err) {
      console.warn("Failed to parse block at line", i, err);
    }
  }
  return blocks;
}

// ===== EXCEL FORMAT PARSER (13 or 14 columns) =====

function parseExcelRows(rows: any[][]): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let startIdx = 0;
  if (rows.length > 0) {
    const firstCell = String(rows[0][0] || "").toLowerCase();
    if (firstCell.includes("origem") || firstCell.includes("partida")) startIdx = 1;
  }

  // Detect if header has "Cia Aérea" column (14-col format)
  const header = rows[0] || [];
  const hasAirlineCol = header.length >= 14 && 
    String(header[12] || "").toLowerCase().includes("cia");

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 4) continue;

    const origin = String(r[0] || "").trim().toUpperCase();
    const dataIda = String(r[1] || "").trim();
    const horaSaida = String(r[2] || "").trim().replace(/h$/i, "");
    const destination = String(r[3] || "").trim().toUpperCase();
    const dataChegada = String(r[4] || "").trim();
    const horaChegada = String(r[5] || "").trim().replace(/h$/i, "");
    const dataVolta = String(r[7] || "").trim();
    const horaSaidaVolta = String(r[8] || "").trim().replace(/h$/i, "");
    const dataChegadaVolta = String(r[10] || "").trim();
    const horaChegadaVolta = String(r[11] || "").trim().replace(/h$/i, "");

    let airline = "";
    let operadora = "";

    if (hasAirlineCol) {
      // 14 columns: col 12 = Cia Aérea, col 13 = Operadora
      airline = String(r[12] || "").trim().toUpperCase();
      operadora = String(r[13] || "").trim().toUpperCase();
    } else {
      // 13 columns: col 12 = Operadora (airline unknown)
      operadora = String(r[12] || "").trim().toUpperCase();
      airline = "";
    }

    if (!airline) airline = "NÃO INFORMADO";
    if (!origin || !destination) continue;

    blocks.push({
      origin,
      destination,
      departure_date: parseDate(dataIda),
      departure_time: horaSaida,
      arrival_date: parseDate(dataChegada),
      arrival_time: horaChegada,
      return_departure_date: parseDate(dataVolta),
      return_departure_time: horaSaidaVolta,
      return_arrival_date: parseDate(dataChegadaVolta),
      return_arrival_time: horaChegadaVolta,
      airline,
      block_code: "",
      price: "",
      currency: "BRL",
      price_text: "",
      deadline: "",
      seats_available: "0",
      operator: operadora,
    });
  }
  return blocks;
}

// ===== AUTO-DETECT FORMAT =====

function parseRawText(text: string, format: "auto" | "table" | "legacy"): ParsedBlock[] {
  if (format === "table") return parseTableFormat(text);
  if (format === "legacy") return parseLegacyFormat(text);

  // Auto-detect: if first non-header line has exactly 4 tab-separated columns, it's table format
  const lines = text.replace(/\r\n/g, "\n").split("\n").map(l => l.trim()).filter(l => l.length > 0);
  let firstDataLine = lines[0] || "";
  if (/partida|chegada|cia|disp/i.test(firstDataLine) && lines.length > 1) {
    firstDataLine = lines[1];
  }
  const tabCount = (firstDataLine.match(/\t/g) || []).length;
  
  if (tabCount >= 2 && tabCount <= 4) {
    const tableResult = parseTableFormat(text);
    if (tableResult.length > 0) return tableResult;
  }
  
  return parseLegacyFormat(text);
}

export function FlightBlocksImporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"paste" | "preview" | "done">("paste");
  const [rawText, setRawText] = useState("");
  const [importFormat, setImportFormat] = useState<"auto" | "table" | "legacy">("auto");
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
  const [importResult, setImportResult] = useState({ success: 0, errors: 0, skipped: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatAirportLabel, getAirport } = useAirports();

  const importMutation = useMutation({
    mutationFn: async (rows: ParsedBlock[]) => {
      let success = 0;
      let errors = 0;
      const existingKeys = new Set<string>();

      // Fetch existing blocks to avoid duplicates
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

  const handleParse = () => {
    if (!rawText.trim()) {
      toast({ title: "Cole o texto dos bloqueios aéreos", variant: "destructive" });
      return;
    }
    const blocks = parseRawText(rawText, importFormat);
    if (blocks.length === 0) {
      toast({ title: "Nenhum bloqueio válido detectado", description: "Verifique o formato ou tente selecionar o tipo manualmente.", variant: "destructive" });
      return;
    }
    setParsedBlocks(blocks);
    setStep("preview");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const blocks = parseExcelRows(rows);
        if (blocks.length === 0) {
          toast({ title: "Nenhum bloqueio encontrado no arquivo", variant: "destructive" });
          return;
        }
        setParsedBlocks(blocks);
        setStep("preview");
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
    setStep("paste");
    setRawText("");
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
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Importar Excel
        </Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => setIsOpen(true)}>
              <ClipboardPaste className="h-4 w-4 mr-2" />
              Importar Texto
            </Button>
          </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Importar Bloqueios Aéreos
          </DialogTitle>
          <DialogDescription>
            Cole o texto copiado da tabela de bloqueios. O sistema detecta automaticamente o formato.
          </DialogDescription>
        </DialogHeader>

        {step === "paste" && (
          <div className="space-y-4">
            <Tabs value={importFormat} onValueChange={(v) => setImportFormat(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="auto">Auto-detectar</TabsTrigger>
                <TabsTrigger value="table">Tabela (4 colunas)</TabsTrigger>
                <TabsTrigger value="legacy">Legado (5 linhas)</TabsTrigger>
              </TabsList>
              <TabsContent value="auto" className="mt-2">
                <p className="text-xs text-muted-foreground">O sistema detecta automaticamente se o texto é uma tabela com colunas (Partida | Chegada | Cia Aérea | Disp) ou o formato legado de 5 linhas.</p>
              </TabsContent>
              <TabsContent value="table" className="mt-2">
                <p className="text-xs text-muted-foreground">
                  Formato tabela: cada bloqueio ocupa 2 linhas. A 1ª linha tem ida + cia aérea + disponibilidade, a 2ª linha tem volta.
                  <br />Exemplo: <code className="bg-muted px-1 rounded">GRU 19/06/26 17:35h → POA 19/06/26 19:20h → LATAM → 10</code>
                </p>
              </TabsContent>
              <TabsContent value="legacy" className="mt-2">
                <p className="text-xs text-muted-foreground">Formato legado de 5 linhas por bloco com código, preço e deadline.</p>
              </TabsContent>
            </Tabs>

            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={importFormat === "table"
                ? `Cole aqui a tabela de bloqueios...\n\nFormato esperado (2 linhas por bloco):\n\nGRU 19/06/26 17:35h\tPOA 19/06/26 19:20h\tLATAM\t10\nPOA 24/06/26 21:55h\tGRU 24/06/26 23:40h`
                : `Cole aqui o texto com os bloqueios aéreos...\n\nFormato esperado (5 linhas por bloco):\n\nGIG16/03/26 04:50h\nBPS21/03/26 18:00h\tBPS16/03/26 09:00h\nGIG21/03/26 21:45h\tLATAM\n33394716\tDIVPIX A PARTIR DE BRL 505,35 + TAXAS\nBloqueio\t15/03/26 18:00h\tAtivo\t9`
              }
              className="min-h-[280px] font-mono text-sm leading-relaxed"
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleParse} disabled={!rawText.trim()}>
                <Search className="h-4 w-4 mr-2" />
                Analisar Bloqueios
              </Button>
            </DialogFooter>
          </div>
        )}

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
              <Button variant="outline" onClick={() => setStep("paste")}>Voltar</Button>
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
                  <p className="text-3xl font-bold text-amber-500">{importResult.skipped}</p>
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
      </div>
    </>
  );
}
