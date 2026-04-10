

# Plano: Destinos dinâmicos na Academy

## Problema
Os destinos das trilhas são uma lista fixa no código (`POPULAR_DESTINATIONS`). Não há como criar destinos novos.

## Solução
Criar uma tabela `academy_destinations` no banco e substituir o Select estático por um que carrega do banco + permite criar novos destinos inline.

## Etapas

### 1. Migration — Criar tabela `academy_destinations`
```sql
CREATE TABLE public.academy_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.academy_destinations ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar
CREATE POLICY "Admins full access" ON public.academy_destinations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Todos autenticados podem ler
CREATE POLICY "Authenticated read" ON public.academy_destinations
  FOR SELECT TO authenticated USING (true);

-- Seed com os destinos populares existentes
INSERT INTO public.academy_destinations (name) VALUES
  ('Orlando'),('Nova York'),('Miami'),('Paris'),('Londres'),('Roma'),
  ('Caribe'),('Cancún'),('Punta Cana'),('Buenos Aires'),('Santiago'),
  ('Dubai'),('Europa'),('Ásia'),('Disney'),('Cruzeiros'),('Destinos Premium');
```

### 2. Atualizar `AdminAcademyManager.tsx`
- Carregar destinos do banco via `useQuery` na tabela `academy_destinations`.
- Substituir o `<Select>` de destinos por um componente com:
  - Lista dos destinos existentes (do banco).
  - Campo de input + botão "Criar destino" no final da lista.
  - Ao criar, insere no banco e seleciona automaticamente.
- Remover dependência da constante `POPULAR_DESTINATIONS` neste componente.

### 3. Manter `POPULAR_DESTINATIONS` no types
A constante pode continuar existindo para outros usos no sistema, mas o formulário de trilhas passará a usar exclusivamente o banco.

## Detalhes técnicos
- Tabela simples: `id`, `name` (unique), `created_at`
- RLS: admin full access, authenticated read
- UI: Combobox ou Select com opção "Adicionar novo destino" que abre um pequeno input inline

