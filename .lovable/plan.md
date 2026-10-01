# Ícone personalizado em Outros Serviços

## Objetivo
Permitir que a agência escolha o ícone do cabeçalho de cada item criado como **Outros Serviços**, reutilizando o seletor já disponível em “O que está incluso”.

## Implementação
- Adicionar ao formulário de Outros Serviços um campo opcional de ícone, com prévia e acesso ao seletor existente.
- Salvar somente o identificador permitido do ícone dentro dos dados do próprio serviço, sem alteração de banco.
- Exibir a escolha no cabeçalho do orçamento público e no PDF.
- Manter compatibilidade: serviços antigos ou com valor inválido continuam usando o ícone padrão de pacote.

## Validação
- Cobrir seleção, edição, persistência e fallback com testes focados.
- Confirmar tipos, testes e estado do build.
- Não publicar e não alterar outros tipos de serviço.
