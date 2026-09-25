# Plano: ajustes visuais na seção Xcaret

## Objetivo
Corrigir a seção Xcaret da página principal da Destinos com a Ju e o selo na landing `/xcaret`, sem publicar e sem mexer em banco, senha, permissões ou outros tenants.

## Ajustes
1. Selo Xperts Xcaret
   - Trocar o formato visual circular por retangular.
   - Aumentar o tamanho e dar mais destaque na seção Xcaret da home.
   - Aplicar o mesmo padrão retangular e maior na landing `/xcaret`, incluindo hero, seção da especialista e fechamento.

2. Foto da Juliana na seção Xcaret da home
   - Ajustar o enquadramento da foto inferior esquerda para não cortar a cabeça.
   - Usar `object-position`/proporção adequada, mantendo a imagem real já enviada.

3. Elemento branco na lateral direita da imagem principal
   - Ajustar o enquadramento da foto principal mais para a direita quando possível.
   - Se ainda aparecer, usar recorte visual na largura da imagem para remover o elemento branco sem trocar a foto.
   - É aceitável esconder parte da arara conforme indicado.

## Validação focada
- Conferir que a alteração fica restrita à Destinos com a Ju.
- Conferir que o selo não aparece mais redondo na home nem na landing.
- Conferir que a foto da Juliana não corta a cabeça.
- Conferir que o elemento branco lateral não aparece na imagem principal.
- Rodar validação focada disponível para os componentes Xcaret e checar o build/status atual.

## Não será feito
- Não publicar.
- Não alterar banco, senhas, status dos sites ou permissões.
- Não trocar as fotos por outras imagens.
- Não refatorar a estrutura global dos white labels.
