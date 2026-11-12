# Revisão dos 24 relatos de funcionamento

Data: 11/11/2026. Base: `03210b3804a1021f1dee738885198fcc8255c95e`.

Pacote para revisão, sem merge, migração aplicada em produção ou publicação. O contador do painel Lovable não foi alterado. Correção no código não significa correção já publicada.

## Resultado por item

| Item | Estado | Tratamento |
| --- | --- | --- |
| 1. Notas da carteira/PDF como HTML | Já tratado na base | Testes adicionais confirmam formatação e sanitização de HTML nos renderizadores. |
| 2. Fornecedor impede mudar status | Preparado, depende de migração | Confirma fornecedor do snapshot; nova RPC altera só identidade, inclusive após conversão, com permissões e isolamento de agência. |
| 3. Visão Geral/Meta de Vendas 404 | Já tratado na base | Rotas atuais registram os destinos. |
| 4. Promoção Grupo SC aparece como grátis | Já tratado na base | Guards promocionais, validade e bloqueio de contratação durante promoção ativa. |
| 5. Desfazer movimento de voz | Corrigido no código | Callback usa estado recente e só anuncia sucesso após movimento confirmado. |
| 6. Logo da campanha não sai da página | Corrigido no código | Saída do pathname da campanha remonta o aplicativo no destino. |
| 7. Oferta existente aparece desativada | Corrigido no código | Reconhece oferta existente, preserva canais e respeita opt-out; não cria duplicação. |
| 8. Universal menciona outra agência | Corrigido no código | Consentimento neutro fora do perfil que usa texto pessoal. |
| 9. Arquivo de voo perde campos | Corrigido no código | Preserva resultado completo e File; texto não herda upload anterior. Só estado React. |
| 10. Modelos de IA aposentados | Corrigido no código | Gemini 2.5 Pro/Flash trocados pelo substituto oficial do gateway, Gemini 3.8 Flash. Exige deploy das funções. |
| 11. Resorts menciona outra agência | Já tratado na base | Texto compartilhado neutro e personalização restrita ao perfil correspondente. |
| 12. Popup anuncia R$98 | Corrigido no código | Alinhado ao aplicativo: R$196/mês e 15 dias de teste. Stripe real não foi alterado nem consultado. |
| 13. Aviso depende da primeira aba | Corrigido no código | Inscrição única fora dos routers de abas; SiteLab/demo não assina dados reais. |
| 14. Cotação mobile espremida | Corrigido no código | Uma coluna mobile e span do botão corrigido; tablet/desktop preservados. |
| 15. Âncora Experiências quebrada | Corrigido no código | Preserva âncora legada campanhas no bloco Xcaret. |
| 16. Reserva manual sem custo/comissão | Corrigido no código | Campos restaurados somente na reserva manual com permissões separadas. |
| 17. Abrir oportunidade leva só ao funil | Corrigido no código | Redirect /crm preserva query e hash; funil já consumia opportunity. |
| 18. Identidade nas notificações | Corrigido no código | Busca de perfis por user_id, inclusive avatar mobile. |
| 19. Anexo compartilhado ao duplicar carteira | Confirmado, não alterado | URL legada pode manter referência ao original e exclusão/substituição pode removê-lo. Apenas caracterização sintética. |
| 20. Apagar preço mantém valor antigo | Já tratado na base | Vazio envia zero; sem permissão não altera valor. |
| 21. Fullscreen esconde alertas | Já tratado na base | Host dos portais/toasts dentro da superfície fullscreen. |
| 22. Maximizar CRM antigo | Já tratado na rota ativa | /crm já redirecionava ao CRM atual; página antiga sem rota não foi modificada. |
| 23. Equipe recebe domínio genérico | Preparado, depende de migração | SELECT apenas do domínio ativo da própria agência, sem DNS ou permissões de escrita. |
| 24. Retomada repete vencedores | Corrigido no código | Histórico carregado antes de ativar, snapshot correto e capacidades/filtros restaurados; dados desconhecidos não anulam restrições. |

**16 itens com correções propostas, 7 já tratados na base, 1 defeito preservado para decisão específica.**

## Anexos e links públicos

