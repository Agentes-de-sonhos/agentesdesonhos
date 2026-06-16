# Avaliação: como abrir o serviço a partir do chip do roteiro

## 1. Comparação das abordagens

| Abordagem | Vantagens | Desvantagens | Adequação |
|---|---|---|---|
| **Scroll para seção (atual)** | Já implementado, zero custo | Mobile: usuário "se perde" — sai do dia do roteiro, precisa rolar de volta, perde o estado do acordeão; ainda exibe os outros serviços do mesmo tipo, tira o foco do que ele clicou | Ruim no mobile |
| **Modal/Sheet sobreposto** | Mantém o roteiro intacto por baixo, fechar = voltar exatamente para o mesmo ponto, padrão familiar (Nubank, Apple Wallet), reaproveita 100% o `TripServiceCard`, sem mudança de rota | Em telas muito densas pode parecer apertado — mitigado usando Sheet full-height no mobile | **Melhor opção** |
| **Tela cheia com rota dedicada (`/carteira/:code/servico/:id`)** | URL compartilhável, histórico nativo do navegador (botão voltar do sistema funciona) | Custo alto: nova rota pública, novo loader, RPC ou query separada, gestão de auth/voucher, duplica scaffolding de página, e o "voltar" precisa restaurar o dia/acordeão aberto do roteiro | Overkill para o ganho |
| **Inline expand dentro da atividade** | Mantém contexto absoluto | Quebra o ritmo do roteiro (atividades viram cards gigantes), dificulta scroll, e replica conteúdo se o mesmo serviço estiver vinculado a várias atividades | Não recomendado |

**Recomendação:** **Sheet no mobile + Dialog grande no desktop**, ambos renderizando o **mesmo `TripServiceCard`** que a Carteira já usa. É a única alternativa que preserva o contexto do roteiro sem duplicar componentes nem criar rotas novas.

## 2. Por que reaproveita tudo

O `TripServiceCard` (`src/components/trip/TripServiceCard.tsx`) já é o componente único que a Carteira Pública (`ViagemPublica.tsx`) renderiza dentro de cada seção colapsável. Ele já trata todos os tipos (voo, hotel, ingresso, transfer, seguro, cruzeiro, locação, trem, outros) com voucher, PDF, localizador, observações e anexos.

Basta envolvê-lo num `Sheet`/`Dialog` controlado por estado no `ViagemPublica.tsx`. Zero duplicação.

## 3. Fluxo proposto

```
Carteira → Roteiro → Dia → Atividade
                              │
                              ▼  (clique no chip "Ver hospedagem")
                    ┌────────────────────────┐
                    │  Sheet (mobile)        │
                    │  ou Dialog (desktop)   │
                    │                        │
                    │  ← Voltar              │
                    │  ─────────────────     │
                    │  <TripServiceCard />   │
                    │  (mesmo da Carteira)   │
                    └────────────────────────┘
                              │  fechar
                              ▼
                    Volta exatamente ao dia/atividade
                    (roteiro nunca saiu da tela)
```

- **Mobile**: `Sheet side="bottom"` ocupando ~92vh, com handle de arrastar para fechar (já é o padrão do projeto — ver memória `Chat UX`).
- **Desktop**: `Dialog` centralizado, largura ~640px, scroll interno.
- **Cabeçalho do overlay**: ícone do tipo de serviço + label ("Hospedagem", "Passagem aérea", etc.) + botão fechar/voltar.
- **Sem mudança de rota** → botão "voltar" do sistema fecha o overlay (mapear via histórico opcional, ou apenas via X/swipe).

## 4. Detalhes técnicos (seção para a equipe)

**Arquivos afetados (estimativa):**
- `src/pages/ViagemPublica.tsx`: substituir `handleOpenService` (que hoje faz `setOpenSection` + `scrollIntoView`) por `setActiveService(service)`; renderizar um único `<ServiceDetailOverlay service={activeService} onClose={...} />` no fim do JSX. Manter o scroll antigo como fallback para o caso de o usuário clicar no header da seção (não no chip).
- **Novo** `src/components/wallet/ServiceDetailOverlay.tsx` (~60 linhas): wrapper responsivo que escolhe `Sheet` (mobile via `useIsMobile`) ou `Dialog` (desktop), com header padronizado, e renderiza `<TripServiceCard service={...} variant="detail" />` dentro. Sem lógica de dados.
- `src/components/trip/TripServiceCard.tsx`: aceitar prop opcional `variant?: 'inline' | 'detail'` para remover bordas/sombras quando exibido dentro do overlay (já vem com bordas próprias). Mudança mínima e retrocompatível.
- `CollapsibleDayCard.tsx`: nenhum ajuste — continua chamando `onOpenService(service)`.

**Estado e dados:**
- A lista `services` já está carregada na `ViagemPublica` (mesma query que alimenta as seções). O chip resolve o `linked_trip_service_id` para um item dessa lista → passa direto para o overlay. Zero fetch adicional, zero nova RPC.

**Auth / vouchers:**
- O `TripServiceCard` já lida com signed URLs/serve-voucher pelo contexto da carteira pública. Como ele continua sendo renderizado dentro da mesma página com o mesmo contexto, nada muda.

**Histórico/voltar do sistema (opcional, fase 2):**
- Pode-se fazer `pushState` ao abrir e interceptar `popstate` para fechar. Útil no mobile (botão físico voltar). Opcional — não é bloqueante para MVP.

## 5. O que NÃO muda

- Estrutura do banco (já temos `linked_trip_service_id`).
- RPC `get_public_trip_itinerary_v2`.
- Seções colapsáveis da Carteira: continuam funcionando para quem entra pela aba de tipo de serviço.
- Editor de roteiro: nenhuma mudança.

## 6. Recomendação final

Implementar **Sheet (mobile) + Dialog (desktop)** reaproveitando `TripServiceCard`. É a opção com a melhor relação custo/UX:

- Preserva contexto do roteiro (objetivo principal).
- Reutiliza 100% do componente de detalhes do serviço.
- ~1 componente novo + ~30 linhas alteradas em `ViagemPublica.tsx`.
- Reversível: se quisermos voltar a scroll, basta trocar o handler.

A rota dedicada fica como evolução futura caso surja necessidade de compartilhar link direto de um serviço específico — hoje não é o caso.
