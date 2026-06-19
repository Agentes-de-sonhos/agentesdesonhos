---
id: carteira-digital-prob-02
titulo: Voucher PDF não abre para o cliente
modulo: Carteira Digital
tipo: problema-comum
publico: [agente, titular]
nivel: iniciante
plano: não-confirmado
permissoes: usar módulo Carteira Digital
intencoes: [voucher pdf não abre para o cliente]
palavras-chave: [problema, carteira-digital]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: [carteira-digital-faq-32, carteira-digital-faq-33]
fonte-interna: supabase/functions/serve-voucher/index.ts
---

# Voucher PDF não abre para o cliente

## Sintoma
O cliente clica no anexo e o PDF não carrega.

## Causas possíveis
- URL assinada expirou (sessão antiga em cache).
- Arquivo corrompido no upload.
- Bloqueio de pop-up no navegador do cliente.

## Como verificar
1. Reabra o serviço e teste o anexo internamente.
2. Confira tamanho e formato do arquivo.

## Solução passo a passo
1. Reenvie o arquivo, removendo o anterior.
2. Salve o serviço.
3. Peça ao cliente para recarregar o link da carteira e tentar de novo.

## Quando procurar suporte
Se persistir, envie ao suporte o ID da carteira e o nome do arquivo.
