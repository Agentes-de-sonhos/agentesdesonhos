import { useNavigate } from "react-router-dom";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft } from "lucide-react";

export default function TermosDeUso() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <img
            src={logoAgentes}
            alt="Agentes de Sonhos"
            className="h-9 cursor-pointer"
            onClick={() => navigate("/")}
          />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button size="sm" onClick={() => navigate("/auth?tab=signup")}>
              Cadastrar
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-12 md:py-20">
        <div className="container max-w-3xl space-y-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-display font-bold">Termos de Uso</h1>
            <p className="text-muted-foreground">Última atualização: Março de 2026</p>
          </div>

          <div className="prose prose-sm max-w-none space-y-8 text-foreground">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. Aceitação dos Termos</h2>
              <p>Ao criar conta, você:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Declara ser maior de 18 anos</li>
                <li>Assume responsabilidade pelas informações cadastrais</li>
                <li>Concorda com todas cláusulas aqui presentes</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. Funcionalidades da Plataforma</h2>
              <p>Incluem mas não se limitam a:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Gerenciamento de carteira digital de clientes</li>
                <li>Participação em programas de mentoria</li>
                <li>Uso de ferramentas de IA para criação de conteúdo</li>
                <li>Acesso a materiais de fornecedores parceiros</li>
                <li>Interação em comunidade profissional moderada</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. Responsabilidades do Usuário</h2>
              <p>É proibido:</p>
              <ul className="list-none pl-0 space-y-1 text-muted-foreground">
                <li>❌ Compartilhar acesso à conta</li>
                <li>❌ Usar IA para gerar conteúdo ilegal ou ofensivo</li>
                <li>❌ Copiar materiais protegidos por direitos autorais</li>
                <li>❌ Realizar engenharia reversa da plataforma</li>
                <li>❌ Comercializar dados da comunidade sem autorização</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Propriedade Intelectual</h2>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Conteúdo gerado por IA:</strong> Licença de uso não-exclusiva</li>
                <li><strong className="text-foreground">Materiais de fornecedores:</strong> Uso restrito à plataforma</li>
                <li><strong className="text-foreground">Posts na comunidade:</strong> Licença mundial para exibição</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. Pagamentos e Assinaturas</h2>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Planos podem incluir cobrança recorrente</li>
                <li>Renovação automática, cancelável a qualquer momento</li>
                <li>Reembolsos apenas para serviços não prestados</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">6. Limitação de Responsabilidade</h2>
              <p>Não nos responsabilizamos por:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Conteúdos gerados por terceiros na comunidade</li>
                <li>Interrupções por força maior (ex.: falhas em provedores cloud)</li>
                <li>Uso indevido das ferramentas por usuários</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Rescisão</h2>
              <p>Podemos encerrar contas que:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Violarem estes termos repetidamente</li>
                <li>Estiverem inativas por 24 meses</li>
                <li>Apresentarem risco à segurança da plataforma</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">8. Disposições Gerais</h2>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Foro:</strong> São Paulo/SP</li>
                <li>Atualizações comunicadas por e-mail 30 dias antes</li>
                <li>Serviço regulado pelo Marco Civil da Internet (Lei 12.965/14)</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <div className="border-t border-border/40 bg-card">
        <Footer />
      </div>
    </div>
  );
}
