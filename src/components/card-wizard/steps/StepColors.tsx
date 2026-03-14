import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface StepColorsProps {
  primaryColor: string;
  secondaryColor: string;
  setPrimaryColor: (c: string) => void;
  setSecondaryColor: (c: string) => void;
  onSave: () => void;
  onBack: () => void;
  isPending: boolean;
}

export function StepColors({ primaryColor, secondaryColor, setPrimaryColor, setSecondaryColor, onSave, onBack, isPending }: StepColorsProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Cores do cartão</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Defina as cores que serão utilizadas no seu cartão virtual.
          </p>
        </div>

        <div className="space-y-6">
          {/* Primary */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Cor principal</Label>
            <p className="text-sm text-muted-foreground">
              É a cor mais utilizada no cartão. Recomendamos usar a cor predominante do logotipo da sua empresa.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-12 w-12 rounded-lg cursor-pointer border-0 p-0"
              />
              <span className="text-sm text-muted-foreground font-mono">{primaryColor}</span>
            </div>
          </div>

          {/* Secondary */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Cor secundária</Label>
            <p className="text-sm text-muted-foreground">
              É usada em detalhes e elementos complementares do cartão. Pode ser uma segunda cor do logotipo ou uma cor neutra.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-12 w-12 rounded-lg cursor-pointer border-0 p-0"
              />
              <span className="text-sm text-muted-foreground font-mono">{secondaryColor}</span>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Para escolher uma cor:</p>
          <p>• Clique no quadrado de cor</p>
          <p>• Escolha a cor no seletor</p>
          <p>• Ou insira o código da cor manualmente</p>
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
