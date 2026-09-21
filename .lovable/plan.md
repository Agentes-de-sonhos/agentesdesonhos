# Importar vários serviços do mesmo documento

Hoje só a **Hospedagem** entende que um documento pode conter mais de uma reserva (traz a lista, você marca o que quer e cada hotel entra como um serviço separado). Nos outros tipos — ingressos/atrações, transfer, cruzeiro, seguro, circuito, trem, aéreo e locação — a IA é obrigada a devolver **um único item**, então um orçamento com Universal + Disney + SeaWorld vira um serviço só.

A proposta é levar o comportamento da Hospedagem para todos os tipos de serviço.

## O que muda para você

1. Ao importar um documento com vários itens, a tela de revisão mostra **uma lista**: "3 ingressos encontrados", cada um em um bloco com seus próprios campos, valores e datas.
2. Você pode **desmarcar** os itens que não quer importar e editar cada um antes de aplicar.
3. Ao confirmar, **cada item entra como um serviço separado** no orçamento (ou na carteira digital), com seu próprio valor — nunca mais tudo somado em um "pacote".
4. Documento com um único item continua exatamente como é hoje: vai direto para o formulário preenchido.
5. Vale para: ingressos/atrações, transfer, cruzeiro, seguro, circuito, trem, outros serviços, aéreo (vários bilhetes/trechos independentes) e locação de veículo.

## Como será feito (técnico)

- `supabase/functions/import-generic-service-document/index.ts`: o schema da ferramenta passa a ter um array (`itens`) com um objeto por serviço identificado, seguindo o mesmo padrão de `hospedagens` em `import-hotel-document`. Resposta retorna `items`, `items_count` e mantém `data` = primeiro item (compatibilidade com respostas antigas).
- Mesmo ajuste em `import-airfare-document` (`bilhetes`) e `import-car-rental-document` (`locacoes`).
- Novo util `src/lib/serviceImportList.ts` — generalização de `hotelImportList.ts` (extrai a lista de qualquer formato de resposta, descarta itens vazios, ordena por data quando houver).
- `GenericServiceSmartImport.tsx`: passa a guardar `parsedList` + `skipped[]`, renderiza a revisão item por item (reaproveitando `ReviewScreen` por item, como o `HotelSmartImport`) e ganha `onConfirmMany`.
- `CarRentalSmartImport.tsx` e `AirfareSmartImport.tsx`: mesmo tratamento de lista.
- `ServiceForms.tsx`: liberar `onSubmitMany` para todos os tipos (hoje linha 3502 restringe a `hotel`) e repassar `onConfirmMany` nos importadores.
- Consumidores da Carteira Digital (`TripServiceForms.tsx`, `WizardAIImport.tsx`, `AIImportServiceModal.tsx`): aceitar e repassar a lista, criando um serviço por item.
- Testes novos em `src/test/` cobrindo: resposta singular antiga (1 item), resposta em lista (3 ingressos), descarte de itens vazios e criação de um serviço por item.

## Fora do escopo

- Nenhuma alteração de banco, migrations, RLS ou permissões.
- Nada de publicação/deploy sem sua autorização (a parte das funções de IA só vale em produção após atualizar as funções — eu aviso e peço OK).
- Regras de preço, moeda, campos e etapas dos formulários permanecem iguais.
