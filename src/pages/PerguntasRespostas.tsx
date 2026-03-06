import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QAFeed } from "@/components/qa/QAFeed";
import { QARanking } from "@/components/qa/QARanking";
import { MessageCircleQuestion, Trophy } from "lucide-react";

export default function PerguntasRespostas() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perguntas e Respostas</h1>
          <p className="text-muted-foreground mt-1">
            Tire dúvidas e ajude outros agentes. Ganhe pontos por cada resposta!
          </p>
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
            <QAFeed />
          </TabsContent>

          <TabsContent value="ranking" className="mt-4">
            <QARanking />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
