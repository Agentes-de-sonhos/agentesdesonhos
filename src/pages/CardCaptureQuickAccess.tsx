import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BusinessCardCapture } from "@/components/admin/card-capture/BusinessCardCapture";
import { Loader2, ShieldX, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function CardCaptureQuickAccess() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validate = async () => {
      const { data, error } = await supabase.rpc("validate_quick_access_token", {
        _token: token,
      });

      if (error || !data) {
        setStatus("invalid");
      } else {
        setStatus("valid");
      }
    };

    validate();
  }, [token]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validando acesso...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
            <ShieldX className="h-14 w-14 text-destructive" />
            <h1 className="text-xl font-bold">Acesso inválido</h1>
            <p className="text-sm text-muted-foreground">
              Este link expirou ou é inválido. Gere um novo token no painel administrativo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold">Captura de Cartão</h1>
            <p className="text-[11px] text-muted-foreground">Acesso rápido para eventos</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4">
        <BusinessCardCapture quickAccessToken={token} />
      </div>
    </div>
  );
}
