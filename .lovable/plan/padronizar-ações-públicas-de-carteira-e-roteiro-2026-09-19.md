# Padronizar ações públicas de Carteira e Roteiro

## Objetivo
Aplicar à Carteira Digital e ao Roteiro a mesma faixa compacta do Orçamento, sem publicar projetos, alterar dados, links, permissões ou geradores de PDF.

## Implementação
- Extrair a faixa e o modal editável atuais do Orçamento para um componente compartilhado configurável por tipo, rótulos e estado disponível/indisponível.
- Manter no Orçamento a aparência, ordem e comportamento atuais, garantindo regressão visual e funcional.
- Na Carteira Digital, inserir a faixa logo abaixo do título, usando o link oficial da agência proprietária, senha somente na mensagem quando aplicável e o gerador de PDF existente.
- Remover o botão superior “Compartilhar link” e o antigo modal “Compartilhar Carteira”; retirar a duplicação de compartilhamento na etapa Acesso sem afetar a gestão de senha.
- No Roteiro, substituir a caixa azul pela faixa compartilhada, mover para ela o gerador de PDF existente e manter “Salvar como modelo” separado.
- Para rascunhos ou links inválidos, mostrar o campo indisponível e desabilitar copiar, abrir e criar mensagem, sem criar código ou alterar status.
- Preservar domínio personalizado e contexto do dono da agência para colaboradores por meio dos hooks e helpers oficiais já existentes.

## Detalhes técnicos
- Reutilizar `buildPublicShareMessage`, `copyTextToClipboard`, `buildProjectPublicUrl` e os handlers atuais de PDF.
- A faixa manterá URL fixa e truncada, botões quadrados acessíveis, abertura com `noopener,noreferrer` e rolagem horizontal responsiva.
- O modal inicializará a mensagem somente ao abrir e copiará exatamente o texto editado.
- Nenhuma mudança em banco, migrations, RLS, funções, payloads persistidos, códigos públicos, domínios, planos ou contas.

## Validação
- Testes do componente compartilhado para ordem, estados desabilitados, cópia, abertura segura, modal editável e rótulos por tipo.
- Testes de integração estrutural para Carteira, Roteiro e não regressão do Orçamento, incluindo domínio personalizado de colaboradores, senha condicional e mesmos handlers de PDF.
- Executar testes relacionados, verificação de tipos, build e conferência visual desktop/mobile.
- Não publicar nem fazer deploy.
