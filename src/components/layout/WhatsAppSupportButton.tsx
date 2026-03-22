import { MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const WHATSAPP_URL = `https://wa.me/5511982853937?text=${encodeURIComponent(
  "Olá! Estou utilizando a plataforma Agentes de Sonhos (versão beta) e gostaria de reportar um problema ou sugerir uma melhoria."
)}`;

export function WhatsAppSupportButton() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3">
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-2xl bg-[#25D366] px-5 py-2.5 text-white shadow-lg shadow-[#25D366]/30 transition-transform duration-200 hover:scale-105"
      >
        <MessageCircle className="h-5 w-5 fill-white" />
        <span className="font-semibold text-sm whitespace-nowrap">
          💬 Suporte – Fale com a gente
        </span>
      </a>
      <span className="text-xs text-muted-foreground max-w-[200px] leading-tight hidden sm:block">
        Encontrou algum erro ou gostaria de sugerir alguma melhoria?
      </span>
    </div>
  );
}
