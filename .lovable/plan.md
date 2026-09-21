# Seletor de ícones na etapa "Incluso" do Orçamento

## O que muda para o usuário

Na etapa 2 ("Incluso") das Configurações do Orçamento, cada item da lista "O que está incluso" passa a ter um ícone trocável:

- No computador: passando o mouse (ou com foco pelo teclado) aparece um lápis discreto no canto do bloco do ícone; clicar no lápis ou no próprio ícone abre o seletor.
- No celular: tocar no ícone abre o seletor em tela cheia, confortável para toque.
- O seletor traz busca em português (avião, hospedagem, transfer, ingresso, navio, seguro, restaurante, guia, documento, bagagem, praia, compras, câmera, mapa…), categorias navegáveis (Transporte, Hospedagem, Alimentação, Passeios e ingressos, Cruzeiros, Proteção e seguros, Documentos, Serviços gerais), grade de ícones com nome acessível, destaque do ícone atual, prévia do item, "Recentes" (guardados só no navegador) e três ações: Aplicar, Cancelar e "Usar sugestão automática".
- A escolha manual continua ao navegar entre etapas, salvar e reabrir, e aparece igual no orçamento web público e no PDF.
- "Gerar novamente" refaz a lista mas preserva os ícones escolhidos para itens com o mesmo texto; itens sem correspondência voltam à sugestão automática (comportamento explícito e previsível).
- "Restaurar automática" continua limpando a lista personalizada — inclusive os ícones manuais — voltando à sugestão automática completa (comportamento atual mantido).

## Detalhes técnicos

Arquitetura atual encontrada:
- `quotes.whats_included` é `jsonb` (hoje um array de strings). O payload público (`build_public_quote_payload`) envia a linha inteira, então o campo já chega à web pública sem alteração no banco.
- `src/lib/whatsIncluded.ts` gera a lista automática e deriva o ícone por palavra-chave (`iconKeyForIncludedItem`).
- Consumidores: `WhatsIncludedEditor.tsx` (lucide), `OrcamentoPublico.tsx` (lucide) e `QuotePDF.tsx` (emoji dentro de HTML impresso numa janela de print).

Mudanças:
1. **Registro único de ícones** — novo `src/lib/includedIcons.ts`: allowlist curada de ícones Lucide com `id` estável, rótulo pt-BR, aliases de busca e categoria; `resolveIncludedIcon(id)` com fallback seguro (`sparkles`) para ids desconhecidos/removidos; mapeamento das chaves antigas (`hotel`, `flight`, `car`, …) para ids do registro, sem duplicar listas.
2. **Modelo de dados aditivo** — `whatsIncluded.ts` passa a normalizar itens como `{ text, icon?, autoIcon? }`, aceitando strings antigas. `icon` = escolha manual (id da allowlist, validado ao carregar); quando ausente, usa a sugestão automática por palavra-chave. Persistência: strings simples continuam sendo gravadas quando não há ícone manual, evitando mudança de formato desnecessária.
3. **Editor** — `WhatsIncludedEditor.tsx`: bloco do ícone vira botão acessível ("Alterar ícone de [item]"), com lápis em hover/foco no desktop e alvo ≥44px no mobile; autosave existente preservado. "Gerar novamente" reaproveita ícones manuais por texto.
4. **Seletor** — novo `src/components/quote/IncludedIconPicker.tsx`: diálogo (tela cheia no mobile, largo no desktop) com busca, abas de categoria, grade responsiva, seleção por Enter/Espaço, Escape para cancelar, prévia e as três ações; "Recentes" em `localStorage`.
5. **Saídas consistentes** — `OrcamentoPublico.tsx` usa o registro compartilhado; `QuotePDF.tsx` passa a renderizar o mesmo ícone Lucide como SVG inline (via `renderToStaticMarkup`), mantendo cor/estilo atuais e eliminando dependência de fonte de emoji.

Sem migration, sem mudança de RLS/permissões, sem alteração de regras de negócio. Nada será publicado.

## Testes

Novo `src/test/included-icon-picker.test.tsx` + `src/test/included-icons.test.ts`: abrir pelo ícone e pelo lápis, busca por termo em português, troca de categoria, selecionar/confirmar/cancelar, restaurar sugestão automática, normalização e persistência (string antiga ↔ objeto), preservação em "Gerar novamente", fallback de id desconhecido, ícone no orçamento público e no HTML do PDF, teclado/rótulos e alvo de toque. Depois: testes focados, suíte completa, typecheck, lint dos arquivos alterados e build.
