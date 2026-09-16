
## Site Lab Base — usar páginas reais (sem demo)
- [ ] /sitelab-base/gestao monta AgencyAdminArea real
- [ ] /sitelab-base/area-do-cliente monta AgencyClientArea real
- [ ] remover SiteLabAdminDemo/Surfaces/ClientAreaDemo/sitelabAdminNav/fixtures
- [ ] testes de contrato + typecheck + build + publicar

## Idioma it-IT nos materiais públicos
- [x] Zerar rótulos fixos em português no orçamento público + PDF
- [x] Zerar rótulos fixos em português na carteira digital pública + PDF
- [x] Roteiro público + PDF
- [x] Corrigir todos os erros de typecheck/build (inclusive preexistentes) antes de concluir

## Padronização dos botões de importação
- [x] Padronizar os cabeçalhos de Roteiro, Carteira Digital e Orçamento
- [x] Atualizar testes focados e validar tipos/build

## Desativacao rota legada /crm
- [x] /crm redireciona com replace para /gestao-clientes/funil
- [x] remover import lazy de pages/CRM em App.tsx
- [x] teste comprovando redirect sem loop/historico extra; ajustar dashboard-container.test
- [x] testes focados + typecheck + build; sem publicar

## Aba Meus Modelos em Criar Roteiro
- [x] terceira opcao na mesma barra abrindo Meus Projetos > Modelos > Roteiros
- [x] remover TabsContent morto de templates
- [x] testes focados + typecheck + build; sem publicar

- [x] Miniaturas de fotos no editor de serviços do orçamento: fim do piscar a cada digitação (ResolvedThumb em escopo de módulo, chaves estáveis por referência, resolução síncrona de URLs/cache da sessão, "Indisponível" só após falha real).

## Casa Nova Tur — cenário demonstrativo (plano em 4 etapas)
- [x] Etapa 1: demo_scenarios + demo_scenario_records (RLS/grants restritos), guarda is_demo_scenario_tenant, cleanup mapeado e mapeamento idempotente em casanova-provision
- [x] Etapa 2: cenário ponta a ponta (Ana + Roberto, 8 serviços, CRM, orçamento, roteiro, carteira, file, venda) — implementada em código no provisionamento idempotente; ainda não executada (sem deploy)
- [ ] Etapa 3: datas relativas restritas a tenants demo (1x/dia, delta único, atômico)
- [ ] Etapa 4: URLs amigáveis por agency_slug no host compartilhado + bateria de testes
