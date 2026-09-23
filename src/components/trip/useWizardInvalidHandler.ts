import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import type { FieldErrors } from "react-hook-form";
import { toast } from "@/hooks/use-toast";

export const WALLET_REQUIRED_MESSAGE = "Preencha os campos obrigatórios para adicionar o serviço.";

type Invalid = { label: string | null; focus: HTMLElement | null };

/** Localiza campos inválidos pela mensagem de erro exibida (FormMessage) ou aria-invalid. */
function invalidIn(root: HTMLElement): Invalid[] {
  const out: Invalid[] = [];
  const seen = new Set<string>();
  root.querySelectorAll<HTMLElement>('[id$="-form-item-message"]').forEach((msg) => {
    const baseId = msg.id.replace(/-message$/, "");
    if (seen.has(baseId)) return;
    seen.add(baseId);
    const label = root.querySelector(`label[for="${CSS.escape(baseId)}"]`) as HTMLElement | null;
    const item = msg.parentElement;
    const control =
      (root.querySelector(`#${CSS.escape(baseId)}`) as HTMLElement | null) ?? null;
    const focus =
      (control && control.matches("input,textarea,select,button") ? control : null) ??
      (control?.querySelector("input,textarea,select,button") as HTMLElement | null) ??
      (item?.querySelector("input,textarea,select,button") as HTMLElement | null) ??
      control;
    const text = (label?.textContent || "").replace(/\*/g, "").replace(/Campo obrigatório/gi, "").trim();
    out.push({ label: text || null, focus });
  });
  if (!out.length) {
    root.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((el) => out.push({ label: null, focus: el }));
  }
  return out;
}

/**
 * Tratamento compartilhado de validação para os formulários em etapas da
 * Carteira Digital. Ao falhar a validação: percorre as etapas para descobrir
 * quais contêm campos inválidos, volta para a primeira, rola/foca o campo e
 * mostra uma única mensagem com os nomes dos campos pendentes.
 */
export function useWizardInvalidHandler(opts: {
  totalSteps: number;
  currentStep: number;
  setStep: (i: number) => void;
  wizardMode?: boolean;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const onInvalid = useCallback((errors: FieldErrors) => {
    const { totalSteps, currentStep, setStep, wizardMode } = optsRef.current;
    const root = formRef.current;
    const labels: string[] = [];
    const add = (l: string | null) => { if (l && !labels.includes(l)) labels.push(l); };
    let firstStep = -1;

    if (root && wizardMode && totalSteps > 1) {
      for (let i = 0; i < totalSteps; i++) {
        flushSync(() => setStep(i));
        const found = invalidIn(root);
        if (found.length && firstStep < 0) firstStep = i;
        found.forEach((f) => add(f.label));
      }
      flushSync(() => setStep(firstStep >= 0 ? firstStep : currentStep));
    } else if (root) {
      invalidIn(root).forEach((f) => add(f.label));
    }

    toast({
      title: WALLET_REQUIRED_MESSAGE,
      description: labels.length ? `Pendências: ${labels.join(", ")}.` : undefined,
      variant: "destructive",
    });

    const target = root ? invalidIn(root)[0]?.focus ?? null : null;
    const fallbackName = Object.keys(errors || {})[0];
    const el =
      target ??
      (fallbackName && root ? (root.querySelector(`[name="${CSS.escape(fallbackName)}"]`) as HTMLElement | null) : null);
    if (el) {
      try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch { el.scrollIntoView?.(); }
      el.focus?.({ preventScroll: true } as FocusOptions);
    }
  }, []);

  return { formRef, onInvalid };
}
