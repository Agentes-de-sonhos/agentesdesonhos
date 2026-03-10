import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { QAFeed } from "@/components/qa/QAFeed";
import { QARankingSidebar } from "@/components/qa/QARankingSidebar";
import { MessageCircleQuestion, Sparkles } from "lucide-react";

export default function PerguntasRespostas() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Compact Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/8 rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl" />

          <div className="relative z-10 p-5 md:p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 bg-primary/15 backdrop-blur-sm rounded-full px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Comunidade</span>
              </div>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight flex items-center gap-2">
              <MessageCircleQuestion className="h-6 w-6 text-primary" />
              Comunidade de Agentes de Viagem
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Faça perguntas, compartilhe conhecimento e ganhe pontos ajudando outros agentes.
            </p>
          </div>
        </div>

        {/* Main content: Feed + Ranking side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <QAFeed />
          </div>
          <div className="lg:col-span-1">
            <QARankingSidebar />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
