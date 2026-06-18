# Base de Conhecimento Mestre — Agentes de Sonhos

- **Data da auditoria:** 18/06/2026
- **Commit / versão analisada:** snapshot atual do workspace (não identificável por hash neste ambiente)
- **Autor:** auditoria automatizada (somente leitura de código-fonte, banco e configurações)
- **Escopo:** inventário funcional + documentação geral oficial da plataforma

> **Importante**: nenhum código, banco de dados, migration, política, Edge Function, integração, dependência, variável de ambiente ou configuração foi alterado. Esta auditoria criou apenas arquivos Markdown dentro de `docs/base-conhecimento-agentes-de-sonhos/`.

## Como ler esta base

Cada informação está classificada com um dos rótulos abaixo:

- **CONFIRMADO** — localizado diretamente no código-fonte, banco ou configuração;
- **INFERIDO** — comportamento deduzido a partir da implementação, sem afirmação totalmente explícita;
- **NÃO LOCALIZADO** — mencionado ou esperado, mas não encontrado nesta auditoria;
- **PENDENTE DE CONFIRMAÇÃO** — exige validação do proprietário do produto;
- **INATIVO OU INCOMPLETO** — existe parcialmente, está oculto, desconectado ou aparentemente não concluído.

## Índice geral

1. [Visão geral do produto](./01-VISAO-GERAL-DO-PRODUTO.md)
2. [Inventário funcional](./02-INVENTARIO-FUNCIONAL.md)
3. [Jornadas e fluxos](./03-JORNADAS-E-FLUXOS.md)
4. [Perfis, permissões e segurança](./04-PERFIS-PERMISSOES-E-SEGURANCA.md)
5. [Modelo de dados](./05-MODELO-DE-DADOS.md)
6. [Integrações e automações](./06-INTEGRACOES-E-AUTOMACOES.md)
7. [Glossário](./07-GLOSSARIO.md)
8. [FAQ inicial](./08-FAQ-INICIAL.md)
9. [Lacunas, inconsistências e perguntas](./09-LACUNAS-INCONSISTENCIAS-E-PERGUNTAS.md)
10. [Relatório de cobertura](./10-RELATORIO-DE-COBERTURA.md)

## Documentação por módulo

- [CRM e Oportunidades](./modulos/crm.md)
- [Gestão de Clientes](./modulos/gestao-clientes.md)
- [Operações](./modulos/operacoes.md)
- [Orçamentos](./modulos/orcamentos.md)
- [Roteiros](./modulos/roteiros.md)
- [Carteira Digital](./modulos/carteira-digital.md)
- [Financeiro](./modulos/financeiro.md)
- [Comissões e Vendedores](./modulos/comissoes-vendedores.md)
- [Faturas](./modulos/faturas.md)
- [Captação de Leads](./modulos/captacao-leads.md)
- [Marketing — Vitrine, Cartão e Lâminas](./modulos/marketing.md)
- [Materiais de Divulgação](./modulos/materiais.md)
- [Bloqueios Aéreos](./modulos/bloqueios-aereos.md)
- [Mapa do Turismo](./modulos/mapa-turismo.md)
- [Raio-X do Hotel](./modulos/hotel-raio-x.md)
- [Travel Advisor (Hotéis, Restaurantes, Compras, Experiências, Atrações)](./modulos/travel-advisor.md)
- [Central de Requisitos de Viagem](./modulos/requisitos-viagem.md)
- [Benefícios e Descontos](./modulos/beneficios.md)
- [EducaTravel Academy](./modulos/educatravel-academy.md)
- [Cursos e Mentorias](./modulos/cursos-mentorias.md)
- [Notícias do Trade / Radar do Turismo](./modulos/noticias.md)
- [Comunidade (Trade Connect)](./modulos/comunidade.md)
- [Perguntas e Respostas](./modulos/perguntas-respostas.md)
- [Ferramentas de IA](./modulos/ferramentas-ia.md)
- [Agenda](./modulos/agenda.md)
- [Bloco de Notas](./modulos/bloco-notas.md)
- [Calculadora](./modulos/calculadora.md)
- [Gamificação](./modulos/gamificacao.md)
- [Equipe e Permissões](./modulos/equipe-e-permissoes.md)
- [Configurações, Conta e Onboarding](./modulos/configuracoes.md)
- [Planos e Assinatura](./modulos/planos-assinatura.md)
- [Suporte](./modulos/suporte.md)
- [Painel Administrativo](./modulos/admin.md)
- [Painel do Fornecedor](./modulos/dashboard-fornecedor.md)

## Avisos de segurança

Esta base de conhecimento não contém senhas, chaves de API, tokens, secrets, credenciais, dados pessoais reais, dados financeiros reais nem valores de variáveis de ambiente. Quando uma integração é citada, apenas o nome técnico aparece (por exemplo, `LOVABLE_API_KEY`, `RESEND_API_KEY`), nunca o seu valor.