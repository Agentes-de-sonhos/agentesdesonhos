import { useState } from "react";
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
import { ClipboardPaste, Loader2, Check, AlertCircle, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAirports } from "@/hooks/useAirports";
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

/**
 * Parse date from format "dd/mm/yy" to "yyyy-mm-dd"
 */
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
 * Extract airport code + date + time from a segment like "GIG16/03/26 04:50h"
 */
function parseSegment(segment: string): { airport: string; date: string; time: string } {
  const trimmed = segment.trim();
  // Pattern: 3 uppercase letters + dd/mm/yy + space + hh:mmh
  const match = trimmed.match(/^([A-Z]{3})(\d{2}\/\d{2}\/\d{2,4})\s+(\d{1,2}:\d{2})h?$/i);
  if (match) {
    return {
      airport: match[1].toUpperCase(),
      date: parseDate(match[2]),
      time: match[3],
    };
  }
  return { airport: "", date: "", time: "" };
}

/**
 * Parse raw pasted text into blocks using fixed 5-line structure.
 * Blocks with 0 seats are excluded.
 */
function parseRawText(text: string): ParsedBlock[] {
  // Normalize line endings and split
  const allLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  
  // Filter out completely empty lines but preserve structure
  // We need to group into blocks of 5 non-empty lines
  const lines = allLines.map(l => l.trim()).filter(l => l.length > 0);
  
  const blocks: ParsedBlock[] = [];
  
  for (let i = 0; i + 4 < lines.length; i += 5) {
    const line1 = lines[i];
    const line2 = lines[i + 1];
    const line3 = lines[i + 2];
    const line4 = lines[i + 3];
    const line5 = lines[i + 4];

    try {
      const block = parseFiveLines(line1, line2, line3, line4, line5);
      if (block && parseInt(block.seats_available || "0") > 0) {
        blocks.push(block);
      }
    } catch (err) {
      console.warn("Failed to parse block at line", i, err);
    }
  }

  return blocks;
}

function parseFiveLines(
  line1: string,
  line2: string,
  line3: string,
  line4: string,
  line5: string
): ParsedBlock | null {
  // LINE 1: Outbound departure - e.g. "GIG16/03/26 04:50h"
  const outDep = parseSegment(line1);
  
  // LINE 2: Two tab-separated values
  // First: return departure, Second: outbound arrival
  const parts2 = line2.split(/\t+/);
  const returnDep = parseSegment(parts2[0] || "");
  const outArr = parseSegment(parts2[1] || parts2[0] || "");
  
  // LINE 3: Two tab-separated values
  // First: return arrival, Second: airline
  const parts3 = line3.split(/\t+/);
  const returnArr = parseSegment(parts3[0] || "");
  const airline = (parts3[1] || "").trim();
  
  // LINE 4: block_code + price info
  // e.g. "33394716\tDIVPIX A PARTIR DE BRL 505,35 + TAXAS"
  const parts4 = line4.split(/\t+/);
  const blockCode = (parts4[0] || "").trim();
  const priceRaw = (parts4.slice(1).join(" ") || "").trim();
  
  // Extract price and currency
  let price = "";
  let currency = "BRL";
  let priceText = priceRaw;
  const priceMatch = priceRaw.match(/(BRL|USD|EUR|R\$|US\$)\s*([\d.,]+)/i);
  if (priceMatch) {
    const curr = priceMatch[1].toUpperCase();
    currency = curr === "R$" ? "BRL" : curr === "US$" ? "USD" : curr;
    price = priceMatch[2].replace(/\./g, "").replace(",", ".");
  }
  
  // LINE 5: "Bloqueio\t15/03/26 18:00h\tAtivo\t0"
  const parts5 = line5.split(/\t+/);
  // Find deadline (date + time pattern)
  let deadline = "";
  let seatsAvailable = "0";
  
  for (const part of parts5) {
    const deadlineMatch = part.trim().match(/^(\d{2}\/\d{2}\/\d{2,4})\s+(\d{1,2}:\d{2})h?$/i);
    if (deadlineMatch) {
      deadline = parseDate(deadlineMatch[1]) + " " + deadlineMatch[2];
    }
    // Last numeric value is seats
    if (/^\d+$/.test(part.trim())) {
      seatsAvailable = part.trim();
    }
  }

  const origin = outDep.airport;
  const destination = outArr.airport || returnDep.airport;

  if (!origin && !destination && !airline) return null;

  return {
    origin,
    destination,
    departure_date: outDep.date,
    departure_time: outDep.time,
    arrival_date: outArr.date,
    arrival_time: outArr.time,
    return_departure_date: returnDep.date,
    return_departure_time: returnDep.time,
    return_arrival_date: returnArr.date,
    return_arrival_time: returnArr.time,
    airline,
    block_code: blockCode,
    price,
    currency,
    price_text: priceText,
    deadline,
    seats_available: seatsAvailable,
    operator: "",
  };
}

