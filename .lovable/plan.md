# Múltiplos apartamentos dentro de uma opção de hotel

## Objetivo
Permitir que uma única opção de hotel no orçamento contenha vários apartamentos (duplo, triplo, duplo com criança, etc.), sem precisar duplicar o hotel.

## Escopo (somente módulo Orçamentos)
- Cadastro/edição de serviço tipo `hotel`.
- Card resumo do serviço.
- PDF do orçamento.
- Orçamento público (`OrcamentoPublico.tsx` e `OrcamentoPublicoV2.tsx`).
- Compatibilidade retroativa com orçamentos antigos.

## Mudanças

### 1. Modelo de dados (`src/types/quote.ts`)
Adicionar a estrutura `HotelRoom` e o array `rooms` opcional em `HotelData`:

```ts
interface HotelRoom {
  room_type: string;         // "Duplo", "Triplo", "Duplo com criança", "Single", "Quádruplo", "Outro"
  quantity: number;          // qtde de apartamentos daquele tipo
  adults: number;
  children: number;
  children_ages?: number[];
  unit_price: number;        // valor por apartamento
  total_price: number;       // quantity * unit_price
  notes?: string;
}
```

`HotelData` mantém `room_type` / `meal_plan` / `price` legados (para não quebrar dados antigos) e ganha `rooms?: HotelRoom[]`. Quando `rooms` existir, ele é a fonte da verdade e `price` = soma dos `total_price`.

### 2. Formulário de hotel (`src/components/quote/ServiceForms.tsx`)
- Nova seção "Apartamentos" com lista dinâmica (`useFieldArray`).
- Botão "Adicionar apartamento".
- Cada linha: tipo (select), quantidade, adultos, crianças, idades (aparece se children>0), valor unitário, observações, subtotal calculado.
- Total da opção = soma dos subtotais, exibido em destaque, grava em `price`.
- Migração automática ao editar: se `init.rooms` estiver vazio mas houver `init.room_type/price`, cria uma linha inicial com esses dados.
- Validação: pelo menos 1 apartamento; `quantity >= 1`; `adults >= 1`.
- Mantém regime de alimentação (`meal_plan`), nome do hotel, cidade, check-in/out, categoria.

### 3. Resumo (`ServiceCard.tsx`)
Se `rooms?.length`, mostrar bullets:
`1x Apartamento Duplo — 2 adultos`
`1x Duplo + Criança — 2 adultos + 1 criança (6 anos)`
Fallback para o texto antigo quando não houver `rooms`.

### 4. PDF (`QuotePDF.tsx`)
Renderizar as mesmas linhas de acomodações dentro do bloco do hotel. Fallback legado.

### 5. Público (`OrcamentoPublico.tsx` + `OrcamentoPublicoV2.tsx`)
Mesma renderização agrupada abaixo do hotel. Fallback legado.

### 6. Import IA (`service-import/serviceImportConfigs.ts`)
Não é alterado agora: o hotel importado continua chegando como um único quarto (compatível — vira `rooms[0]` na edição).

## Compatibilidade
- Nenhuma migração de banco: `service_data` é JSONB.
- Orçamentos antigos continuam funcionando (leitura cai no fallback).
- Ao editar um hotel antigo e salvar, o formulário grava `rooms` automaticamente.

## Critério de aceite
Criar 1 opção do "Hotel X" com 3 quartos (Duplo, Duplo+Criança, Triplo), salvar, reabrir e ver os 3 apartamentos e o total somado corretamente no editor, no card, no PDF e na página pública.
