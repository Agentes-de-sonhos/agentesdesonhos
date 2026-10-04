# Auditoria somente leitura dos 22 problemas do monitoramento

## Situação
A lista exata dos 22 problemas do aviso de monitoramento do projeto não pode ser lida no modo de planejamento: a ferramenta que lê essa lista não fica disponível aqui. Tudo o que está abaixo vem de leituras já feitas nesta conversa. Nada foi alterado.

## O que já foi verificado (somente leitura)
- **Registros do preview** (erros de build, de execução e do console): não há nenhum arquivo agora. Nada indica erro ativo de build ou de execução.
- **Verificador automático do banco:** 539 avisos, de 6 tipos:
  - 515 funções privilegiadas que podem ser chamadas por visitantes (218) ou por usuários logados (297);
  - 15 tabelas protegidas, mas sem nenhuma regra de acesso;
  - 6 funções sem caminho de busca fixo;
  - 2 extensões instaladas na área pública;
  - proteção contra senhas vazadas desligada.
- **Varredura de segurança:**
  - A última varredura do banco é de 03/10. Ela está marcada como desatualizada.
  - Nenhum problema de dependências (varredura de 16/09) nem de integrações MCP.
  - A varredura de conectores está incompleta.
- Dois itens de nível "erro" já aparecem na varredura. Os dois merecem atenção imediata se fizerem parte dos 22:
  - **quote-documents:** uma regra pública de leitura permite baixar documentos de orçamento sem ligação com o dono. **Pode vazar dados entre agências e clientes.**
  - **tour-guides-gallery:** visitantes não logados podem apagar arquivos e enviar novos arquivos.
- Avisos de nível médio, ligados a uploads e substituição de arquivos sem dono: supplier-logos, media-files e showcase-images.
- A maioria dos itens restantes é informativa: tabelas de conteúdo compartilhado legíveis por qualquer usuário logado (trilhas, mentorias, quiz, frases mensais). Provavelmente são intencionais.

## Passos após aprovação (continua somente leitura)
1. Ler a lista de monitoramento e obter exatamente os 22 itens: título, origem e recurso afetado.
2. Para cada item, confirmar o estado real só com consultas de leitura:
   - regras de acesso das tabelas e dos arquivos envolvidos;
   - quem pode chamar as funções;
   - uso no código, para saber se a regra é usada pelas páginas públicas (links de orçamento, galeria de guias);
   - registros de funções e de erros.
3. Cruzar os 22 itens com a varredura acima e marcar duplicados e causas comuns.
4. Entregar o relatório na conversa, sem alterar nada, com:
   - os 10 pontos pedidos para cada item;
   - grupos de itens com a mesma causa e a quantidade de itens realmente distintos;
   - classificação: corrigir imediatamente, próxima rodada, pode aguardar ou falso positivo;
   - fases de correção em ordem segura, com complexidade baixa, média ou alta;
   - destaque para riscos de vazamento entre agências, perda de dados, indisponibilidade ou cobrança indevida;
   - lista das verificações realizadas.

## Garantias
Não haverá alteração de arquivos, banco, regras de acesso, migrações, publicação ou deploy. Também não haverá testes destrutivos nem a suíte completa de testes. Nenhum alerta será marcado como resolvido ou ignorado.
