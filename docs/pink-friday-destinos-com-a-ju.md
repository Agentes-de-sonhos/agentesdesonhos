# Pink Friday: Destinos com a Ju (rascunho de revisão)

- Vitrine dedicada em `/pink-friday` e faixa na home, com até quatro ofertas publicadas do canal exclusivo `pink-friday`.
- Cores e elementos são isolados nas superfícies da campanha. A página de novembro do Mundo em Cores, suas artes, ofertas e contatos não mudam.
- O lançamento fica **desligado** em `src/lib/pinkFriday.ts`. A ativação pública posterior exige aprovação separada e só alcança os domínios exatos da Ju. Não há oferta criada, ativação, merge ou publicação neste trabalho.
- A capa existente é apenas provisória em prévia local. A versão pública não usa essa imagem; confirmar a capa oficial antes da ativação. Nenhuma das três lâminas de referência é cadastrada como oferta.
- A campanha aproveita o catálogo e o formulário compartilhados. No painel, o canal só aparece para a Ju após ativação; não há migração de banco. A prévia local não consulta ofertas reais nem envia pedidos da campanha.
- Para revisar localmente, use o contexto existente: `/?__agency_host=www.destinoscomaju.com.br` e `/pink-friday?__agency_host=www.destinoscomaju.com.br`. Para testes sem acesso de produção, simule a resolução da agência e as integrações do site.
