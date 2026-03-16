import { useState, useCallback } from "react";
import { Upload, ClipboardPaste, Download, AlertTriangle, CheckCircle2, Users, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ClientStatus } from "@/types/crm";
import { CLIENT_STATUS_LABELS } from "@/types/crm";
import { cn } from "@/lib/utils";

interface ImportContact {
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: ClientStatus;
  birthday_day: number | null;
  birthday_month: number | null;
  birthday_year: number | null;
  travel_preferences: string | null;
  notes: string | null;
  internal_notes: string | null;
  warnings: string[];
  duplicate?: "none" | "phone";
  duplicateAction?: "skip" | "update" | "create";
  existingId?: string;
}

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPhones: Map<string, string>; // normalizedPhone -> clientId
  onImportComplete: () => void;
}

function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")) {
    digits = "55" + digits;
  }
  return digits;
}

function parseStatus(raw: string | null | undefined): ClientStatus {
  if (!raw) return "lead";
  const lower = raw.toString().trim().toLowerCase();
  const map: Record<string, ClientStatus> = {
    lead: "lead",
    "em negociação": "em_negociacao",
    "em negociacao": "em_negociacao",
    em_negociacao: "em_negociacao",
    "cliente ativo": "cliente_ativo",
    cliente_ativo: "cliente_ativo",
    fidelizado: "fidelizado",
  };
  return map[lower] || "lead";
}

const COLUMN_MAP: Record<string, keyof ImportContact> = {
  "nome completo": "name",
  nome: "name",
  name: "name",
  email: "email",
  "e-mail": "email",
  telefone: "phone",
  phone: "phone",
  whatsapp: "phone",
  "telefone/whatsapp": "phone",
  cidade: "city",
  city: "city",
  status: "status",
  "dia aniversário": "birthday_day",
  "dia aniversario": "birthday_day",
  "dia anniversário": "birthday_day",
  dia: "birthday_day",
  "mês aniversário": "birthday_month",
  "mes aniversario": "birthday_month",
  mês: "birthday_month",
  mes: "birthday_month",
  "ano aniversário": "birthday_year",
  "ano aniversario": "birthday_year",
  ano: "birthday_year",
  "preferências de viagem": "travel_preferences",
  "preferencias de viagem": "travel_preferences",
  preferências: "travel_preferences",
  "observações gerais": "notes",
  "observacoes gerais": "notes",
  observações: "notes",
  observacoes: "notes",
  "observações internas": "internal_notes",
  "observacoes internas": "internal_notes",
};

function mapColumns(headers: string[]): Record<number, keyof ImportContact> {
  const result: Record<number, keyof ImportContact> = {};
  headers.forEach((h, i) => {
    const key = h.trim().toLowerCase();
    if (COLUMN_MAP[key]) result[i] = COLUMN_MAP[key];
  });
  return result;
}

function rowToContact(row: any[], colMap: Record<number, keyof ImportContact>): ImportContact | null {
  const contact: any = {
    name: "",
    email: null,
    phone: null,
    city: null,
    status: "lead" as ClientStatus,
    birthday_day: null,
    birthday_month: null,
    birthday_year: null,
    travel_preferences: null,
    notes: null,
    internal_notes: null,
    warnings: [],
    duplicate: "none",
    duplicateAction: "create",
  };

  for (const [idx, field] of Object.entries(colMap)) {
    const val = row[Number(idx)];
    if (val === undefined || val === null || String(val).trim() === "") continue;
    const strVal = String(val).trim();

    switch (field) {
      case "name":
        contact.name = strVal;
        break;
      case "email":
        contact.email = strVal;
        break;
      case "phone":
        contact.phone = strVal;
        break;
      case "city":
        contact.city = strVal;
        break;
      case "status":
        contact.status = parseStatus(strVal);
        break;
      case "birthday_day": {
        const d = parseInt(strVal);
        if (!isNaN(d) && d >= 1 && d <= 31) contact.birthday_day = d;
        break;
      }
      case "birthday_month": {
        const m = parseInt(strVal);
        if (!isNaN(m) && m >= 1 && m <= 12) contact.birthday_month = m;
        break;
      }
      case "birthday_year": {
        const y = parseInt(strVal);
        if (!isNaN(y) && y >= 1920 && y <= new Date().getFullYear()) contact.birthday_year = y;
        break;
      }
      case "travel_preferences":
        contact.travel_preferences = strVal;
        break;
      case "notes":
        contact.notes = strVal;
        break;
      case "internal_notes":
        contact.internal_notes = strVal;
        break;
    }
  }

  if (!contact.name) return null;

  // Normalize phone
  if (contact.phone) {
    const normalized = normalizePhone(contact.phone);
    if (normalized) {
      contact.phone = normalized;
    } else {
      contact.warnings.push("Telefone inválido");
    }
  }

  // Validate email
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    contact.warnings.push("Email com formato inválido");
  }

  return contact as ImportContact;
}

