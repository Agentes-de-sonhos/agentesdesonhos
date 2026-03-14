import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Plus, Trash2, GripVertical, Lightbulb } from "lucide-react";
import { CardButton } from "@/hooks/useBusinessCard";
import { toast } from "sonner";

const MAX_BUTTONS = 6;

const EXAMPLES = [
  "Promoções da semana",
  "Pacotes internacionais",
  "Pacotes nacionais",
  "Cruzeiros",
  "Ingressos Disney",
  "Minha vitrine de viagens",
  "Fale comigo no WhatsApp",
  "Agendar atendimento",
  "Formas de pagamento",
];

interface StepButtonsProps {
  buttons: CardButton[];
  setButtons: (buttons: CardButton[]) => void;
  onSave: () => void;
  onBack: () => void;
  isPending: boolean;
}

export function StepButtons({ buttons, setButtons, onSave, onBack, isPending }: StepButtonsProps) {
  const addButton = () => {
    if (buttons.length >= MAX_BUTTONS) {
      toast.error(`Máximo de ${MAX_BUTTONS} botões.`);
      return;
    }
    setButtons([...buttons, { text: "", url: "" }]);
  };

  const removeButton = (i: number) => setButtons(buttons.filter((_, idx) => idx !== i));

  const updateButton = (i: number, field: keyof CardButton, value: string) => {
    const updated = [...buttons];
    updated[i] = { ...updated[i], [field]: value };
    setButtons(updated);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Botões de ação</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione botões que levarão seus clientes para links importantes.
          </p>
        </div>

        {/* Examples */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm font-medium text-foreground">Exemplos para se inspirar:</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <span key={ex} className="text-xs bg-background border border-border rounded-full px-2.5 py-1 text-muted-foreground">
                {ex}
              </span>
            ))}
          </div>
        </div>

        {/* Buttons list */}
        <div className="space-y-3">
          {buttons.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum botão adicionado ainda.</p>
          )}
          {buttons.map((btn, i) => (
            <div key={i} className="flex items-start gap-2">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-2.5 shrink-0" />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome do botão</Label>
                  <Input
                    placeholder="Ex: Promoções da semana"
                    value={btn.text}
                    onChange={(e) => updateButton(i, "text", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">URL do botão</Label>
                  <Input
                    placeholder="https://..."
                    value={btn.url}
                    onChange={(e) => updateButton(i, "url", e.target.value)}
                  />
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeButton(i)} className="shrink-0 mt-5">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addButton}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar botão
        </Button>

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
