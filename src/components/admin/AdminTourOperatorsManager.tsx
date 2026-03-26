import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Upload,
  Download,
  Loader2,
  Trash2,
  Search,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Plus,
} from "lucide-react";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { SupplierLogoUpload } from "./SupplierLogoUpload";

const TEMPLATE_HEADERS = [
  "Operator Name",
  "Category",
  "Description",
  "How to Sell",
  "Sales Channels",
  "Commercial Contacts",
  "Business Hours",
  "Specialties",
  "Competitive Advantages",
  "Certifications",
  "Instagram",
  "Facebook",
  "LinkedIn",
  "YouTube",
  "TikTok",
  "Telegram",
  "Website",
  "Founding Year",
  "Annual Revenue",
  "Number of Employees",
  "Executive Team",
];

const HEADER_ALIASES = {
  name: ["name", "operator name", "nome da operadora", "operator_name"],
  category: ["category", "categoria"],
  description: ["description", "descrição", "descricao"],
  how_to_sell: ["how to sell", "how_to_sell", "como vender"],
  sales_channels: ["sales channels", "sales_channels", "canais de venda"],
  commercial_contacts: ["commercial contacts", "commercial_contacts", "contatos comerciais"],
  business_hours: ["business hours", "business_hours", "horários e suporte", "horarios e suporte"],
  specialties: ["specialties", "especialidades"],
  competitive_advantages: ["competitive advantages", "competitive_advantages", "diferenciais competitivos"],
  certifications: ["certifications", "certifications and associations", "associações e certificações", "associacoes e certificacoes"],
  instagram: ["instagram"],
  facebook: ["facebook"],
  linkedin: ["linkedin", "linked in"],
  youtube: ["youtube", "you tube"],
  tiktok: ["tiktok", "tik tok"],
  telegram: ["telegram"],
  website: ["website", "site"],
  founded_year: ["founding year", "founded year", "founding_year", "founded_year", "ano de fundação", "ano de fundacao"],
  annual_revenue: ["annual revenue", "annual_revenue", "faturamento anual"],
  employees: ["number of employees", "employees", "number_of_employees", "funcionários", "funcionarios"],
  executive_team: ["executive team", "executive_team", "equipe executiva"],
} as const;

const normalizeHeader = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toText = (value: unknown) => {
  if (value == null) return "";
  return String(value).trim();
};

const toInteger = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  const text = toText(value)
    .replace(/^=/, "")
    .replace(/\s+/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "");

  if (!text) return null;

  const match = text.match(/-?\d+/);
  return match ? Number(match[0]) : null;
};

const normalizeCategory = (value: unknown) => {
  const raw = toText(value);
  const normalized = normalizeHeader(raw);

  if (!normalized) return "Operadoras de turismo";

  const categoryMap: Record<string, string> = {
    operadora: "Operadoras de turismo",
    operadoras: "Operadoras de turismo",
    "operadoras de turismo": "Operadoras de turismo",
    consolidadora: "Consolidadoras",
    consolidadoras: "Consolidadoras",
    "companhia aerea": "Companhias aéreas",
    "companhias aereas": "Companhias aéreas",
    hospedagem: "Hospedagem",
    hotel: "Hospedagem",
    hoteis: "Hospedagem",
    locadora: "Locadoras de veículos",
    "locadoras de veiculos": "Locadoras de veículos",
    cruzeiro: "Cruzeiros",
    cruzeiros: "Cruzeiros",
    "seguro viagem": "Seguros viagem",
    "seguros viagem": "Seguros viagem",
    "parque e atracao": "Parques e atrações",
    "parques e atracoes": "Parques e atrações",
    receptivo: "Receptivos",
    receptivos: "Receptivos",
    guia: "Guias",
    guias: "Guias",
  };

  return categoryMap[normalized] || raw;
};

const normalizeOperatorName = (value: string) => normalizeHeader(value);

const buildRowLookup = (row: Record<string, unknown>) => {
  return Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[normalizeHeader(key)] = value;
    return acc;
  }, {});
};

const getMappedValue = (
  lookup: Record<string, unknown>,
  aliases: readonly string[]
) => {
  for (const alias of aliases) {
    const value = lookup[normalizeHeader(alias)];
    if (value !== undefined) return value;
  }
  return "";
};

