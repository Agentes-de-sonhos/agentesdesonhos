# Ajustes visuais e Comunidade opcional por agência

## Objetivo
Aprimorar a Comunidade concluída na Fase 5, mantendo todas as interações atuais, e disponibilizar a mesma experiência no painel autenticado do Site Lab Base e das agências somente quando a agência ativar explicitamente o recurso.

## Premissa de escopo
A Comunidade white-label será disponibilizada dentro da **gestão autenticada da agência**, onde existem usuário, permissões, plano, chat e identidade de tenant. O site público de clientes continuará inalterado e não ganhará publicação/chat sem autenticação.

## Implementação

### 1. Cabeçalho e membros online no dashboard
- Remover a barra mobile global do topo da página inicial.
- Incorporar avatar, Pesquisa e Chat no cabeçalho da seção Comunidade, reutilizando a busca existente com Tudo, Pessoas, Publicações e Mensagens.
- Colocar a faixa de membros online em uma linha própria imediatamente acima do título/conteúdo da Comunidade.
- Manter a barra atual nas páginas completas da Comunidade, Minha Rede e Minhas Denúncias.
- Exibir integralmente o texto “Compartilhe experiências e oportunidades com outros agentes de viagens.”.

### 2. Feed e cabeçalho compartilhado dos posts
- Extrair o cabeçalho do post para um componente compartilhado pelos cards do dashboard e da página completa.
- Manter nome e agência em uma linha cada, com reticências quando necessário.
- Organizar a coluna de ações: Conectar no topo quando aplicável; menu e ocultar logo abaixo; sem espaço vazio quando Conectar não aparecer.
- Preservar todas as regras atuais de conexão, seguir, editar, excluir, denunciar e ocultar.
- Ajustar os contêineres mobile para quase toda a largura útil, sem remover o espaço interno de leitura/toque e sem overflow horizontal; manter largura máxima confortável em telas maiores.

### 3. Compositor mobile
- Fazer o convite recolhido abrir o mesmo `PostComposerDialog` usado pelo botão Publicação da barra inferior, evitando dois comportamentos.
- No mobile, usar viewport inteira e superfície branca, sem o título “Criar publicação”.
- Cabeçalho: fechar, avatar + seletor de público e Publicar.
- Corpo: texto amplo sem caixa/borda/fundo; rodapé fixo interno com Foto, Vídeo e menu de mais opções para Enquete e Documento, respeitando teclado e safe-area.
- No desktop/tablet, manter modal central confortável.
- Preservar validação, progresso, erros, uploads, menções e confirmação de descarte apenas para rascunho não vazio.

### 4. Comunidade opcional no Site Lab Base e white-labels
- Reutilizar `agency_community_settings`, a infraestrutura de equipe/permissões e os componentes modernos existentes.
- Adicionar um sinalizador explícito `community_experience_enabled`, com padrão `false`, sem alterar registros atuais em massa.
- Atualizar as funções seguras de leitura/gravação da configuração e a sessão da equipe para transportar o sinalizador.
- Habilitar somente o tenant técnico do Site Lab Base como referência; agências reais permanecem desligadas até opt-in do proprietário.
- Quando habilitada, adicionar Comunidade à navegação e à página inicial da gestão white-label, com rota interna protegida, identidade visual da agência e os mesmos feed, compositor, busca, chat e interações.
- Respeitar os modos já existentes (aberto, somente agência, desativado), permissões, plano e isolamento por `agency_id`; não tocar no dashboard de fornecedores nem no site público.

## Segurança e dados
- Criar uma migração pequena e aditiva para o novo sinalizador, com atualização das RPCs existentes e sem apagar dados.
- Manter RLS como autoridade final e nunca confiar em tenant enviado pelo navegador.
- Garantir que a rota white-label não monte nem consulte a Comunidade quando o sinalizador estiver desligado.

## Validação
- Adicionar testes para: cabeçalho embutido sem duplicidade; posição dos membros online; largura/overflow mobile; textos; cabeçalho compartilhado dos posts; compositor fullscreen branco e modal desktop; descarte de rascunho; padrão desligado nas agências; Site Lab habilitado; opt-in e isolamento white-label.
- Rodar testes específicos, suíte completa, verificação de tipos e compilação.
- Validar visualmente dashboard, Comunidade completa, compositor em mobile/desktop e gestão Site Lab/white-label.
- Revisar o diff para evitar duplicações, TODOs e mudanças globais perigosas.
- Não publicar nem fazer deploy.
