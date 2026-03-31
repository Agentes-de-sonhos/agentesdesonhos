import { useState, useRef, useCallback } from "react";
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
  X,
  Link as LinkIcon,
  ImagePlus,
} from "lucide-react";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { SupplierLogoUpload } from "./SupplierLogoUpload";
import { MediaManagerModal } from "@/components/media/MediaManagerModal";
import type { MediaFile } from "@/hooks/useMediaManager";

const TEMPLATE_HEADERS = [
  "Operator Name", "Category", "Description", "How to Sell",
  "Sales Channels", "Commercial Contacts", "Business Hours",
  "Specialties", "Competitive Advantages", "Certifications",
  "Instagram", "Facebook", "LinkedIn", "YouTube", "TikTok", "Telegram",
  "Website", "Founding Year", "Annual Revenue", "Number of Employees", "Executive Team",
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
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const toText = (value: unknown) => {
  if (value == null) return "";
  return String(value).trim();
};

const toInteger = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  const text = toText(value).replace(/^=/, "").replace(/\s+/g, "").replace(/,(?=\d{3}(\D|$))/g, "");
  if (!text) return null;
  const match = text.match(/-?\d+/);
  return match ? Number(match[0]) : null;
};

const normalizeCategory = (value: unknown) => {
  const raw = toText(value);
  const normalized = normalizeHeader(raw);
  if (!normalized) return "Operadoras de turismo";
  const categoryMap: Record<string, string> = {
    operadora: "Operadoras de turismo", operadoras: "Operadoras de turismo",
    "operadoras de turismo": "Operadoras de turismo",
    consolidadora: "Consolidadoras", consolidadoras: "Consolidadoras",
    "companhia aerea": "Companhias aéreas", "companhias aereas": "Companhias aéreas",
    hospedagem: "Hospedagem", hotel: "Hospedagem", hoteis: "Hospedagem",
    locadora: "Locadoras de veículos", "locadoras de veiculos": "Locadoras de veículos",
    cruzeiro: "Cruzeiros", cruzeiros: "Cruzeiros",
    "seguro viagem": "Seguros viagem", "seguros viagem": "Seguros viagem",
    "parque e atracao": "Parques e atrações", "parques e atracoes": "Parques e atrações",
    receptivo: "Receptivos", receptivos: "Receptivos",
    guia: "Guias", guias: "Guias",
  };
  return categoryMap[normalized] || raw;
};

const normalizeOperatorName = (value: string) => normalizeHeader(value);

const buildRowLookup = (row: Record<string, unknown>) =>
  Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => { acc[normalizeHeader(key)] = value; return acc; }, {});

const getMappedValue = (lookup: Record<string, unknown>, aliases: readonly string[]) => {
  for (const alias of aliases) { const value = lookup[normalizeHeader(alias)]; if (value !== undefined) return value; }
  return "";
};

const appendSection = (label: string, value: unknown) => { const text = toText(value); return text ? `${label}: ${text}` : null; };

const CATEGORIES = [
  "Operadoras de turismo", "Consolidadoras", "Companhias aéreas", "Hospedagem",
  "Locadoras de veículos", "Cruzeiros", "Seguros viagem", "Parques e atrações", "Receptivos", "Guias",
];

interface ImportResult { created: number; skipped: number; errors: string[]; }

interface SalesChannelItem { name: string; url: string; }
interface MaterialItem { name: string; url: string; type: string; }

interface OperatorFormData {
  name: string;
  category: string;
  specialties: string;
  how_to_sell: string;
  business_hours: string;
  after_hours: string;
  emergency: string;
  competitive_advantages: string;
  certifications: string;
  sales_channels_list: SalesChannelItem[];
  commercial_phone: string;
  commercial_whatsapp: string;
  commercial_text: string;
  commercial_url: string;
  website: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  facebook: string;
  linkedin: string;
  telegram: string;
  founded_year: string;
  annual_revenue: string;
  employees: string;
  executive_team: string;
  logo_url: string | null;
  materials: MaterialItem[];
}

