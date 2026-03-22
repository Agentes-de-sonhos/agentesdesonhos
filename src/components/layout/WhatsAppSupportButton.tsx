import { MessageCircle } from "lucide-react";

const WHATSAPP_URL = `https://wa.me/5511982853937?text=${encodeURIComponent(
  "Olá! Estou utilizando a plataforma Agentes de Sonhos (versão beta) e gostaria de reportar um problema ou sugerir uma melhoria."
)}`;

export function WhatsAppSupportButton() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-0.5 rounded-2xl bg-[#25D366] px-5 py-2.5 text-white shadow-lg shadow-[#25D366]/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-[#25D366]/40 animate-[pulse_3s_ease-in-out_infinite] sm:flex-row sm:gap-2 sm:py-3 sm:px-6"
    >
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 fill-white" />
        <span className="font-semibold text-sm sm:text-base whitespace-nowrap">
          💬 Suporte – Fale com a gente
        </span>
      </div>
      <span className="text-[10px] sm:text-xs opacity-90 text-center leading-tight">
        Encontrou algum erro ou gostaria de sugerir alguma melhoria?
      </span>
    </a>
  );
}
