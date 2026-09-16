# Problema 14 — Aba "Meus Modelos" na tela Criar Roteiro

## Status: persiste (remoção intencional confirmada)

## Evidências
- A tela de criação é `src/pages/CriarRoteiro.tsx`. A barra de abas tem hoje apenas **Novo Roteiro** e **Meus Roteiros** (esta última abre "Meus Projetos" em nova janela interna). Não existe mais gatilho para modelos, em desktop nem mobile (é a mesma barra única).
- O conteúdo da aba ainda existe no código (`<TabsContent value="templates"><TemplatesGrid /></TabsContent>`) e o estado aceita `"templates"`, mas ficou **inalcançável** por não haver botão.
- A remoção foi intencional: o teste `src/test/criacao-nova-aba-cabecalhos.test.ts` afirma explicitamente "não exibe mais a aba Meus Modelos". Não foi perda de refatoração.
- Os modelos continuam existindo e preservados: tabelas `itinerary_templates` / `itinerary_template_activities`, hook `useItineraryTemplates`, componente `TemplatesGrid`, página `ModelosRoteiros` em `/ferramentas-ia/modelos-roteiros` e aba "Modelos" em Meus Projetos (`?tab=modelos`, disponível também no plano Start e no painel das agências).
- Salvar como modelo continua funcionando na própria tela (`SaveAsTemplateDialog`).

## Impacto atual
Baixo/médio: nada foi perdido, mas o agente precisa sair da tela de criação para consultar ou aplicar um modelo salvo — passo extra num fluxo frequente. Também há código morto (aba `templates`) que confunde manutenção futura.

## Recomendação
Não reintroduzir uma terceira aba (a barra foi simplificada de propósito). Em vez disso, adicionar um **atalho discreto "Meus Modelos"** no mesmo cabeçalho, ao lado do bloco de importação, abrindo a biblioteca de modelos em nova janela interna — mesmo padrão já usado por "Meus Roteiros". E remover o resto da aba morta.

## Plano curto
1. Em `src/pages/CriarRoteiro.tsx`, acrescentar botão/atalho "Meus Modelos" no cabeçalho do card de criação, usando `useAdminNav` + `useOpenInternalWindow` para abrir a aba Modelos de Meus Projetos (funciona igual na plataforma, no SiteLab e nos sites das agências).
2. Remover o `TabsContent value="templates"` inalcançável e o valor `"templates"` do estado, mantendo `TemplatesGrid` intacto (segue em uso em Meus Projetos e na Biblioteca de Modelos).
3. Manter `SaveAsTemplateDialog`, importação de roteiro, duplicação, publicação e limites de plano sem alteração.
4. Atualizar o teste que exige a ausência da aba, para exigir a ausência da **aba** e a presença do **atalho**.

## Dependências verificadas
- Roteiro V2 / público (`RoteiroPublicoV2`) não usa modelos: sem impacto.
- Importação (`ImportItineraryWizard`) e duplicação são independentes dos modelos.
- Permissões: `/ferramentas-ia/modelos-roteiros` exige `itineraries.view`; o atalho deve respeitar a mesma condição de visibilidade usada hoje pelas listas.
- Plano: a aba Modelos de Meus Projetos está liberada inclusive no Start, então o atalho não cria bloqueio novo.
- Responsividade: o cabeçalho já usa layout que empilha no mobile; o atalho entra nesse mesmo bloco.

## Testes e critérios de aceite
- Teste de componente/arquivo: atalho "Meus Modelos" presente no cabeçalho; nenhuma terceira aba na barra; ausência do `TabsContent` de modelos.
- Regressão: barra continua com Novo Roteiro e Meus Roteiros; "Meus Roteiros" continua abrindo em nova janela; wizard de importação e salvar-como-modelo continuam ligados.
- Aceite: da tela Criar Roteiro é possível alcançar os modelos salvos em um clique, sem perder o formulário em andamento, e nenhum modelo existente é afetado.

## Esforço
Pequeno — um arquivo de interface e um arquivo de teste; sem migração e sem mudança de dados.
