# Smoke local do PR #7

Executar na raiz do checkout, com as dependências da aplicação instaladas:

```sh
./node_modules/.bin/vitest run --config scripts/test/audit-smoke.config.ts \
  src/test/audit-supplier-smoke.test.tsx \
  src/test/audit-mobile-smoke.test.tsx \
  src/test/crm-legacy-route.test.tsx \
  src/test/lovable-crm-regressions.test.tsx \
  src/test/sitelab-gestao-runtime.test.tsx \
  src/test/flight-auto-import-upload.test.tsx \
  src/test/november-campaign-release.test.tsx \
  src/test/community-profile-identities.test.tsx \
  src/test/agency-quick-quote-layout.test.tsx
```

Resultado em 11/11/2026: **46 passaram, 0 falharam**, em nove arquivos. Guard de rede instalado antes dos imports e antes de cada teste, com verificação de integridade depois; zero tentativas de conexão. fetch, XHR, WebSocket, HTTP(S), net e TLS são bloqueados. Supabase e respostas externas são mocks explícitos, sem credenciais ou dados reais.

Cobre redirect CRM/query/hash/Voltar; avisos entre abas; SiteLab sem canal; PDF/imagem/texto de voo; hook real de fornecedor com resposta RPC mockada (sucesso, erro de permissão/transitório, retry, cancelar/reabrir e submit repetido); ações mobile; campanha e contratos de grade.

É integração React/jsdom. Não prova aparência/scroll em navegador, sessão real, RLS (testada separadamente no harness SQL), extração de IA ou acesso/assinatura/persistência de anexos ponta a ponta. Conversão pertence ao file; o teste UI de fornecedor usa serviço reservado e não simula o backend da conversão. Nenhuma alteração de produção ou dos mecanismos de anexos.
