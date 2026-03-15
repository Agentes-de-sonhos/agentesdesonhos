import { useState, useEffect } from "react";
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
import { ClipboardPaste, Loader2, Check, AlertCircle, Trash2 } from "lucide-react";
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
  return_date: string;
  return_time: string;
  airline: string;
  block_code: string;
  deadline: string;
  seats_available: string;
  operator: string;
  price_text: string;
}

const KNOWN_AIRLINES = ["LATAM", "AZUL", "GOL", "QATAR", "TAP", "IBERIA", "AMERICAN", "UNITED", "DELTA", "EMIRATES", "AIR FRANCE", "KLM", "LUFTHANSA", "BRITISH", "COPA", "AVIANCA"];

function parseRawText(text: string): ParsedBlock[] {
  const chunks = text.split(/bloqueio/i).filter((c) => c.trim().length > 10);
  const blocks: ParsedBlock[] = [];

  for (const chunk of chunks) {
    const block: ParsedBlock = {
      origin: "",
      destination: "",
      departure_date: "",
      departure_time: "",
      return_date: "",
      return_time: "",
      airline: "",
      block_code: "",
      deadline: "",
      seats_available: "",
      operator: "",
      price_text: "",
    };

    // Extract airport codes (3 uppercase letters)
    const airports = chunk.match(/\b[A-Z]{3}\b/g) || [];
    if (airports.length >= 2) {
      block.origin = airports[0];
      block.destination = airports[1];
    } else if (airports.length === 1) {
      block.destination = airports[0];
    }

    // Extract dates (dd/mm/yy or dd/mm/yyyy)
    const dates = chunk.match(/\b(\d{2}\/\d{2}\/\d{2,4})\b/g) || [];
    if (dates.length >= 1) block.departure_date = normalizeDate(dates[0]);
    if (dates.length >= 2) block.return_date = normalizeDate(dates[1]);
    // Third date could be deadline
    if (dates.length >= 3) block.deadline = normalizeDate(dates[2]);

    // Extract times (hh:mmh or hh:mm)
    const times = chunk.match(/\b(\d{1,2}:\d{2})h?\b/gi) || [];
    if (times.length >= 1) block.departure_time = times[0].replace(/h$/i, "");
    if (times.length >= 2) block.return_time = times[1].replace(/h$/i, "");

    // Extract airline
    for (const airline of KNOWN_AIRLINES) {
      if (chunk.toUpperCase().includes(airline)) {
        block.airline = airline;
        break;
      }
    }

    // Extract seats (look for patterns like "20 lugares", "15 assentos", or just numbers near seat keywords)
    const seatsMatch = chunk.match(/(\d+)\s*(?:lugar|assento|seat|pax|vaga)/i);
    if (seatsMatch) block.seats_available = seatsMatch[1];

    // Extract block code (alphanumeric patterns like BLK-123, AB1234)
    const codeMatch = chunk.match(/\b([A-Z]{2,4}[-\s]?\d{3,6})\b/);
    if (codeMatch) block.block_code = codeMatch[1];

    // Extract price text
    const priceMatch = chunk.match(/(?:R\$|USD|US\$|EUR)\s*[\d.,]+/i);
    if (priceMatch) block.price_text = priceMatch[0];

    // Only add if we have minimum useful data
    if (block.destination || block.airline || block.departure_date) {
      blocks.push(block);
    }
  }

  return blocks;
}

