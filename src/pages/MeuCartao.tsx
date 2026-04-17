import { useState } from "react";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBusinessCards, MAX_BUSINESS_CARDS } from "@/hooks/useBusinessCard";
import { CreditCard, Plus, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdminEditButton } from "@/components/layout/AdminEditButton";
import { BusinessCardListItem } from "@/components/card-wizard/BusinessCardListItem";
import { CreateCardDialog } from "@/components/card-wizard/CreateCardDialog";

function MeuCartaoContent() {
  const { cards, isLoading, createCard, deleteCard, cardCount, canCreate } = useBusinessCards();
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreate = ({ slug, label }: { slug: string; label: string }) => {
    createCard.mutate(
      { slug, label },
      {
        onSuccess: (created) => {
          setDialogOpen(false);
          if (created?.id) navigate(`/meu-cartao/${created.id}`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              Meus Cartões Virtuais
            </h1>
            <p className="text-sm text-muted-foreground">
              Você pode ter até {MAX_BUSINESS_CARDS} cartões ativos —
              {" "}
              <span className="font-medium text-foreground">
                {cardCount}/{MAX_BUSINESS_CARDS} em uso
              </span>
              .
            </p>
          </div>
          <AdminEditButton adminTab="business-cards" />
        </div>

        {/* Empty state */}
        {cards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Você ainda não tem cartões
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Crie seu primeiro cartão de visita digital profissional. Você pode ter
                  diferentes cartões para contextos distintos.
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Criar meu primeiro cartão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Grid of cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card) => (
                <BusinessCardListItem
                  key={card.id}
                  card={card}
                  onDelete={(id) => deleteCard.mutate(id)}
                  isDeleting={deleteCard.isPending}
                />
              ))}

              {/* "Create new" tile */}
              {canCreate ? (
                <button
                  onClick={() => setDialogOpen(true)}
                  className="rounded-lg border-2 border-dashed border-border bg-card hover:border-primary hover:bg-accent/30 transition-colors min-h-[280px] flex flex-col items-center justify-center gap-3 p-6 text-center group"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">Criar novo cartão</p>
                    <p className="text-xs text-muted-foreground">
                      {MAX_BUSINESS_CARDS - cardCount} {MAX_BUSINESS_CARDS - cardCount === 1 ? "vaga restante" : "vagas restantes"}
                    </p>
                  </div>
                </button>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 min-h-[280px] flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground text-sm">
                      Limite atingido
                    </p>
                    <p className="text-xs text-muted-foreground max-w-[200px]">
                      Você já atingiu o limite de {MAX_BUSINESS_CARDS} cartões. Exclua um existente para liberar espaço.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <CreateCardDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={handleCreate}
          isPending={createCard.isPending}
        />
      </div>
    </DashboardLayout>
  );
}

export default function MeuCartao() {
  return (
    <SubscriptionGuard feature="business_card">
      <MeuCartaoContent />
    </SubscriptionGuard>
  );
}
