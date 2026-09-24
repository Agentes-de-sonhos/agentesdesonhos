# Correção declarativa — Destinos com a Ju

## Implementação
- Adicionar ao perfil propriedades opcionais para apresentação do destaque inicial: texto superior e CTA com rótulo/serviço.
- Fazer a engine consumir apenas essas propriedades, mantendo os fallbacks atuais para todos os perfis.
- Configurar os valores aprovados somente em `EDITORIAL_ROSE`.
- Enxugar o menu da Destinos com a Ju para: Início, Destinos, Experiências, Cruzeiros, Ofertas, Sobre e Avaliações.
- Adicionar rótulo opcional ao botão de WhatsApp da seção de atendimento, com o texto atual como padrão e “Falar com a Juliana” apenas nesse perfil.
- Confirmar por teste que o perfil continua resolvido por `info.hostname`, inclusive no slug canônico existente, sem regra nova por slug.

## Validação
- Atualizar somente o teste focado da Destinos com a Ju.
- Rodar esse teste e o typecheck.
- Não executar build, publicar, alterar banco, formulários ou Google Reviews.
