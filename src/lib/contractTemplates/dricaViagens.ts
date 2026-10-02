/**
 * Fonte literal do contrato da DRICA VIAGENS (transcrição integral do DOCX enviado pela agência).
 *
 * NÃO é revisão jurídica: o texto é preservado como no original (redação, títulos, numeração,
 * erros gramaticais, maiúsculas/minúsculas e ordem). Foram removidos apenas os marcadores
 * técnicos do leitor (quebras de linha/página e o rodapé repetido de cada página, que agora
 * é renderizado como rodapé do PDF), e os pontos dinâmicos foram trocados por tokens:
 *   {{slot:x}}  {{list:x}}  {{table:x}}  {{check:x}}  {{choice:grupo=valor}}  {{signatures}}
 * Este arquivo é a fonte usada para gravar o modelo no banco e para os testes de integridade.
 */
import type { ContractRenderConfig } from '@/types/contracts';

export interface LiteralSection {
  section_key: string;
  title: string | null;
  paragraphs: string[];
}

export const DRICA_TEMPLATE_NAME =
  'Condições Gerais de Contrato de Prestação de Serviços de Agenciamento de Viagens e Turismo — Drica Viagens';
export const DRICA_CONTRACT_TITLE =
  'CONDIÇÕES GERAIS DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE AGENCIAMENTO DE VIAGENS E TURISMO';
export const DRICA_FOOTER_TEXT =
  'DRICA VIAGENS I Tel.: (21) 9 8790-7853 I E-mail: faleconosco@dricaviagens.rio';

