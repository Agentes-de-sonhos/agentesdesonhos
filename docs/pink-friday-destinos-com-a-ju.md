# Pink Friday: Destinos com a Ju

- Vitrine dedicada em `/pink-friday` e faixa na home, com até quatro ofertas publicadas do canal exclusivo `pink-friday`.
- Cores e elementos são isolados nas superfícies da campanha. A página de novembro do Mundo em Cores, suas artes, ofertas e contatos não mudam.
- A vitrine fica habilitada no código para os domínios exatos da Ju. Sem ofertas cadastradas, a home leva para a página de campanha, que informa onde as ofertas serão divulgadas. Isso não publica a versão no domínio: ainda é necessário integrar o PR e publicar pela hospedagem existente.
- A capa de bangalôs é provisória e aparece na prévia e na vitrine. Substitua-a quando a capa oficial chegar. Nenhuma das três lâminas de referência é cadastrada como oferta.
- A campanha aproveita o catálogo e o formulário compartilhados. No painel, o canal só aparece para a Ju; não há migração de banco. A prévia local não consulta ofertas reais nem envia pedidos da campanha.
- Para revisar localmente, use o contexto existente: `/?__agency_host=www.destinoscomaju.com.br` e `/pink-friday?__agency_host=www.destinoscomaju.com.br`. Para testes sem acesso de produção, simule a resolução da agência e as integrações do site.
