import { createContext, useContext, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { REQUIRED_FIELDS_MESSAGE, requiredFieldNames } from "@/lib/serviceFormRequired";

const RequiredFieldsContext = createContext<Set<string> | null>(null);

/**
 * Informa aos rótulos quais campos do formulário são obrigatórios, derivando a
 * lista do schema Zod do próprio serviço. Um único ponto para todos os tipos.
 */
export function RequiredFieldsScope({
  schema,
  children,
}: {
  schema: unknown;
  children: React.ReactNode;
}) {
  const names = useMemo(() => requiredFieldNames(schema), [schema]);
  return <RequiredFieldsContext.Provider value={names}>{children}</RequiredFieldsContext.Provider>;
}

export function useIsRequiredField(name: string | undefined): boolean {
  const names = useContext(RequiredFieldsContext);
  if (!names || !name) return false;
  return names.has(name);
}

/**
 * Resumo de erro exibido junto ao botão Salvar, para o usuário não precisar
 * percorrer o formulário procurando o que falta.
 */
export function RequiredFieldsSummary() {
  const form = useFormContext();
  const { submitCount, errors } = form?.formState ?? { submitCount: 0, errors: {} };
  const hasErrors = Object.keys(errors || {}).length > 0;
  if (!submitCount || !hasErrors) return null;
  return (
    <p
      role="alert"
      aria-live="assertive"
      data-testid="service-form-required-summary"
      className="text-xs font-medium text-destructive"
    >
      {REQUIRED_FIELDS_MESSAGE}
    </p>
  );
}

/** Rodapé padrão: ações + resumo de campos obrigatórios logo abaixo do Salvar. */
export function ServiceFormActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex gap-2 justify-end">{children}</div>
      <div className="flex justify-end text-right">
        <RequiredFieldsSummary />
      </div>
    </div>
  );
}
