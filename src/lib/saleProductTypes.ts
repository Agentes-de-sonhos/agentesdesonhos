import type { ProductType } from "@/types/financial";

/**
 * Espelho em TypeScript da função `public.canonical_sale_product_type`.
 *
 * O CHECK de `sale_products.product_type` só aceita um domínio fechado. Os
 * tipos de serviço que circulam no produto vêm de várias origens (extração por
 * IA, importações, formulários antigos) e usam sinônimos em inglês e português.
 * Toda gravação de produto financeiro precisa passar por aqui para não derrubar
 * a transação inteira por um alias não previsto.
 */
export function canonicalSaleProductType(serviceType?: string | null): ProductType {
  switch ((serviceType ?? "").trim().toLowerCase()) {
    case "flight":
    case "aereo":
    case "aéreo":
    case "air":
    case "airfare":
    case "passagem":
      return "aereo";
    case "hotel":
    case "hospedagem":
    case "lodging":
    case "accommodation":
      return "hotel";
    case "insurance":
    case "seguro":
      return "seguro";
    case "cruise":
    case "cruzeiro":
      return "cruzeiro";
    case "transfer":
    case "transport":
    case "transporte":
      return "transfer";
    case "attraction":
    case "atracao":
    case "atração":
    case "ingresso":
    case "ingressos":
    case "ticket":
    case "tour":
    case "passeio":
      return "atracao";
    case "car_rental":
    case "rental_car":
    case "car":
    case "locacao":
    case "locação":
    case "locacao_veiculo":
      return "locacao";
    case "package":
    case "pacote":
      return "pacote";
    default:
      return "outro";
  }
}
