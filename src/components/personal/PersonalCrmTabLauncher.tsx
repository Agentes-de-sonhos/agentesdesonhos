import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  PERSONAL_CRM_TAB_PATH,
  isPersonalCrmTabUser,
  openPersonalCrmTab,
} from "@/lib/personalCrmTab";

/**
 * CUSTOMIZAÇÃO INDIVIDUAL TEMPORÁRIA (ver src/lib/personalCrmTab.ts).
 * Para os demais usuários este componente não renderiza nada e não executa efeito.
 */
export function PersonalCrmTabLauncher() {
  const { user } = useAuth();
  const location = useLocation();
  const [blocked, setBlocked] = useState(false);

  const isTargetUser = isPersonalCrmTabUser(user?.id);

  useEffect(() => {
    if (!isTargetUser) return;
    const result = openPersonalCrmTab({
      userId: user?.id,
      storage: typeof window === "undefined" ? null : window.sessionStorage,
      pathname: location.pathname,
      open: (url, target, features) => window.open(url, target, features),
    });
    if (result === "blocked") setBlocked(true);
    // Roda uma única vez por sessão da aba (a própria função protege contra duplicação).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTargetUser]);

  if (!isTargetUser || !blocked) return null;

  return (
    <div className="fixed bottom-24 right-4 z-40 lg:bottom-6">
      <Button
        size="sm"
        variant="secondary"
        className="shadow-md"
        onClick={() => {
          window.open(PERSONAL_CRM_TAB_PATH, "_blank", "noopener,noreferrer");
          setBlocked(false);
        }}
      >
        <Users className="mr-2 h-4 w-4" />
        Abrir CRM em nova aba
      </Button>
    </div>
  );
}