function normalizeDate(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  let [day, month, year] = parts;
  if (year.length === 2) {
    year = `20${year}`;
  }
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function FlightBlocksImporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"paste" | "preview" | "done">("paste");
  const [rawText, setRawText] = useState("");
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
  const [importResult, setImportResult] = useState({ success: 0, errors: 0 });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (rows: ParsedBlock[]) => {
      let success = 0;
      let errors = 0;

      for (const row of rows) {
        try {
          const { error } = await supabase.from("air_blocks" as any).insert({
            origin: row.origin,
            destination: row.destination,
            departure_date: row.departure_date || null,
            departure_time: row.departure_time || null,
            return_date: row.return_date || null,
            return_time: row.return_time || null,
            airline: row.airline,
            seats_available: row.seats_available ? parseInt(row.seats_available) : null,
            deadline: row.deadline || null,
            block_code: row.block_code || null,
            operator: row.operator || null,
            price_text: row.price_text || null,
          });

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
      return { success, errors };
    },
    onSuccess: (result) => {
      setImportResult(result);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["admin-flight-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["flight-blocks"] });
      toast({
        title: "Importação concluída!",
        description: `${result.success} bloqueios importados, ${result.errors} erros`,
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
      toast({ title: "Nenhum bloqueio detectado no texto", variant: "destructive" });
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
    const valid = parsedBlocks.filter((b) => b.destination && b.airline);
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
    setImportResult({ success: 0, errors: 0 });
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetImporter, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          <ClipboardPaste className="h-4 w-4 mr-2" />
          Importar Texto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Importar Bloqueios Aéreos (Texto)
          </DialogTitle>
          <DialogDescription>
            Cole o texto copiado do sistema de bloqueios. O sistema detectará automaticamente os dados.
          </DialogDescription>
        </DialogHeader>

        {step === "paste" && (
          <div className="space-y-4">
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"Cole aqui o texto com os bloqueios aéreos...\n\nO sistema detecta automaticamente:\n• Códigos de aeroporto (GRU, MIA, CDG...)\n• Datas (dd/mm/aa)\n• Horários (hh:mmh)\n• Companhias (LATAM, GOL, AZUL...)\n• Lugares disponíveis\n\nSepare os bloqueios pela palavra \"Bloqueio\""}
              className="min-h-[250px] font-mono text-sm"
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleParse} disabled={!rawText.trim()}>
                Analisar Texto
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {parsedBlocks.length} bloqueio(s) detectado(s). Edite os campos antes de salvar:
            </p>

            <div className="max-h-[400px] overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">Origem</TableHead>
                    <TableHead className="w-[70px]">Destino</TableHead>
                    <TableHead className="w-[100px]">Ida</TableHead>
                    <TableHead className="w-[60px]">Hora</TableHead>
                    <TableHead className="w-[100px]">Volta</TableHead>
                    <TableHead className="w-[60px]">Hora</TableHead>
                    <TableHead className="w-[80px]">Cia</TableHead>
                    <TableHead className="w-[55px]">Lug.</TableHead>
                    <TableHead className="w-[100px]">Deadline</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedBlocks.map((block, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={block.origin}
                          onChange={(e) => updateBlock(idx, "origin", e.target.value.toUpperCase())}
                          className="h-8 text-xs px-1"
                          maxLength={3}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={block.destination}
                          onChange={(e) => updateBlock(idx, "destination", e.target.value.toUpperCase())}
                          className="h-8 text-xs px-1"
                          maxLength={3}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formatDisplayDate(block.departure_date)}
                          onChange={(e) => updateBlock(idx, "departure_date", normalizeDate(e.target.value))}
                          className="h-8 text-xs px-1"
                          placeholder="dd/mm/aaaa"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={block.departure_time}
                          onChange={(e) => updateBlock(idx, "departure_time", e.target.value)}
                          className="h-8 text-xs px-1"
                          placeholder="hh:mm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formatDisplayDate(block.return_date)}
                          onChange={(e) => updateBlock(idx, "return_date", normalizeDate(e.target.value))}
                          className="h-8 text-xs px-1"
                          placeholder="dd/mm/aaaa"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={block.return_time}
                          onChange={(e) => updateBlock(idx, "return_time", e.target.value)}
                          className="h-8 text-xs px-1"
                          placeholder="hh:mm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={block.airline}
                          onChange={(e) => updateBlock(idx, "airline", e.target.value)}
                          className="h-8 text-xs px-1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={block.seats_available}
                          onChange={(e) => updateBlock(idx, "seats_available", e.target.value)}
                          className="h-8 text-xs px-1"
                          type="number"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formatDisplayDate(block.deadline)}
                          onChange={(e) => updateBlock(idx, "deadline", normalizeDate(e.target.value))}
                          className="h-8 text-xs px-1"
                          placeholder="dd/mm/aaaa"
                        />
                      </TableCell>
                      <TableCell>
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

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("paste")}>Voltar</Button>
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                {importMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar {parsedBlocks.length} bloqueio(s)
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center py-8">
            <div className="flex justify-center">
              {importResult.errors === 0 ? (
                <Check className="h-16 w-16 text-green-500" />
              ) : (
                <AlertCircle className="h-16 w-16 text-amber-500" />
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
                  <p className="text-3xl font-bold text-red-500">{importResult.errors}</p>
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
