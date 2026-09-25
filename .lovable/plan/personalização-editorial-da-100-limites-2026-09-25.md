# Personalização editorial da 100 Limites

## Objetivo
Transformar o perfil `editorialDmc` da 100 Limites em um perfil completo e exclusivo, mantendo a mesma engine do SiteLab Base, os formulários e integrações atuais, sem alterar outros tenants.

## Implementação
- Preencher o perfil declarativo da 100 Limites com menu, três banners, Central de Solicitações, destinos, destaques, apresentação da Amanda, diferenciais, atendimento, etapas e FAQ conforme os textos aprovados.
- Adicionar “Para agências” ao menu desktop/mobile, apontando para `#dmc-agencias`, sem remover os acessos atuais.
- Atualizar a DMC existente para quatro serviços, nova redação, CTA e mensagem específica de WhatsApp. Manter fundo branco, foto atual já fornecida e ausência de sobreposição escura.
- Ocultar campanhas genéricas repetidas apenas neste perfil, preservando a configuração para reativação futura.
- Manter o portfólio futuro apenas como possibilidade declarativa, sem renderizar botão, link, aviso ou PDF nesta etapa.
- Ajustar o rodapé e a apresentação institucional somente com dados confirmados; manter o e-mail atual e registrar a divergência para decisão posterior.
- Reutilizar os slots de imagens existentes para variar Brasil, Europa, parques, Caribe e América do Sul. Não usar imagem de destino como foto da Amanda; se não houver foto real configurada, o bloco institucional ficará sem retrato editorial enganoso.

## Ajustes técnicos compartilhados mínimos
- Ampliar propriedades opcionais do perfil apenas onde a engine ainda não permite conteúdo declarativo, como dois destaques factuais no bloco “Sobre” e as quatro etapas de atendimento.
- Garantir defaults idênticos aos atuais para todos os outros perfis.
- Usar os componentes e fluxos existentes para os botões de solicitação e WhatsApp.

## Validação
- Testes focados para conteúdo, navegação, DMC, ocultação de campanhas, ausência do portfólio/PDF e isolamento dos demais perfis.
- Verificação de tipos e build.
- Conferência visual da home da 100 Limites em desktop e celular, incluindo navegação “Para agências”, imagens, botões, formulário, mensagem de WhatsApp e ausência de sobreposição/overflow.
- Nenhuma publicação e nenhuma alteração de banco, autenticação, CRM ou dados reais.