export const DRICA_SECTIONS: LiteralSection[] = [
  {
    section_key: 'preambulo',
    title: null,
    paragraphs: [
      'Pelo presente contrato particular de prestação de serviços turísticos, as partes a seguir qualificadas',
      'Contratada: DRICA VIAGENS (Razão Social: Maralba Viagens e Turismo Ltda), regularmente inscrita no CNPJ sob n°: 11.636.130/0001-31, com sede à Largo do Machado, número 11, Apt. 302, Catete, Município de Rio de Janeiro (RJ), CEP: 22221-020, neste ato representado por sua titular;',
      'Contratante: {{slot:contractor_name}}, {{slot:contractor_nationality}}, {{slot:contractor_marital_status}}, {{slot:contractor_profession}}, portador da cédula de identidade RG nº {{slot:contractor_rg}}, inscrito no CPF sob nº {{slot:contractor_cpf}}, com domicílio à {{slot:contractor_address}};',
      'Tem entre si, justo e contratado o quanto segue:',
    ],
  },
  {
    section_key: 'do_objeto',
    title: 'DO OBJETO DO CONTRATO',
    paragraphs: [
      'Cláusula 1: O objeto do presente contrato é regulamentar o agenciamento de serviços de viagens e turismo adquiridos pelo CONTRATANTE, intermediados pela CONTRATADA, de acordo com o valor oferecidos pelos prestadores finais de serviço no modo, data e horário da contratação.',
      'Parágrafo único: Estão inclusos neste contrato, exclusivamente os serviços a seguir relacionados e descritos:',
      '{{list:included_services}}',
      'OBS: Os serviços contratados foram confirmados através do(s) fornecedor(es) {{slot:airlines}}, {{slot:operators}}, e {{slot:travel_agency}}, motivo pelo qual o CONTRATANTE assinará uma autorização de débito e verificará na fatura do cartão de crédito o nome da(s) referida(s) empresa(s), caso opte pelo pagamento parcelado no cartão de crédito.',
      'Cláusula 2: Se declara ciente o CONTRATANTE e/ou o passageiro quanto aos serviços especificamente contratados, bem como, aqueles que não estão inclusos no respectivo preço final.',
      'Parágrafo primeiro: Assim, são considerados "serviços inclusos" somente aqueles que estiverem expressamente mencionados no programa. Quaisquer informações prestadas verbalmente sobre bagagem, o destino, sugestão de passeios, indicação de serviços, entre outros, NÃO devem ser consideradas inclusas se não estiveram escritas como tal no contrato.',
      'Parágrafo segundo: Fica expressamente consignado que, qualquer cortesia a ser concedida pela empresa ora vendedora, será realizada expressamente no presente contrato.',
      'Parágrafo terceiro: O CONTRATANTE deve informar, no ato da inscrição, e por escrito, eventuais impedimentos ou restrições (doenças crônicas, cardíacos, grávidas, etc.), que embora não os impossibilite em tese de participarem da viagem, importe em cuidados especiais durante a viagem, providência de documentação específica, entre outros; sendo advertido nesse momento da capacidade ou incapacidade de providencia do suporte necessário pelos organizadores.',
      'Parágrafo quarto: O CONTRATANTE declara-se ciente que adquiriu esta viagem durante a pandemia do COVID-19, e que foi devidamente informado quanto aos riscos de contaminação, bem como as eventuais limitações/restrições que podem ser impostas pelas autoridades locais do destino escolhido como medidas de contenção do avanço da doença, o que poderá afetar direta ou indiretamente seu roteiro, condições estas as quais, por não possuir ingerência, a CONTRATADA fica isenta de responsabilidade. Ainda, quando da necessidade de remarcação da mesma, esta ficará condicionada ao pagamento de eventuais taxas e/ou diferenças tarifárias, estipuladas exclusivamente pelos respectivos fornecedores dos serviços contratados, para sua efetivação.',
    ],
  },
  {
    section_key: 'dos_valores',
    title: 'DOS VALORES E FORMA DE PAGAMETO',
    paragraphs: [
      'Cláusula 3: De acordo com a prestação dos serviços relacionados e expressas neste contrato, o CONTRATANTE pagará a CONTRATADA, o valor de R$ {{slot:total}} da seguinte forma:',
      'a) O CONTRATANTE terá que dar uma entrada no valor de R$ {{slot:down_payment}} até a data de {{slot:down_payment_date}}',
      'b) O restante do pagamento poderá ser dividido em {{slot:installments_count}} parcelas iguais de R${{slot:installment_value}} com vencimento estipulado no dia {{slot:due_day}} cada mês até o fim do pagamento das parcelas, a serem pagos mediante {{slot:payment_method}}.',
      'Parágrafo primeiro: A impontualidade no pagamento de qualquer parcela, pode ensejar a cobrança de juros, multas, despesas com honorários e custas diversas, valores esse imputados exclusivamente junto dos fornecedores finais com os quais o CONTRATANTE efetuou o pagamento dos serviços. Fica o CONTRATANTE / PASSAGEIRO ciente de que, nesse caso, os fornecedores poderão ainda, se a viagem não tiver iniciado, tomar providências no sentido de cancelar as reservas realizadas, de modo que sobre eventual saldo já quitado serão calculadas e aplicadas as respectivas penalidades contratuais, para apuração de eventual valor a pagar ou reembolsar.',
      'Cláusula 4: Recairão exclusivamente sobre o CONTRATANTE as responsabilidades civis, administrativas, judiciais e criminais pertinentes, no caso da caracterização do chargeback fraudulento.',
      'Parágrafo único: Entende-se por chargeback fraudulento, a contestação e cancelamento de uma compra de viagem/serviço turístico realizada com cartão de crédito ou débito junto à CONTRATADA, pelo titular deste, ante o seu não reconhecimento, munido de má-fé, com o intuito de prejudicar a CONTRATADA e seus fornecedores.',
    ],
  },
  {
    section_key: 'do_pagamento',
    title: 'DO PAGAMENTO E INADIMPLEMENTO',
    paragraphs: [
      'Cláusula 5: O cliente CONTRATANTE é responsável pelo integral pagamento da viagem contratada. Caso seja financiamento, a venda somente se concretizará após a pré-aprovação do crédito junto à instituição financeira.',
      'Cláusula 6: Caso solicitado e concedido o parcelamento do preço, o CONTRATANTE que tiver pago a entrada será responsável pela quitação integral do restante do preço orçado para todo o programa de viagem.',
      'Cláusula 7: Pagamentos através de depósito bancário serão processados somente após o recebimento do comprovante de depósito e confirmação do valor em conta corrente. Já pagamentos realizados através de cartão de crédito, somente após a confirmação do fornecedor mediante aprovação da administradora do cartão. Por fim, pagamentos através de boleto bancário, somente após a confirmação do fornecedor.',
      'Cláusula 8: Qualquer pagamento feito pelo (a) CONTRATANTE para a CONTRATADA mesmo sem o contrato estar assinado caracteriza aceitação do roteiro e do contrato de viagem e todas as suas cláusulas e responsabilidades da reserva para sua viagem.',
    ],
  },
  {
    section_key: 'condicoes_gerais',
    title: 'DAS CONDIÇÕES GERAIS DO CONTRATO',
    paragraphs: [
      'Cláusula 9: O CONTRATANTE declara-se ciente que a CONTRATADA não possui nenhuma ingerência sobre os prestadores finais dos serviços contratados (por ex. cias. aéreas, marítimas, hotéis, operadores, agências receptivas, outros), razão pela qual fica isenta de qualquer responsabilidade quanto a falta de conformidade na execução dos serviços por parte destes prestadores.',
      'Cláusula 10: O CONTRATANTE declara-se ciente que a CONTRATADA atua em seu nome como mandatária, prestando o serviço de consultoria de roteiros turísticos, cotações de hospedagens, cruzeiros ou qualquer outro serviço solicitado pelo CONTRATANTE, e ainda efetuando para este as reservas, confirmações e emissões nos serviços de viagens e turismo conforme sua opção, bem como, posteriores solicitações de alteração e cancelamento, ficando na dependência das regras, condições e valores de seus fornecedores.',
      'Cláusula 11: Quando se tratar de viagem internacional, o CONTRATANTE fica ciente que independente de ser turista, está sobre as leis, normas e costumes do país de destino. Qualquer infração será de sua responsabilidade as penalidades sofridas.',
      'Cláusula 12: Fica expressamente vedado ao CONTRATANTE ceder ou transferir, a qualquer título, salvo mediante autorização expressa da outra parte, os direitos e obrigações estabelecidos neste instrumento.',
    ],
  },
  {
    section_key: 'resp_contratante',
    title: 'DAS RESPONSABILIDADES DO CONTRATANTE',
    paragraphs: [
      'Cláusula 13: O CONTRATANTE fica incumbido e responsável pela correta apresentação, verificação e confirmação das informações relativas aos seus dados pessoais e cadastrais e pelos demais viajantes nomeados, para quem junto as reservas são feitas, conforme tabela abaixo, quais sejam:',
      '{{table:passengers}}',
      'Cláusula 14: O CONTRATANTE é responsável, por si e pelos passageiros que consigo viajarão, independentemente do disposto em outras cláusulas deste contrato, no tocante a:',
      'a) Adimplir a viagem na forma, valor e data acordada entre as partes;',
      'b) Cumprir rigorosamente todos os horários e procedimentos recomendados pela CONTRATADA;',
      'c) Conferir minuciosamente todos os serviços adquiridos e inclusos, no ato da compra (voos, traslados, reservas, dentre outros);',
      'd) Respeitar todas as orientações dadas pelo Guia de Turismo durante a viagem, se acaso houver;',
      'e) Respeitar e seguir os procedimentos de segurança;',
      'f) Zelar por todos os objetos pessoais de valores que portar;',
      'g) Arcar com as perdas e danos decorrentes de ações ou omissões originadas por sua culpa;',
      'h) Preservar as instalações e equipamentos que estejam a sua disposição durante a viagem;',
      'i) Responsabilizar-se pelas ações e/ou omissões, danos e/ou prejuízos, causados pelos usuários nos serviços que contratar.',
      'Parágrafo primeiro: No caso de o CONTRATANTE e o PASSAGEIRO não se tratarem da mesma pessoa, compromete-se aquele a levar ao conhecimento deste o teor destas Condições Gerais, sendo solidariamente responsável por qualquer ato deste último praticado no âmbito da execução do contrato.',
      'Cláusula 15: É de responsabilidade do CONTRATANTE providenciar, em tempo hábil, toda a documentação necessária e/ou eventualmente exigida, conforme a orientação de seu agente de viagens, como: passaporte válido, visto, vacinação e autorizações para menores viajantes, de acordo com o destino que escolheu.',
      '{{check:ack_documents_required}} Contratante/Passageiros declara o conhecimento aos documentos exigidos acima.',
      'Parágrafo único: O CONTRATANTE declara estar ciente que a CONTRATADA e os fornecedores dos serviços mencionados nesse contrato ficam isentos de quaisquer despesas que venham à ocorrer durante a viagem e/ou o não embarque dos passageiros descritos nesse contrato, devido à falta ou irregularidade da documentação mencionada, bem como, por atos de autoridade migratória dos países a serem visitados, não sendo responsável pela recusa no ingresso e pela deportação de passageiros e as despesas daí advindos, não cabendo igualmente nenhuma restituição de valores pagos.',
      'Cláusula 16: O CONTRATANTE, no ato do recebimento de seus vouchers tem a obrigação e responsabilidade de conferir os dados nele contidos, como datas da viagem, nome e sobrenome inserido no bilhete, sob pena de exclusivamente arcar com os prejuízos que eventualmente decorrerem da falta.',
      'Cláusula 17: O CONTRATANTE deverá, anteriormente à assinatura do contrato, se cientificar das condições de desistência, transferências, cancelamentos, solicitação de carta de crédito e no-show (não comparecimento) que constam no contrato de prestação de serviços de cada fornecedor contratado. Reforçamos que qualquer alteração, cancelamento, transferência, solicitação de carta de crédito ou não comparecimento do viajante no dia do embarque, provavelmente acarretarão em multas e cobrança de taxas dos fornecedores dos serviços contratados, conforme contrato dos mesmos, podendo ou não haver reembolsos, conforme condição estipulada por cada fornecedor, não possuindo a CONTRATADA nenhuma ingerência sobre estas condições, razão pela qual fica isenta de qualquer responsabilidade quanto as multas cobradas ou reembolso negado pelos fornecedores dos serviços reservados.',
      '{{choice:fare_refund_condition=nao_reembolsavel}} Contratante declara-se ciente que no presente contrato, de acordo com as normas estabelecidas pelos respectivos fornecedores, um ou mais serviços constam como tarifa não reembolsável em caso de cancelamento.',
      '{{choice:fare_refund_condition=reembolso_parcial}} Contratante declara-se ciente que no presente contrato, de acordo com as normas estabelecidas pelos respectivos fornecedores, todos permitem algum percentual de reembolso, em caso de cancelamento da viagem.',
      'Cláusula 18: Para toda e qualquer alteração, solicitação de carta de crédito ou transferência realizada pelo contratante, além das multas cobradas pelos fornecedores, a CONTRATADA cobrará 5% (cinco por cento) sobre o valor dos serviços contratados, referentes encargos administrativos na prestação do serviço de agenciamento.',
      'Cláusula 19: Só será validado o pedido de cancelamento e alteração, na hipótese em que o CONTRATANTE realizar a solicitação por e-mail ou por escrito via aplicativo de celular WhatsApp, sendo considerada a mensagem recebida apenas com a sua expressa confirmação.',
      'Parágrafo único: Na falta do aceite expresso e/ou pagamento direto do CONTRATANTE para posteriores pedidos de alteração e cancelamento que exijam o pagamento de taxas adicionais, fica este advertido que o serviço não será realizado.',
      'Cláusula 20: Os valores pagos diretamente ao contratado ou repassados pelos fornecedores a título de comissão, não serão reembolsados na hipótese de cancelamento da viagem.',
      'Cláusula 21: Nas viagens aéreas, qualquer alteração que exija a reemissão do bilhete, haverá uma multa determinada pela CIA aérea e/ou seu representante, que deverá ser paga pelo passageiro e/ou CONTRATANTE, cujo valor varia de acordo com cada CIA aérea / representante.',
      'Cláusula 22: A CONTRATADA é uma agência que trabalha com os melhores fornecedores de serviços turísticos no Brasil e no mundo. Qualquer tipo de insatisfação gerada entre expectativa e realidade, é de total responsabilidade do CONTRATANTE.',
      'Cláusula 23: O CONTRATANTE autoriza a CONTRATADA a realizar consultas aos Sistemas de Risco de Crédito e às demais organizações centralizadoras de cadastros e informações privadas ou governamentais (SERASA, SCPC, Bureaus de Cadastros Positivos, etc.), sobre eventuais débitos e responsabilidades do mesmo, bem como a prestação aos órgãos citados das informações cadastrais e dados relativos ao parcelamento, tudo em conformidade com o disposto na legislação em vigor.',
      'Cláusula 24: Nos casos de transporte aéreo, no embarque, no curso da viagem, retorno, em que houver cancelamento de voo, atrasos e alterações de quaisquer naturezas, independente dos motivos, a CONTRATADA informa que, os eventuais gastos provenientes decorrentes, quando não assumidos de imediato ou posteriormente pela companhia aérea, correrão por conta do(a) CONTRATANTE, que deverá guardar os recibos e notas que comprovem os gastos para serem cobrados da companhia aérea pertinente no retorno ao Brasil.',
      'Cláusula 25: Se no embarque, curso da viagem ou retorno, por qualquer motivo, haja necessidade de aquisição de novo bilhete aéreo (nacional ou internacional), o valor correspondente será arcado, na hora da aquisição, pelo(a) CONTRATANTE.',
      'Parágrafo único: Em face do constante no caput Cláusula anterior, a CONTRATADA não assume responsabilidades sobre eventuais problemas, perdas ou danos que se originem, quaisquer que sejam os motivos.',
      'Cláusula 26: A CONTRATADA não se responsabiliza por roubos, assaltos ou furtos ocorridos contra o (a) CONTRATANTE durante os dias de viagem, nem por perda ou furtos de documentos dentro ou fora dos hotéis, bem como nos deslocamentos.',
      'Cláusula 27: Os custos de todo e qualquer deslocamento particular durante a viagem, fora do roteiro programado, por qualquer que seja o motivo, ficará a cargo do CONTRATANTE.',
      'Cláusula 28: O CONTRATANTE declara que se certificou, por meio de pesquisa prévia, que os serviços escolhidos atendem suas necessidades em termos de estrutura e localização. Durante a viagem, caso a CONTRATANTE altere as reservas de Hotéis, altere a categoria do quarto, contrate guia de turismo a parte ou transfer/taxi ou qualquer serviço por conta própria será de sua total responsabilidade os custos.',
    ],
  },
  {
    section_key: 'resp_contratada',
    title: 'DAS RESPONSABILIDADES DA CONTRATADA',
    paragraphs: [
      'Cláusula 29: É de responsabilidade da CONTRATADA a fiel emissão de todos os serviços incluídos neste pacote, tal como ajustados neste contrato, ressalvadas as hipóteses de imprevistos oriundos de caso fortuito e força maior e/ou que ocorram com as empresas especializadas na execução dos mesmos (transporte terrestre, alimentação, hospedagem etc.).',
      'Cláusula 30: O cancelamento ou alterações do roteiro por motivos de caso fortuito ou força-maior (guerras, epidemias, pandemia, eventos naturais ou climáticos adversos, greves, manifestações, convulsões sociais, etc.), e os prejuízos de qualquer natureza advindos de tais fatos, não são de responsabilidade da CONTRATADA.',
      'Parágrafo único: Havendo quaisquer alterações na programação da viagem, por força maior ou caso fortuito, afetando parcial ou totalmente qualquer item da viagem, a Contratada comunicará por escrito o Contratante, quando da entrega dos documentos da viagem e respectivas passagens.',
      'Cláusula 31: A CONTRATADA não se responsabiliza, não garante e não intercede pela permanência, tampouco pelo não ingresso do turista em país estrangeiro, haja vista que se insere no poder abrangido pela soberania de um Estado, poder este de natureza discricionária, independente que o passageiro se encontre apto com a documentação, não lhe sendo ressarcido nenhum valor pago.',
      'Cláusula 32: O CONTRATANTE autoriza expressamente a CONTRATADA a manter arquivo de seus dados pessoais e de pagamento, bem como dos demais passageiros que consigo viajarão, e ainda, o compartilhamento destes dados com todos os fornecedores envolvidos na prestação dos serviços aqui contratados, pelo prazo mínimo de 05 anos.',
      'O CONTRATANTE anui também com o recebimento de informativos e material de marketing da CONTRATADA e demais fornecedores, ficando o CONTRATANTE incumbido de solicitar a exclusão definitiva das informações diretamente à cada prestador de serviço envolvido findando-se o referido prazo.',
    ],
  },
  {
    section_key: 'transporte_aereo',
    title: 'DAS CONDIÇÕES ESPECÍFICAS DO TRANSPORTE AÉREO',
    paragraphs: [
      'Cláusula 33: O bilhete de passagem aéreo é a expressão do contrato de transporte aéreo, firmado entre a CIA de transporte e o passageiro. Portanto, qualquer solicitação de alteração de data, cancelamento ou solicitação de reembolso, o CONTRATANTE estará sujeito as normas estabelecidas exclusivamente pela própria Cia Aérea fornecedora, em relação a eventuais taxas, multas e prazos.',
      'Cláusula 34: No caso de atraso no horário previsto para o voo, fica previamente estabelecido que a responsabilidade será única e exclusivamente da companhia aérea em questão, de acordo com as normas internacionais (Convenção de Varsóvia) e/ou o Código Brasileiro de Aeronáutica.',
      'Parágrafo único: O serviço de traslado/receptivo é contratado para esperar até 60 minutos após o horário de chegada do voo. Atrasos do voo, demora na imigração ou na localização das bagagens podem extrapolar esse tempo. Nesse caso o serviço poderá não ser realizado, sem direito a reembolso.',
      'Cláusula 35: O transportador aéreo não poderá retardar o voo para aguardar passageiros que, por acaso, fiquem retidos por autoridades fiscais ou policiais para verificação ou formalização de alguma medida administrativa ou judicial; sendo que se tais eventos ocorrerem, a CONTRATADA fica isenta de quaisquer responsabilidades.',
      'Cláusula 36: A eventual solicitação de cadastro, cartão e milhagem é de responsabilidade única e exclusiva do (a) CONTRATANTE.',
      'Cláusula 37: Os valores da passagem aérea serão conforme cotação do dia da compra e forma de pagamento escolhida, ficando a CONTRATADA isenta da responsabilidade em caso encerramento de promoção pelas Cias Aéreas ou indisponibilidade de assentos com preços promocionais.',
      'Cláusula 38: O transporte da bagagem será feito de acordo com os regulamentos e critérios da companhia aérea, que deverão ser consultados previamente pelo CONTRATANTE no site da empresa. Qualquer taxa extra, referente a excesso de peso de bagagem será de responsabilidade única e exclusiva do (a) CONTRATANTE.',
      'Cláusula 39: Alguns aeroportos internacionais não autorizam excesso de bagagem, portanto, fica desde já ciente o (a) CONTRATANTE que nestes casos, será obrigatória a retirada de itens de sua bagagem, podendo acarretar em perda dos mesmos. E quando permitir o eventual pagamento de excesso de peso de bagagem, este será por conta do passageiro.',
      'Cláusula 40: A bagagem e demais pertences pessoais do (a) CONTRATANTE não são objetos deste contrato. A CONTRATADA não se responsabiliza pela perda, roubo, extravio, furtos, violação, rodinhas quebradas, alças quebradas, rasgos em malas, zíper quebrado, ou quaisquer outros danos que as bagagens e pertences pessoais do (a) CONTRATANTE venham a sofrer no transcurso da viagem, por qualquer que seja a causa, incluindo sua manipulação pela (s) companhia (s) aérea (s), pelos carregadores de malas em hotéis e motoristas de ônibus.',
      'Cláusula 41: Não estão incluídos carregadores de malas, à título de exemplo, em portos, aeroportos, fronteiras ou estação de trens e transbordo em geral.',
      'Cláusula 42: No caso de extravio de bagagem, o custo de transporte do Hotel ao Aeroporto para retirada da mala extraviada ou para soluções pertinentes a essa ocorrência, bem como a compra de itens primordiais para suprir a falta da bagagem, a CONTRATANTE deverá arcar com os valores, guardar os recibos para depois em seu retorno solicitar a Cia Aérea ou ao Seguro Viagem os reembolsos conforme apólice, esse se acaso tiver contratado previamente tal serviço.',
      'Cláusula 43: A Franquia de Bagagem será conforme estipulado pela Cia Aérea ou contratado pelo CONTRATANTE no ato da emissão do bilhete eletrônico. O peso /quantidade de mala despachada e de mão deve ser verificado antes do embarque. O CONTRATANTE que adquirir bilhetes eletrônicos sem franquia de bagagem deverá fazer a compra com antecedência no site da Cia Aérea ou diretamente no dia do check in, de acordo com o peso/quantidade embarcado.',
    ],
  },
  {
    section_key: 'rescisao',
    title: 'RESCISÃO/CANCELAMENTO',
    paragraphs: [
      'Cláusula 44: Sem prejuízo das demais disposições contidas neste instrumento, o presente Contrato também poderá ser rescindido, pela CONTRATADA ou pelo(a) CONTRATANTE pelo descumprimento total ou parcial, de quaisquer de suas cláusulas e condições deste contrato.',
      'Cláusula 45: Este contrato ficará rescindido a partir do momento em que qualquer das partes fizer comunicação por escrito da desistência, recaindo a partir daí todas as obrigações pendentes.',
      'Cláusula 46: Desistência após o início da viagem, qualquer que o fato determinante ou etapa da viagem em que ocorrer a desistência da viagem, não haverá nenhuma redução do preço com relação a parte não utilizada, e tampouco será concedido reembolso em absoluto.',
      'Cláusula 47: Quando sobrevier o cancelamento da viagem a pedido do CONTRATANTE, independente do motivo, serão devidas todas as multas estipuladas pelos fornecedores dos serviços contratados. Dessa forma, frisa-se, a Operadora responsável efetuará, à agência de viagem contratada e ao contratante, o cálculo do reembolso devido, excluindo-se o valor da comissão da agência de viagem, bem como eventuais taxas administrativas.',
      'Parágrafo Primeiro: Para solicitações de cancelamento que aconteçam com antecedência superior à 24horas em relação ao embarque, será cobrado pela CONTRATADA, à título de multa, o importe de 20% do valor do contrato, acrescido de eventuais multas estabelecidas pelos prestadores dos serviços contratados. Destaca-se ainda que, pelo trabalho de intermediação integralmente prestado, ora emitindo e ora solicitando o cancelamento dos serviços, a comissão paga à agência de viagens também não será reembolsada ao CONTRATANTE.',
      'Parágrafo segundo: Para solicitações de cancelamentos que aconteçam com antecedência inferior à 24h do horário previsto para embarque, ou ainda, em eventual ocorrência de NO-SHOW (não apresentação do passageiro para embarque), não haverá reembolso de quaisquer valores, por qualquer motivo que seja.',
    ],
  },
  {
    section_key: 'foro',
    title: 'ELEIÇÃO DE FORO',
    paragraphs: [
      'Cláusula 48: Para dirimir qualquer dúvida proveniente do presente contrato, as partes de comum acordo, elegem o foro da comarca de Rio de Janeiro (RJ) renunciando a qualquer outro por mais privilegiado que seja, para dirimir dúvidas do presente, cientes de todo o pactuado, firmado em duas vias, na presença de testemunhas.',
      'E, por assim estarem de acordo, as partes firmam o presente Contrato.',
      'Rio de Janeiro (RJ), {{slot:emission_day}} de {{slot:emission_month}} de {{slot:emission_year}}.',
      '{{signatures}}',
    ],
  },
  {
    section_key: 'autorizacao_imagem',
    title: 'AUTORIZAÇÃO DO USO DE IMAGEM',
    paragraphs: [
      '{{choice:image_use_authorization=sim}} SIM {{choice:image_use_authorization=nao}} NÃO',
      'Eu, {{slot:image_auth_name}}, CPF {{slot:image_auth_cpf}}, autorizo o uso da minha imagem e dos passageiros que comigo viajarão para fins de divulgação e publicidade no site e páginas nas mídias sociais da AGENCIA CONTRATADA, por tempo indeterminado.',
    ],
  },
  {
    section_key: 'anexo_1',
    title: 'ANEXO 1 — CARTILHA DO VIAJANTE',
    paragraphs: [
      'ANEXO 1',
      'CARTILHA DO VIAJANTE',
      '1. Documentação/Visto/Passaporte/Vacinação/Autorização necessárias:',
      'VIAGEM EM TERRITÓRIO BRASILEIRO: é obrigatório portar RG válido ou outros documentos de identidade original e em bom estado durante toda a viagem.',
      'Estrangeiros viajando pelo Brasil devem portar o seu Passaporte original.',
      'VIAGEM EM PAÍSES DA AMÉRICA DO SUL: Alguns países da América do Sul (como, por exemplo, Argentina, Chile, Uruguai) aceitam o RG original como documento migratório, desde que em bom estado de conservação e recente (últimos 05 anos), permitindo o reconhecimento do portador pela foto. Consulte seu agente de viagem se é o seu caso ou não.',
      'VIAGEM INTERNACIONAL (fora do território brasileiro): é obrigatório portar passaporte válido durante toda a viagem, ou seja, com vencimento após 06 meses, observada a data prevista para retorno.',
      'VISTOS: muitos países exigem que brasileiros possuam vistos para entrarem no país (como é o caso dos Estados Unidos). A responsabilidade pela validade do passaporte, obtenção dos vistos, bem como os pagamentos das taxas envolvidas são de inteira responsabilidade dos passageiros. Importante frisar que crianças também necessitam de vistos.',
      '**Atenção: A obtenção do visto não garante a entrada no país de destino. No caso de ter sua entrada negada pelas autoridades de imigração, não haverá reembolso pela não utilização dos serviços previamente contratados.',
      'VIAGENS MARÍTIMAS: Muita atenção em viagens marítimas, pois o porto de embarque pode não necessitar de visto/passaporte/vacinação, mas os portos de paradas (visitas) podem ser em países que façam essa exigência.',
      'VACINAÇÃO: Muitos países exigem que o viajante tome determinadas vacinas com determinada antecedência. Além de tomar a vacina, o viajante deve obter a carteira internacional de vacinação. O viajante deve obter a informação correta e atual de cada país, entrando diretamente em contato com seu consulado, sendo de sua responsabilidade a providencia.',
      'DOS INGRESSOS',
      'Quando da aquisição de ingressos, declara-se expressamente que são pessoais e intransferíveis.',
      'DA MEIA ENTRADA: Passageiros que adquiriram eventos com desconto de meia entrada, deverão apresentar:',
      '- Desconto estudantil (nível fundamental, médio, superior): Carteira Escolar atualizada com foto;',
      '- Aposentados: Carteira do INSS ou Holerite;',
      '- Idoso (acima de 60 anos de idade): documento de identidade original.',
      'Estes documentos especificados acima deveram ser apresentados na bilheteria do evento. Caso o Contratante e ou passageiro não venha apresentar os comprovantes, ficará incumbido de pagar a diferença do valor do ingresso ao órgão Responsável do Evento em sua Bilheteria, não cabendo qualquer responsabilidade por ressarcimento da Contratada.',
      'Os ingressos são documentos ao portador, portanto a CONTRATADA não se responsabiliza por perda ou roubo dos mesmos. Após a liberação, RESSALTA-SE que não é possível a emissão de segunda via. Uma vez adquiridos e pagos não poderão ser reembolsados.',
      'MENORES VIAJANDO:',
      'DENTRO DO BRASIL: incluindo as modificações provenientes da Lei 13.812, as condições estabelecidas que estão em vigor são:',
      'Desacompanhados: Adolescentes com 16 anos completos podem viajar sozinhos sem nenhuma autorização. Crianças e adolescentes menores de 16 anos precisam de autorização judicial para viajarem sozinhos, exceto para comarcas contíguas à da residência da criança ou do adolescente, se no mesmo Estado, ou incluída na mesma região metropolitana.',
      'Acompanhados - Crianças e adolescentes menores de 16 anos podem viajar sem autorização judicial se estiverem acompanhados de um ascendente (pai, mãe, avós, bisavós) ou parente, maior de idade, até terceiro grau (irmãos, tios, sobrinhos, primos-irmãos, tios-avós, sobrinhos-netos), ou ainda na companhia de pessoa maior, expressamente autorizada pelos pais ou responsável. Nesse caso, é necessário comprovar documentalmente o parentesco ou a condição de responsável legal.',
      'É proibida a hospedagem de criança ou adolescente em hotel, motel, pensão ou estabelecimento congênere, salvo se autorizado ou acompanhado pelos pais ou responsável.',
      'EM CRUZEIROS MARÍTIMOS (mesmo que na costa brasileira): menores de 18 anos de idade em conformidade com o artigo 84 do Estatuto da Criança e do Adolescente, a autorização judicial não será necessária quando a criança ou adolescente estiver acompanhada de ambos os pais, guardião ou tutor.',
      'Quando viajar em companhia de apenas um dos pais, o outro deverá autorizar por escrito, com firma reconhecida. Em qualquer outra hipótese, a autorização judicial é imprescindível.',
      'Importante: essa autorização é para sair do Brasil; países como os Estados Unidos, a maioridade é de 21 anos.',
      'LEMBRE-SE DE CONFERIR E PROVIDENCIAR TUDO AQUILO QUE FOR NECESSÁRIO DENTRO DE TEMPO HÁBIL PARA O EMBARQUE.',
      '2. Vouchers:',
      'VOUCHERS: vale lembrar que contratos e recibos não valem como documento para embarque aéreo, marítimo ou terrestre, ou ainda para hospedagem ou utilização de serviços. Para utilização dos serviços contratados o viajante receberá por meio eletrônico ou através de serviço postal com 2 (dois) dias úteis de antecedência a data de embarque, os documentos necessários como bilhetes aéreos, vouchers, entre outros, conferindo os mesmos.',
      '3. Seguro Viagem',
      'CARTÃO DE ASSISTÊNCIA COM SEGURO VIAGEM: Oportuno mencionar que, durante uma viagem, infelizmente imprevistos podem ocorrer gerando gastos com assistência médica, odontológica, entre outras. No programa adquirido não está incluído nenhum tipo de seguro automaticamente. O cliente declara que este serviço foi oferecido e que recomendamos a sua aquisição.',
      'Ressalva-se que o voucher de SEGURO VIAGEM, se contratado, e escolhido pelo CONTRATANTE, serão válidos somente para o período da viagem e todas as documentações exigidas pela seguradora, são de inteira responsabilidade do contratante.',
      'Esse Seguro é adquirido à parte pelo contratante. O orçamento será enviado por e-mail com todas as categorias e coberturas ficando a livre escolha da CONTRATANTE qual irão optar.',
      'No caso da contratação, toda e qualquer ocorrência que for necessário, o CONTRATANTE deverá acionar a SEGURADORA, entrando em contato através dos meios informados no voucher (e-mails, telefones, whatsapp) e a partir disso, abrir o protocolo de atendimento.',
      'Uma vez aberto um atendimento o próprio passageiro deverá acompanhar e seguir as orientações da Seguradora.',
      'Em caso de necessidade de retorno antecipado ao Brasil, o passageiro deverá: solicitar e aguardar a autorização do seguro; aguardar o tempo necessário para que a operadora junto com Cia Aérea possa executar os transmites necessários de alteração e reemissão do novo bilhete.',
      'Assim, lembramos que quaisquer solicitações de retorno antecipado de emergência, como seus devidos trechos, antes da autorização do seguro serão de inteira responsabilidade do próprio passageiro.',
      'Já em caso de Extravio ou Atraso de Bagagem o passageiro deverá solicitar no guichê da Cia Aérea o formulário P.I.R, pois este é o ÚNICO formulário aceito pelas seguradoras para as devidas providencias (qualquer outro documento poderá ser recusado pela SEGURADORA, portanto não deixar o aeroporto sem o formulário padrão exigido). O próprio passageiro será responsável de abrir o protocolo de atendimento junto ao Seguro notificando o extravio ou atraso de sua bagagem.',
      'O seguro de bagagem disponível no Brasil, através dos Cartões de Assistência Internacional, não cobre o roubo ou extravio de malas, exceto quando em posse da transportadora aérea, quando o roubo ou extravio for comprovado através do cupom da mala. Assim, o passageiro viaja com pleno conhecimento que suas malas não estão cobertas em qualquer outra situação, sem embargo de outras, no saguão do aeroporto, no transporte terrestre, no navio ou no hotel. Nenhum hotel no mundo assume responsabilidade por roubos ou furtos dentro das suas dependências (exceto quando guardado dentro do cofre e sujeito a certos limites de acordo com a política de cada hotel). Por isso, recomenda-se guardar acessórios de alto valor sempre nos cofres ou, quando viajando, na bagagem de mão. (Dessa forma, posto que se os especialistas, hotéis, seguradoras não podem cobrir estes riscos, a CONTRATADA turística ou seus correspondentes também estão isentos de assumi-los).',
      'Se a necessidade for de Atendimento Médico, deverá o contratante abrir o protocolo de atendimento e aguardar orientação quanto ao local para atendimento médico.',
      '***Lembre-se de consultar seus agentes de viagem, visto que, para alguns países, a sua aquisição é obrigatória. (Exemplo: viagens para alguns países da Europa).',
      'Assim, devidamente orientado, no tocante a opção pela aquisição do seguro viagem, minha opção foi:',
      '{{choice:insurance=contratado}} Optei pela aquisição',
      '{{choice:insurance=recusado}} Optei por não adquirir',
      '4. Dos horários de apresentação dos passageiros',
      'VOO DOMÉSTICO: para embarques em voos domésticos, deverá o CONTRATANTE comparecer no balcão da Cia aérea no aeroporto de embarque com, no mínimo, 2h (duas horas) de antecedência ao horário de partida do voo;',
      'VOO INTERNACIONAL: para embarques em voos internacionais, o CONTRATANTE deverá comparecer no balcão da Cia aérea no aeroporto de embarque com, no mínimo, 3h (três horas) de antecedência ao horário de partida do voo;',
      'CRUZEIROS: para embarques em cruzeiros marítimos, comparecer no balcão da Cia marítima no porto de embarque com, no mínimo, 5h (cinco horas) de antecedência ao horário de partida do navio.',
      'No caso de eventual atraso no horário previsto para o voo, fica previamente estabelecido que a responsabilidade será única e exclusivamente da companhia aérea em questão.',
      'Em viagens à negócios, feiras, reuniões, congressos, entre outros compromissos COM HORÁRIO ESPECÍFICO, orientamos o contratante a viajar com 02 (dois) dias de antecedência ao seu compromisso no local de destino, podendo assim em sua maioria dos casos, evitar a perda desse compromisso por um atraso de voo etc.',
      '5. Do check-in e check-out em hotéis/pousadas',
      'A grande maioria dos hotéis no Brasil e no mundo trabalham com as diárias iniciando às 15 horas e encerrando às 11 horas. Verifique a sua previsão de chegada e saída do hotel e adquira uma diária a mais na ida e/ou na volta se for o caso, para que seu apartamento esteja disponível durante toda a sua viagem, de acordo com a conveniência que a situação exigir.',
      'FUSO HORÁRIO: O CONTRATANTE deverá prestar muita atenção a diferença de horário referente a fusos e também ao horário de verão. Os horários impressos nos vouchers referem-se sempre ao horário local. Muita atenção aos voos com embarque na madrugada, pois em sua maioria a sua apresentação no aeroporto se dará no dia anterior ao embarque.',
      '6. Aluguel de carros',
      'Para locação de veículos no Brasil e no mundo, existem exigências específicas por parte das locadoras (como por exemplo mínimo de 2 anos de carteira de habilitação, possuir cartão de crédito internacional de titularidade do condutor, com limite para a franquia do seguro, possuir carteira de habilitação internacional, entre outros), devendo o contratante de veículos estar atento as exigências das locadoras, descritas em seus sites / contratos.',
      'O CONTRATANTE declara-se ciente que os veículos são reservados por categoria e não por modelos específicos.',
      '7. Moedas/Declaração de valores e bens que entram e saem do país',
      'Para cada viagem, o CONTRATANTE deverá estar atento a moeda local utilizada, pois cada país possui uma moeda distinta, sendo que alguns países aceitam além da moeda em espécie e cartão de crédito internacional.',
      'Solicitamos que o contratante entre em contato diretamente com uma casa de câmbio para a realização de compra e venda de moedas e maiores informações.',
      'Salientamos que em viagens marítimas, mesmo realizadas na costa brasileira, não é aceito a moeda brasileira (REAL).',
      'Para viagens ao exterior, existe uma quantia máxima de moedas que o passageiro poderá portar para entrar ao país, bem como de bens que poderá importar durante o seu regresso ao Brasil, consulte:',
      '- http://www.receita.fazenda.gov.br',
      '8. ROUBOS, assaltos, perda de documentos, desaparecimento de bens dentro de apartamentos, entre outros:',
      'Recomendamos que todos os objetos de valores sejam armazenados no cofre de seu apartamento / cabine.',
      'No caso de assalto ou perda de documentos / pertences, o próprio passageiro deverá procurar a delegacia local para registrar um boletim de ocorrência. A CONTRATADA, as Operadoras, os Hotéis e as Cias Marítimas, não possuem nenhuma responsabilidade nos casos citados acima, bem como, não se responsabilizam pelos documentos / pertences deixados em ônibus ou embarcações durante transfers ou passeios.',
    ],
  },
];

