# Remover o acesso por código da Área do Cliente

## Alteração
- Remover o bloco “Recebeu um link com código?” do login e da página inicial autenticada da Área do Cliente compartilhada.
- Excluir o bloco reutilizável que ficará sem uso, garantindo a remoção no SiteLab Base e em todos os sites de agência.
- Manter intactos login, recuperação de senha, viagens, documentos e links públicos acessados diretamente.

## Validação
- Atualizar os testes para confirmar que o bloco não aparece antes nem depois do login.
- Rodar os testes focados, conferência de tipos e verificar a compilação automática.
- Não alterar banco, permissões, regras de negócio nem publicar.
