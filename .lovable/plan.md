# Favicon personalizado por site (mesma lógica dos títulos)

## Objetivo
Cada site de agência mostra o próprio ícone na aba do navegador, assim como já acontece com o título. Sites sem configuração continuam com o ícone padrão da plataforma.

## Como funciona hoje
- O título por site já existe em `useAgencyBrowserTitle` (mapa por endereço).
- Cada site de agência já resolve o logotipo correto em `agencySiteBrand.ts` (`resolveAgencyLogoUrl`): primeiro um ajuste por endereço, depois o logotipo salvo no cadastro da agência.
- O painel de gestão já troca o favicon pelo logotipo da agência enquanto está aberto (`useAgencyAdminHead`) e restaura ao sair — prova de que a troca dinâmica funciona.
- O favicon padrão vem do `index.html` (`/favicon.ico`, `/favicon-32x32.png`, `/favicon-16x16.png`).

## O que será feito
1. Novo hook `useAgencyFavicon` (em `src/hooks/`), espelhando o padrão do hook de título:
   - recebe o endereço do site e a URL do logotipo já resolvida;
   - enquanto o site estiver montado, aponta as tags `link[rel="icon"]` do `<head>` para o logotipo da agência;
   - ao sair da página, restaura os ícones originais;
   - sites sem logotipo configurado não sofrem nenhuma alteração.
2. `AgencySiteLayout.tsx` passa a chamar o hook com `info.hostname` e o `logoUrl` já existente — vale para o site público de todas as agências (100 Limites, Destinos com a Ju, Paraiso Viagens, Essya Tur e futuras).
3. Escopo: somente os sites públicos das agências. As páginas neutras dos domínios de produto (vitrine, seuroteiro etc.) e a plataforma principal continuam com o ícone padrão.
4. Nenhuma mudança de banco, migrations ou dados. Nenhuma publicação.

## Detalhes técnicos
- Arquivos: novo `src/hooks/useAgencyFavicon.ts`; ajuste em `src/components/whitelabel/AgencySiteLayout.tsx`; novo teste `src/test/agency-favicon.test.tsx`.
- O hook troca `href` das tags `link[rel="icon"]` existentes (sem criar tags novas) e guarda os valores anteriores para restaurar no cleanup.
- Logotipos quadrados funcionam melhor; logotipos largos aparecem reduzidos — comportamento aceito, igual ao que já ocorre no painel de gestão.

## Validação
- Teste focado novo: favicon aplicado e restaurado por endereço; tenant sem logotipo inalterado.
- Rodar testes focados existentes relacionados (título por agência, layout do site), typecheck e `git diff --check`.
- Sem deploy; publicação segue separada após auditoria.
