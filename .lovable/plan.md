# Reorganização do editor de orçamento

## Objetivo
Simplificar a navegação visual do editor sem alterar dados, permissões, geração pública ou funcionamento dos recursos existentes.

## Implementação
- Reduzir a orientação superior a quatro etapas: Adicionar serviços, Organizar serviços, Configurar orçamento e Publicar.
- Transformar cada etapa superior em um controle apenas explicativo, com conteúdo acessível por mouse, teclado e toque, sem rolagem ou abertura de blocos.
- Posicionar as ações existentes de geração web e PDF ao lado direito das etapas em telas largas, com quebra segura em telas estreitas.
- Manter somente os três blocos principais: Adicionar serviços, Organizar serviços e Configurar orçamento.
- Renomear o bloco e referências pertinentes de configuração para “Configurar orçamento”.
- Tornar “Configuração inicial” o primeiro passo da janela de configuração, reunindo ali o resumo editável já existente e, logo depois, capa e descrição do destino.
- Mover o seletor de assinatura existente para “Configurações avançadas”, preservando gravação, responsável e validações.
- Remover apenas as apresentações duplicadas de Revisar orçamento e Escolher assinatura; os mesmos componentes e vínculos continuarão existindo no novo local.

## Detalhes técnicos
- Evoluir o componente compartilhado das etapas para aceitar uma área de ações e usar os componentes acessíveis de tooltip/popover já existentes.
- Reutilizar `QuoteSummary`, `DestinationIntroEditor`, `DocumentSignatureCard` e os handlers atuais de publicação/PDF.
- Manter o modal de configuração e seus passos internos, alterando somente o primeiro passo e o conteúdo avançado necessário.
- Não alterar banco, funções de servidor, rotas públicas, payloads ou arquivos fora do editor e testes relacionados.

## Validação
- Cobrir por testes os quatro passos, textos, ausência do passo 5/“Ver mais”, ausência de ação de scroll, explicações acessíveis e layout das ações.
- Confirmar três blocos principais, resumo e capa no primeiro passo, assinatura no avançado e ausência de duplicação.
- Confirmar que geração web/PDF continua chamando as ações existentes.
- Executar testes focados e relacionados, verificação de tipos e compilação, sem publicação.
