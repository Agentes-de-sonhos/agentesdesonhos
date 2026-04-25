## Ajustes no módulo de Benefícios e Descontos

### 1. Reposicionar botão "Funciona" no modal de detalhes
No `BenefitDetailDialog.tsx`, mover o botão "Funciona (contagem)" do meio do conteúdo para o **canto superior direito do header**, alinhado horizontalmente com o logotipo da empresa (lado oposto).

- Ajustar o `DialogHeader` para usar layout flex com `justify-between`: logo + título à esquerda, botão "Funciona" à direita.
- Em mobile (viewport 390px), garantir que o botão fique compacto (apenas ícone + número, mantendo o label "Funciona" se houver espaço) e não quebre o layout do header.
- Remover o bloco de "Confirmations" que estava no meio do conteúdo do `ScrollArea`.

### 2. Corrigir barra de rolagem do conteúdo
Hoje o `ScrollArea` está dentro de um `DialogContent` com `max-h-[85vh] flex flex-col`, mas o conteúdo longo (rich content / texto grande) não está rolando corretamente — provavelmente porque o `ScrollArea` precisa de altura definida e o `flex-1` não está se aplicando como esperado em todos os casos.

Ajustes:
- Garantir que o `DialogContent` tenha `overflow-hidden` para conter o scroll interno.
- Confirmar que o `ScrollArea` recebe altura via `flex-1 min-h-0` (a chave é o `min-h-0` em containers flex para permitir que o filho encolha e rolagem funcione).
- Validar que o `RichContentDisplay` não tem `overflow` próprio que esteja interferindo.

### 3. Remover seção "Top Contribuidores" da página de Benefícios
No `src/pages/Beneficios.tsx`:
- Remover o import e o uso do componente `BenefitContributorsRanking`.
- Remover o sidebar à direita (`<div className="lg:w-72 shrink-0">`) e o wrapper `flex flex-col lg:flex-row`, fazendo a grade de cards ocupar 100% da largura.
- Remover o `ranking` desestruturado do `useBenefits()` (caso não seja usado em outro lugar — apenas na página, não no hook).

O componente `BenefitContributorsRanking.tsx` em si pode ser deixado no codebase (caso seja reutilizado no futuro) ou removido. Por padrão, vou **deixar o arquivo** mas removê-lo da página.

### Arquivos afetados
- `src/components/benefits/BenefitDetailDialog.tsx` — reposicionar botão "Funciona" e ajustar scroll.
- `src/pages/Beneficios.tsx` — remover ranking e ajustar layout em coluna única.
