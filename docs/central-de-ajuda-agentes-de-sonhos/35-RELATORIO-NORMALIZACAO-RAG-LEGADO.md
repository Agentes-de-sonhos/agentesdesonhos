# Relatório de Normalização do RAG Legado

Data: 2026-06-22 • Subonda 2D

## 1. Contexto
Durante as Subondas 2B e 2C foi identificado que 74 chunks publicados em ondas anteriores (Subonda 1B — Gestão de Clientes e Operações) usavam o **esquema antigo em PT-BR** (`modulo`, `titulo`, `texto`, `palavras_chave`, `intencoes`, `confianca`, `fonte`, `ultima_revisao`) e não tinham todos os campos obrigatórios atuais. A Subonda 2D encerrou essa pendência.

## 2. Lista / contagem
- Módulo "Gestão de Clientes": 37 chunks (`clientes-*`).
- Módulo "Operações": 37 chunks (`operacoes-*`).
- Por tipo: FAQ 40 · Tutoriais 16 · Problemas comuns 10 · Boas práticas 8.

## 3. Campos ausentes mais comuns
`title`, `content`, `module`, `submodule`, `type`, `audience`, `plan`, `permissions`, `intents`, `keywords`, `confidence`, `related_ids`, `source_reference`, `last_reviewed`.

## 4. Estratégia de normalização
1. Preservar `id` original (zero alterações).
2. Mapear PT-BR → EN sem alterar conteúdo.
3. Preencher campos novos com valores conservadores:
   - `audience = ["agente","titular"]`
   - `plan = "não-confirmado"`
   - `permissions = "usar módulo <module>"`
   - `related_ids = []`
   - `submodule` derivado do `type`.
4. `type=boas-praticas` → `boa-pratica`.
5. Não promover conteúdo pendente como confirmado.
6. Validação JSONL/JSON após gravação.

## 5. Exemplos antes/depois
**Antes** (`clientes-faq-01`):
```json
{"id":"clientes-faq-01","modulo":"Gestão de Clientes","tipo":"faq","titulo":"Onde fica a lista de clientes","texto":"Em Gestão de Clientes, abra a aba Clientes...","palavras_chave":["clientes","lista"],"intencoes":["abrir clientes"],"confianca":"confirmado","status":"pronto","fonte":"modulos/gestao-clientes/faq/00-perguntas-frequentes.md","ultima_revisao":"2026-06-18"}
```
**Depois:**
```json
{"id":"clientes-faq-01","title":"Onde fica a lista de clientes","content":"Em Gestão de Clientes, abra a aba Clientes...","module":"Gestão de Clientes","submodule":"FAQ","type":"faq","audience":["agente","titular"],"plan":"não-confirmado","permissions":"usar módulo Gestão de Clientes","intents":["abrir clientes"],"keywords":["clientes","lista"],"confidence":"confirmado","status":"pronto","related_ids":[],"source_reference":"modulos/gestao-clientes/faq/00-perguntas-frequentes.md","last_reviewed":"2026-06-18"}
```

## 6. Totais
- Normalizados: 74.
- Mantidos sem alteração de conteúdo: 74.
- Removidos: 0.
- Pendentes: 0.

## 7. Validação final
- JSONL: 764 linhas válidas.
- 0 IDs duplicados, 0 campos obrigatórios ausentes.
- Manifesto coerente (`total_chunks=764`, versão `2.3.0`).

## 8. Riscos remanescentes
- `plan` ficou `não-confirmado` em 74 chunks; refinar na Onda 3.
- `audience` inferido por padrão; refinar conforme governança.

## 9. Recomendação para governança
1. Validação CI do esquema antes de commits em `rag/`.
2. Gerador único de chunks com defaults explícitos.
3. Revisões periódicas (`last_reviewed`) por onda.
4. Histórico versionado do manifesto.

*Sem exposição de conteúdo sensível.*