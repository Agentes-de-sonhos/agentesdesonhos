# Reorganização do menu lateral — Agentes de Sonhos

## Objetivo
Reorganizar exclusivamente o menu da plataforma Agentes de Sonhos, preservando o cabeçalho atual, rotas, abas internas, permissões, regras de planos, comportamento por hover e navegação mobile. O Site Lab Base e todos os white-labels permanecerão sem alterações.

## Implementação
- Criar uma configuração única do menu Agentes de Sonhos para desktop e gaveta mobile, mantendo as rotas e os metadados de acesso já existentes.
- Aplicar a ordem fixa solicitada:
  - **Criar novo** expansível com os atalhos de criação atualmente permitidos.
  - **MEU TRABALHO** com **Meus projetos** expansível (Orçamentos, Roteiros e Carteiras digitais) e Agenda.
  - **GESTÃO** com Clientes, Oportunidades, Operações, Reservas e Financeiro.
  - **OUTRAS** com Notícias do Trade, EducaTravel Academy, Mapa do Turismo e **Mais…** expansível com os nove itens informados.
- Manter páginas omitidas da nova navegação — inclusive Comunidade — acessíveis por suas rotas atuais, sem criar novo item visível.
- Preservar o cabeçalho com o símbolo atual e “Agentes de Sonhos”, além do hover automático que expande e recolhe o menu desktop.
- Criar o bloco de conta no rodapé usando avatar/iniciais e os dados oficiais já disponíveis, com menu na ordem exata: Meu perfil, Minha conta, Suporte, divisor e Sair.
- Controlar o menu da conta para que interações com o popover não provoquem recolhimento indevido; manter Escape, foco, teclado e atributos ARIA.
- Fazer desktop e mobile consumirem a mesma definição de grupos e itens, evitando divergência futura; não alterar componentes do Site Lab/white-label.
- Remover as duplicações visíveis de Meu Perfil e Suporte no corpo/rodapé antigo, sem alterar suas rotas ou ações.

## Regras preservadas
- Cada item continuará passando pelos mesmos filtros de permissão de equipe, recursos do plano, bloqueios especiais e diálogo de upgrade/indisponibilidade.
- A rota ativa continuará destacada, inclusive em filhos de grupos e páginas internas.
- Links continuarão sendo interceptáveis pelo gerenciador atual de abas internas.
- A ordenação administrativa antiga não será aplicada à nova hierarquia fixa solicitada, mas nenhuma regra de acesso será removida.

## Validação
- Adicionar testes para hierarquia, ordem, conteúdo exato de “Mais…”, expansão de Criar novo/Meus projetos/Mais…, rota ativa e filtros de acesso.
- Testar o bloco de conta e as quatro ações, incluindo logout existente e fechamento por Escape.
- Testar expansão/recolhimento por hover, foco/teclado e comportamento do popover no desktop.
- Testar a gaveta mobile e ausência de overflow/sobreposição em viewport desktop e mobile.
- Executar regressões específicas garantindo que o Site Lab Base/white-label não foi modificado.
- Rodar testes relacionados, verificação de tipos e build; não publicar nem fazer deploy.

## Entrega
Informar arquivos alterados/criados, testes executados, limitações de validação, commit final e créditos consumidos.
