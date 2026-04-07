## Fase 1 — Correções de bugs (itens 1, 2, 3)

1. **Quebra de linha**: Aplicar `whitespace-pre-wrap` nos textos do link público (observações, descrições, condições, notas de transfer/seguro)
2. **Cabeçalho "Serviços incluídos"**: Padronizar visual
3. **Observações de Transfer e Seguro**: Exibir `notes`/`description` no `getServiceDetails()` e no card público

## Fase 2 — Melhorias simples (itens 4, 5, 9, 10, 11)

4. **Editar destino**: Adicionar botão de edição no campo destino do editor do orçamento
5. **Negrito (botão)**: Criar componente `BoldTextarea` com botão de toggle que insere `**texto**`, renderizar markdown simples no público
6. **Transfer Regular/Privativo**: Adicionar campo `service_category` ao schema do Transfer  
9. **Hospedagem**: Adicionar campos opcionais `adult_price`/`child_price`, manter `price` como fallback
10. **Valor Total visual**: Reduzir destaque do bloco de investimento (menos padding, font menor, gradiente mais sutil)

## Fase 3 — Melhorias maiores (itens 6, 7, 8)

6. **Seguro valor único vs separado**: Toggle no form entre "por pessoa" e "valor total"
7. **Imagem na descrição do destino**: Upload manual adicional no DestinationIntroEditor
8. **Título da viagem**: Novo campo `trip_title` na tabela `quotes`, exibido acima do destino

### Migração necessária (Fase 3)
- `ALTER TABLE quotes ADD COLUMN trip_title TEXT DEFAULT NULL`
