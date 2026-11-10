# Página compartilhada da temporada brasileira 2026/2027

Rota: `/cruzeiros/temporada-brasileira-2026-2027`, sob o layout e a resolução de domínio de cada agência. Link `Cruzeiros 26/27` no menu compartilhado, inclusive perfis com navegação própria. Não insere nova seção na home nesta etapa.

Oito cards usam imagens oficiais e navegam para o registro compartilhado de navios. Crédito único por companhia abaixo da grade. Sem ondas, paleta fixa, preços inventados ou fotos geradas. Cores dos tokens `--brand-primary`, `--brand-secondary` e contraste do tema; fonte e raio herdados.

Assistente de cinco etapas: mês, porto de embarque, duração, passageiros/idades e preferências. Filtros obrigatórios são respeitados simultaneamente. Preferências apenas ordenam por espaços documentados, sem alegar ranking de qualidade. Retorna até três navios com exemplo de saída correspondente; nenhum resultado gera orientação para flexibilizar filtros e opção de pedir atendimento, sem inventar compatibilidade. Exclui saídas anteriores à data brasileira atual e registros conflitantes. Seleção não é estoque em tempo real e não inclui anúncios sem itinerário confirmado.

Pedido usa `useAgencySiteRequest`, serviço `cruzeiros`, mantendo identificação da agência no servidor por hostname. Resumo inclui filtros, passageiros, idades e exemplo escolhido, explicitamente sujeito a confirmação. Consentimento, honeypot, bloqueio de duplo clique, tratamento de erro/sucesso e bloqueio em host sintético preservados. Nenhum lead real enviado durante os testes.

Validação: 39 testes passaram no checkout integrado à main atual (seis novos do assistente, 26 da coleção brasileira, sete do Harmony). Build da prévia inclui a página e acesso aos navios. Build completo e conferência em navegador registrados na entrega. Nenhuma chamada ao Lovable.
