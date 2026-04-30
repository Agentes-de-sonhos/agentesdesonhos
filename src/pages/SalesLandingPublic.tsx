import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

interface PublicLanding {
  id: string;
  slug: string;
  headline: string;
  subheadline: string | null;
  description: string | null;
  cta_text: string;
  image_url: string | null;
  primary_color: string;
  agent_name: string | null;
}

function getOrCreateSessionHash(): string {
  try {
    const k = "lp_session_hash";
    let v = localStorage.getItem(k);
    if (!v) {
      v =
        Math.random().toString(36).slice(2) +
        Date.now().toString(36) +
        Math.random().toString(36).slice(2);
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export default function SalesLandingPublic() {
  const { slug: paramSlug } = useParams();
  // Support both /lp/:slug and root path on lp.vitrine.tur.br
  const slug =
    paramSlug ||
    (typeof window !== "undefined"
      ? window.location.pathname.replace(/^\/+|\/+$/g, "")
      : "");

  const [landing, setLanding] = useState<PublicLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const tracked = useRef(false);

  useEffect(() => {
    if (!slug) {
      setError("Página não encontrada");
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error: rpcErr } = await supabase.rpc("get_public_sales_landing", {
        p_slug: slug,
      });
      if (rpcErr || !data || (data as any).error) {
        setError("Página não encontrada");
      } else {
        setLanding(data as unknown as PublicLanding);
      }
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (landing && !tracked.current) {
      tracked.current = true;
      const sessionHash = getOrCreateSessionHash();
      supabase.rpc("track_sales_landing_view", {
        p_slug: landing.slug,
        p_session_hash: sessionHash,
      });
      // Update document title for SEO
      document.title = landing.headline.slice(0, 60);
    }
  }, [landing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!landing) return;
    if (name.trim().length < 2) return;
    if (phone.trim().length < 8) return;
    setSubmitting(true);
    const { data, error: rpcErr } = await supabase.rpc("submit_sales_landing_lead", {
      p_slug: landing.slug,
      p_lead_name: name.trim(),
      p_lead_phone: phone.trim(),
    });
    setSubmitting(false);
    if (rpcErr || (data as any)?.error) {
      setError((data as any)?.error || "Não foi possível enviar. Tente novamente.");
      return;
    }
    setSubmitted(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !landing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="text-center space-y-2">
          <p className="text-2xl font-semibold">Página não encontrada</p>
          <p className="text-gray-500 text-sm">O link pode ter expirado ou estar incorreto.</p>
        </div>
      </div>
    );
  }

  const color = landing.primary_color || "#0f766e";

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: `linear-gradient(135deg, ${color}15, white)` }}
      >
        <div className="text-center space-y-4 max-w-sm">
          <div
            className="h-16 w-16 rounded-full mx-auto flex items-center justify-center"
            style={{ background: color }}
          >
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Recebemos seu contato! 🎉</h1>
          <p className="text-gray-600">
            {landing.agent_name ? landing.agent_name : "O agente"} entrará em contato com você
            pelo WhatsApp em instantes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto">
        {/* Imagem principal */}
        {landing.image_url && (
          <div className="aspect-[4/3] sm:aspect-[16/10] bg-gray-100 overflow-hidden">
            <img
              src={landing.image_url}
              alt={landing.headline}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Conteúdo */}
        <div className="px-5 sm:px-6 py-6 sm:py-8 space-y-4">
          <h1
            className="text-2xl sm:text-3xl font-bold leading-tight"
            style={{ color: "#111" }}
          >
            {landing.headline}
          </h1>

          {landing.subheadline && (
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
              {landing.subheadline}
            </p>
          )}

          {landing.description && (
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed whitespace-pre-line">
              {landing.description}
            </p>
          )}

          {/* CTA */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-4 rounded-2xl text-white font-semibold text-base shadow-lg active:scale-[0.99] transition-transform"
              style={{ background: color }}
            >
              {landing.cta_text}
            </button>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-3 rounded-2xl border p-4 bg-gray-50/50"
            >
              <p className="font-semibold text-sm">Preencha seus dados</p>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                maxLength={120}
                className="w-full px-4 py-3 rounded-xl border bg-white text-base focus:outline-none focus:ring-2"
                style={{ borderColor: "#e5e7eb" }}
              />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="WhatsApp com DDD"
                maxLength={30}
                className="w-full px-4 py-3 rounded-xl border bg-white text-base focus:outline-none focus:ring-2"
                style={{ borderColor: "#e5e7eb" }}
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl text-white font-semibold text-base shadow-lg active:scale-[0.99] transition-transform disabled:opacity-60"
                style={{ background: color }}
              >
                {submitting ? "Enviando..." : "Quero saber mais"}
              </button>
              <p className="text-xs text-gray-500 text-center">
                Seus dados estão seguros e não serão compartilhados.
              </p>
            </form>
          )}

          <p className="text-xs text-gray-400 text-center pt-4">
            {landing.agent_name && `Atendimento por ${landing.agent_name} • `}
            Feito com ♥ em Agentes de Sonhos
          </p>
        </div>
      </div>
    </div>
  );
}