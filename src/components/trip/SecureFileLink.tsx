import { useState, useCallback } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { getSignedVoucherUrl, getPublicVoucherUrl } from "@/lib/secureVoucher";
import { toast } from "sonner";

interface SecureFileLinkProps {
  filePath: string;
  fileName: string;
  /** For authenticated user access */
  mode?: "authenticated";
  className?: string;
}

interface PublicFileLinkProps {
  filePath: string;
  fileName: string;
  mode: "public";
  slug?: string;
  shareToken?: string;
  password?: string;
  className?: string;
}

type Props = SecureFileLinkProps | PublicFileLinkProps;

export function SecureFileLink(props: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      let url: string | null = null;

      if (props.mode === "public") {
        url = await getPublicVoucherUrl(props.filePath, {
          slug: props.slug,
          share_token: props.shareToken,
          password: props.password,
        });
      } else {
        url = await getSignedVoucherUrl(props.filePath);
      }

      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Não foi possível acessar o arquivo");
      }
    } catch {
      toast.error("Erro ao acessar arquivo");
    } finally {
      setLoading(false);
    }
  }, [props, loading]);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={props.className || "inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer disabled:opacity-50"}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Download className="h-3 w-3" />
      )}
      {props.fileName}
      {!loading && <ExternalLink className="h-3 w-3" />}
    </button>
  );
}
