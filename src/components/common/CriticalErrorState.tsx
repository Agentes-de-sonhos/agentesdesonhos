import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResetSessionButton } from "@/components/settings/ResetSessionButton";

interface CriticalErrorStateProps {
  title?: string;
  description?: string;
  errorMessage?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Visual fallback for critical/fatal errors on key pages (e.g. itinerary
 * generation). Always offers "Try again" and "Reset session" actions so the
 * user is never left looking at a blank screen.
 */
export function CriticalErrorState({
  title = "Algo deu errado",
  description = "Não foi possível concluir a operação. Você pode tentar novamente ou, se o problema persistir, resetar sua sessão.",
  errorMessage,
  onRetry,
  retryLabel = "Tentar novamente",
}: CriticalErrorStateProps) {
  return (
    <Card className="max-w-xl mx-auto border-destructive/30 animate-fade-in">
      <CardContent className="p-6 sm:p-8 text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          {errorMessage ? (
            <p className="text-xs text-muted-foreground/80 font-mono break-words bg-muted/40 rounded-md p-2 mt-2">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          {onRetry ? (
            <Button onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {retryLabel}
            </Button>
          ) : null}
          <ResetSessionButton variant="outline" />
        </div>
      </CardContent>
    </Card>
  );
}