function parsePastedText(text: string): ImportContact[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const contacts: ImportContact[] = [];

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length === 0 || !parts[0]) continue;

    const contact: ImportContact = {
      name: "",
      email: null,
      phone: null,
      city: null,
      status: "lead",
      birthday_day: null,
      birthday_month: null,
      birthday_year: null,
      travel_preferences: null,
      notes: null,
      internal_notes: null,
      warnings: [],
      duplicate: "none",
      duplicateAction: "create",
    };

    for (const part of parts) {
      if (!part) continue;
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) {
        contact.email = part;
      } else if (/^[\d\s\(\)\+\-]{8,}$/.test(part)) {
        const normalized = normalizePhone(part);
        if (normalized) contact.phone = normalized;
      } else if (!contact.name) {
        contact.name = part;
      } else if (!contact.city) {
        contact.city = part;
      }
    }

    if (contact.name) contacts.push(contact);
  }
  return contacts;
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = [
    "Nome Completo",
    "Email",
    "Telefone",
    "Cidade",
    "Status",
    "Dia Aniversário",
    "Mês Aniversário",
    "Ano Aniversário",
    "Preferências de Viagem",
    "Observações Gerais",
    "Observações Internas",
  ];
  const exampleRow = [
    "Maria Silva",
    "maria@email.com",
    "(11) 99888-7766",
    "São Paulo",
    "Lead",
    "15",
    "3",
    "1990",
    "Praias, família",
    "Cliente indicada",
    "",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, "Contatos");
  XLSX.writeFile(wb, "modelo-importacao-contatos.xlsx");
}

