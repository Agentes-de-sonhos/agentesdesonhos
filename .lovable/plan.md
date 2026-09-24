# Corrigir o favicon individual dos sites de agência

## Diagnóstico confirmado
- A troca do favicon está hoje dentro do layout do site completo.
- As páginas iniciais temporárias de **100 Limites**, **Destinos com a Ju** e **Paraíso Viagens** são renderizadas fora desse layout; por isso continuam usando o favicon padrão.
- A **Essyatur** já recebe o logotipo no favicon, mas a página mantém três declarações fixas do ícone padrão e o navegador pode reutilizar essas imagens em cache.
- A versão publicada foi conferida: os três primeiros sites ainda apontam para `/favicon.ico`, `/favicon-32x32.png` e `/favicon-16x16.png`; somente a Essyatur aponta para seu logotipo.

## Ajuste
- Aplicar o favicon da agência no ponto comum que envolve todas as páginas do respectivo domínio, incluindo página inicial, “em construção”, Área do Cliente e páginas públicas.
- Durante a navegação no domínio da agência, substituir as declarações concorrentes por um único favicon identificado e com endereço específico da marca, evitando que o cache antigo prevaleça.
- Restaurar o favicon padrão apenas ao sair desse contexto.
- Manter sem alteração os sites sem logotipo cadastrado e todos os conteúdos, links e regras dos tenants.

## Validação
- Testar especificamente 100 Limites, Destinos com a Ju, Paraíso Viagens e Essyatur.
- Confirmar o favicon também nas páginas temporárias e em uma página interna de cada domínio.
- Confirmar que uma agência sem logotipo continua usando o ícone padrão.
- Executar somente testes focados e verificação de tipos.
- Não alterar banco, dados, domínios ou publicar o projeto.
