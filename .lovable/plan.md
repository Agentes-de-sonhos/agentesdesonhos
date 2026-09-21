# Diagnóstico: "Importar locação com IA" falha com HTTP 400

## O que acontece

O arquivo é enviado à IA como se fosse uma **imagem**. Quando o arquivo é um PDF, o
provedor recusa a requisição e devolve 400. A tela então mostra "Falha na chamada à IA (HTTP 400)".

## Evidência concreta

1. Log da função `import-car-rental-document` (21/09, 13:40 UTC):
   `AI gateway error: 400 {"error":{"message":"Request contains an invalid argument.","type":"upstream_error"}}`
   — erro do provedor, não do nosso código; a função apenas repassa a mensagem
   (`supabase/functions/import-car-rental-document/index.ts`, bloco `if (!aiResp.ok)`).
2. Montagem do conteúdo na mesma função:
   `userContent.push({ type: "image_url", image_url: { url: \`data:${mime};base64,${fileBase64}\` } })`
   — um PDF é embutido no bloco de imagem.
3. Frontend `src/components/quote/car-rental-import/CarRentalSmartImport.tsx` (linhas ~341-360):
   `const fileBase64 = uploadFile ? await fileToBase64(uploadFile) : undefined;`
   — o base64 do PDF é enviado **sempre**, mesmo quando a extração de texto
   (`extractPdfText`) já trouxe o conteúdo completo.
4. Reprodução direta contra o provedor com um PDF em `image_url`: HTTP 400 em
   `google/gemini-2.5-pro` e em `google/gemini-2.5-flash`.
5. O modelo usado (`google/gemini-2.5-pro`) existe e está disponível — não é causa.

## É específico deste PDF?

É uma falha **estrutural do importador de locação**, não do arquivo. Qualquer PDF
segue o mesmo caminho e é enviado como imagem. O que varia é a sorte: o
importador de "pacote completo" (`import-full-package`) tem a mesma montagem, mas
o frontend dele usa `src/lib/fullPackageImportPayload.ts` (`shouldSendFileBase64`)
e **não envia o binário** quando o texto extraído já é suficiente — por isso ele
funciona com PDFs de texto e o de locação falha.

## Causa raiz

Envio de PDF dentro do bloco de imagem da chamada de chat. O provedor aceita
imagens nesse bloco; documentos PDF precisam do bloco próprio de arquivo (ou não
devem ser enviados quando já existe o texto extraído).

## Correção recomendada (não aplicada)

1. No frontend de locação, reaproveitar `shouldSendFileBase64` /
   `hasSufficientText` de `src/lib/fullPackageImportPayload.ts`: com PDF cujo
   texto extraído é suficiente, enviar **apenas texto**. Isso resolve o caso
   relatado e reduz muito o tempo de resposta.
2. Na função, tratar PDF com o bloco de documento correto (em vez de `image_url`)
   para o caso de PDF digitalizado sem texto; imagens continuam em `image_url`.
3. Mensagem de erro mais útil na tela quando o provedor recusar o formato.

## Limites deste turno

Nenhum arquivo de código, migration, dado ou deploy foi alterado; nenhuma chave
foi exposta.
