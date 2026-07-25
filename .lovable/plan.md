# Análise do Banner da Dashboard — somente leitura

Nenhuma alteração de código é proposta nesta etapa, conforme solicitado. O relatório completo foi entregue na resposta do chat e cobre:

1. Arquivos/componentes responsáveis (`src/components/dashboard/DashboardBanner.tsx`, uso em `src/pages/Dashboard.tsx`, wrapper `src/components/layout/DashboardLayout.tsx`).
2. Classes exatas aplicadas a container, imagem (via `background-image`) e overlay.
3. Dimensões efetivas: `w-full`, altura entre `min-height: 220px` e `max-height: 320px` (sem breakpoints de altura), `rounded-2xl` (16px), sem `max-width` e sem `aspect-ratio` definidos.
4. Método: `background-image` com `bg-cover bg-center` (não há `<img>` nem `object-cover`).
5. Cortes possíveis em desktop panorâmico e mobile estreito, e área encoberta pelo overlay `from-black/70 via-black/50 to-black/30`.
6. Medida ideal de upload recomendada: **1920×480 px (≈4:1)**, com zona segura de composição ao centro/direita, JPG/WebP otimizado (<300 KB).
7. Diferença entre upload e exibição: o arquivo é servido cru (sem `srcset`/otimização) e apenas escalado por CSS.

## Próximos passos (aguardando decisão do usuário)

Se quiser evoluir o componente, possíveis direções — nenhuma será executada sem aprovação:

- Fixar `aspect-ratio` responsivo (ex.: `aspect-[4/1] md:aspect-[5/1]`) para eliminar variação de altura entre slides.
- Migrar de `background-image` para `<img>` com `object-cover` + `srcset`/`sizes` e `loading="lazy"`.
- Padronizar altura por breakpoint (`h-48 sm:h-56 lg:h-64`) em vez de `minHeight/maxHeight` inline.
- Definir zona segura documentada para uploads e/ou pipeline de otimização no bucket.

Confirme qual direção seguir (ou peça só a padronização da medida de upload) que eu preparo o plano de implementação.
