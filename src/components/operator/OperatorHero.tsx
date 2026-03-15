interface OperatorHeroProps {
  name: string;
  category: string;
  logoUrl?: string | null;
}

export function OperatorHero({ name, logoUrl }: OperatorHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-primary/10 border border-border/60 p-8 sm:p-10">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative flex items-center gap-5">
        {/* Logo */}
        <div className="h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex items-center justify-center shadow-sm overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="h-full w-full object-contain p-2" />
          ) : (
            <span className="text-2xl font-bold text-primary">
              {name.charAt(0)}
            </span>
          )}
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl tracking-tight">
            {name}
          </h1>
          <p className="text-muted-foreground mt-1">Operadora de Turismo</p>
        </div>
      </div>
    </div>
  );
}
