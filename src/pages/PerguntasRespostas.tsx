import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { QAFeed } from "@/components/qa/QAFeed";
import { QARankingSidebar } from "@/components/qa/QARankingSidebar";
import { MessageCircleQuestion } from "lucide-react";

export default function PerguntasRespostas() {

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          pageKey="perguntas-respostas"
          title="Perguntas e Respostas"
          subtitle="Pergunte, compartilhe e ganhe pontos"
          icon={MessageCircleQuestion}
        />
              </div>
            </div>

            {/* spacer */}
            <div />
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
