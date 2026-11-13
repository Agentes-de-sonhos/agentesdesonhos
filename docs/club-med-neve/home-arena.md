# Chamada Club Med na home Arena — revisão de layout e filtros

Opt-in `clubMedSnowHome`: substitui Prioridades, primeira seção após o banner, sem afetar outras agências. Texto e países à esquerda (55%), vídeo à direita (45%). Mapas ampliados de 56 × 48 para aproximadamente 73 × 62 px (+30%). No celular, o texto vem antes do vídeo. Não há foto do Rafael nem botão intermediário; o player está diretamente na seção.

Os países levam a `/club-med-neve?pais=<chave>`. A coleção usa os parâmetros da URL como fonte do filtro, valida as chaves contra o catálogo, permite seleção múltipla, desmarcar e limpar. Outros parâmetros, como o contexto da agência, são preservados. A navegação interna da prévia técnica agora conserva a query string em vez de descartá-la. O catálogo e a contagem continuam compartilhados.

Vídeo: https://www.youtube.com/watch?v=C-4BqbfgBe0 — “Club Med - All-inclusive Ski Vacations”, canal verificado Club Med, duração exibida de 15 segundos. Player oficial incorporado via youtube-nocookie; sem download, edição, re-hospedagem ou ocultação da marca do YouTube. Não foi encontrado MP4 direto oficial apropriado após pesquisa nas páginas públicas de neve, imprensa e Media Hub. A API oficial documenta vídeos diretos, mas exige credencial de parceiro: https://portal.api.clubmed/en-US/scenarios/resort-media . Não foi usada nenhuma chave nem fonte de outra agência. Portanto a substituição por player nativo de cruzeiros permanece dependente de um arquivo/link MP4 oficial; não se afirma que os elementos do YouTube tenham sido removidos.

Sem confirmação da trilha/narração em português. Texto comercial sem preços, promessa de neve ou inclusão irrestrita de serviços. Fontes: https://www.clubmed.com.br/l/neve-by-club-med e https://www.clubmed.ch/l/ski-holiday-package?locale=en-CH .

Verificação: testes da home e da coleção (abertura direta com Japão, limpar filtro, seleção múltipla, país inválido e links), build e diff-check. Sincronização da prévia pelo GitHub, sem créditos Lovable e sem publicação em produção. Acesso visual à prévia sujeito ao login do Lovable.
