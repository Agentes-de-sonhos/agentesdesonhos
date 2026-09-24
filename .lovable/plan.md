# Evolução editorial — Destinos com a Ju

## Objetivo
Transformar o perfil `editorialRose` em uma página editorial completa e exclusiva para `destinoscomaju.com.br`, `www.destinoscomaju.com.br` e o slug canônico já resolvido, sem alterar banco, integrações, formulários ou outros tenants.

## Implementação
- Preencher o perfil `editorialRose` com o conteúdo aprovado: navegação, três slides, assinatura, destinos, seis especialidades, autoridade em cruzeiros, sobre, diferenciais, atendimento em quatro passos, FAQ, newsletter e textos de seção.
- Acrescentar somente propriedades opcionais e seções genéricas necessárias, desativadas por padrão, para autoridade editorial, textos da Central, SEO, avaliações e contatos institucionais.
- Consumir esses campos na engine única e nos componentes compartilhados com os defaults atuais intactos.
- Reaproveitar exclusivamente imagens já existentes para Europa, parques, cruzeiros, litoral e resort; usar uma imagem internacional/premium existente no fallback do topo.
- Manter a seção de avaliações e todos os textos obrigatórios do Google Maps, alterando apenas o título editorial permitido pelo perfil.
- Completar o rodapé da Destinos com os contatos e dados institucionais aprovados, sem duplicar valores.
- Ajustar apenas os tokens `.wl-rose` para equilibrar azul-marinho, rosé e vinho, preservando o tema dos demais sites.
- Definir título e descrição da página pelo gerenciador de SEO já existente, sem alterar tags globais dos demais tenants.

## Validação
- Testes focados do perfil, hosts, ordem das seções, Central, contatos, ausência de Comandatuba/Lua de mel e isolamento dos outros tenants.
- Preservar e executar os testes focados de avaliações do Google.
- Executar typecheck e build.
- Conferir a página no preview em desktop e mobile, incluindo topo, Central, conteúdo, avaliações e rodapé.

## Restrições
- Nenhuma publicação.
- Nenhuma mudança no banco, dados reais, autenticação, CRM, formulários ou funções da integração Google.
- Nenhum asset novo e nenhuma alegação não aprovada.
