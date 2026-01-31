import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, Loader2, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ColumnMapping {
  operator: string;
  airline: string;
  destination: string;
  start_date: string;
  end_date: string;
  notes: string;
}

interface ParsedRow {
  [key: string]: string;
}

export function FlightBlocksImporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    operator: "",
    airline: "",
    destination: "",
    start_date: "",
    end_date: "",
    notes: "",
  });
  const [importResult, setImportResult] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      let success = 0;
      let errors = 0;

      for (const row of rows) {
        try {
          const { error } = await supabase.from("flight_blocks").insert({
            operator: row.operator,
            airline: row.airline,
            destination: row.destination,
            start_date: row.start_date,
            end_date: row.end_date,
            notes: row.notes || null,
            is_active: true,
          });

          if (error) {
            errors++;
            console.error("Error importing row:", error);
          } else {
            success++;
          }
        } catch (err) {
          errors++;
          console.error("Error importing row:", err);
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
        description: `${result.success} registros importados, ${result.errors} erros`,
      });
    },
    onError: () => {
      toast({ title: "Erro na importação", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      toast({ title: "Arquivo vazio ou inválido", variant: "destructive" });
      return;
    }

    // Detect separator (comma or semicolon)
    const separator = lines[0].includes(";") ? ";" : ",";

    const headerLine = lines[0].split(separator).map((h) => h.trim().replace(/"/g, ""));
    setHeaders(headerLine);

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map((v) => v.trim().replace(/"/g, ""));
      const row: ParsedRow = {};
      headerLine.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      rows.push(row);
    }

    setCsvData(rows);
    setStep("map");
  };

  const handleMapping = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const canProceedToPreview = () => {
    return mapping.operator && mapping.airline && mapping.destination && mapping.start_date && mapping.end_date;
  };

  const getMappedData = () => {
    return csvData.map((row) => ({
      operator: row[mapping.operator] || "",
      airline: row[mapping.airline] || "",
      destination: row[mapping.destination] || "",
      start_date: formatDate(row[mapping.start_date]) || "",
      end_date: formatDate(row[mapping.end_date]) || "",
      notes: mapping.notes ? row[mapping.notes] : "",
    }));
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    
    // Try to parse common date formats
    // DD/MM/YYYY or DD-MM-YYYY
    const brMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (brMatch) {
      const [, day, month, year] = brMatch;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // YYYY-MM-DD (already in correct format)
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return dateStr;
    }

    // MM/DD/YYYY
    const usMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    return dateStr;
  };

  const handleImport = () => {
    const mappedData = getMappedData();
    const validRows = mappedData.filter(
      (row) => row.operator && row.airline && row.destination && row.start_date && row.end_date
    );

    if (validRows.length === 0) {
      toast({ title: "Nenhum registro válido para importar", variant: "destructive" });
      return;
    }

    importMutation.mutate(validRows);
  };

  const resetImporter = () => {
    setStep("upload");
    setCsvData([]);
    setHeaders([]);
    setMapping({
      operator: "",
      airline: "",
      destination: "",
      start_date: "",
      end_date: "",
      notes: "",
    });
    setImportResult({ success: 0, errors: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetImporter, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Bloqueios Aéreos
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV ou Excel para importar múltiplos bloqueios
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Arraste um arquivo CSV aqui ou clique para selecionar
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="max-w-xs mx-auto"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Formato esperado:</p>
              <p>O arquivo deve conter colunas para: Operadora, Companhia Aérea, Destino, Data Início, Data Fim</p>
              <p>Datas podem estar nos formatos: DD/MM/YYYY, YYYY-MM-DD ou DD-MM-YYYY</p>
            </div>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mapeie as colunas do seu arquivo para os campos do sistema:
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Operadora *</Label>
                <Select value={mapping.operator} onValueChange={(v) => handleMapping("operator", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Companhia Aérea *</Label>
                <Select value={mapping.airline} onValueChange={(v) => handleMapping("airline", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Destino *</Label>
                <Select value={mapping.destination} onValueChange={(v) => handleMapping("destination", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Início *</Label>
                <Select value={mapping.start_date} onValueChange={(v) => handleMapping("start_date", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Fim *</Label>
                <Select value={mapping.end_date} onValueChange={(v) => handleMapping("end_date", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações (opcional)</Label>
                <Select value={mapping.notes} onValueChange={(v) => handleMapping("notes", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetImporter}>Voltar</Button>
              <Button onClick={() => setStep("preview")} disabled={!canProceedToPreview()}>
                Prévia
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Prévia dos dados a serem importados ({csvData.length} registros):
            </p>

            <div className="max-h-[300px] overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operadora</TableHead>
                    <TableHead>Cia. Aérea</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getMappedData().slice(0, 10).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.operator}</TableCell>
                      <TableCell>{row.airline}</TableCell>
                      <TableCell>{row.destination}</TableCell>
                      <TableCell>{row.start_date}</TableCell>
                      <TableCell>{row.end_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {csvData.length > 10 && (
              <p className="text-sm text-muted-foreground text-center">
                ...e mais {csvData.length - 10} registros
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("map")}>Voltar</Button>
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                {importMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Importar {csvData.length} registros
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
