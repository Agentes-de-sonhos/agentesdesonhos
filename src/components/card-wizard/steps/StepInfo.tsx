import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Lightbulb } from "lucide-react";

interface FormData {
  name: string;
  title: string;
  agency_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
}

interface StepInfoProps {
  form: FormData;
  setForm: (form: FormData) => void;
  onSave: () => void;
  onBack: () => void;
  isPending: boolean;
}

const FIELDS: { label: string; key: keyof FormData; placeholder?: string }[] = [
  { label: "Nome", key: "name", placeholder: "Seu nome completo" },
  { label: "Cargo / Título", key: "title", placeholder: "Ex: Consultor de Viagens" },
  { label: "Nome da agência", key: "agency_name", placeholder: "Nome da sua agência" },
  { label: "Telefone", key: "phone", placeholder: "(11) 99999-9999" },
  { label: "WhatsApp", key: "whatsapp", placeholder: "(11) 99999-9999" },
  { label: "E-mail", key: "email", placeholder: "seu@email.com" },
  { label: "Site", key: "website", placeholder: "www.suaagencia.com.br" },
];

export function StepInfo({ form, setForm, onSave, onBack, isPending }: StepInfoProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Informações do cartão</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Insira os dados que aparecerão no seu cartão virtual e que seus clientes usarão para entrar em contato com você.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <Label className="text-sm font-medium">{f.label}</Label>
              <Input
                className="mt-1"
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
              {f.key === "whatsapp" && (
                <div className="flex items-start gap-1.5 mt-2">
                  <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <strong>Dica:</strong> o WhatsApp costuma ser o principal canal de contato com clientes.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            Salvar e continuar <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
