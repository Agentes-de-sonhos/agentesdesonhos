/**
 * Campos obrigatórios dos formulários manuais de serviço (orçamentos).
 *
 * A obrigatoriedade é derivada do próprio schema Zod já usado por cada
 * formulário — não existe uma segunda lista para desatualizar, e nenhum campo
 * opcional passa a ser exigido. Os rótulos e a mensagem de erro consomem essas
 * regras, de modo que a marcação vermelha e o resumo no botão Salvar sempre
 * refletem exatamente o que a validação exige.
 */
import { z } from "zod";

export const REQUIRED_FIELD_SUFFIX = "* Campo obrigatório";
export const REQUIRED_FIELDS_MESSAGE = "Preencha os campos obrigatórios para continuar.";

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  const def = (schema as any)?._def;
  if (!def) return schema;
  if (def.innerType) return unwrap(def.innerType);
  if (def.schema) return unwrap(def.schema);
  return schema;
}

/** `true` quando um campo de texto exige conteúdo (tem `min` >= 1). */
function stringRequiresContent(schema: z.ZodTypeAny): boolean {
  const checks = (schema as any)?._def?.checks;
  if (!Array.isArray(checks)) return false;
  return checks.some((c: any) => c?.kind === "min" && (c.value ?? 0) >= 1);
}

/**
 * Nomes dos campos realmente obrigatórios de um schema de serviço.
 * Booleanos (checkboxes) e campos opcionais/anuláveis nunca entram.
 */
export function requiredFieldNames(schema: unknown): Set<string> {
  const shape = (schema as any)?.shape ?? (schema as any)?._def?.shape?.();
  const required = new Set<string>();
  if (!shape || typeof shape !== "object") return required;

  for (const [name, raw] of Object.entries(shape as Record<string, z.ZodTypeAny>)) {
    if (!raw || typeof (raw as any).isOptional !== "function") continue;
    if ((raw as any).isOptional() || (raw as any).isNullable?.()) continue;
    const inner = unwrap(raw);
    const typeName = (inner as any)?._def?.typeName;
    if (typeName === "ZodBoolean" || typeName === "ZodArray") continue;
    if (typeName === "ZodString" && !stringRequiresContent(inner)) continue;
    required.add(name);
  }
  return required;
}

/**
 * Rola suavemente até o primeiro campo inválido, foca e mantém a mensagem
 * específica visível abaixo dele. Nunca obriga o usuário a procurar o erro.
 */
export function focusFirstInvalidField(errors: Record<string, unknown> | undefined): void {
  if (!errors || typeof document === "undefined") return;
  const names = Object.keys(errors);
  for (const name of names) {
    const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(name) : name;
    const el =
      (document.querySelector(`[name="${escaped}"]`) as HTMLElement | null) ??
      (document.querySelector(`[data-field="${escaped}"]`) as HTMLElement | null) ??
      (document.querySelector('[aria-invalid="true"]') as HTMLElement | null);
    if (!el) continue;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      el.scrollIntoView?.();
    }
    if (typeof el.focus === "function") el.focus({ preventScroll: true } as FocusOptions);
    return;
  }
}
