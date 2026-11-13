# Navegação das prévias ADS

Todas as fixtures resolvidas recebem o catálogo compartilhado de resorts e ingressos, além das páginas internas existentes. Overrides de conteúdo por agência são preservados. O roteador de prévia inclui a temporada brasileira, páginas individuais dos navios, Disney e Universal com hotéis, circuitos e Club Med neve.

Links React e links HTML preservam o prefixo da própria prévia, query e âncora. Filtros, assistentes, calculadoras, galerias e diálogos locais ficam ativos. Formulários reais, links externos e chamadas de backend continuam bloqueados; o editor local de itens do carrinho é a única exceção de formulário. O hook de solicitações rejeita hosts sintéticos antes de invocar o servidor.

Validação: 36 testes de navegação, configuração de todas as fixtures exportadas, parâmetros de navio, coleção real com oito navios, avanço do assistente, isolamento dos links e bloqueio dos envios/ações externas. Build Vite concluído. As suítes antigas de Arena/ADS já apresentam falhas na versão anterior (expectativas antigas de identidade/avisos e ausência de HelmetProvider); a nova expectativa de catálogo completo substitui a antiga de pages ausente. Não houve publicação dos domínios reais.
