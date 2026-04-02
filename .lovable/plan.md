

## Plano: Geração de PDF Interativo para o Cartão Virtual

### Visão Geral
Criar uma função que gera um PDF em formato vertical (smartphone) replicando o layout visual do cartão público, com todos os links clicáveis (WhatsApp, telefone, e-mail, site, redes sociais, botões de ação).

### Abordagem Técnica
Usar a biblioteca **jsPDF** para gerar o PDF diretamente no navegador, desenhando cada elemento do cartão (foto, nome, título, ícones de contato, botões, redes sociais, logos) com links ativos via `doc.link()`. O formato será vertical, simulando tela de celular (100mm x 178mm aprox.).

### Arquivos a Criar/Editar

1. **`src/lib/generateBusinessCardPdf.ts`** — Nova função que:
   - Recebe os dados do `BusinessCard`
   - Cria um PDF vertical com jsPDF (tamanho customizado ~smartphone)
   - Desenha o gradiente/cover de fundo
   - Renderiza foto circular (se houver)
   - Renderiza nome, título, agência com as cores do cartão
   - Desenha botões de contato rápido (WhatsApp, telefone, e-mail, site) como círculos coloridos com links clicáveis
   - Desenha botão "Salvar Contato" com link para vCard (fallback: sem link)
   - Desenha botões de ação customizados com bordas e links
   - Desenha ícones de redes sociais com links
   - Renderiza logos da agência
   - QR Code via canvas (biblioteca `qrcode`) convertido para imagem no PDF
   - Retorna o Blob do PDF

2. **`src/components/card-wizard/WizardComplete.tsx`** — Adicionar botão "Gerar PDF":
   - Importar a função de geração
   - Buscar dados completos do cartão via hook
   - Botão com ícone de download que chama a função e faz auto-download
   - Nome do arquivo: `cartao-{slug}.pdf`

3. **`src/pages/MeuCartao.tsx`** — Adicionar botão "Gerar PDF" na seção de ações rápidas (ao lado de "Copiar link" e "Visualizar")

### Dependência
- Instalar `jspdf` (já pode estar disponível; caso contrário, adicionar ao package.json)

### Detalhes do Layout do PDF
- Dimensões: ~100mm x 178mm (proporção smartphone)
- Header com gradiente usando as cores primária/secundária do cartão
- Foto centralizada com borda branca circular
- Tipografia: Helvetica (built-in do jsPDF)
- Botões de contato como retângulos arredondados com texto e links `href`
- Redes sociais como círculos com texto abreviado e links
- QR Code no rodapé apontando para a URL pública
- Arquivo leve, otimizado para compartilhamento via WhatsApp

### Resultado
O agente poderá gerar e compartilhar seu cartão virtual como PDF interativo, mantendo a identidade visual e todos os links funcionais.

