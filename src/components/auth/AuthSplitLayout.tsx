import type { ReactNode } from "react";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import logoDark from "@/assets/logo-agentes-de-sonhos-dark.png";
import "./authSplitLayout.css";

/** Destino de suporte já usado pela plataforma (Políticas de Privacidade). */
export const AUTH_SUPPORT_HREF = "mailto:suporte@agentesdesonhos.com.br";

function PanelArt() {
  return (
    <svg className="auth-split__art" viewBox="0 0 900 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="authTrail" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="hsl(189 88% 58%)" stopOpacity="0" />
          <stop offset="0.55" stopColor="hsl(189 88% 58%)" stopOpacity="0.9" />
          <stop offset="1" stopColor="hsl(189 88% 62%)" />
        </linearGradient>
        <radialGradient id="authGlow" cx="0.1" cy="1" r="0.6">
          <stop offset="0" stopColor="hsl(204 90% 45%)" stopOpacity="0.55" />
          <stop offset="1" stopColor="hsl(204 90% 45%)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="900" height="420" fill="url(#authGlow)" />
      <g fill="none" stroke="hsl(199 85% 55%)" strokeWidth="2" strokeOpacity="0.75">
        <path d="M-20 175 C 10 150, 60 150, 95 175 C 120 85, 230 50, 300 95 C 345 125, 360 165, 362 225 C 410 205, 470 215, 500 250 C 540 290, 560 360, 565 440" />
        <path d="M-40 220 C 20 195, 110 205, 140 260 C 185 240, 240 255, 265 300 C 285 335, 285 380, 282 440" strokeOpacity="0.55" />
      </g>
      <path d="M190 405 C 400 340, 560 250, 700 140" fill="none" stroke="url(#authTrail)" strokeWidth="2.5" />
      <path d="M230 425 C 420 360, 580 270, 705 150" fill="none" stroke="url(#authTrail)" strokeWidth="1.5" strokeOpacity="0.6" />
      <path d="M340 440 C 600 330, 790 210, 900 115" fill="none" stroke="hsl(199 85% 55%)" strokeWidth="1.5" strokeOpacity="0.5" />
      <g transform="translate(732 118) rotate(-35) scale(1.25)" fill="hsl(199 85% 55%)">
        <path d="M-26 -3 L 22 -3 C 30 -3, 32 3, 22 3 L -26 3 Z" />
        <path d="M2 -3 L -12 -24 L -5 -24 L 14 -3 Z" />
        <path d="M2 3 L -12 24 L -5 24 L 14 3 Z" />
        <path d="M-22 -3 L -28 -12 L -24 -12 L -16 -3 Z" />
        <path d="M-22 3 L -28 12 L -24 12 L -16 3 Z" />
      </g>
    </svg>
  );
}

interface Props {
  children: ReactNode;
  wide?: boolean;
}

export function AuthSplitLayout({ children, wide }: Props) {
  return (
    <div className="auth-split">
      <aside className="auth-split__panel" aria-hidden="false">
        <img src={logoDark} alt="Agentes de Sonhos" className="auth-split__logo" />
        <div className="auth-split__copy">
          <h2 className="auth-split__headline">
            Sua agência de viagens&nbsp;em um só lugar.
          </h2>
          <p className="auth-split__sub">
            Mais organização para sua agência.
            <br />
            Mais tempo para realizar sonhos.
          </p>
        </div>
        <PanelArt />
      </aside>
      <main className="auth-split__main">
        <img src={logoAgentes} alt="Agentes de Sonhos" className="auth-split__mobile-logo" />
        <div className={`auth-split__form ${wide ? "auth-split__form--wide" : ""}`}>{children}</div>
        <p className="auth-split__credit">Desenvolvido por Nobre Digital</p>
      </main>
    </div>
  );
}
