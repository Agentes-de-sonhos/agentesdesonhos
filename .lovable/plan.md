## Objetivo
Reintroduzir o logotipo flutuante da agência no orçamento público, posicionado **sobreposto à imagem do destino, na região superior (cabeçalho do hero)**, acima do nome do destino — não centralizado no meio nem invisível como antes.

## Mudanças em `src/pages/OrcamentoPublico.tsx`

1. **Adicionar badge flutuante do logo** dentro do container do hero (a imagem do destino), posicionado absoluto no topo:
   - Posição: `absolute top-4 left-1/2 -translate-x-1/2` (ou `top-6` para respiro), sobre a imagem.
   - Tamanho visível e premium: container `h-16 w-16 sm:h-20 sm:w-20`, fundo branco `rounded-2xl`, sombra suave (`shadow-[0_12px_40px_-8px_rgba(0,0,0,0.35)]`), padding interno para o logo respirar.
   - `<img src={agentProfile?.agency_logo_url}>` com `object-contain` ocupando todo o badge.
   - Renderizar apenas se `agentProfile?.agency_logo_url` existir.
   - z-index acima da imagem mas abaixo do gradiente de texto, garantindo que fique claramente visível no topo do hero.

2. **Manter o nome da agência no header sticky direito** (já implementado) — o logo flutuante é complementar, posicionado sobre o hero, bem acima do nome do destino que aparece na parte inferior da imagem.

3. **Não reintroduzir** a seção "Por que viajar com a gente" (continua removida, conforme pedido anterior).

## Resultado visual
```text
┌─────────────────────────────┐
│ [Proposta]      [Agência]   │ ← header sticky
├─────────────────────────────┤
│         ┌──────┐            │
│         │ LOGO │            │ ← badge flutuante (topo do hero)
│         └──────┘            │
│   (imagem do destino)       │
│                             │
│                             │
│   Rio de Janeiro            │ ← nome do destino (rodapé do hero)
└─────────────────────────────┘
```
