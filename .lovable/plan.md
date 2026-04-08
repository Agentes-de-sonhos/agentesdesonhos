

## Mudança no botão de Suporte WhatsApp

**O que muda:**
1. **Texto do botão**: trocar `💬 Suporte – Fale com a gente` por apenas `Suporte` (sem emoji)
2. **Remover frase lateral**: deletar o `<span>` com "Encontrou algum erro ou tem uma sugestão de melhoria?"

**Arquivo:** `src/components/layout/WhatsAppSupportButton.tsx`

- Linha 50-52: substituir conteúdo do span por `Suporte`
- Linhas 54-56: remover o span com a frase auxiliar

