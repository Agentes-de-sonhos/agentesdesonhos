
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
