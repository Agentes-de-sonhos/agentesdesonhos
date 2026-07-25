import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  phase?: string;
  routeOverride?: string;
  metadata?: Record<string, unknown>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global React error boundary so an unexpected render error never leaves
 * the user staring at a fully blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log useful debugging info
    console.error("[ErrorBoundary] Render error:", error, info);
    void this.recordStructuredError(error, info);

    // Stale dynamic-import chunks: after a redeploy the previously loaded
    // index.html can still hold references to hashed chunks that no longer
    // exist (HTTP 404). React throws a ChunkLoadError / "Failed to fetch
    // dynamically imported module". Force a one-time hard reload to pick
    // up the fresh manifest so the user is never stuck.
    const msg = String(error?.message || "");
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /Loading chunk [\d]+ failed/i.test(msg) ||
      /Importing a module script failed/i.test(msg);

    if (isChunkError) {
      try {
        const key = "__chunk_reload_attempted";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
          return;
        }
      } catch {
        // ignore storage errors and fall through to fallback UI
      }
    }
  }

  handleReload = () => {
    try {
      sessionStorage.removeItem("__chunk_reload_attempted");
    } catch {
      /* noop */
    }
    window.location.reload();
  };

  handleGoHome = () => {
    try {
      sessionStorage.removeItem("__chunk_reload_attempted");
    } catch {
      /* noop */
    }
    window.location.assign("/dashboard");
  };

  private async recordStructuredError(error: Error, info: ErrorInfo) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: membership } = await (supabase as any)
        .from("agency_membership")
        .select("agency_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const limit = (value: unknown, max: number) => {
        const text = String(value ?? "");
        return text.length > max ? `${text.slice(0, max)}…` : text;
      };

      await (supabase as any).from("app_error_logs").insert({
        user_id: user.id,
        agency_id: membership?.agency_id ?? null,
        route: this.props.routeOverride ?? `${window.location.pathname}${window.location.search}`,
        phase: this.props.phase ?? "react-render",
        error_name: limit(error.name || "Error", 120),
        error_message: limit(error.message || "Erro sem mensagem", 1000),
        component_stack: limit(info.componentStack, 4000),
        stack: limit(error.stack, 4000),
        user_agent: limit(window.navigator.userAgent, 500),
        metadata: {
          hostname: window.location.hostname,
          timestamp: new Date().toISOString(),
          ...this.props.metadata,
        },
      });
    } catch (logError) {
      console.warn("[ErrorBoundary] Structured error log failed:", logError);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-semibold">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              Tivemos um problema inesperado ao carregar esta área. Atualize a
              página para tentar novamente. Se o problema persistir, fale com o
              suporte.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                onClick={this.handleReload}
              >
                Atualizar página
              </Button>
              <Button
                type="button"
                onClick={this.handleGoHome}
                variant="outline"
              >
                Voltar ao Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}