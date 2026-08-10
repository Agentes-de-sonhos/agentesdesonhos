import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Lock, Trash2, ShieldCheck } from "lucide-react";

/**
 * Public (no-login) homepage for the Google Calendar integration.
 * Used as the "App homepage" URL of the Google OAuth verification process.
 */
export default function GoogleCalendarIntegracao() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-14 space-y-10">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Integração oficial · Agentes de Sonhos
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Agentes de Sonhos e o Google Calendar
          </h1>
          <p className="text-muted-foreground text-lg">
            O Agentes de Sonhos é uma plataforma de gestão para agentes e agências de viagens
            (clientes, orçamentos, viagens, roteiros e agenda de compromissos). A integração com o
            Google Calendar é opcional e existe com uma única finalidade: manter a sua Agenda da
            plataforma e o seu Google Calendar sincronizados, para que você não precise digitar o
            mesmo compromisso duas vezes.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Como funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>
              Você conecta a integração dentro da sua conta, em <strong className="text-foreground">Agenda →
              Conectar Google Calendar</strong>. A partir daí:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>eventos criados no Google Calendar aparecem na Agenda da plataforma;</li>
              <li>eventos criados na plataforma aparecem no seu Google Calendar principal;</li>
              <li>alterações de título, data, hora, local e descrição são propagadas nos dois sentidos;</li>
              <li>quando o mesmo evento é alterado nos dois lados, registramos o conflito e mostramos para você decidir.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Permissões solicitadas (apenas duas)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">
                https://www.googleapis.com/auth/calendar.events
              </p>
              <p>
                Ler, criar, atualizar e excluir eventos do seu calendário principal. É o mínimo
                necessário para a sincronização nos dois sentidos.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">
                https://www.googleapis.com/auth/calendar.calendars.readonly
              </p>
              <p>
                Ler somente a configuração do calendário principal (o fuso horário), para que
                horários e eventos de dia inteiro apareçam na hora correta.
              </p>
            </div>
            <p>
              Não pedimos acesso a Gmail, Drive, Contatos, nem a qualquer outra permissão além
              dessas duas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-4 w-4" /> Dados usados e segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <ul className="list-disc pl-6 space-y-1">
              <li>Usamos título, descrição, data, hora, fuso horário, local, recorrência e status do evento.</li>
              <li>Guardamos identificadores técnicos do evento e do calendário apenas para evitar duplicidades.</li>
              <li>As credenciais do Google ficam criptografadas em repouso (AES-256-GCM) e são acessíveis somente pelos serviços internos de sincronização.</li>
              <li>O acesso ao banco é restrito por usuário: ninguém vê a agenda de outra conta.</li>
              <li>Não vendemos seus dados, não usamos para publicidade e não treinamos modelos de IA com eles.</li>
            </ul>
            <p>
              O uso das informações recebidas das APIs do Google segue a{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="underline text-foreground"
              >
                Google API Services User Data Policy
              </a>
              , incluindo os requisitos de <strong className="text-foreground">Limited Use</strong>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Como desconectar e excluir cópias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <ul className="list-disc pl-6 space-y-1">
              <li>Em <strong className="text-foreground">Agenda → Desconectar</strong>, a autorização é revogada no Google e as credenciais são apagadas imediatamente.</li>
              <li>No momento de desconectar você pode marcar a opção de <strong className="text-foreground">apagar as cópias locais</strong> dos eventos importados do Google.</li>
              <li>Nada é apagado no seu Google Calendar — nunca excluímos eventos do lado do Google ao desconectar.</li>
              <li>
                Você também pode revogar o acesso a qualquer momento em{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-foreground"
                >
                  myaccount.google.com/permissions
                </a>
                .
              </li>
            </ul>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Documentos e contato
          </h2>
          <div className="flex flex-wrap gap-4">
            <Link to="/politicasdeprivacidade" className="underline">
              Política de Privacidade
            </Link>
            <Link to="/termosdeuso" className="underline">
              Termos de Uso
            </Link>
            <a href="mailto:contato@agentesdesonhos.com.br" className="underline">
              contato@agentesdesonhos.com.br
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}