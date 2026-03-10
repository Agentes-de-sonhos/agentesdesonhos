import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QAFeed } from "@/components/qa/QAFeed";
import { QARanking } from "@/components/qa/QARanking";
import { MessageCircleQuestion, Trophy, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PerguntasRespostas() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewQuestion, setShowNewQuestion] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero Block */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/20 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Comunidade</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Comunidade de Agentes de Viagem
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm md:text-base">
              Faça perguntas, compartilhe conhecimento e ganhe pontos ajudando outros agentes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <Button onClick={() => setShowNewQuestion(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Fazer uma pergunta
              </Button>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar na comunidade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/80 backdrop-blur-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="feed" className="w-full">
          <TabsList>
            <TabsTrigger value="feed" className="gap-2">
              <MessageCircleQuestion className="h-4 w-4" />
              Perguntas
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-2">
              <Trophy className="h-4 w-4" />
              Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-4">
            <QAFeed
              searchQuery={searchQuery}
              showNewQuestionDialog={showNewQuestion}
              onCloseNewQuestion={() => setShowNewQuestion(false)}
            />
          </TabsContent>

          <TabsContent value="ranking" className="mt-4">
            <QARanking />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
