# Padronização dos botões de importação

## Alterações
- Padronizar os botões de Roteiro, Carteira Digital e Orçamento com ícone `Download`, texto “Importar” e o mesmo estilo visual.
- Reorganizar os cabeçalhos de Roteiro e Carteira em duas linhas compactas à direita, mantendo os ícones de contexto fora dos botões.
- Manter a descrição do novo roteiro em uma linha no desktop, com empilhamento seguro no mobile.
- Preservar integralmente os handlers, assistentes de importação, formulários, navegação e demais fluxos.

## Validação
- Atualizar somente os testes focados afetados pelas redações e ícones.
- Executar os testes direcionados, verificação de tipos e conferir o build automático.
- Não publicar.

## Detalhes técnicos
- Arquivos de interface: `CriarRoteiro.tsx`, `TripWallet.tsx` e `GerarOrcamento.tsx`.
- Testes de contrato dos cabeçalhos confirmarão textos removidos, ícones, responsividade e conexões existentes.
