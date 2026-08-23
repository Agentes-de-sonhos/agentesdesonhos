import { Eye, EyeOff, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandText } from "@/components/ui/brand-text";
import { type AgencyDomainInfo, agencyDisplayName } from "@/lib/agencyDomains";
import { agencyWhatsappLink } from "@/lib/clientAreaAccess";
import { ClientAreaCodeAccess } from "./ClientAreaCodeAccess";

interface LoginProps {
  info: AgencyDomainInfo;
  email: string;
  password: string;
  showPassword: boolean;
  busy: boolean;
  formError: string | null;
  recoveryNotice: string | null;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onToggleShow: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onRecover: () => void;
}

/**
 * Tela de login da Área do Cliente — apenas apresentação. Toda a lógica de
 * autenticação, rotação de sessão e recuperação permanece na página container
 * (fundação da Etapa 1.1, preservada).
 */
export function ClientAreaLogin({
  info, email, password, showPassword, busy, formError, recoveryNotice,
  onEmail, onPassword, onToggleShow, onSubmit, onRecover,
}: LoginProps) {
  const name = agencyDisplayName(info);
  const whatsapp = agencyWhatsappLink(
    info.phone,
    `Olá! Preciso de ajuda com meu acesso à Área do Cliente da ${name}.`,
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-16">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Apresentação da marca da agência */}
        <div className="order-1 text-center lg:text-left">
          {info.logo_url ? (
            <img
              src={info.logo_url}
              alt={`Logotipo da ${name}`}
              className="mx-auto h-14 w-auto max-w-[220px] object-contain lg:mx-0 lg:h-16"
            />
          ) : (
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground lg:mx-0">
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}

          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Área do Cliente
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground lg:mx-0">
            Acompanhe suas viagens e acesse as informações disponibilizadas pela{" "}
            <BrandText>{name}</BrandText>.
          </p>

          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Acesso exclusivo dos clientes
          </p>

          {whatsapp && (
            <div className="mt-6">
              <Button asChild variant="outline" size="lg" className="min-h-11">
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Falar com a agência
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Formulário */}
        <div className="order-2 space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="ca-email">E-mail</Label>
                <Input
                  id="ca-email"
                  type="email"
                  value={email}
                  onChange={(e) => onEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="username"
                  aria-invalid={formError ? true : undefined}
                  aria-describedby={formError ? "ca-login-error" : undefined}
                  className="min-h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ca-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="ca-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => onPassword(e.target.value)}
                    autoComplete="current-password"
                    aria-invalid={formError ? true : undefined}
                    aria-describedby={formError ? "ca-login-error" : undefined}
                    className="min-h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={onToggleShow}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {formError && (
                <p id="ca-login-error" role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}

              <Button type="submit" size="lg" disabled={busy} className="min-h-12 w-full">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />} Entrar
              </Button>

              <div className="text-center">
                <Button type="button" variant="link" onClick={onRecover} disabled={busy}>
                  Esqueci minha senha
                </Button>
              </div>
            </form>

            {recoveryNotice && (
              <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4" role="status">
                <p className="text-sm text-foreground">{recoveryNotice}</p>
                {whatsapp && (
                  <Button asChild variant="outline" size="sm" className="mt-3 min-h-11">
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Falar com a agência
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>

          <ClientAreaCodeAccess />
        </div>
      </div>
    </section>
  );
}
