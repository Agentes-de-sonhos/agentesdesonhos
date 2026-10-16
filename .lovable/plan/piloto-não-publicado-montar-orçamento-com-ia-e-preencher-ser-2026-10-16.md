# Piloto não publicado: "Montar orçamento com IA" e "Preencher serviço com IA"

## O que já existe e será reaproveitado
- Editor de orçamento `GerarOrcamento.tsx` e seus formulários de serviço (`ServiceForms`, `ServiceModal`).
- Importação de pacote completo (`FullPackageImportModal` + função `import-full-package`): já separa o documento em blocos por serviço e revisa um a um antes de salvar. Usa `gemini-2.5-flash` e registra em `full_package_imports`.
- Importadores por serviço (`import-airfare-document`, `import-hotel-document`, `import-car-rental-document`, `import-generic-service-document`, `ai-import-service`) e a lista múltipla normalizada (`serviceImportList.ts`, `serviceImportFieldAliases.ts`).
- Envio econômico de PDF (`fullPackageImportPayload.ts`: só texto quando a extração já basta) e extração no navegador (`pdfText.ts`).
- Limite de uso de IA `check_ai_usage` (usado em `ai-import-service`; **não** usado em `import-full-package` — ponto a corrigir no piloto).

## Como fica para o proprietário (apenas no modo teste)
1. No editor do orçamento, botão "Montar orçamento com IA (teste)".
2. Campo de texto livre + botão de microfone. A fala é transcrita pelo reconhecimento do próprio navegador/teclado; se o navegador não suportar, o botão some e fica o texto (sem gravação enviada à IA, sem voz em tempo real).
3. A IA devolve uma **prévia** da estrutura: passagens, hospedagens (ex.: 2 períodos), ingressos Disney/Universal/SeaWorld, seguro, "Itens não incluídos" e "Informações importantes". Campos não ditos ficam vazios — sem valores, localizadores ou reservas inventados.
4. Alertas na prévia, sem corrigir nada sozinho: noites sem hospedagem entre os períodos, datas no passado, datas fora da viagem, sobreposição de hotéis.
5. O agente marca o que aceita; só então os serviços são criados no orçamento (em rascunho), pelo mesmo caminho do "importar todos" já existente.
6. Em cada serviço, "Preencher com IA por PDF": mostra lado a lado **valor atual × valor do documento**, campo a campo, com caixa de seleção. Nada é sobrescrito sem confirmação; campos vazios no documento não apagam o atual.

## Barra de segurança
- Visível só para administrador (verificado também no servidor, via `has_role`), mais uma chave local de teste. Outras agências não veem nem conseguem chamar.
- Funções novas recusam quem não for admin e aplicam `check_ai_usage` + limite diário próprio do piloto (ex.: 20 chamadas/dia) e tamanho máximo de texto/arquivo.
- Nenhuma mensagem enviada a cliente, nenhum e-mail/WhatsApp. Testes feitos em orçamento de cliente fictício.
- Sem migração no banco na 1ª versão (contador usa `daily_feature_usage` já existente). Nada publicado.

## Etapas incrementais
1. Lógica pura + testes: validação de cronologia (noites descobertas, datas passadas) e diff de campos para a comparação.
2. Função `quote-ai-compose` (texto → estrutura) e reaproveitamento dos importadores por serviço para o PDF.
3. Telas: entrada texto/voz, prévia com alertas, comparação por serviço.
4. Teste ponta a ponta no preview como admin.

## Riscos e custos
- Custo: 1 chamada por montagem; PDF só envia binário quando é digitalizado. Limite diário evita gasto sem controle.
- Reconhecimento de voz varia por navegador (Safari/iOS limitado) — o teclado do celular com ditado cobre o caso.
- Nomes de ingressos/hotéis ambíguos: ficam como texto, sem buscar preço ou disponibilidade.
- `import-full-package` hoje não aplica limite de IA; o piloto não o usa diretamente sem esse limite.

## Detalhes técnicos
- Nova edge function `quote-ai-compose`: auth via `getClaims`, `has_role(admin)`, `check_ai_usage`, contador em `daily_feature_usage` (feature `quote_ai_pilot`), saída por JSON schema estrito reutilizando as chaves de `serviceImportFieldAliases`; modelo padrão do gateway via Responses API com streaming.
- Gate de UI: `useUserRole().isAdmin && localStorage.quote_ai_pilot === "on"`.
- Novos módulos: `src/lib/quoteAiTimeline.ts` (lacunas/datas), `src/lib/serviceFieldDiff.ts`, componentes em `src/components/quote/ai-compose/`.
- Voz: `window.SpeechRecognition || webkitSpeechRecognition`, `lang="pt-BR"`, sessão curta iniciada por clique.
- Testes: regras de cronologia, diff sem sobrescrita, gate admin, payload sem binário quando o texto basta.
