/**
 * Compatibilidade de nomes de campos entre a resposta da IA e o modelo usado
 * pelos formulários de serviço.
 *
 * O extrator genérico devolve JSON livre (sem tool schema), então a IA às vezes
 * usa sinônimos ("produto", "descricao", "productName", "ticketType") em vez das
 * chaves canônicas em português. Sem tradução, campos preenchidos pela IA chegam
 * vazios ao formulário — foi o que fez ingressos aparecerem como
 * "Sem nome identificado" mesmo com a descrição legível na linha de origem.
 *
 * Regras:
 * - só preenche a chave canônica quando ela está vazia (não sobrescreve nada);
 * - nunca remove campos originais (o contrato atual segue válido);
 * - quando só há uma descrição combinada, ela é preservada integralmente no nome
 *   e o tipo só é derivado com delimitador/padrão claro.
 */

export type ServiceItemRecord = Record<string, any>;

/** Aliases por chave canônica, por tipo de serviço. */
const ALIASES: Record<string, Record<string, string[]>> = {
  attraction: {
    nome_produto: [
      "nome_produto",
      "nome_do_produto",
      "produto",
      "nome_atracao",
      "atracao",
      "attraction",
      "parque",
      "park",
      "nome",
      "titulo",
      "title",
      "name",
      "product",
      "productName",
      "product_name",
      "servico",
      "item",
      "descricao",
      "description",
      "descricao_completa",
    ],
    tipo_ingresso: [
      "tipo_ingresso",
      "tipo_do_ingresso",
      "tipo",
      "modalidade",
      "ticket_type",
      "ticketType",
      "type",
      "categoria",
      "category",
      "descricao_ingresso",
    ],
  },
  transfer: {
    empresa: ["empresa", "operadora", "company", "companyName", "fornecedor_transfer", "nome"],
    tipo_transfer: ["tipo_transfer", "tipo", "transfer_type", "transferType"],
  },
  insurance: {
    seguradora: ["seguradora", "insurer", "company", "empresa", "nome"],
    plano: ["plano", "plan", "produto", "nome_plano"],
  },
  cruise: {
    companhia: ["companhia", "armador", "company", "empresa", "cruise_line", "cruiseLine"],
    nome_navio: ["nome_navio", "navio", "ship", "shipName", "nome"],
  },
  circuit: {
    nome_circuito: ["nome_circuito", "circuito", "nome", "titulo", "title", "name", "produto"],
    operadora: ["operadora", "empresa", "company", "fornecedor"],
  },
  rail_transport: {
    empresa: ["empresa", "operadora", "company", "ferrovia", "nome"],
  },
  other: {
    descricao_cliente: ["descricao_cliente", "descricao", "description", "nome", "titulo", "title", "name"],
  },
};

function cleanText(value: any): string {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function isEmpty(value: any): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Primeira letra maiúscula, sem mexer no resto (siglas preservadas). */
function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Delimitadores seguros entre "nome" e "tipo/modalidade" de um ingresso. */
const SPLIT_PATTERN = /\s+[-–—]\s+|\s+[|]\s+|:\s+/;

/**
 * Separação conservadora de uma descrição combinada.
 * Retorna o nome e, somente quando houver delimitador claro, o tipo.
 */
export function splitAttractionDescription(description: string): { name: string; type: string } {
  const text = cleanText(description);
  if (!text) return { name: "", type: "" };

  const match = SPLIT_PATTERN.exec(text);
  if (match && match.index > 0) {
    const name = text.slice(0, match.index).trim();
    const type = text.slice(match.index + match[0].length).trim();
    // Só aceita a separação quando as duas partes têm conteúdo aproveitável.
    if (name.length >= 2 && type.length >= 2) {
      return { name, type: capitalizeFirst(type) };
    }
  }

  // "Combo SeaWorld + Busch Gardens": sem delimitador inequívoco, preserva a
  // descrição completa no nome e usa o padrão reconhecido como tipo.
  const comboMatch = /^(combo|pacote|passaporte|passe)\b/i.exec(text);
  if (comboMatch) {
    return { name: text, type: capitalizeFirst(comboMatch[1].toLowerCase()) };
  }

  return { name: text, type: "" };
}

/**
 * Traduz aliases para as chaves canônicas do formulário e aplica o fallback
 * conservador de nome/tipo para ingressos. Não altera valores já preenchidos.
 */
export function normalizeServiceItemFields<T extends ServiceItemRecord>(
  serviceType: string | undefined,
  item: T,
): T {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;

  const map = serviceType ? ALIASES[serviceType] : undefined;
  if (!map) return item;

  const out: ServiceItemRecord = { ...item };

  for (const [canonical, aliases] of Object.entries(map)) {
    if (!isEmpty(out[canonical])) continue;
    for (const alias of aliases) {
      const value = cleanText(out[alias]);
      if (value) {
        out[canonical] = value;
        break;
      }
    }
  }

  if (serviceType === "attraction") {
    const name = cleanText(out.nome_produto);
    const type = cleanText(out.tipo_ingresso);
    if (name && !type) {
      const split = splitAttractionDescription(name);
      out.nome_produto = split.name || name;
      if (split.type) out.tipo_ingresso = split.type;
    } else if (name) {
      out.nome_produto = name;
      out.tipo_ingresso = type;
    }
  }

  return out as T;
}