/** Configuração de renderização + definição dos campos dinâmicos do modelo Drica (genérica). */
export const DRICA_RENDER_CONFIG: ContractRenderConfig = {
  mode: 'slotted',
  footer_text: DRICA_FOOTER_TEXT,
  blocks: {
    meta_line: false,
    contractor: false,
    passengers: false,
    trip_summary: false,
    services: false,
    financial: false,
    insurance: false,
    special_conditions: false,
    attachments: false,
    signatures: false,
    standard_footer: false,
  },
  slots: {
    contractor_name: { label: 'Nome completo do contratante', source: 'contractor.name', required: true, fallback: '______' },
    contractor_nationality: { label: 'Nacionalidade', source: 'contractor.nationality', required: true, fallback: '______' },
    contractor_marital_status: { label: 'Estado civil', source: 'contractor.marital_status', required: true, fallback: '______' },
    contractor_profession: { label: 'Profissão', source: 'contractor.profession', required: true, fallback: '______' },
    contractor_rg: { label: 'RG', source: 'contractor.rg', required: true, fallback: '______' },
    contractor_cpf: { label: 'CPF', source: 'contractor.cpf', required: true, fallback: '______' },
    contractor_address: { label: 'Endereço completo', source: 'contractor.address', required: true, fallback: '______' },
    airlines: { label: 'Companhia(s) aérea(s)', source: 'suppliers.airlines', required: false, fallback: '____________' },
    operators: { label: 'Consolidadora(s)/operadora(s)', source: 'suppliers.operators', required: false, fallback: '____________' },
    travel_agency: { label: 'Agência de viagens', source: 'suppliers.travel_agency', required: true, fallback: '____________' },
    total: { label: 'Valor total (R$)', source: 'financial.total', required: true, fallback: '____________' },
    down_payment: { label: 'Entrada (R$)', source: 'financial.down_payment', required: false, fallback: '____________' },
    down_payment_date: { label: 'Data da entrada', source: 'financial.down_payment_date', required: false, fallback: '___/___/_____' },
    installments_count: { label: 'Quantidade de parcelas', source: 'financial.installments_count', required: false, fallback: '_____' },
    installment_value: { label: 'Valor da parcela (R$)', source: 'financial.installment_value', required: false, fallback: '_________________' },
    due_day: { label: 'Dia de vencimento', source: 'financial.due_day', required: false, fallback: '_______' },
    payment_method: { label: 'Forma de pagamento', source: 'financial.payment_method', required: true, fallback: '(cartão de crédito/boleto)' },
    emission_day: { label: 'Dia da emissão', source: 'emission.day', required: true, fallback: '____' },
    emission_month: { label: 'Mês da emissão', source: 'emission.month', required: true, fallback: '____________' },
    emission_year: { label: 'Ano da emissão', source: 'emission.year', required: true, fallback: '20____' },
    image_auth_name: { label: 'Nome (autorização de imagem)', source: 'contractor.name', required: false, fallback: '________________________________' },
    image_auth_cpf: { label: 'CPF (autorização de imagem)', source: 'contractor.cpf', required: false, fallback: '_____________________' },
  },
  lists: {
    included_services: { label: 'Serviços inclusos (Cláusula 1)', source: 'included', required: true },
  },
  tables: {
    passengers: { label: 'Passageiros (Cláusula 13)', source: 'passengers', columns: ['name', 'cpf'], header: ['Nome e Sobrenome', 'CPF'], required: true },
  },
  checks: {
    ack_documents_required: { label: 'Ciência dos documentos exigidos (Cláusula 15)', required: true },
  },
  choices: {
    fare_refund_condition: {
      label: 'Condição tarifária / reembolso (Cláusula 17)',
      options: { nao_reembolsavel: 'Um ou mais serviços não reembolsáveis', reembolso_parcial: 'Todos permitem algum percentual de reembolso' },
      required: true,
    },
    insurance: {
      label: 'Opção pelo seguro viagem (Anexo 1)',
      source: 'insurance',
      options: { contratado: 'Optei pela aquisição', recusado: 'Optei por não adquirir' },
      required: true,
    },
    image_use_authorization: {
      label: 'Autorização do uso de imagem',
      options: { sim: 'SIM', nao: 'NÃO' },
      required: true,
    },
  },
  signatures: {
    contracted_label: 'Contratado: DRICA VIAGENS',
    contractor_label: 'Contratante:',
    witnesses_label: 'Testemunhas',
    witness_name_label: 'Nome',
    witness_doc_label: 'CPF',
    witnesses: 2,
  },
};

/** Converte os parágrafos literais em HTML para gravação em `body_html`. */
export function paragraphsToHtml(paragraphs: string[]): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return paragraphs.map((p) => `<p>${esc(p)}</p>`).join('');
}