const initialFormData: OperatorFormData = {
  name: "", category: "Operadoras de turismo", specialties: "",
  how_to_sell: "", business_hours: "", after_hours: "", emergency: "",
  competitive_advantages: "", certifications: "",
  sales_channels_list: [{ name: "", url: "" }],
  commercial_phone: "", commercial_whatsapp: "", commercial_text: "", commercial_url: "",
  website: "", instagram: "", tiktok: "", youtube: "", facebook: "", linkedin: "", telegram: "",
  founded_year: "", annual_revenue: "", employees: "", executive_team: "",
  logo_url: null, materials: [],
};

/* ---- Serializers / Parsers ---- */

const parseSalesChannels = (text: string | null): SalesChannelItem[] => {
  if (!text) return [{ name: "", url: "" }];
  const lines = text.split("\n").filter(Boolean);
  const items: SalesChannelItem[] = lines.map((line) => {
    const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
    const name = line.replace(/(https?:\/\/[^\s]+)/, "").replace(/[-–|:]?\s*$/, "").trim() || line.trim();
    return { name, url: urlMatch ? urlMatch[1] : "" };
  });
  return items.length > 0 ? items : [{ name: "", url: "" }];
};

const serializeSalesChannels = (items: SalesChannelItem[]): string | null => {
  const lines = items.filter((i) => i.name.trim() || i.url.trim()).map((i) => i.url ? `${i.name.trim()} ${i.url.trim()}` : i.name.trim());
  return lines.length > 0 ? lines.join("\n") : null;
};

const parseHowToSell = (text: string | null) => {
  const result = { main: "", businessHours: "", afterHours: "", emergency: "", advantages: "", certifications: "" };
  if (!text) return result;
  const sectionMap: Record<string, keyof typeof result> = {
    "horários e suporte": "businessHours", "horario comercial": "businessHours",
    "atendimento fora do horário": "afterHours", "fora do horario": "afterHours",
    "emergencial": "emergency",
    "diferenciais competitivos": "advantages",
    "certificações": "certifications", "associações e certificações": "certifications",
    "descrição": "main",
  };
  const lines = text.split("\n");
  let currentKey: keyof typeof result = "main";
  for (const line of lines) {
    const lower = line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[:\-–]/g, "").trim();
    let matched = false;
    for (const [pattern, key] of Object.entries(sectionMap)) {
      const normalizedPattern = pattern.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (lower.startsWith(normalizedPattern) || lower === normalizedPattern) {
        currentKey = key;
        const remainder = line.replace(/^[^:]+:\s*/, "").trim();
        if (remainder && remainder.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() !== lower) {
          result[currentKey] += remainder + "\n";
        }
        matched = true;
        break;
      }
    }
    if (!matched) result[currentKey] += line + "\n";
  }
  for (const k of Object.keys(result) as (keyof typeof result)[]) result[k] = result[k].trim();
  return result;
};

const serializeHowToSell = (d: OperatorFormData): string | null => {
  const parts: string[] = [];
  if (d.how_to_sell.trim()) parts.push(d.how_to_sell.trim());
  if (d.business_hours.trim()) parts.push(`Horários e suporte: ${d.business_hours.trim()}`);
  if (d.after_hours.trim()) parts.push(`Atendimento fora do horário: ${d.after_hours.trim()}`);
  if (d.emergency.trim()) parts.push(`Emergencial: ${d.emergency.trim()}`);
  if (d.competitive_advantages.trim()) parts.push(`Diferenciais competitivos: ${d.competitive_advantages.trim()}`);
  if (d.certifications.trim()) parts.push(`Certificações: ${d.certifications.trim()}`);
  return parts.length > 0 ? parts.join("\n\n") : null;
};

