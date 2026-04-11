import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2, AlertTriangle, User, Building2, MapPin, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ExtractedCardData } from "./BusinessCardCapture";

interface Props {
  data: ExtractedCardData;
  imagePreview: string;
  onSave: (data: any) => Promise<void>;
  onBack: () => void;
}

interface DuplicateResult {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  empresa: string | null;
}

export function CardReviewForm({ data, imagePreview, onSave, onBack }: Props) {
  // Form fields
  const [personName, setPersonName] = useState(data.person_name || "");
  const [jobTitle, setJobTitle] = useState(data.job_title || "");
  const [companyName, setCompanyName] = useState(data.company_name || "");
  const [phone, setPhone] = useState(data.phone || "");
  const [whatsapp, setWhatsapp] = useState(data.whatsapp || "");
  const [email, setEmail] = useState(data.email || "");
  const [website, setWebsite] = useState(data.website || "");
  const [address, setAddress] = useState(data.address || "");
  const [city, setCity] = useState(data.city || "");
  const [state, setState] = useState(data.state || "");
  const [country, setCountry] = useState(data.country || "");
  const [notes, setNotes] = useState(data.other_info || "");

  // Classification
  const [contactType, setContactType] = useState("outro");
  const [isExistingClient, setIsExistingClient] = useState<string>("");
  const [geoScope, setGeoScope] = useState("");
  const [supplierCategory, setSupplierCategory] = useState("");

  // Extra fields
  const [eventOrigin, setEventOrigin] = useState("");
  const [leadTemp, setLeadTemp] = useState("");
  const [nextAction, setNextAction] = useState("");

  // State
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([]);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);

  // Check duplicates when key fields change
  useEffect(() => {
    const checkDuplicates = async () => {
      if (!email && !phone && !companyName && !personName) return;

      let query = supabase.from("crm_contacts").select("id, nome, email, telefone, empresa");
      const conditions: string[] = [];
      if (email) conditions.push(`email.eq.${email}`);
      if (phone) conditions.push(`telefone.eq.${phone}`);

      if (conditions.length === 0) return;

      const { data: results } = await supabase
        .from("crm_contacts")
        .select("id, nome, email, telefone, empresa")
        .or(conditions.join(","));

      if (results && results.length > 0) {
        setDuplicates(results);
        setShowDuplicateAlert(true);
      } else {
        setDuplicates([]);
        setShowDuplicateAlert(false);
      }
    };

    const timer = setTimeout(checkDuplicates, 500);
    return () => clearTimeout(timer);
  }, [email, phone]);

  const handleSubmit = async () => {
    if (!personName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        person_name: personName.trim(),
        job_title: jobTitle.trim() || null,
        company_name: companyName.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        country: country.trim() || null,
        social_links: data.social_links || {},
        contact_type: contactType,
        is_existing_client: isExistingClient === "sim" ? true : isExistingClient === "nao" ? false : null,
        geographic_scope: geoScope || null,
        supplier_category: supplierCategory || null,
        notes: notes.trim() || null,
        event_origin: eventOrigin.trim() || null,
        lead_temperature: leadTemp || null,
        next_action: nextAction || null,
        capture_origin: "cartao_visita",
      });
    } finally {
      setSaving(false);
    }
  };

  const confidence = data.confidence || {};

  const ConfidenceBadge = ({ field }: { field: string }) => {
    const level = confidence[field];
    if (!level || level === "high") return null;
    return (
      <Badge variant="outline" className={level === "low" ? "border-destructive text-destructive" : "border-yellow-500 text-yellow-600"}>
        <AlertTriangle className="h-3 w-3 mr-1" />
        {level === "low" ? "Baixa confiança" : "Média confiança"}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">Conferir Dados</h2>
          <p className="text-xs text-muted-foreground">Revise e corrija antes de salvar</p>
        </div>
      </div>

      {/* Preview */}
      {imagePreview && (
        <div className="rounded-lg overflow-hidden border max-h-40 flex items-center justify-center bg-muted">
          <img src={imagePreview} alt="Cartão" className="max-h-40 object-contain" />
        </div>
      )}

      {/* Duplicate alert */}
      {showDuplicateAlert && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Possível duplicidade encontrada
                </p>
                {duplicates.map((d) => (
                  <p key={d.id} className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
                    {d.nome} — {d.email || d.telefone}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Person data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" /> Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-xs">Nome *</Label>
              <ConfidenceBadge field="person_name" />
            </div>
            <Input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Nome completo" />
          </div>
          <div>
            <Label className="text-xs">Cargo</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Cargo / Função" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-xs">Empresa</Label>
              <ConfidenceBadge field="company_name" />
            </div>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome da empresa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-xs">Telefone</Label>
                <ConfidenceBadge field="phone" />
              </div>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" />
            </div>
            <div>
              <Label className="text-xs">WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-xs">E-mail</Label>
              <ConfidenceBadge field="email" />
            </div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" type="email" />
          </div>
          <div>
            <Label className="text-xs">Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Endereço</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Cidade</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Estado</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">País</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Classification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="h-4 w-4" /> Classificação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Tipo do contato</Label>
            <Select value={contactType} onValueChange={setContactType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agente_viagens">Agente de viagens</SelectItem>
                <SelectItem value="fornecedor">Fornecedor</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {contactType === "cliente" && (
            <div>
              <Label className="text-xs">Já é cliente?</Label>
              <Select value={isExistingClient} onValueChange={setIsExistingClient}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Já é cliente</SelectItem>
                  <SelectItem value="nao">Ainda não é cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {contactType === "fornecedor" && (
            <>
              <div>
                <Label className="text-xs">Escopo geográfico</Label>
                <Select value={geoScope} onValueChange={setGeoScope}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="internacional">Internacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={supplierCategory} onValueChange={setSupplierCategory}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="destino">Destino</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="parque">Parque</SelectItem>
                    <SelectItem value="companhia_aerea">Companhia aérea</SelectItem>
                    <SelectItem value="operadora">Operadora</SelectItem>
                    <SelectItem value="consolidadora">Consolidadora</SelectItem>
                    <SelectItem value="locacao_carro">Locação de carro</SelectItem>
                    <SelectItem value="guia">Guia</SelectItem>
                    <SelectItem value="dmc">DMC</SelectItem>
                    <SelectItem value="seguro_viagem">Seguro viagem</SelectItem>
                    <SelectItem value="cruzeiro">Cruzeiro</SelectItem>
                    <SelectItem value="receptivo">Receptivo</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Extra fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Informações Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Evento de origem</Label>
            <Input value={eventOrigin} onChange={(e) => setEventOrigin(e.target.value)} placeholder="Ex: ABAV Expo 2026" />
          </div>
          <div>
            <Label className="text-xs">Temperatura do lead</Label>
            <Select value={leadTemp} onValueChange={setLeadTemp}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quente">🔥 Quente</SelectItem>
                <SelectItem value="morno">🟡 Morno</SelectItem>
                <SelectItem value="frio">🧊 Frio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Próxima ação</Label>
            <Select value={nextAction} onValueChange={setNextAction}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="enviar_whatsapp">Enviar WhatsApp</SelectItem>
                <SelectItem value="enviar_apresentacao">Enviar apresentação</SelectItem>
                <SelectItem value="agendar_reuniao">Agendar reunião</SelectItem>
                <SelectItem value="adicionar_base">Adicionar à base</SelectItem>
                <SelectItem value="sem_acao">Sem ação por enquanto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Anotações rápidas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações sobre o contato..." rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 sticky bottom-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="flex-1 gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar no CRM
        </Button>
      </div>
    </div>
  );
}
