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

function parseDate(raw: string): string {
  if (!raw) return "";
  const parts = raw.split("/");
  if (parts.length !== 3) return "";
  let [day, month, year] = parts;
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// ===== EXCEL FORMAT PARSER =====

export function FlightBlocksImporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"preview" | "done">("preview");
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
