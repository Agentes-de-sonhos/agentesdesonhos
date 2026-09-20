# Cabeçalho da Comunidade conforme a referência

## Objetivo
Refazer somente a parte superior da seção Comunidade na página inicial, reproduzindo a hierarquia visual da imagem anexada e mantendo intactos o feed, as postagens e todas as funcionalidades existentes.

## Implementação

### 1. Primeira linha: identidade e chat
- Exibir o ícone roxo de pessoas e o título “Comunidade” à esquerda, com sublinhado roxo.
- Posicionar o botão atual do chat no canto superior direito, preservando exatamente a abertura do chat existente.
- Remover dessa composição o avatar e a frase “Compartilhe experiências e oportunidades com outros agentes de viagens.”.

### 2. Segunda linha: pesquisa
- Separar o campo “Pesquisar” em uma linha própria, ocupando praticamente toda a largura útil.
- Reutilizar a busca atual da Comunidade e seus filtros, sem criar outro fluxo.

### 3. Terceira linha: presença
- Adaptar a faixa existente para um card horizontal compacto com quantidade online, divisor e chave On/Off.
- Manter consulta de presença, alternância de visibilidade, permissões e interações atuais.
- Preservar acesso aos usuários online quando houver resultados, sem poluir a composição compacta.

### 4. Quarta linha: publicação
- Manter o launcher “O que você quer compartilhar hoje?” em uma única linha, logo abaixo da presença.
- Preservar o mesmo compositor, validações, anexos e envio já existentes.

### 5. Aparência e responsividade
- Aplicar fundo claro, bordas suaves, cantos arredondados, espaçamentos compactos e sem sombras pesadas.
- Aproveitar melhor a largura no celular com margens laterais pequenas e consistentes, sem corte ou overflow.
- Ajustar tablet e desktop para manter a mesma ordem visual com proporções confortáveis.
- Não alterar Agenda, Próximas Viagens, conteúdo dos posts ou a página completa da Comunidade.

## Validação
- Atualizar os testes do cabeçalho da Comunidade para confirmar ordem, ausência de duplicidade, pesquisa, chat, presença e compositor.
- Conferir visualmente a página inicial em celular e desktop, incluindo largura, alinhamento e ausência de cortes.
- Rodar testes relevantes, suíte completa, verificação de tipos e compilação.
- Não publicar nem fazer deploy.
