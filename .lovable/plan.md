# Ajustes no banner da Destinos com a Ju

## Objetivo
Ajustar somente a primeira dobra da Destinos com a Ju, conforme a referência enviada, sem alterar os demais sites white label.

## Alterações
1. **Quebra controlada do título**
   - Manter o texto aprovado e fazer a quebra de linha ser respeitada visualmente:
     - `Sua viagem importa.`
     - `Cada detalhe também.`
   - Aplicar a quebra apenas quando declarada no conteúdo, sem impor `nowrap`, cortar texto ou alterar o padrão global dos demais perfis.

2. **Controles no lado direito do banner**
   - Mover o botão **“Começar a planejar”** para a área direita da primeira dobra.
   - Mover junto o conjunto completo de navegação do banner: seta anterior, indicadores e seta seguinte.
   - Organizar botão e navegação como um bloco alinhado à direita no desktop, mantendo contraste, área de clique e funcionamento atuais.
   - No mobile, adaptar o mesmo bloco sem sobreposição, corte ou overflow, preservando uma disposição confortável para toque.

3. **Isolamento por perfil**
   - Ampliar a configuração declarativa opcional de apresentação do banner.
   - Ativar o novo posicionamento somente no perfil `editorialRose`, usado pela Destinos com a Ju.
   - Preservar integralmente o layout atual de 100 Limites, Paraíso, Essyatur, SiteLab Base e futuros perfis que não adotarem essa opção.

## Validação
- Atualizar somente os testes focados da Destinos com a Ju para confirmar:
  - título em duas linhas explícitas;
  - botão e navegação usando o posicionamento à direita;
  - demais perfis mantendo o comportamento padrão.
- Rodar os testes focados e o typecheck.
- Conferir visualmente a primeira dobra da Destinos com a Ju em desktop e mobile, incluindo troca de slides e abertura da Central pelo botão.

## Restrições
- Não alterar textos além da apresentação da quebra solicitada.
- Não alterar banco, formulários, integrações, senha, CRM, autenticação ou outros tenants.
- Não publicar.
