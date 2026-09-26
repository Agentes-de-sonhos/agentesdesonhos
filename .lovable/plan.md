# Carrossel da Destinos com a Ju

## Objetivo
Atualizar exclusivamente os três slides da primeira dobra da Destinos com a Ju, mantendo textos, ordem, formulário, demais seções e outros sites intactos.

## Alterações
1. Baixar exatamente as três fotografias aprovadas, otimizá-las e armazená-las como assets do projeto.
2. Associar cada foto ao slide pelo título informado, não pela posição das capturas.
3. Aplicar configuração visual exclusiva do perfil `editorialRose`:
   - degradê mais escuro à esquerda e suave à direita;
   - ponto focal próprio para cada foto em desktop e mobile;
   - largura de texto controlada no slide da viajante para preservar rosto, corpo e mala;
   - navio visível acima da Central de Solicitações.
4. Preservar integralmente a seção Inspirações e os demais tenants.

## Validação
- Conferir os três slides e a navegação do carrossel em desktop e mobile no host da Destinos com a Ju.
- Verificar carregamento das imagens, contraste, recorte, ausência de overflow e sobreposição.
- Rodar testes focados, verificação de tipos e build.
- Não publicar.

## Detalhes técnicos
A apresentação será declarativa por slide no perfil da Destinos com a Ju, com fallbacks que mantêm todos os outros perfis no comportamento atual. Os arquivos serão servidos pelo CDN de assets do projeto.
