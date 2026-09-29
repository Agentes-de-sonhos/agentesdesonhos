# Prévia técnica do briefing 14

## Objetivo
Criar uma segunda prévia revisável, isolada e sem publicação, para **O Mundo em Cores - Studio de Viagens**, usando a mesma `AgencySiteLayout` e `AgencySiteHome` do SiteLab Base.

## Implementação
- Generalizar minimamente o mecanismo atual de prévias ADS para resolver cada briefing por identificador, mantendo `ads-email-test-v1` intacto.
- Adicionar a rota técnica `/ads-briefing-preview/briefing-14-v1`, disponível somente no host técnico de prévia; em qualquer host de produção, retornar página não encontrada.
- Criar uma configuração local separada para o briefing 14, sem IDs de conta, consultas ao backend ou associação a domínio real.
- Incorporar o logotipo original enviado como mídia do projeto, preservando proporções e transparência.
- Configurar a identidade #245C81 / #338FB8 e conteúdo autorizado para hero, assinatura, destinos, diferenciais, apresentação de Vanessa, atendimento, FAQ e contato.
- Usar apenas imagens já licenciadas do catálogo compartilhado e ocultar depoimentos, equipe com retratos, ofertas, preços, números e certificações.
- Manter a faixa “Prévia para revisão — sem publicação · ações desativadas”, `noindex`, bloqueio de links externos, formulários, WhatsApp, APIs e ações comerciais.
- Registrar no conteúdo de revisão que a vinculação de domínio está pendente, sem criar domínio ou alterar DNS.

## Validação
- Cobrir em testes as duas rotas/fixtures, resolução isolada de perfil e rejeição em host de produção.
- Confirmar que a prévia não possui contexto de tenant real e não dispara leituras/escritas do backend.
- Verificar tipos, testes focados, estado do build e renderização desktop/mobile da nova URL.
- Não publicar, não executar deploy e não alterar banco, permissões, pagamentos ou dados ativos.