export function ImportContactsDialog({
  open,
  onOpenChange,
  existingPhones,
  onImportComplete,
}: ImportContactsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"choose" | "preview" | "result">("choose");
  const [contacts, setContacts] = useState<ImportContact[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState({ imported: 0, updated: 0, skipped: 0 });

  const reset = () => {
    setStep("choose");
    setContacts([]);
    setPasteText("");
    setImporting(false);
    setImportResult({ imported: 0, updated: 0, skipped: 0 });
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const checkDuplicates = useCallback(
    (contacts: ImportContact[]) => {
      return contacts.map((c) => {
        if (c.phone) {
          const normalized = normalizePhone(c.phone);
          if (normalized && existingPhones.has(normalized)) {
            return {
              ...c,
              duplicate: "phone" as const,
              duplicateAction: "skip" as const,
              existingId: existingPhones.get(normalized),
            };
          }
        }
        return c;
      });
    },
    [existingPhones]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "csv") {
      toast({ title: "Formato não suportado", description: "Use arquivos .xlsx ou .csv", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) {
          toast({ title: "Planilha vazia", description: "A planilha precisa ter pelo menos um cabeçalho e uma linha de dados.", variant: "destructive" });
          return;
        }

        const headers = rows[0].map((h: any) => String(h || ""));
        const colMap = mapColumns(headers);

        if (!Object.values(colMap).includes("name")) {
          toast({ title: "Coluna obrigatória não encontrada", description: "A planilha precisa ter uma coluna 'Nome Completo' ou 'Nome'.", variant: "destructive" });
          return;
        }

        const parsed = rows
          .slice(1)
          .map((row) => rowToContact(row, colMap))
          .filter(Boolean) as ImportContact[];

        if (parsed.length === 0) {
          toast({ title: "Nenhum contato encontrado", description: "Verifique se a planilha possui dados válidos.", variant: "destructive" });
          return;
        }

        setContacts(checkDuplicates(parsed));
        setStep("preview");
      } catch {
        toast({ title: "Erro ao ler planilha", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handlePaste = () => {
    if (!pasteText.trim()) {
      toast({ title: "Cole a lista de contatos", variant: "destructive" });
      return;
    }
    const parsed = parsePastedText(pasteText);
    if (parsed.length === 0) {
      toast({ title: "Nenhum contato detectado", description: "Verifique o formato da lista.", variant: "destructive" });
      return;
    }
    setContacts(checkDuplicates(parsed));
    setStep("preview");
  };

  const handleDuplicateAction = (index: number, action: "skip" | "update" | "create") => {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, duplicateAction: action } : c)));
  };

  const handleImport = async () => {
    if (!user) return;
    setImporting(true);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    try {
      for (const contact of contacts) {
        if (contact.duplicate === "phone" && contact.duplicateAction === "skip") {
          skipped++;
          continue;
        }

        const payload = {
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          city: contact.city,
          status: contact.status,
          birthday_day: contact.birthday_day,
          birthday_month: contact.birthday_month,
          birthday_year: contact.birthday_year,
          travel_preferences: contact.travel_preferences,
          notes: contact.notes,
          internal_notes: contact.internal_notes,
        };

        if (contact.duplicate === "phone" && contact.duplicateAction === "update" && contact.existingId) {
          const { error } = await supabase.from("clients").update(payload).eq("id", contact.existingId);
          if (!error) updated++;
          else skipped++;
        } else {
          const { error } = await supabase.from("clients").insert({ ...payload, user_id: user.id });
          if (!error) imported++;
          else skipped++;
        }
      }

      setImportResult({ imported, updated, skipped });
      setStep("result");
      onImportComplete();
    } catch {
      toast({ title: "Erro na importação", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const duplicateCount = contacts.filter((c) => c.duplicate === "phone").length;
  const warningCount = contacts.filter((c) => c.warnings.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Contatos
          </DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file" className="gap-2">
                <Upload className="h-4 w-4" />
                Importar Planilha
              </TabsTrigger>
              <TabsTrigger value="paste" className="gap-2">
                <ClipboardPaste className="h-4 w-4" />
                Colar Lista
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4 mt-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center space-y-4">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">Arraste ou selecione sua planilha</p>
                  <p className="text-sm text-muted-foreground">Formatos aceitos: .xlsx, .csv</p>
                </div>
                <label>
                  <Input
                    type="file"
                    accept=".xlsx,.csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button variant="outline" asChild>
                    <span>Selecionar arquivo</span>
                  </Button>
                </label>
              </div>
              <Button variant="link" className="gap-2" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />
                Baixar modelo de planilha
              </Button>
            </TabsContent>

            <TabsContent value="paste" className="space-y-4 mt-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Cole a lista de contatos separando cada campo por vírgula. Um contato por linha.
                </p>
                <div className="bg-muted rounded-md p-3 text-xs font-mono">
                  <p>Maria Silva, 11999998888, maria@email.com, São Paulo</p>
                  <p>João Souza, 11988887777, joao@email.com, Rio de Janeiro</p>
                </div>
                <Textarea
                  placeholder="Cole seus contatos aqui..."
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handlePaste} disabled={!pasteText.trim()}>
                  Processar Lista
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {contacts.length} contatos detectados
              </Badge>
              {duplicateCount > 0 && (
                <Badge variant="outline" className="gap-1.5 border-yellow-500 text-yellow-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {duplicateCount} duplicados
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="gap-1.5 border-orange-500 text-orange-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {warningCount} com avisos
                </Badge>
              )}
            </div>

            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[140px]">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((c, i) => (
                    <TableRow
                      key={i}
                      className={cn(c.duplicate === "phone" && "bg-yellow-50 dark:bg-yellow-900/10")}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.phone || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.email || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.city || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {CLIENT_STATUS_LABELS[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.duplicate === "phone" ? (
                          <Select
                            value={c.duplicateAction}
                            onValueChange={(v) => handleDuplicateAction(i, v as any)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Ignorar</SelectItem>
                              <SelectItem value="update">Atualizar</SelectItem>
                              <SelectItem value="create">Criar novo</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : c.warnings.length > 0 ? (
                          <span className="text-xs text-orange-600">{c.warnings[0]}</span>
                        ) : (
                          <span className="text-xs text-green-600">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("choose")}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importando..." : `Importar ${contacts.length} contatos`}
              </Button>
            </div>
          </div>
        )}

        {step === "result" && (
          <div className="text-center space-y-4 py-6">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Importação concluída!</h3>
              <p className="text-muted-foreground">
                {importResult.imported > 0 && (
                  <span className="block">{importResult.imported} contatos importados com sucesso.</span>
                )}
                {importResult.updated > 0 && (
                  <span className="block">{importResult.updated} contatos atualizados.</span>
                )}
                {importResult.skipped > 0 && (
                  <span className="block">{importResult.skipped} contatos ignorados.</span>
                )}
              </p>
            </div>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
