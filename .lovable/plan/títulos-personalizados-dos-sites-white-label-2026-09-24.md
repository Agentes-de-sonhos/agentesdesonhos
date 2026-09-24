# Títulos personalizados dos sites white-label

## Objetivo
Exibir na aba do navegador o nome correto de cada agência, sem alterar conteúdo, dados, domínio, publicação ou outros tenants.

## Títulos e endereços
- `100limites.tur.br` e `www.100limites.tur.br` → **100 Limites Turismo**
- `destinoscomaju.com.br` e `www.destinoscomaju.com.br` → **Destinos com a Ju**
- `paraisoviagens.com` → **Paraiso Viagens**
- `essyatur.com.br` e `www.essyatur.com.br` → **Essya Tur Viagens**

> Os endereços conectados são `paraisoviagens.com` e `www.essyatur.com.br`; `paraiso.tur.br` e `essyatur.tur.br` não estão conectados a este projeto.

## Implementação
- Criar uma configuração opcional de título por hostname dentro da configuração compartilhada dos sites SiteLab Base.
- Aplicar o título no layout comum do site white-label, cobrindo a navegação entre suas páginas.
- Preservar os títulos próprios das páginas temporárias “em construção” quando elas estiverem ativas.
- Manter todos os tenants sem configuração explícita com o comportamento atual.

## Validação
- Testar os quatro títulos nos hostnames conectados, incluindo as variantes com e sem `www` quando existentes.
- Confirmar que outro tenant não recebe nenhum desses títulos.
- Executar somente os testes focados e a verificação de tipos.
- Não alterar banco, DNS, conteúdo, rotas ou publicar o projeto.