const parseCommercialContacts = (text: string | null) => {
  const r = { phone: "", whatsapp: "", text: "", url: "" };
  if (!text) return r;
  const phoneMatch = text.match(/(?:tel(?:efone)?)[:\s]*([\d\s()+-]+)/i);
  const whatsappMatch = text.match(/(?:whatsapp|wpp|zap)[:\s]*([\d\s()+-]+)/i);
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
  let remaining = text;
  if (phoneMatch) remaining = remaining.replace(phoneMatch[0], "");
  if (whatsappMatch) remaining = remaining.replace(whatsappMatch[0], "");
  if (urlMatch) remaining = remaining.replace(urlMatch[0], "");
  r.phone = phoneMatch ? phoneMatch[1].trim() : "";
  r.whatsapp = whatsappMatch ? whatsappMatch[1].trim() : "";
  r.url = urlMatch ? urlMatch[1] : "";
  r.text = remaining.trim();
  return r;
};

const serializeCommercialContacts = (d: OperatorFormData): string | null => {
  const parts: string[] = [];
  if (d.commercial_phone.trim()) parts.push(`Telefone: ${d.commercial_phone.trim()}`);
  if (d.commercial_whatsapp.trim()) parts.push(`WhatsApp: ${d.commercial_whatsapp.trim()}`);
  if (d.commercial_text.trim()) parts.push(d.commercial_text.trim());
  if (d.commercial_url.trim()) parts.push(d.commercial_url.trim());
  return parts.length > 0 ? parts.join("\n") : null;
};

