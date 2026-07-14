import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  componentDidCatch(error: Error, info: unknown) {
    // Log useful debugging info
    console.error("[ErrorBoundary] Render error:", error, info);

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
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Atualizar página
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}