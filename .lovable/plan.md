# Melhorias mobile da página inicial e fluxos rápidos

## Objetivo
Refinar somente a apresentação e a acessibilidade da página inicial e dos quatro formulários rápidos, preservando integralmente campos, etapas, validações, dados, ações e calendários já corrigidos.

## Implementação
- Alinhar cabeçalho, atalhos e blocos da página inicial com margens móveis consistentes.
- Exibir os rótulos Cliente, Orçamento, Roteiro e Carteira nos atalhos; tornar cada área inteira clicável, com alvo mínimo de 44 px e indicador “+” mais discreto.
- Reforçar contraste e áreas de toque dos controles de notificações, perfil, sair e paginações, sem mudar seus comandos.
- Refinar o invólucro compartilhado dos quatro formulários: tela cheia móvel, cabeçalho fixo, conteúdo rolável, safe areas, `dvh`, foco visível e espaço para ações acima do teclado.
- Ajustar apenas classes visuais dos rodapés dos formulários para manter a ação principal alcançável; nenhuma função ou sequência será alterada.
- Preservar o calendário de intervalo compartilhado atual, incluindo um mês no mobile, dois no desktop, setas em português e seleção existente.
- Corrigir associações de título/descrição e alvos de toque encontrados no escopo.

## Verificação
- Atualizar testes focados em dashboard, formulários rápidos e calendário responsivo.
- Verificar visualmente 360×800, 390×844, 768 px e desktop, incluindo conteúdo longo, rolagem, calendário e overflow horizontal, sem enviar formulários.
- Executar testes relacionados, suíte disponível, verificação de tipos, lint disponível e confirmar a compilação automática.
- Não alterar banco e não publicar.
