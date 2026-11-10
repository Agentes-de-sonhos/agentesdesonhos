# Diagnóstico e-mails corporativos (somente leitura, 10/11/2026)

Nada foi alterado: código, DNS e publicação continuam iguais.

## O que a plataforma faz e não faz (verificado)
- O projeto **não tem domínio de envio de e-mails configurado** (nenhum registro NS/MX/SPF criado pela plataforma para envio).
- Todos os domínios estão em modo "conectar", com DNS em provedores externos (Locaweb, Registro.br, HostGator, Via Hospedagem). A plataforma só pede **A @ / A www → 185.158.133.1** e **TXT _lovable**. Ela **não cria, apaga nem altera MX, SPF, DKIM ou o subdomínio mail** nesses provedores.
- Não há conexão Cloudflare ligada a esses domínios.
- Conclusão: a plataforma, sozinha, não derruba caixas de e-mail. A queda vem de mudanças feitas no provedor de DNS/hospedagem durante a migração.

## Leitura pública atual (verificado agora)
| Domínio | DNS | MX | Situação |
|---|---|---|---|
| **kaributurismo.com.br** | Registro.br | **NENHUM MX** | Forte suspeita. Nameservers trocados para o Registro.br sem recriar o MX: e-mails não chegam. Site também sem A (em configuração há ~5 dias). |
| destinoscomaju.com.br | Registro.br | mail.destinoscomaju → 108.179.253.65 (HostGator) | Servidor responde hoje. Risco se a hospedagem antiga for cancelada. |
| curtiviagens.com.br | HostGator | mail.curtiviagens → 108.179.193.74 | Responde hoje. Mesmo risco (hospedagem antiga). |
| dricaviagens.com.br | Via Hospedagem | mail.dricaviagens → 23.111.175.90 | Responde. SPF ok. |
| innovati.tur.br (5 dias) | Registro.br | Umbler | MX ok; **sem SPF** (envios podem cair no spam). |
| arenatravelgroup.com.br (5 dias) | Registro.br | Zoho | MX e SPF ok. |
| paraisoviagens.com | Locaweb | Microsoft 365 | MX/SPF ok; só o www está pendente. |
| bardelli, essyatur, omundoemcores | Locaweb | Locaweb | ok. |
| 100limites.tur.br | Registro.br | Google | MX ok; SPF tem um "." final malformado (`~all.`). |

## Limites do que consegui ver
- Não tenho acesso aos painéis Registro.br/Locaweb/HostGator, ao histórico antigo do DNS nem a caixas, nem aos devolvidos/bounces.
- Não testei login IMAP/webmail nem DKIM (seletor desconhecido).
- Ainda não sei quais são as duas agências afetadas.

## Por que a queda aparece 1–2 dias depois (explicação)
- **Cache de DNS:** MX/NS antigos ficam guardados por horas a 2 dias (TTL do NS no .br = 24h). A troca parece funcionar e depois falha.
- **Troca de nameservers:** a zona nova (ex.: Registro.br) começa vazia. Se MX, mail, SPF e DKIM não forem recriados, o e-mail para quando o cache expira (caso provável da Kaributurismo).
- **MX apontando para o domínio raiz** (ou `mail` como CNAME do raiz): quando o A do raiz vai para 185.158.133.1, os e-mails vão para o servidor do site, que não recebe e-mails. Hoje nenhum domínio consultado está assim.
- **Fim da hospedagem antiga:** se o MX/mail continua apontando para HostGator/Via Hospedagem e o plano for cancelado, as caixas param (risco Ju/Curti).
- **SPF/DKIM:** se faltarem ou estiverem errados, os e-mails enviados vão para spam ou são rejeitados, mesmo recebendo normalmente.

## Próximos passos sugeridos (nenhum executado)
1. Fernando confirma as duas agências e diz o sintoma: não recebe, não envia, ou não entra no webmail.
2. Kaributurismo: recriar no Registro.br os MX/SPF/DKIM do provedor de e-mail anterior (pegar valores no painel antigo), mais o A e o TXT do site.
3. Ju e Curti: confirmar que a hospedagem de e-mail antiga continua ativa até migrar as caixas.
4. Innovati: adicionar o SPF da Umbler. 100 Limites: corrigir o "." no SPF.
5. Depois, posso repetir esta checagem por domínio.
