# Club Med na neve — formato de dados (um arquivo JSON por país: data/<pais>.json, array de objetos)

{
  "slug": "alpe-d-huez",                 // kebab-case, único
  "kind": "resort" | "chalet",           // chalés são produtos relacionados próprios
  "relatedTo": "valmorel",               // só para chalés: slug do resort vizinho
  "name": "Club Med Alpe d'Huez",
  "country": "França", "countryKey": "franca",   // franca|italia|suica|canada|japao|china
  "region": "Isère, Alpes franceses",
  "village": "Alpe d'Huez",
  "status": "confirmado" | "nao_confirmado",     // disponibilidade atual no site oficial
  "statusNote": "texto curto se houver dúvida (reabertura, fechado, só verão etc.)",
  "category": "Premium" | "Exclusive Collection" | ...,  // somente se oficial
  "altitude": "1 850 m" | null,          // somente confirmado na fonte
  "skiArea": { "name": "Alpe d'Huez Grand Domaine", "km": 250, "note": "..." } | null,
  "season": "texto da temporada de inverno conforme fonte" | null,
  "skiInSkiOut": true | false | null,    // true SOMENTE se a página oficial afirma; null se não comprovado
  "tagline": "frase curta",
  "whyChoose": [ { "title": "...", "text": "2-4 frases concretas e explicadas" } ],  // 5 a 7 razões
  "highlights": ["..."],                 // 6-10 itens curtos
  "location": "parágrafo",
  "accommodation": "parágrafo",
  "dining": "parágrafo",
  "wellness": "parágrafo (lazer/bem-estar)",
  "families": "parágrafo com clubes infantis e restrições de idade (Baby/Petit/Mini/Junior...)",
  "idealFor": ["famílias com crianças pequenas", "..."],
  "differentiators": ["..."],
  "snowBenefits": {
    "included": ["ski pass do domínio X", "aulas coletivas de esqui/snowboard a partir de N anos", ...],
    "extra": ["aluguel de equipamento", "spa", "transfer", "aulas particulares", ...],
    "notes": "observações sobre logística/escola/equipamento"
  },
  "sources": [ { "url": "https://www.clubmed...", "label": "Página oficial", "accessed": "2026-11-12" } ]
}

Regras: português do Brasil; nada de neve garantida; nada inventado; quando a fonte não confirma, use null ou omita e cite em statusNote.
