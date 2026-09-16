# Diagnóstico: miniaturas de fotos "piscando" no editor de serviços do orçamento

Verificação concluída: o problema **persiste** e a causa foi confirmada no código. Nada foi alterado.

## O que acontece

No editor de serviços do orçamento, cada digitação ou interação que faz o formulário se redesenhar destrói e recria as miniaturas. Ao serem recriadas, elas começam "vazias" e mostram o aviso "Indisponível" por um instante antes de a foto voltar. É um efeito puramente visual.

## Causa exata (confirmada)

1. **Causa principal — componente declarado dentro de outro componente.**
   Em `src/components/quote/ServiceForms.tsx`, a miniatura `ResolvedThumb` (linhas 2902–2917) está declarada **dentro** do corpo de `ServiceImageUpload` (2817–3027). A cada redesenho, ela passa a ser um componente "novo" para o React, que então descarta a miniatura anterior e monta outra do zero — perdendo o estado já resolvido da imagem.

2. **Causa somada — a resolução da imagem só acontece depois do primeiro desenho.**
   Em `src/hooks/useServiceImages.ts`, a lista de imagens utilizáveis é preenchida em um efeito posterior ao primeiro desenho, inclusive para fotos enviadas pelo usuário (que não precisam de consulta nenhuma). Assim, no instante em que a miniatura é remontada, ela desenha "sem imagem" e com `loading = false` — exatamente o estado que exibe "Indisponível".

3. **Agravante — identidade instável na lista.**
   As miniaturas do editor são listadas por posição (`key={i}`, linhas 2940 e 2985). Ao remover ou reordenar, o React reaproveita a caixa errada, provocando um segundo piscar.

4. **Gatilho dos redesenhos:** `ServiceForm` (linha 3371) mantém estados que mudam durante a edição (`placeId`, `galleryPending`, lista de fotos), e a barra de fotos é recriada em cada redesenho — o que basta para disparar 1 e 2.

## Onde ocorre e onde não ocorre

- **Ocorre:** todos os tipos de serviço que usam a barra de fotos padrão (passeios/atrações, transfer, seguro, cruzeiro, trem, circuito, locação, outros) — tanto fotos enviadas quanto fotos vindas do Google.
- **Menos afetada:** a Galeria de fotos da Hospedagem (`src/components/quote/HotelPhotoGallery.tsx`) usa a miniatura compartilhada (estável) e identifica cada foto pela própria referência; ali o piscar aparece apenas pelo item 2 (primeiro desenho sem imagem) quando a galeria é remontada, não a cada tecla.
- Telas públicas e PDFs usam outros componentes e não apresentam esse remonte.

## Impacto

- **Risco de perda, troca ou duplicação de fotos: nenhum.** A lista de referências salvas não é tocada pelo piscar; nada é reenviado nem apagado. O problema é apenas visual.
- Impacto real: percepção de instabilidade durante a edição, além de consumo desnecessário de requisições de foto do Google quando o cache em memória ainda não está aquecido.

## Correção mínima proposta (não executada)

Reaproveitando a arquitetura atual, sem tocar banco nem modelo de dados:

1. Mover `ResolvedThumb` para o escopo do módulo em `ServiceForms.tsx` (ou trocar diretamente pela miniatura compartilhada `ResolvedServiceThumb`), eliminando o remonte.
2. Em `useServiceImages`, resolver de imediato o que não depende de consulta: fotos com URL própria ficam disponíveis já no primeiro desenho; referências do Google já resolvidas na sessão são lidas do cache em memória sem passar pelo estado "vazio".
3. Nunca exibir "Indisponível" antes de uma tentativa concluída de resolução — enquanto não houver resposta, manter o estado de carregamento.
4. Usar a própria referência da foto como identidade na lista (em vez da posição), preservando o cabeçalho e o comportamento de remover.

Escopo: `src/components/quote/ServiceForms.tsx`, `src/hooks/useServiceImages.ts` e, se necessário, `src/components/shared/ResolvedServiceImage.tsx`. Sem mudanças em upload, limites de fotos, galeria de hospedagem, salvamento ou orçamentos publicados.

## Testes de regressão propostos

Novo arquivo focado (ex.: `src/test/quote-service-photo-thumbs.test.tsx`):

- fotos enviadas aparecem já no primeiro desenho, sem passar por "Indisponível";
- digitação contínua no formulário (vários redesenhos) não remonta as miniaturas nem faz a imagem sumir;
- foto de hotel (referência do Google) resolve uma vez e permanece após redesenhos, sem nova consulta;
- adicionar, remover e reordenar fotos mantém cada miniatura ligada à foto correta;
- salvar o serviço envia exatamente a mesma lista de fotos de antes da correção;
- regressões existentes de `resolved-service-image` e `hotel-gallery-integration` continuam passando.

## Riscos, esforço e aceite

- **Risco da correção:** baixo. Mudança de apresentação e de momento de resolução; nenhuma escrita de dados envolvida.
- **Estimativa:** 1 crédito (uma rodada comum), incluindo testes focados, verificação de tipos e build.
- **Critérios de aceite:** ao digitar em qualquer serviço com fotos, nenhuma miniatura desaparece nem exibe "Indisponível"; fotos de hospedagem seguem intactas; adicionar/remover/reordenar continua correto; a lista salva permanece idêntica; testes, tipos e build passando; nada publicado.
