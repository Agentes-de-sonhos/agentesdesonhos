## Objetivo

Evoluir o overlay de categoria (ex.: Ingressos/Atrações, Hospedagem, Transfer) da Carteira Digital Pública para facilitar a localização e consulta quando houver muitos serviços (10, 15, 20+). Mantém o cabeçalho atual, a janela/modal atual e a identidade visual da agência. Sem novo menu inferior. Sem nova página.

Hoje, o overlay de grupo (em `ViagemPublica.tsx` ~linha 2583) apenas faz `map` dos serviços renderizando o `PublicServiceCard` completo — pesado, sem resumo no topo, sem âncoras e sem distinção compacto/expandido.

## Escopo desta entrega

1. Novo componente `CategoryServiceView` que substitui o conteúdo do "Group overlay" para todas as categorias.
2. `CategoryServiceSummary` — bloco horizontal no topo com até 8 miniaturas numeradas, swipe horizontal, e "Ver mais N / Mostrar menos" quando houver mais de 8.
3. `CompactServiceCard` — card compacto reutilizável, com:
   - miniatura (imagem personalizada do serviço se houver, senão ícone padrão da categoria com fundo pastel);
   - nome, linha secundária (produto/modalidade), quantidade de pessoas;
   - badge de status (só quando preenchido);
   - ícone de documento com contador (só quando houver anexos);
   - seta de expandir (só quando `hasAdditionalDetails(service)` for verdadeiro).
4. `ExpandableServiceDetails` — accordion interno que reaproveita o `PublicServiceCard` já existente para mostrar todos os detalhes. Em mobile, apenas um card aberto por vez.
5. Comportamento de navegação: tocar numa miniatura faz scroll suave até `service-card-{id}` e aplica destaque temporário (~1,5s) com borda azul suave. Respeita `prefers-reduced-motion`. Tocar no ícone de documento expande o card e rola até a seção de arquivos.
6. Configuração por categoria (`categoryPresentationConfig`): nome singular/plural, título do resumo ("Seus ingressos", "Suas hospedagens"…), ícone padrão da categoria, cor pastel do fallback e seletor dos campos principais do card compacto.
7. Helper `hasAdditionalDetails(service)` — ignora null/strings vazias/arrays vazios e campos já mostrados no card compacto. Sem detalhes → sem seta, sem expansão.

## Itens explicitamente fora desta entrega

- Menu inferior, busca, filtros, mistura de categorias, datas no resumo, nova página/modal, alterações no cadastro de serviços, imagens específicas por parque/hotel/fornecedor.
- Não vou trocar o `PublicServiceCard` existente — ele continua sendo a fonte dos detalhes completos dentro da expansão e do overlay individual de serviço.

## Detalhes técnicos

- Arquivo principal modificado: `src/pages/ViagemPublica.tsx` — substituir o conteúdo do `ServiceDetailOverlay` de grupo pelo novo `CategoryServiceView`.
- Novos arquivos:
  - `src/components/wallet/category/CategoryServiceView.tsx`
  - `src/components/wallet/category/CategoryServiceSummary.tsx`
  - `src/components/wallet/category/CompactServiceCard.tsx`
  - `src/components/wallet/category/ExpandableServiceDetails.tsx`
  - `src/components/wallet/category/categoryPresentationConfig.ts` (labels singular/plural, ícone padrão, cores pastel, seletores de campos compactos por `service_type`).
  - `src/components/wallet/category/serviceDetailsHelpers.ts` (`hasAdditionalDetails`, `getCompactFields`, `getServiceThumbnail`, `getServiceAttachments`).
- Estilo: usa tokens da agência (`--wallet-brand`) já existentes; cards arredondados, sombras suaves, fundo branco. Mobile-first, alvos de toque ≥ 44 px.
- Acessibilidade: `aria-expanded`, labels descritivos nas setas e no ícone de documento ("X possui N documentos"), alt nas miniaturas, navegação por teclado, foco visível, `prefers-reduced-motion`.
- Reutiliza `SERVICE_ICONS`, `SERVICE_COLORS` e `SERVICE_LABELS` que já existem em `ViagemPublica.tsx` — exportados ou movidos para `categoryPresentationConfig.ts` conforme conveniente.

## Critérios de aceite (atendidos pela implementação)

Todos os 23 critérios do prompt aplicados sobre o overlay de grupo: resumo no topo sem datas, até 8 no estado inicial com swipe, "Ver mais X" / "Mostrar menos", scroll com destaque temporário usando `service-card-{id}`, miniatura personalizada com fallback por categoria, cards compactos com campos essenciais, omissão de campos vazios e status vazio, ícone de documento com contador que expande direto na seção de arquivos, seta apenas quando há conteúdo adicional, mesma janela atual da Carteira Digital, layout responsivo.

## Pontos para você confirmar antes de eu codar

1. Confirmar que a evolução fica restrita ao overlay de **grupo por categoria** (acessado pela Navegação Rápida) e que o overlay individual de serviço (tocado a partir de uma atividade do roteiro) continua usando o `PublicServiceCard` cheio como hoje.
2. OK reutilizar o `PublicServiceCard` atual dentro da expansão (sem reescrever os blocos de detalhes), ou prefere que eu construa uma versão de detalhes mais enxuta seguindo a referência?