export function AdminTourOperatorsManager() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<any | null>(null);
  const [formData, setFormData] = useState<OperatorFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState("como-vender");
  const [quickLogoOperatorId, setQuickLogoOperatorId] = useState<string | null>(null);
  const [quickLogoOpen, setQuickLogoOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: operators, isLoading } = useQuery({
    queryKey: ["admin-tour-operators"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tour_operators").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tour_operators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-tour-operators"] }); toast.success("Operadora removida!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("tour_operators").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-tour-operators"] }),
  });

  const quickLogoMutation = useMutation({
    mutationFn: async ({ id, logo_url }: { id: string; logo_url: string }) => {
      const { error } = await supabase.from("tour_operators").update({ logo_url } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tour-operators"] });
      toast.success("Logotipo atualizado!");
      setQuickLogoOpen(false);
      setQuickLogoOperatorId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleQuickLogoSelect = useCallback((files: MediaFile[]) => {
    if (files.length > 0 && quickLogoOperatorId) {
      quickLogoMutation.mutate({ id: quickLogoOperatorId, logo_url: files[0].url });
    }
  }, [quickLogoOperatorId, quickLogoMutation]);

    mutationFn: async ({ id, data }: { id: string | null; data: OperatorFormData }) => {
      const socialLinks: Record<string, string> = {};
      if (data.facebook.trim()) socialLinks.facebook = data.facebook.trim();
      if (data.linkedin.trim()) socialLinks.linkedin = data.linkedin.trim();
      if (data.youtube.trim()) socialLinks.youtube = data.youtube.trim();
      if (data.tiktok.trim()) socialLinks.tiktok = data.tiktok.trim();
      if (data.telegram.trim()) socialLinks.telegram = data.telegram.trim();

      const payload: any = {
        name: data.name.trim(),
        category: data.category.trim() || "Operadoras de turismo",
        specialties: data.specialties.trim() || null,
        how_to_sell: serializeHowToSell(data),
        sales_channels: serializeSalesChannels(data.sales_channels_list),
        commercial_contacts: serializeCommercialContacts(data),
        website: data.website.trim() || null,
        instagram: data.instagram.trim() || null,
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        founded_year: data.founded_year ? Number(data.founded_year) || null : null,
        annual_revenue: data.annual_revenue.trim() || null,
        employees: data.employees ? Number(data.employees) || null : null,
        executive_team: data.executive_team.trim() || null,
        logo_url: data.logo_url || null,
        materials: data.materials.filter((m) => m.name.trim() || m.url.trim()),
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

  const resetForm = () => { setFormData(initialFormData); setEditingOperator(null); setIsEditOpen(false); setActiveTab("como-vender"); };

  const openEdit = (op: any) => {
    const parsed = parseHowToSell(op.how_to_sell);
    const contacts = parseCommercialContacts(op.commercial_contacts);
    const social = (op.social_links && typeof op.social_links === "object") ? op.social_links : {};
    const mats = Array.isArray(op.materials) ? op.materials as MaterialItem[] : [];

    setEditingOperator(op);
    setFormData({
      name: op.name || "",
      category: op.category || "Operadoras de turismo",
      specialties: op.specialties || "",
      how_to_sell: parsed.main,
      business_hours: parsed.businessHours,
      after_hours: parsed.afterHours,
      emergency: parsed.emergency,
      competitive_advantages: parsed.advantages,
      certifications: parsed.certifications,
      sales_channels_list: parseSalesChannels(op.sales_channels),
      commercial_phone: contacts.phone,
      commercial_whatsapp: contacts.whatsapp,
      commercial_text: contacts.text,
      commercial_url: contacts.url,
      website: op.website || "",
      instagram: op.instagram || "",
      tiktok: social.tiktok || "",
      youtube: social.youtube || "",
      facebook: social.facebook || "",
      linkedin: social.linkedin || "",
      telegram: social.telegram || "",
      founded_year: op.founded_year != null ? String(op.founded_year) : "",
      annual_revenue: op.annual_revenue || "",
      employees: op.employees != null ? String(op.employees) : "",
      executive_team: op.executive_team || "",
      logo_url: op.logo_url || null,
      materials: mats,
    });
    setActiveTab("como-vender");
    setIsEditOpen(true);
  };

  const openCreate = () => { resetForm(); setIsEditOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error("Nome é obrigatório"); return; }
    saveMutation.mutate({ id: editingOperator?.id || null, data: formData });
  };

  const updateField = (key: keyof OperatorFormData, value: any) => setFormData((prev) => ({ ...prev, [key]: value }));

  const addSalesChannel = () => updateField("sales_channels_list", [...formData.sales_channels_list, { name: "", url: "" }]);
  const removeSalesChannel = (i: number) => updateField("sales_channels_list", formData.sales_channels_list.filter((_, idx) => idx !== i));
  const updateSalesChannel = (i: number, field: "name" | "url", value: string) => {
    const list = [...formData.sales_channels_list];
    list[i] = { ...list[i], [field]: value };
    updateField("sales_channels_list", list);
  };

  const addMaterial = () => updateField("materials", [...formData.materials, { name: "", url: "", type: "link" }]);
  const removeMaterial = (i: number) => updateField("materials", formData.materials.filter((_, idx) => idx !== i));
  const updateMaterial = (i: number, field: keyof MaterialItem, value: string) => {
    const list = [...formData.materials];
    list[i] = { ...list[i], [field]: value };
    updateField("materials", list);
  };

  // ---- Import logic ----
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
      if (rows.length === 0) { toast.error("Planilha vazia"); setImporting(false); return; }
      const { data: existingOperators, error: existingError } = await supabase.from("tour_operators").select("name");
      if (existingError) throw existingError;
      const existingNames = new Set((existingOperators || []).map((op) => normalizeOperatorName(op.name || "")).filter(Boolean));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNum = i + 2;
        try {
          const lookup = buildRowLookup(row);
          const name = toText(getMappedValue(lookup, HEADER_ALIASES.name));
          if (!name) { result.errors.push(`Linha ${lineNum}: nome vazio`); continue; }
          const normalizedName = normalizeOperatorName(name);
          if (existingNames.has(normalizedName)) { result.skipped++; continue; }

          const description = appendSection("Descrição", getMappedValue(lookup, HEADER_ALIASES.description));
          const businessHours = appendSection("Horários e suporte", getMappedValue(lookup, HEADER_ALIASES.business_hours));
          const competitiveAdvantages = appendSection("Diferenciais competitivos", getMappedValue(lookup, HEADER_ALIASES.competitive_advantages));
          const certifications = appendSection("Certificações", getMappedValue(lookup, HEADER_ALIASES.certifications));
          const howToSellParts = [toText(getMappedValue(lookup, HEADER_ALIASES.how_to_sell)), description, businessHours, competitiveAdvantages, certifications].filter(Boolean);

          const socialLinks: Record<string, string> = {};
          for (const key of ["facebook", "linkedin", "youtube", "tiktok", "telegram"] as const) {
            const v = toText(getMappedValue(lookup, HEADER_ALIASES[key]));
            if (v) socialLinks[key] = v;
          }

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
            social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
          };

          const { error: insertErr } = await supabase.from("tour_operators").insert(payload as any);
          if (insertErr) {
            if (insertErr.message.includes("duplicate") || insertErr.code === "23505") result.skipped++;
            else result.errors.push(`Linha ${lineNum}: ${insertErr.message}`);
          } else { existingNames.add(normalizedName); result.created++; }
        } catch (rowErr: any) {
          result.errors.push(`Linha ${lineNum}: ${rowErr.message || "erro desconhecido"}`);
        }
      }
      setImportResult(result);
      setShowResultDialog(true);
      queryClient.invalidateQueries({ queryKey: ["admin-tour-operators"] });
      if (result.created > 0) toast.success(`${result.created} operadora(s) importada(s)!`);
    } catch (err: any) {
      toast.error("Erro ao ler arquivo: " + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = operators?.filter((op: any) => {
    const matchesSearch = op.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || op.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Fornecedores
          {operators && <Badge variant="secondary" className="ml-2">{operators.length}</Badge>}
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" />Modelo</Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}Importar
          </Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          <input ref={fileInputRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Tipo de serviço" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os serviços</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {filterCategory !== "all" && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{filterCategory}</Badge>
            <span className="text-sm text-muted-foreground">{filtered?.length || 0} resultado(s)</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !filtered?.length ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma operadora cadastrada.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((op: any) => (
              <div key={op.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {op.logo_url ? <img src={op.logo_url} alt={op.name} className="h-full w-full object-contain" /> : <Building2 className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{op.name}</p>
                    <p className="text-xs text-muted-foreground">{op.category}</p>
                  </div>
                  <Badge variant={op.is_active ? "default" : "outline"}>{op.is_active ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => toggleActiveMutation.mutate({ id: op.id, is_active: !op.is_active })} title={op.is_active ? "Desativar" : "Ativar"}>
                    {op.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/mapa-turismo/operadora/${op.id}`)} title="Ver página"><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(op)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                  <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(op.id)} title="Remover operadora" description="Tem certeza que deseja remover permanentemente esta operadora?">
                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </ConfirmDeleteDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* ===== Edit / Create Dialog with 7 Tabs ===== */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {editingOperator ? "Editar Operadora" : "Adicionar"}
            </DialogTitle>
          </DialogHeader>

          {/* Header fields: Logo + Name + Category (always visible) */}
          <div className="space-y-4 pb-4 border-b">
            <SupplierLogoUpload logoUrl={formData.logo_url} onLogoChange={(url) => updateField("logo_url", url)} supplierId={editingOperator?.id} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nome da Empresa *</Label>
                <Input value={formData.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Ex: CVC Corp" />
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select value={formData.category} onValueChange={(v) => updateField("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="como-vender" className="text-xs">Como Vender</TabsTrigger>
                <TabsTrigger value="especialidades" className="text-xs">Especialidades</TabsTrigger>
                <TabsTrigger value="redes-sociais" className="text-xs">Redes Sociais</TabsTrigger>
                <TabsTrigger value="info-empresa" className="text-xs">Info Empresa</TabsTrigger>
                <TabsTrigger value="canais-venda" className="text-xs">Canais de Venda</TabsTrigger>
                <TabsTrigger value="contatos" className="text-xs">Contatos</TabsTrigger>
                <TabsTrigger value="materiais" className="text-xs">Materiais</TabsTrigger>
              </TabsList>

              {/* 1. Como Vender */}
              <TabsContent value="como-vender" className="space-y-4 mt-4">
                <div>
                  <Label>Descrição geral de vendas</Label>
                  <Textarea value={formData.how_to_sell} onChange={(e) => updateField("how_to_sell", e.target.value)} placeholder="Fluxo de venda, sistema utilizado, suporte ao agente..." rows={4} />
                </div>
                <div>
                  <Label>Horário comercial</Label>
                  <Input value={formData.business_hours} onChange={(e) => updateField("business_hours", e.target.value)} placeholder="Ex: Seg a Sex, 9h às 18h" />
                </div>
                <div>
                  <Label>Atendimento fora do horário</Label>
                  <Input value={formData.after_hours} onChange={(e) => updateField("after_hours", e.target.value)} placeholder="Ex: Chat disponível 24h" />
                </div>
                <div>
                  <Label>Emergencial</Label>
                  <Input value={formData.emergency} onChange={(e) => updateField("emergency", e.target.value)} placeholder="Ex: Telefone de emergência 24h" />
                </div>
                <div>
                  <Label>Diferenciais competitivos</Label>
                  <Textarea value={formData.competitive_advantages} onChange={(e) => updateField("competitive_advantages", e.target.value)} placeholder="Liste os diferenciais, um por linha..." rows={3} />
                </div>
                <div>
                  <Label>Certificações</Label>
                  <Textarea value={formData.certifications} onChange={(e) => updateField("certifications", e.target.value)} placeholder="Ex: IATA, ABAV, BRAZTOA..." rows={2} />
                </div>
              </TabsContent>

              {/* 2. Especialidades */}
              <TabsContent value="especialidades" className="space-y-4 mt-4">
                <div>
                  <Label>Especialidades</Label>
                  <Textarea value={formData.specialties} onChange={(e) => updateField("specialties", e.target.value)} placeholder="Separe por vírgula: Europa, Orlando, Cruzeiros, LGBTQIA+..." rows={4} />
                  <p className="text-xs text-muted-foreground mt-1">Cada especialidade será exibida como um chip no perfil.</p>
                </div>
                {formData.specialties.trim() && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.specialties.split(",").map((s, i) => { const t = s.trim(); return t ? <Badge key={i} variant="secondary">{t}</Badge> : null; })}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* 3. Redes Sociais */}
              <TabsContent value="redes-sociais" className="space-y-4 mt-4">
                <p className="text-xs text-muted-foreground">Preencha apenas os que existirem. Campos vazios não serão exibidos.</p>
                {([
                  { key: "website", label: "Website", ph: "https://..." },
                  { key: "instagram", label: "Instagram", ph: "https://instagram.com/..." },
                  { key: "tiktok", label: "TikTok", ph: "https://tiktok.com/@..." },
                  { key: "youtube", label: "YouTube", ph: "https://youtube.com/..." },
                  { key: "facebook", label: "Facebook", ph: "https://facebook.com/..." },
                  { key: "linkedin", label: "LinkedIn", ph: "https://linkedin.com/..." },
                  { key: "telegram", label: "Telegram", ph: "https://t.me/..." },
                ] as { key: keyof OperatorFormData; label: string; ph: string }[]).map(({ key, label, ph }) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Input value={formData[key] as string} onChange={(e) => updateField(key, e.target.value)} placeholder={ph} />
                  </div>
                ))}
              </TabsContent>

              {/* 4. Informações da Empresa */}
              <TabsContent value="info-empresa" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ano de Fundação</Label>
                    <Input type="number" value={formData.founded_year} onChange={(e) => updateField("founded_year", e.target.value)} placeholder="Ex: 1972" />
                  </div>
                  <div>
                    <Label>Funcionários</Label>
                    <Input type="number" value={formData.employees} onChange={(e) => updateField("employees", e.target.value)} placeholder="Ex: 500" />
                  </div>
                </div>
                <div>
                  <Label>Faturamento Anual</Label>
                  <Input value={formData.annual_revenue} onChange={(e) => updateField("annual_revenue", e.target.value)} placeholder="Ex: R$ 550 milhões" />
                </div>
                <div>
                  <Label>Equipe Executiva</Label>
                  <Textarea value={formData.executive_team} onChange={(e) => updateField("executive_team", e.target.value)} placeholder="Nomes e cargos dos executivos..." rows={3} />
                </div>
              </TabsContent>

              {/* 5. Canais de Venda */}
              <TabsContent value="canais-venda" className="space-y-4 mt-4">
                <p className="text-xs text-muted-foreground">Cada canal com URL será exibido como botão clicável no perfil.</p>
                {formData.sales_channels_list.map((ch, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Input value={ch.name} onChange={(e) => updateSalesChannel(i, "name", e.target.value)} placeholder="Nome do canal (ex: Sistema de reservas)" />
                      <Input value={ch.url} onChange={(e) => updateSalesChannel(i, "url", e.target.value)} placeholder="https://..." />
                    </div>
                    {formData.sales_channels_list.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSalesChannel(i)} className="mt-1"><X className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addSalesChannel}><Plus className="h-4 w-4 mr-1" />Adicionar Canal</Button>
              </TabsContent>

              {/* 6. Contatos Comerciais */}
              <TabsContent value="contatos" className="space-y-4 mt-4">
                <div>
                  <Label>Telefone</Label>
                  <Input value={formData.commercial_phone} onChange={(e) => updateField("commercial_phone", e.target.value)} placeholder="Ex: (11) 3003-1234" />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={formData.commercial_whatsapp} onChange={(e) => updateField("commercial_whatsapp", e.target.value)} placeholder="Ex: (11) 99999-0000" />
                </div>
                <div>
                  <Label>Texto complementar</Label>
                  <Textarea value={formData.commercial_text} onChange={(e) => updateField("commercial_text", e.target.value)} placeholder="Instruções adicionais de contato..." rows={3} />
                </div>
                <div>
                  <Label>URL (opcional)</Label>
                  <Input value={formData.commercial_url} onChange={(e) => updateField("commercial_url", e.target.value)} placeholder="Ex: https://equipe-comercial.com" />
                </div>
              </TabsContent>

              {/* 7. Materiais de Divulgação */}
              <TabsContent value="materiais" className="space-y-4 mt-4">
                <p className="text-xs text-muted-foreground">Adicione links para PDFs, imagens ou páginas externas. Se vazio, será exibida mensagem padrão.</p>
                {formData.materials.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">Nenhum material adicionado</p>
                ) : (
                  formData.materials.map((mat, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 space-y-2">
                        <Input value={mat.name} onChange={(e) => updateMaterial(i, "name", e.target.value)} placeholder="Nome do material" />
                        <Input value={mat.url} onChange={(e) => updateMaterial(i, "url", e.target.value)} placeholder="URL do material (PDF, imagem, link)" />
                        <Select value={mat.type} onValueChange={(v) => updateMaterial(i, "type", v)}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="image">Imagem</SelectItem>
                            <SelectItem value="link">Link externo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(i)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))
                )}
                <Button type="button" variant="outline" size="sm" onClick={addMaterial}><Plus className="h-4 w-4 mr-1" />Adicionar Material</Button>
              </TabsContent>
            </Tabs>

            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingOperator ? "Salvar Alterações" : "Criar Operadora"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resultado da Importação</DialogTitle></DialogHeader>
          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-500" /><span>{importResult.created} operadora(s) criada(s)</span></div>
              {importResult.skipped > 0 && <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-yellow-500" /><span>{importResult.skipped} duplicada(s) ignorada(s)</span></div>}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-destructive" /><span>{importResult.errors.length} erro(s)</span></div>
                  <div className="max-h-40 overflow-y-auto text-xs text-muted-foreground bg-muted rounded p-2 space-y-1">
                    {importResult.errors.map((err, i) => <p key={i}>{err}</p>)}
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
