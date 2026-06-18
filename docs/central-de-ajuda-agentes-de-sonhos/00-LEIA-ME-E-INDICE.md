# Central de Ajuda do Agentes de Sonhos

> Gerado em 2026-06-18. Versão inicial da Central de Ajuda voltada ao usuário final.

Esta Central traduz a Base de Conhecimento Mestre em conteúdos práticos para agentes, agências de viagens e suas equipes. Ela atende também a usos automatizados, como busca semântica e chatbot de suporte.

## Documentos gerais

1. [Como usar esta Central](./01-COMO-USAR-A-CENTRAL-DE-AJUDA.md)
2. [Primeiros passos no Agentes de Sonhos](./02-PRIMEIROS-PASSOS.md)
3. [Mapa de módulos](./03-MAPA-DE-MODULOS.md)
4. [Glossário para usuários](./04-GLOSSARIO-PARA-USUARIOS.md)
5. [FAQ geral](./05-FAQ-GERAL.md)
6. [Solução de problemas gerais](./06-SOLUCAO-DE-PROBLEMAS-GERAIS.md)
7. [Perguntas pendentes de validação](./07-PERGUNTAS-PENDENTES-DE-VALIDACAO.md)
8. [Relatório de cobertura](./08-RELATORIO-DE-COBERTURA.md)
9. [Manifesto de conteúdo](./09-MANIFESTO-DE-CONTEUDO.md)

## Conteúdo por módulo

Os artigos por módulo estão em [`modulos/`](./modulos/), com a estrutura:

- `00-visao-geral.md`
- `01-primeiros-passos.md`
- `faq/` (perguntas canônicas)
- `tutoriais/` (passo a passo por tarefa — em construção)
- `problemas-comuns/` (em construção)
- `boas-praticas/` (em construção)

## Conteúdo para IA

- [`chatbot/`](./chatbot/) — prompts e regras do assistente de suporte
- [`rag/`](./rag/) — índice de chunks, manifesto e base JSONL pronta para RAG

## Princípios

- Linguagem simples, em português do Brasil.
- Nomes da interface conforme exibidos ao usuário.
- Apenas conteúdos confirmados são publicados como prontos.
- Conteúdos inferidos ou pendentes ficam marcados e fora do pacote para RAG público.
- Não há referência a tabelas, rotas internas ou detalhes de implementação no corpo dos artigos.
