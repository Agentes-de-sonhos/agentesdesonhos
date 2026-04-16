import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const HIDDEN_ROUTES = ["/cadastro-fornecedor", "/meu-perfil-empresa"];

const WHATSAPP_URL = `https://wa.me/5511982853937?text=${encodeURIComponent(
  "Olá! Estou utilizando a plataforma Agentes de Sonhos (versão beta) e gostaria de reportar um problema ou sugerir uma melhoria."
)}`;

function useSidebarWidth() {
  const [width, setWidth] = useState(64);

  useEffect(() => {
    const sidebar = document.getElementById("app-sidebar");
    if (!sidebar) return;

    const observer = new MutationObserver(() => {
      const val = getComputedStyle(sidebar).getPropertyValue("--sidebar-current-width");
      if (val) setWidth(parseInt(val, 10) || 64);
    });

    // Initial read
    const val = getComputedStyle(sidebar).getPropertyValue("--sidebar-current-width");
    if (val) setWidth(parseInt(val, 10) || 64);

    observer.observe(sidebar, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

  return width;
}

export function WhatsAppSupportButton() {
  const { user } = useAuth();
  const location = useLocation();
  const sidebarWidth = useSidebarWidth();

  if (!user || HIDDEN_ROUTES.includes(location.pathname)) return null;

  return (
    <div
      className="fixed bottom-24 lg:bottom-6 z-40 flex items-center gap-3 transition-all duration-300"
      style={{ left: `calc(${sidebarWidth}px + 8px)` }}
    >
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-2xl bg-[#25D366] px-5 py-2.5 text-white shadow-lg shadow-[#25D366]/30 transition-transform duration-200 hover:scale-105"
      >
        <MessageCircle className="h-5 w-5 fill-white" />
        <span className="font-semibold text-sm whitespace-nowrap">
          Suporte
        </span>
      </a>
    </div>
  );
}
