import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { QAFeed } from "@/components/qa/QAFeed";
import { QARankingSidebar } from "@/components/qa/QARankingSidebar";
import { MessageCircleQuestion, Users, Sparkles, TrendingUp } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";

export default function PerguntasRespostas() {
  const { myPoints } = useGamification();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero - compact, editorial */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/8" />
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/6 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-accent/8 rounded-full blur-3xl" />

          <div className="relative z-10 p-5 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <MessageCircleQuestion className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight">
                    Perguntas e Respostas
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Pergunte, compartilhe e ganhe pontos
                  </p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-background/60 backdrop-blur-sm rounded-xl border border-border/40 px-3.5 py-2">
                <Sparkles className="h-4 w-4 text-warning" />
                <div>
                  <p className="text-base font-bold text-foreground leading-none">{myPoints}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">pontos</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
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
