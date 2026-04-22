

## Exportar planilha de usuários da plataforma

Vou gerar uma planilha Excel (`.xlsx`) com todos os 142 usuários cadastrados na plataforma, contendo os dados principais para você usar no controle financeiro.

### Colunas da planilha (aba "Usuários")

| # | Coluna | Origem |
|---|--------|--------|
| 1 | Nome | profiles.name |
| 2 | E-mail | auth.users.email |
| 3 | Telefone | profiles.phone |
| 4 | CPF | profiles.cpf |
| 5 | Agência | profiles.agency_name |
| 6 | CNPJ | profiles.cnpj |
| 7 | Endereço completo | rua + número + bairro + cidade + UF + CEP |
| 8 | Cidade | profiles.city |
| 9 | UF | profiles.state |
| 10 | CEP | profiles.zip_code |
| 11 | Plano atual | subscriptions.plan (start / profissional / premium / fundador) |
| 12 | Assinatura ativa | Sim / Não |
| 13 | Stripe Customer ID | subscriptions.stripe_customer_id |
| 14 | Stripe Subscription ID | subscriptions.stripe_subscription_id |
| 15 | Papel | user_roles (admin / agente / fornecedor) |
| 16 | Data de cadastro | profiles.created_at (formato dd/mm/aaaa hh:mm, fuso BRT) |

### Aba adicional "Resumo"

- Total de usuários
- Total de assinaturas ativas
- Distribuição por plano
- Distribuição por papel

### Formatação

- Cabeçalho em azul escuro com fonte branca
- Linhas com filtro automático e congelamento de cabeçalho
- Larguras de coluna ajustadas para leitura confortável
- Quebra de linha em endereços longos

### Como vou obter os dados

O e-mail está no schema protegido `auth.users` e exige uma função segura para ser lido. Vou criar uma função `admin_export_users()` (SECURITY DEFINER, restrita a administradores) que junta `profiles` + `auth.users` + `subscriptions` + `user_roles` em um único retorno. Depois, executo uma chamada para gerar o XLSX.

Essa função fica disponível também para reutilização futura (ex.: re-exportar a planilha quando precisar atualizar o controle financeiro).

### Entrega

Um arquivo único: `usuarios_plataforma.xlsx` disponível para download imediato.

