import { useEffect } from "react";
import { Footer } from "@/components/layout/Footer";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import { useNavigate } from "react-router-dom";

const SORO_SCRIPT_SRC = "https://app.trysoro.com/api/embed/18bb9f90-e619-4a42-b7df-c1dce0cc053a";

const Blog = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Blog | Agentes de Sonhos";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Conteúdo, novidades e insights para profissionais do mercado de turismo.");

    // Inject Soro embed script once
    const existing = document.querySelector(`script[src="${SORO_SCRIPT_SRC}"]`);
    if (!existing) {
      const script = document.createElement("script");
      script.src = SORO_SCRIPT_SRC;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src={logoAgentes} alt="Agentes de Sonhos" className="h-8 w-auto" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full">
        <section className="max-w-4xl mx-auto px-4 py-10 md:py-14">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">Blog</h1>
          <p className="text-muted-foreground text-base md:text-lg mb-8">
            Conteúdo, novidades e insights para profissionais do mercado de turismo.
          </p>
          <div id="soro-blog" className="min-h-[400px]" />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;