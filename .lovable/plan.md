# Correção definitiva dos popovers da sidebar white label

## Objetivo
Corrigir exclusivamente o estado e o ciclo de fechamento dos menus “Criar novo” e usuário, sem alterar layout, rotas, permissões ou demais funcionalidades.

## Implementação
- Substituir o estado compartilhado por dois estados controlados no componente principal: `createMenuOpen` e `userMenuOpen`.
- Criar `closeSidebarMenus` para fechar ambos e garantir exclusividade ao abrir um deles.
- Criar um fluxo único `closeThenNavigate` que aplica o fechamento de forma síncrona antes de executar a navegação/ativação no próximo frame.
- Trocar as opções dos popovers por itens com `onSelect`, sem `preventDefault`, impedindo a propagação que poderia reabrir o trigger.
- Aplicar o fluxo às cinco ações de criação, às três páginas do usuário e ao logout.
- Fechar ambos ao mudar rota, busca, aba ativa ou estado expandido/recolhido; também preservar o fechamento nativo por clique externo e Esc.
- Manter um único par de estados para desktop expandido, desktop recolhido e drawer mobile.

## Validação
- Verificar build e testes relacionados ao workspace/sidebar.
- Validar no navegador, quando o domínio autenticado estiver acessível, seleção com sidebar expandida e recolhida, incluindo destinos já abertos.
- Confirmar que nenhum conteúdo de popover permanece aberto ou perde sua âncora após a ação.
