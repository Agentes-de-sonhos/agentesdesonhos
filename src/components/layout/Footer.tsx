import { Link } from "react-router-dom";
import { PLATFORM_NAME, PLATFORM_VERSION_FULL } from "@/lib/platform-version";

export function Footer() {
  return (
    <footer className="w-full py-4 mt-auto border-t border-border/40">
      <div className="container flex flex-col items-center gap-1">
        <p className="text-xs text-muted-foreground/60">
          {PLATFORM_NAME} •{" "}
          <Link to="/atualizacoes" className="hover:text-primary transition-colors">
            Versão {PLATFORM_VERSION_FULL}
          </Link>
        </p>
        <p className="text-[10px] text-muted-foreground/50">
          Desenvolvido por{" "}
          <span className="font-medium text-muted-foreground/70">Nobre Digital</span>
        </p>
      </div>
    </footer>
  );
}
