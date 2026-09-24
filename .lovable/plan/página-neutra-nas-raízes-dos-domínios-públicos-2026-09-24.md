# Página neutra nas raízes dos domínios públicos

## Objetivo
Ao acessar somente a raiz dos seis domínios públicos, mostrar uma tela branca centralizada com o símbolo de nuvem da Agentes de Sonhos e o nome correspondente. Todos os links completos já existentes continuarão abrindo normalmente.

## Alterações
- Criar uma tela compartilhada e acessível para as raízes:
  - `vitrine.tur.br` → **VITRINE**
  - `seuroteiro.tur.br` → **SEU ROTEIRO**
  - `seuorcamento.tur.br` → **SEU ORÇAMENTO**
  - `proximaviagem.tur.br` → **PRÓXIMA VIAGEM**
  - `contato.tur.br` → **CONTATO**
  - `carteiradigital.tur.br` → **CARTEIRA DIGITAL**
- Aplicar a tela apenas quando o caminho for exatamente `/`, incluindo as versões com `www` quando conectadas.
- Manter intactas todas as rotas com agência, código, slug ou recurso público.
- Adicionar testes focados para as seis raízes e para confirmar que caminhos públicos não são interceptados.

## Verificação
- Rodar somente os testes focados e a verificação de tipos.
- Conferir o estado atual da compilação.
- Não publicar nem alterar banco, domínios ou dados.