const appendSection = (label: string, value: unknown) => {
  const text = toText(value);
  return text ? `${label}: ${text}` : null;
};

const CATEGORIES = [
  "Operadoras de turismo",
  "Consolidadoras",
  "Companhias aéreas",
  "Hospedagem",
  "Locadoras de veículos",
  "Cruzeiros",
  "Seguros viagem",
  "Parques e atrações",
  "Receptivos",
  "Guias",
];

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

interface OperatorFormData {
  name: string;
  category: string;
  specialties: string;
  how_to_sell: string;
  sales_channels: string;
  commercial_contacts: string;
  website: string;
  instagram: string;
  founded_year: string;
  annual_revenue: string;
  employees: string;
  executive_team: string;
  logo_url: string | null;
}

const initialFormData: OperatorFormData = {
  name: "",
  category: "Operadoras de turismo",
  specialties: "",
  how_to_sell: "",
  sales_channels: "",
  commercial_contacts: "",
  website: "",
  instagram: "",
  founded_year: "",
  annual_revenue: "",
  employees: "",
  executive_team: "",
  logo_url: null,
};

export function AdminTourOperatorsManager() {
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<any | null>(null);
  const [formData, setFormData] = useState<OperatorFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState("info");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: operators, isLoading } = useQuery({
    queryKey: ["admin-tour-operators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_operators")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tour_operators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tour-operators"] });
      toast.success("Operadora removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("tour_operators")
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tour-operators"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | null; data: OperatorFormData }) => {
      const payload: any = {
        name: data.name.trim(),
        category: data.category.trim() || "Operadoras de turismo",
        specialties: data.specialties.trim() || null,
        how_to_sell: data.how_to_sell.trim() || null,
        sales_channels: data.sales_channels.trim() || null,
        commercial_contacts: data.commercial_contacts.trim() || null,
        website: data.website.trim() || null,
        instagram: data.instagram.trim() || null,
        founded_year: data.founded_year ? Number(data.founded_year) || null : null,
        annual_revenue: data.annual_revenue.trim() || null,
        employees: data.employees ? Number(data.employees) || null : null,
        executive_team: data.executive_team.trim() || null,
        logo_url: data.logo_url || null,
      };

      if (id) {
        const { error } = await supabase.from("tour_operators").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tour_operators").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tour-operators"] });
      toast.success(editingOperator ? "Operadora atualizada!" : "Operadora criada!");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingOperator(null);
    setIsEditOpen(false);
    setActiveTab("info");
  };

  const openEdit = (op: any) => {
    setEditingOperator(op);
    setFormData({
      name: op.name || "",
      category: op.category || "Operadoras de turismo",
      specialties: op.specialties || "",
      how_to_sell: op.how_to_sell || "",
      sales_channels: op.sales_channels || "",
      commercial_contacts: op.commercial_contacts || "",
      website: op.website || "",
      instagram: op.instagram || "",
      founded_year: op.founded_year != null ? String(op.founded_year) : "",
      annual_revenue: op.annual_revenue || "",
      employees: op.employees != null ? String(op.employees) : "",
      executive_team: op.executive_team || "",
      logo_url: op.logo_url || null,
    });
    setActiveTab("info");
    setIsEditOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setIsEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    saveMutation.mutate({ id: editingOperator?.id || null, data: formData });
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Operadoras");
    XLSX.writeFile(wb, "modelo-operadoras.xlsx");
    toast.success("Modelo baixado!");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const result: ImportResult = { created: 0, skipped: 0, errors: [] };

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (rows.length === 0) {
        toast.error("Planilha vazia");
        setImporting(false);
        return;
      }

      const { data: existingOperators, error: existingError } = await supabase
        .from("tour_operators")
        .select("name");

      if (existingError) throw existingError;

      const existingNames = new Set(
        (existingOperators || [])
          .map((operator) => normalizeOperatorName(operator.name || ""))
          .filter(Boolean)
      );

      // Process each row independently, in order
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNum = i + 2; // +2 because row 1 is the header

        try {
          const lookup = buildRowLookup(row);
          const name = toText(getMappedValue(lookup, HEADER_ALIASES.name));

          if (!name) {
            result.errors.push(`Linha ${lineNum}: nome vazio`);
            continue;
          }

          const normalizedName = normalizeOperatorName(name);
          if (existingNames.has(normalizedName)) {
            result.skipped++;
            continue;
          }

          const description = appendSection(
            "Descrição",
            getMappedValue(lookup, HEADER_ALIASES.description)
          );
          const businessHours = appendSection(
            "Horários e suporte",
            getMappedValue(lookup, HEADER_ALIASES.business_hours)
          );
          const competitiveAdvantages = appendSection(
            "Diferenciais competitivos",
            getMappedValue(lookup, HEADER_ALIASES.competitive_advantages)
          );
          const certifications = appendSection(
            "Certificações",
            getMappedValue(lookup, HEADER_ALIASES.certifications)
          );

          const howToSellParts = [
            toText(getMappedValue(lookup, HEADER_ALIASES.how_to_sell)),
            description,
            businessHours,
            competitiveAdvantages,
            certifications,
          ].filter(Boolean);

          const socialLinks = {
            facebook: toText(getMappedValue(lookup, HEADER_ALIASES.facebook)),
            linkedin: toText(getMappedValue(lookup, HEADER_ALIASES.linkedin)),
            youtube: toText(getMappedValue(lookup, HEADER_ALIASES.youtube)),
            tiktok: toText(getMappedValue(lookup, HEADER_ALIASES.tiktok)),
            telegram: toText(getMappedValue(lookup, HEADER_ALIASES.telegram)),
          };

          const filteredSocialLinks = Object.fromEntries(
            Object.entries(socialLinks).filter(([, value]) => Boolean(value))
          );

          const payload = {
            name,
            category: normalizeCategory(getMappedValue(lookup, HEADER_ALIASES.category)),
            specialties: toText(getMappedValue(lookup, HEADER_ALIASES.specialties)) || null,
            how_to_sell: howToSellParts.join("\n\n") || null,
            sales_channels: toText(getMappedValue(lookup, HEADER_ALIASES.sales_channels)) || null,
            commercial_contacts: toText(getMappedValue(lookup, HEADER_ALIASES.commercial_contacts)) || null,
            website: toText(getMappedValue(lookup, HEADER_ALIASES.website)) || null,
            instagram: toText(getMappedValue(lookup, HEADER_ALIASES.instagram)) || null,
            founded_year: toInteger(getMappedValue(lookup, HEADER_ALIASES.founded_year)),
            annual_revenue: toText(getMappedValue(lookup, HEADER_ALIASES.annual_revenue)) || null,
            employees: toInteger(getMappedValue(lookup, HEADER_ALIASES.employees)),
            executive_team: toText(getMappedValue(lookup, HEADER_ALIASES.executive_team)) || null,
            social_links: Object.keys(filteredSocialLinks).length > 0 ? filteredSocialLinks : null,
          };

          const { error: insertErr } = await supabase
            .from("tour_operators")
            .insert(payload as any);

          if (insertErr) {
            if (insertErr.message.includes("duplicate") || insertErr.code === "23505") {
              result.skipped++;
            } else {
              result.errors.push(`Linha ${lineNum}: ${insertErr.message}`);
            }
          } else {
            existingNames.add(normalizedName);
            result.created++;
          }
        } catch (rowErr: any) {
          result.errors.push(`Linha ${lineNum}: ${rowErr.message || "erro desconhecido"}`);
        }
      }

      setImportResult(result);
      setShowResultDialog(true);
      queryClient.invalidateQueries({ queryKey: ["admin-tour-operators"] });

      if (result.created > 0) {
        toast.success(`${result.created} operadora(s) importada(s)!`);
      }
    } catch (err: any) {
      toast.error("Erro ao ler arquivo: " + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = operators?.filter((op: any) =>
    op.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Operadoras de Turismo
          {operators && (
            <Badge variant="secondary" className="ml-2">
              {operators.length}
            </Badge>
          )}
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" />
            Modelo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            Importar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Operadora
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv,.xlsx,.xls"
            onChange={handleImport}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar operadora..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !filtered?.length ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma operadora cadastrada. Importe via planilha ou crie manualmente.
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((op: any) => (
              <div
                key={op.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {op.logo_url ? (
                      <img
                        src={op.logo_url}
                        alt={op.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{op.name}</p>
                    <p className="text-xs text-muted-foreground">{op.category}</p>
                  </div>
                  <Badge variant={op.is_active ? "default" : "outline"}>
                    {op.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: op.id,
                        is_active: !op.is_active,
                      })
                    }
                    title={op.is_active ? "Desativar" : "Ativar"}
                  >
                    {op.is_active ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/mapa-turismo/operadora/${op.id}`)}
                    title="Ver página"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(op)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(op.id)} title="Remover operadora" description="Tem certeza que deseja remover permanentemente esta operadora?">
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </ConfirmDeleteDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit / Create Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOperator ? "Editar Operadora" : "Nova Operadora"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="specialties">Especialidades</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="social">Redes Sociais</TabsTrigger>
              </TabsList>

              {/* Tab: Informações */}
              <TabsContent value="info" className="space-y-4 mt-4">
                <SupplierLogoUpload
                  logoUrl={formData.logo_url}
                  onLogoChange={(url) => setFormData({ ...formData, logo_url: url })}
                  supplierId={editingOperator?.id}
                />

                <div>
                  <Label>Nome da Empresa *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ano de Fundação</Label>
                    <Input
                      type="number"
                      value={formData.founded_year}
                      onChange={(e) => setFormData({ ...formData, founded_year: e.target.value })}
                      placeholder="Ex: 1840"
                    />
                  </div>
                  <div>
                    <Label>Funcionários</Label>
                    <Input
                      type="number"
                      value={formData.employees}
                      onChange={(e) => setFormData({ ...formData, employees: e.target.value })}
                      placeholder="Ex: 500"
                    />
                  </div>
                </div>
                <div>
                  <Label>Faturamento Anual</Label>
                  <Input
                    value={formData.annual_revenue}
                    onChange={(e) => setFormData({ ...formData, annual_revenue: e.target.value })}
                    placeholder="Ex: R$ 550 milhões"
                  />
                </div>
                <div>
                  <Label>Equipe Executiva</Label>
                  <Textarea
                    value={formData.executive_team}
                    onChange={(e) => setFormData({ ...formData, executive_team: e.target.value })}
                    placeholder="Nomes e cargos dos executivos..."
                    rows={2}
                  />
                </div>
              </TabsContent>

              {/* Tab: Especialidades */}
              <TabsContent value="specialties" className="space-y-4 mt-4">
                <div>
                  <Label>Especialidades</Label>
                  <Textarea
                    value={formData.specialties}
                    onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                    placeholder="Separe por vírgula: Europa, Orlando, Cruzeiros, Disney..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separe cada especialidade por vírgula. Ex: Europa, Circuitos, Grupos Disney, Bloqueios Aéreos
                  </p>
                </div>

                {/* Preview chips */}
                {formData.specialties.trim() && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.specialties.split(",").map((s, i) => {
                        const tag = s.trim();
                        if (!tag) return null;
                        return (
                          <Badge key={i} variant="secondary">
                            {tag}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Detalhes */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <div>
                  <Label>Como Vender</Label>
                  <Textarea
                    value={formData.how_to_sell}
                    onChange={(e) => setFormData({ ...formData, how_to_sell: e.target.value })}
                    placeholder="Instruções para venda..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Canais de Venda</Label>
                  <Textarea
                    value={formData.sales_channels}
                    onChange={(e) => setFormData({ ...formData, sales_channels: e.target.value })}
                    placeholder="Portais, sistemas, telefone..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Contatos Comerciais</Label>
                  <Textarea
                    value={formData.commercial_contacts}
                    onChange={(e) => setFormData({ ...formData, commercial_contacts: e.target.value })}
                    placeholder="Nomes, regiões e telefones..."
                    rows={4}
                  />
                </div>
              </TabsContent>

              {/* Tab: Redes Sociais */}
              <TabsContent value="social" className="space-y-4 mt-4">
                <div>
                  <Label>Website</Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Button
              type="submit"
              className="w-full"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingOperator ? "Salvar" : "Criar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultado da Importação</DialogTitle>
          </DialogHeader>
          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>{importResult.created} operadora(s) criada(s)</span>
              </div>
              {importResult.skipped > 0 && (
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span>{importResult.skipped} duplicada(s) ignorada(s)</span>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <span>{importResult.errors.length} erro(s)</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto text-xs text-muted-foreground bg-muted rounded p-2 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
