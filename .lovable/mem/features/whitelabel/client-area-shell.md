---
name: White Label Client Area shell (Etapa 2)
description: Estrutura visual/navegação da Área do Cliente white label, herança de marca e regra de conteúdo honesto
type: feature
---
- Shell autenticado: `ClientAreaShell` (sidebar no desktop, barra inferior no mobile). Seções em `src/lib/clientAreaNav.ts`: inicio, viagens, documentos, perfil, atendimento — `ready` marca só o que já funciona (inicio, perfil, atendimento).
- Navegação persiste em `?area=`; NUNCA colocar token na URL. Token fica em `localStorage` por hostname (Etapa 1.1 intacta).
- Marca herdada por `getWalletBrandStyle(info.primary_color)` aplicado na raiz da Área do Cliente (login e shell). Proibido hardcode de cores das referências (CVC/Decolar/Booking).
- Conteúdo honesto: Viagens/Documentos mostram card estrutural "em preparação" — nunca "você não tem viagens" nem dados fictícios (pontos, fidelidade, promoções).
- Atendimento: só renderiza canal existente (WhatsApp > telefone > e-mail) com mensagem pré-preenchida; sem contato, o botão não aparece.
- Acesso por código de link é opção secundária recolhida no login (`ClientAreaCodeAccess`), separada do login por e-mail/senha.
- Sem CSP global (SPA de host único): proteção em nível de app, documentada em `docs/area-do-cliente-csp.md`.
- Testes: `src/test/client-area-shell.test.tsx` (+ flow/guards da Etapa 1.1).
