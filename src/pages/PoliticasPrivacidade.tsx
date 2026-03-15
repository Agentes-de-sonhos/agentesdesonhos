import { useNavigate } from "react-router-dom";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft } from "lucide-react";

export default function PoliticasPrivacidade() {
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
            <h1 className="text-3xl md:text-4xl font-display font-bold">Políticas de Privacidade</h1>
            <p className="text-muted-foreground">Última atualização: Março de 2026</p>
          </div>

          <div className="prose prose-sm max-w-none space-y-8 text-foreground">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. Dados Coletados</h2>
              <p>Coletamos e tratamos os seguintes dados pessoais:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Dados cadastrais:</strong> Nome completo, e-mail, CPF, telefone</li>
                <li><strong className="text-foreground">Dados profissionais:</strong> CRP (Conselho Regional de Turismo), especializações, histórico de mentorias</li>
                <li><strong className="text-foreground">Dados de uso:</strong> IP, logs de acesso, interações com a plataforma</li>
                <li><strong className="text-foreground">Conteúdo gerado:</strong> Roteiros, materiais de divulgação, posts na comunidade</li>
                <li><strong className="text-foreground">Dados de pagamento:</strong> Apenas metadados de transações (não armazenamos dados de cartão)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. Finalidades do Tratamento</h2>
              <p>Seus dados são usados para:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Fornecer acesso aos recursos da plataforma</li>
                <li>Personalizar recomendações de conteúdo</li>
                <li>Emitir certificados válidos</li>
                <li>Garantir segurança contra fraudes</li>
                <li>Enviar comunicações técnicas e de atualizações</li>
                <li>Gerar estatísticas agregadas para melhoria do serviço</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. Compartilhamento de Dados</h2>
              <p>Seus dados poderão ser compartilhados com:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Fornecedores de serviços:</strong> Hospedagem cloud, ferramentas de análise</li>
                <li><strong className="text-foreground">Autoridades competentes:</strong> Mediante requisição judicial válida</li>
                <li><strong className="text-foreground">Comunidade profissional:</strong> Apenas informações de perfil público escolhidas por você</li>
              </ul>
              <p className="font-medium">Nunca vendemos ou comercializamos dados pessoais.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Direitos do Titular (LGPD)</h2>
              <p>Você pode através da plataforma:</p>
              <ul className="list-none pl-0 space-y-1 text-muted-foreground">
                <li>✅ Acessar todos dados coletados</li>
                <li>✅ Retificar informações desatualizadas</li>
                <li>✅ Revogar consentimentos</li>
                <li>✅ Excluir conta permanentemente</li>
                <li>✅ Baixar dados em formato portável</li>
              </ul>
              <p className="text-muted-foreground">Prazo máximo para atendimento: 15 dias úteis</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. Segurança de Dados</h2>
              <p>Utilizamos:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Criptografia SSL/TLS 256-bit</li>
                <li>Armazenamento em servidores no Brasil</li>
                <li>Autenticação de dois fatores opcional</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">6. Retenção de Dados</h2>
              <p>Mantemos seus dados por:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Período ativo da conta + 5 anos (obrigações legais)</li>
                <li>Materiais públicos: Até exclusão manual</li>
                <li>Logs de acesso: 6 meses</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Contato</h2>
              <p>Encarregado de Proteção de Dados (DPO):</p>
              <ul className="list-none pl-0 space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Nome:</strong> Matheus Rocha</li>
                <li><strong className="text-foreground">E-mail:</strong> suporte@agentesdesonhos.com.br</li>
                <li><strong className="text-foreground">Atendimento:</strong> Seg-Sex, 9h-18h</li>
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