export function FlightBlocksImporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"paste" | "preview" | "done">("paste");
  const [rawText, setRawText] = useState("");
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
  const [importResult, setImportResult] = useState({ success: 0, errors: 0, skipped: 0 });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatAirportLabel, getAirport } = useAirports();

  const importMutation = useMutation({
    mutationFn: async (rows: ParsedBlock[]) => {
      let success = 0;
      let errors = 0;

      for (const row of rows) {
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

          if (error) {
            errors++;
            console.error("Error importing block:", error);
          } else {
            success++;
          }
        } catch (err) {
          errors++;
        }
      }
      return { success, errors, skipped: 0 };
    },
    onSuccess: (result) => {
      setImportResult(result);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["admin-flight-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["flight-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["air-blocks"] });
      toast({
        title: "Importação concluída!",
        description: `${result.success} bloqueio(s) importado(s)${result.errors > 0 ? `, ${result.errors} erro(s)` : ""}`,
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
    const blocks = parseRawText(rawText);
    if (blocks.length === 0) {
      toast({
        title: "Nenhum bloqueio válido detectado",
        description: "Bloqueios com 0 assentos são ignorados automaticamente.",
        variant: "destructive",
      });
      return;
    }
    setParsedBlocks(blocks);
    setStep("preview");
  };

  const updateBlock = (index: number, field: keyof ParsedBlock, value: string) => {
    setParsedBlocks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
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
            Cole o texto copiado do sistema de bloqueios. Cada bloco deve ter 5 linhas. Bloqueios com 0 assentos são ignorados.
          </DialogDescription>
        </DialogHeader>

        {step === "paste" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Colar bloqueios aéreos</p>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Cole aqui o texto com os bloqueios aéreos...\n\nFormato esperado (5 linhas por bloco):\n\nGIG16/03/26 04:50h\nBPS21/03/26 18:00h\tBPS16/03/26 09:00h\nGIG21/03/26 21:45h\tLATAM\n33394716\tDIVPIX A PARTIR DE BRL 505,35 + TAXAS\nBloqueio\t15/03/26 18:00h\tAtivo\t9`}
                className="min-h-[280px] font-mono text-sm leading-relaxed"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
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
                      <TableHead className="text-xs">Preço</TableHead>
                      <TableHead className="text-xs">Lug.</TableHead>
                      <TableHead className="text-xs">Deadline</TableHead>
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
                            <Input
                              value={block.departure_time}
                              onChange={(e) => updateBlock(idx, "departure_time", e.target.value)}
                              className="h-7 text-xs px-1 w-16"
                              placeholder="hh:mm"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground">{formatDisplayDate(block.arrival_date)}</span>
                            <Input
                              value={block.arrival_time}
                              onChange={(e) => updateBlock(idx, "arrival_time", e.target.value)}
                              className="h-7 text-xs px-1 w-16"
                              placeholder="hh:mm"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground">{formatDisplayDate(block.return_departure_date)}</span>
                            <Input
                              value={block.return_departure_time}
                              onChange={(e) => updateBlock(idx, "return_departure_time", e.target.value)}
                              className="h-7 text-xs px-1 w-16"
                              placeholder="hh:mm"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground">{formatDisplayDate(block.return_arrival_date)}</span>
                            <Input
                              value={block.return_arrival_time}
                              onChange={(e) => updateBlock(idx, "return_arrival_time", e.target.value)}
                              className="h-7 text-xs px-1 w-16"
                              placeholder="hh:mm"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            value={block.airline}
                            onChange={(e) => updateBlock(idx, "airline", e.target.value)}
                            className="h-8 text-xs px-1 w-20"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground">{block.currency}</span>
                            <Input
                              value={block.price}
                              onChange={(e) => updateBlock(idx, "price", e.target.value)}
                              className="h-7 text-xs px-1 w-20"
                              placeholder="0.00"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            value={block.seats_available}
                            onChange={(e) => updateBlock(idx, "seats_available", e.target.value)}
                            className="h-8 text-xs px-1 w-12 text-center"
                            type="number"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {block.deadline}
                          </span>
                        </TableCell>
                        <TableCell className="p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeBlock(idx)}
                          >
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
              <Button variant="outline" onClick={() => setStep("paste")}>
                Voltar
              </Button>
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
                <p className="text-3xl font-bold text-green-500">{importResult.success}</p>
                <p className="text-sm text-muted-foreground">Importados</p>
              </div>
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
  );
}
