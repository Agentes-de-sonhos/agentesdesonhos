import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { QAFeed } from "@/components/qa/QAFeed";
import { QARankingSidebar } from "@/components/qa/QARankingSidebar";
import { Plus, Search, MessageCircleQuestion, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGamification } from "@/hooks/useGamification";

export default function PerguntasRespostas() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const { myPoints } = useGamification();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Premium Hero Block */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/8 to-accent/15" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/8 rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />

          <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 bg-primary/15 backdrop-blur-sm rounded-full px-3 py-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Comunidade</span>
                  </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                  Comunidade de Agentes
                  <br />
                  <span className="text-primary">de Viagem</span>
                </h1>
                <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
                  Faça perguntas, compartilhe conhecimento e ganhe pontos ajudando outros agentes da comunidade.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                  <Button onClick={() => setShowNewQuestion(true)} size="lg" className="gap-2 shadow-lg shadow-primary/25 rounded-xl">
                    <Plus className="h-4 w-4" />
                    Fazer uma pergunta
                  </Button>
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar na comunidade..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-11 bg-background/70 backdrop-blur-sm border-primary/15 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Stats mini cards */}
              <div className="flex flex-row md:flex-col gap-3">
                <div className="flex-1 md:w-44 bg-background/60 backdrop-blur-sm rounded-xl border border-border/50 p-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{myPoints}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Seus pontos</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 md:w-44 bg-background/60 backdrop-blur-sm rounded-xl border border-border/50 p-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center">
                      <MessageCircleQuestion className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">Pergunte e ganhe</p>
                      <p className="text-xs font-semibold text-foreground">+0.25 pts</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content: Feed + Ranking side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed - 2/3 */}
          <div className="lg:col-span-2">
            <QAFeed
              searchQuery={searchQuery}
              showNewQuestionDialog={showNewQuestion}
              onCloseNewQuestion={() => setShowNewQuestion(false)}
            />
          </div>

          {/* Ranking sidebar - 1/3 */}
          <div className="lg:col-span-1">
            <QARankingSidebar />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