Não foram alterados buckets, políticas de anexos, senhas, tokens, URLs ou objetos existentes de orçamentos/carteiras. Nenhum anexo real foi substituído ou removido. Não foi adicionada senha a links públicos. FlightAutoImport muda somente estado React da confirmação.

O item 19 exige autorização específica para uma etapa própria de cópia e exclusão segura, preservando acesso sem senha. O teste correspondente caracteriza o defeito; não prova que a duplicação esteja segura. Não executar limpeza automática de arquivos.

## Verificação local

- Build de produção aprovado, com avisos existentes de CSS, asset em runtime e tamanho de chunks.
- **162 testes focados aprovados em 25 arquivos.**
- Suíte ampla da implementação, antes dos oito cenários adicionais de smoke: **3.779 aprovados, 59 falhas e 1 ignorado**, em 407 arquivos. As falhas remanescentes também existem na base, portanto a suíte global continua vermelha.
- A repetição ampla adicional foi interrompida: o teste legado fx-rate-converter contém chamada HTTPS ao serviço real configurado em VITE_SUPABASE_URL. Essa chamada foi bloqueada por estar fora da validação isolada. Não houve conclusão dessa repetição nem tentativa de liberar acesso à produção. Os resultados novos são os 37 testes SQL e os 46 smoke isolados descritos abaixo.
- A suíte security-access-policies, dependente do executável lovable e do banco publicado, foi excluída: o executável não está disponível. Não houve novo scan ou validação de políticas no banco real.
- Typecheck: os mesmos 13 erros TS2345/RejectExcessProperties da base, nos mesmos arquivos, sem diagnóstico adicional.
- Testes novos passaram no lint; arquivos antigos mantêm dívida de lint. git diff --check aprovado.
- O package-lock da base é incoerente com package.json. Dependências instaladas com --ignore-scripts --package-lock=false, sem alterar manifestos ou locks. Não é uma reprodução congelada do lock de produção.
- Revisão independente confirmou isolamento do fornecedor, capacidades do sorteio, bloqueio de backend em SiteLab e ausência de alterações no acesso a anexos.
- Validação SQL descartável: **37/37 testes aprovados** em PostgreSQL 17.5 via PGlite 0.3.14, com as duas migrações literais, RLS, roles e helpers reais. Inclui isolamento, permissões, revogação, preservação financeira e rollback de erro após UPDATE. [Harness e comando](../supabase/tests/pr7-migrations/README.md).
- Smoke React/jsdom: **46/46 cenários aprovados**, com fetch/XHR/WebSocket/HTTP(S)/net/TLS bloqueados e zero tentativas de rede. Inclui navegação, abas, SiteLab, upload, falha/retry/cancelamento do fornecedor e ações mobile. [Comando reproduzível](../scripts/test/README.md). Esses cenários se sobrepõem aos testes anteriores; não devem ser somados como casos distintos.
- Limites restantes: schema SQL parcial e sentinelas financeiras, sem replay integral do Supabase; autenticação por claim sintética, sem sessão real; sem navegador visual, IA real ou teste ponta a ponta de assinatura/persistência de anexos. Não comprova estado/grants da produção.

## Implantação pendente

1. Validação focada descartável das duas migrações concluída. Antes de implantar, conferir cadeia de migrações, helpers, grants e triggers do ambiente de destino; o teste local não reproduz todo o Supabase.
2. Completar o smoke autenticado/visual em ambiente de homologação equivalente, incluindo navegação mobile e acesso aos anexos sem senha. Os mecanismos de anexos não foram alterados; testes locais não substituem essa verificação ponta a ponta.
3. Aplicar migrações aprovadas antes do frontend que chama a nova RPC. Publicar frontend e funções de IA somente após aprovação de implantação.
4. Fazer smoke test autenticado e de IA ao vivo; revalidar os relatos no ambiente publicado antes de fechá-los.

## Modelos e custo

A [tabela oficial do gateway Lovable](https://docs.lovable.dev/features/ai-deprecated-models) informa aposentadoria de Gemini 2.5 Pro/Flash em 20/10/2026, com redirecionamento para Gemini 3.8 Flash. A troca explícita alinha o código ao destino já documentado. Prompts, schemas, quotas e modelos ainda suportados foram preservados. Não houve chamada de inferência nem uso de créditos de edição do Lovable nesta implementação; uso futuro do aplicativo continua sujeito ao gateway.
