import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, Rocket, Users, CheckCircle, Share2 } from "lucide-react";

const MENSAGEM_WHATSAPP = `Oi! Tudo bem? 😊

Queria te indicar uma plataforma que estou usando para agentes de viagens. Está bem legal e ainda em pré-lançamento.

Eles liberaram uma condição especial com 30% de desconto, de R$129,70 por R$97,90.

E tem um detalhe importante. Você pode testar sem risco. São 7 dias de garantia, com devolução do valor caso não queira continuar.

Se fizer sentido pra você, vale a pena dar uma olhada 👇
https://app.agentesdesonhos.com.br/desconto30off

Se for entrar, usa esse cupom pra garantir o desconto:
AGENTES30
(Todas as letras em caixa alta)`;

export default function CampanhaIndicacao() {
  const { toast } = useToast();

  const copiar = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    toast({ title: `${label} copiado!`, description: "Cole onde quiser 😉" });
  };

  const passos = [
    { num: "1", text: "Compartilhe o cupom com outros agentes de viagens" },
    { num: "2", text: "O agente entra na plataforma usando o cupom" },
    { num: "3", text: "A cada novo cadastro convertido, você ganha 1 mês grátis" },
  ];

  const recompensas = [
    { indicacoes: "1 indicação", premio: "1 mês grátis" },
    { indicacoes: "3 indicações", premio: "3 meses grátis" },
    { indicacoes: "5 indicações", premio: "5 meses grátis" },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Indique e Ganhe Meses Grátis 🚀</h1>
          <p className="text-muted-foreground">
            Campanha exclusiva para membros fundadores – válida até 31 de março
          </p>
        </div>

        {/* Destaque do benefício */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6 text-center space-y-3">
            <Gift className="h-10 w-10 text-primary mx-auto" />
            <p className="text-lg font-semibold">
              Ofereça <span className="text-primary">30% de desconto</span> para outros agentes
            </p>
            <p className="text-muted-foreground">
              De <span className="line-through">R$129,70</span> por{" "}
              <span className="text-primary font-bold text-xl">R$97,90</span>
            </p>
          </CardContent>
        </Card>

        {/* Como funciona */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Como funciona
          </h2>
          <div className="space-y-3">
            {passos.map((p) => (
              <div key={p.num} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {p.num}
                </span>
                <p className="pt-1 text-sm">{p.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recompensas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Quanto mais indicar, mais ganha
          </h2>
          <div className="grid gap-3">
            {recompensas.map((r) => (
              <Card key={r.indicacoes}>
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium">{r.indicacoes}</span>
                  <span className="text-primary font-bold">{r.premio}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-primary" />
            Sem limite de ganhos • Válida até 31 de março
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-lg font-semibold">
            Agora é com você: comece a indicar e acumular meses grátis! 💸
          </p>
        </div>

        {/* Bloco de compartilhamento */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Mensagem pronta para enviar
          </h2>
          <Card>
            <CardContent className="p-4">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
                {MENSAGEM_WHATSAPP}
              </pre>
            </CardContent>
          </Card>

          <Button onClick={() => copiar(MENSAGEM_WHATSAPP, "Mensagem")} className="w-full">
            <Copy className="h-4 w-4 mr-2" />
            Copiar mensagem
          </Button>
        </div>
      </div>
    </div>
  );
}
