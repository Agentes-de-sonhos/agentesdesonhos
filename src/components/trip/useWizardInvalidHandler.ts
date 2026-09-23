import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import type { FieldErrors } from "react-hook-form";
import { toast } from "@/hooks/use-toast";

export const WALLET_REQUIRED_MESSAGE = "Preencha os campos obrigatórios para adicionar o serviço.";

function labelFor(el: HTMLElement, root: HTMLElement): string | null {
  const id = el.id;
  const label = id ? (root.querySelector(`label[for="${CSS.escape(id)}"]`) as HTMLElement | null) : null;
  const text = (label?.textContent || "").replace(/\*/g, "").replace(/Campo obrigatório/gi, "").trim();
  return text || null;
}

function invalidIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[aria-invalid="true"]'));
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
        found.forEach((el) => add(labelFor(el, root)));
      }
      flushSync(() => setStep(firstStep >= 0 ? firstStep : currentStep));
    } else if (root) {
      invalidIn(root).forEach((el) => add(labelFor(el, root)));
    }

    toast({
      title: WALLET_REQUIRED_MESSAGE,
      description: labels.length ? `Pendências: ${labels.join(", ")}.` : undefined,
      variant: "destructive",
    });

    const target = root ? invalidIn(root)[0] : null;
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
