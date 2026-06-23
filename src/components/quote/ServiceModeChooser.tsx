import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getServiceTheme } from "@/lib/serviceTheme";
import type { ServiceType } from "@/types/quote";

export type ChooserMode = "manual" | "wizard" | "import";

interface Props {
  serviceType: ServiceType;
  /** Override title sentence (defaults to "Como você quer preencher {label}?") */
  title?: string;
  /** Override description text for the AI card body */
  importDescription?: string;
  /** Second card configuration — defaults to "Preencher manualmente / Formulário tradicional" */
  secondaryMode?: "manual" | "wizard";
  secondaryLabel?: string;
  secondaryTitle?: string;
  secondaryDescription?: string;
  onChoose: (mode: ChooserMode) => void;
}

export function ServiceModeChooser({
  serviceType,
  title,
  importDescription,
  secondaryMode = "manual",
  secondaryLabel = "Preencher manualmente",
  secondaryTitle = "Formulário tradicional",
  secondaryDescription,
  onChoose,
}: Props) {
  const theme = getServiceTheme(serviceType);
  const Icon = theme.Icon;
  const labelLower = theme.label.toLowerCase();
  const heading = title ?? `Como você quer preencher ${labelLower}?`;
  const importDesc = importDescription
    ?? `A IA lê a reserva, extrai os dados principais de ${labelLower} e abre a tela de revisão.`;
  const secondaryDesc = secondaryDescription
    ?? `Digite os dados de ${labelLower} campo a campo.`;

  return (
    <div className={cn("rounded-2xl p-5 sm:p-6 space-y-5", theme.bgSoft)}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border",
            theme.borderStrong,
          )}
        >
          <Icon className={cn("h-5 w-5", theme.iconStrong)} />
        </span>
        <div className="min-w-0">
          <p className={cn("text-xs font-semibold uppercase tracking-wide", theme.textStrong)}>
            {theme.label}
          </p>
          <h3 className="text-base sm:text-lg font-semibold leading-tight">
            {heading}
          </h3>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* AI import — themed primary card */}
        <button
          type="button"
          onClick={() => onChoose("import")}
          className={cn(
            "text-left rounded-xl border-2 p-4 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5",
            "bg-white",
            theme.borderStrong,
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-md",
                theme.bgSoft,
              )}
            >
              <Sparkles className={cn("h-3.5 w-3.5", theme.iconStrong)} />
            </span>
            <span className={cn("text-xs font-bold uppercase tracking-wide", theme.textStrong)}>
              Importar com IA
            </span>
          </div>
          <p className="font-semibold mb-1 text-foreground">Enviar PDF, imagem ou texto</p>
          <p className="text-sm text-muted-foreground">{importDesc}</p>
        </button>

        {/* Secondary — neutral manual / wizard card */}
        <button
          type="button"
          onClick={() => onChoose(secondaryMode)}
          className={cn(
            "group text-left rounded-xl border bg-white p-4 transition-all",
            "border-border hover:-translate-y-0.5 hover:shadow-sm hover:border-foreground/30",
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {secondaryLabel}
            </span>
          </div>
          <p className="font-semibold mb-1 text-foreground">{secondaryTitle}</p>
          <p className="text-sm text-muted-foreground">{secondaryDesc}</p>
        </button>
      </div>
    </div>
  );
}

/** Compact contextual header for the manual form modal (icon + service name). */
export function ServiceFormHeader({
  serviceType,
  subtitle,
}: {
  serviceType: ServiceType;
  subtitle?: string;
}) {
  const theme = getServiceTheme(serviceType);
  const Icon = theme.Icon;
  return (
    <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border",
          theme.bgSoft,
          theme.borderStrong,
        )}
      >
        <Icon className={cn("h-4 w-4", theme.iconStrong)} />
      </span>
      <div className="min-w-0">
        <p className={cn("text-xs font-semibold uppercase tracking-wide", theme.textStrong)}>
          {theme.label}
        </p>
        <p className="text-sm text-muted-foreground leading-tight">
          {subtitle ?? `Preencha os dados de ${theme.label.toLowerCase()}.`}
        </p>
      </div>
    </div>
  );
}