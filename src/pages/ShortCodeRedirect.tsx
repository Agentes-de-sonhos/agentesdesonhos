import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ShortCodeRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) {
      setError("Link inválido");
      return;
    }

    const resolve = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('resolve_trip_short_code', {
          p_code: code,
        });
        if (rpcError) throw rpcError;
        const result = data as any;
        if (result.error) {
          setError(result.error);
          return;
        }
        navigate(`/c/${result.slug}`, { replace: true });
      } catch (err: any) {
        setError("Link não encontrado");
      }
    };

    resolve();
  }, [code, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground">Este link pode ter expirado ou não existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
