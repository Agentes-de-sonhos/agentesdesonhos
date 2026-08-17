---
name: White-label Initial Form Grid
description: Grade compartilhada dos formulários iniciais dos 8 serviços white label (linha única no desktop) e CTA "Solicitar"
type: design
---
- `src/lib/agencyInitialGrid.ts` declara o template de colunas por serviço (`lg:grid-cols-[...]`), compartilhado por todos os white labels — nunca criar CSS por agência.
- Desktop (≥1024px): todos os campos visíveis + CTA em UMA linha; mobile 1 coluna, tablet 2 colunas, sem overflow horizontal.
- Larguras: numéricos (adultos, crianças, dias, noites) 4.5–5rem; selects moderados ~8.5–9rem; locais médios ~1.1fr; período maior (1.35–1.5fr); CTA 7.5rem. Sempre `minmax(0, ...)` + `min-w-0`.
- Rótulos com `lg:[&_label]:min-h-[2.1rem]` + `md:items-end` para alinhar labels e caixas; textos de ajuda ficam absolutos sob o campo (`lg:absolute`) para não mudar a grade.
- CTA do bloco inicial: "Solicitar" + seta (nunca "Solicitar cotação"). Botões do modal posterior não mudam.
- Textos "…no mesmo calendário." não aparecem no bloco inicial (help do período não é passado ao TripDatePicker); a ajuda de "Quantidade de dias" (Ingressos) permanece.
