import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV, scrollTo, type AgencyConfig } from "./content";

export function Header({ agency }: { agency: AgencyConfig }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const initial = agency.name.charAt(0).toUpperCase();

  return (
    <header
      className={`sticky top-0 z-30 w-full bg-white transition-shadow ${
        scrolled ? "shadow-[0_2px_12px_-6px_rgba(15,23,42,0.15)]" : ""
      }`}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-3 min-w-0">
          {agency.logoUrl ? (
            <img src={agency.logoUrl} alt={agency.name} className="h-10 w-10 rounded-lg object-contain" />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: agency.primaryColor }}
              aria-hidden
            >
              {initial}
            </div>
          )}
          <div className="leading-tight min-w-0">
            <p className="truncate font-display text-[15px] font-bold text-slate-900 sm:text-base">{agency.name}</p>
          </div>
        </div>

        <nav aria-label="Navegação" className="hidden flex-1 items-center justify-center lg:flex">
          <ul className="flex items-center gap-7 text-[14px] font-medium text-slate-700">
            {NAV.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => scrollTo(n.id)}
                  className="transition-colors hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                  style={{ ["--tw-outline-color" as string]: agency.primaryColor }}
                >
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden w-[120px] lg:block" aria-hidden />

        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <ul className="mx-auto flex max-w-[1280px] flex-col px-5 py-2 sm:px-8">
            {NAV.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    scrollTo(n.id);
                  }}
                  className="w-full py-3 text-left text-[15px] font-medium text-slate-700 hover:text-slate-900"
                >
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}