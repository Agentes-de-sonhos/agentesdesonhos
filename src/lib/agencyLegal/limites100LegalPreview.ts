/**
 * PRÉVIA PARA REVISÃO — Política de Privacidade, Termos de Uso e rodapé legal
 * exclusivos da 100 Limites.
 *
 * Proteção contra ativação acidental em produção:
 * - só ativa quando o NAVEGADOR está num host técnico de prévia
 *   (`isTechnicalPreviewHost`: *.lovable.app, *.lovableproject.com, localhost)
 *   E o tenant resolvido é 100limites.tur.br / www.100limites.tur.br;
 * - em qualquer domínio real (inclusive 100limites.tur.br publicado) a função
 *   devolve null — não existe query parameter, flag ou storage que a ligue;
 * - outros tenants nunca recebem estes textos.
 *
 * Os textos são dados estruturados (sem HTML cru) e não contêm marcadores
 * dinâmicos: campos não confirmados foram omitidos do corpo jurídico e
 * listados em `LIMITES100_LEGAL_PENDING`.
 */
import { isTechnicalPreviewHost, normalizeHostname } from "@/lib/agencyDomains";

export type LegalPreviewSection = { heading: string; paragraphs?: string[]; items?: string[] };
export type LegalPreviewDocument = {
  kind: "privacy" | "terms";
  title: string;
  lastUpdated: string;
  intro: string[];
  sections: LegalPreviewSection[];
};

export const LIMITES100_LEGAL_HOSTS = ["100limites.tur.br", "www.100limites.tur.br"] as const;

export const LIMITES100_LEGAL_DATA = {
  tradeName: "100 Limites Viagens",
  legalName: "100LIMITES VIAGENS & TURISMO LTDA",
  cnpj: "21.911.559/0001-43",
  cadastur: "21.911.559/0001-43",
  cadasturValidity: "07/10/2026 a 07/10/2028",
  address: "Rua Emeline Matildes Crisemann Scheidt, 220, Centro, Palhoça/SC, CEP 88133-060, Brasil",
  email: "amanda@100limites.tur.br",
  phone: "(48) 99608-6615",
  site: "https://100limites.tur.br",
  platformName: "Agentes de Sonhos",
  editorialLocation: "Atendimento online com Amanda Larini, atualmente em Lisboa, Portugal.",
  draftDate: "13 de outubro de 2026",
} as const;

/** Pendências que impedem a ativação em produção (exibidas só na prévia). */
export const LIMITES100_LEGAL_PENDING: string[] = [
  "Horário real de atendimento: não confirmado — omitido dos Termos e do rodapé.",
  "Prazo ou critério de retenção de contatos comerciais (leads): não confirmado — a Política usa apenas o critério geral de necessidade, sem prazo numérico.",
  "Pessoa jurídica operadora da plataforma Agentes de Sonhos e link da política própria da plataforma: não confirmados — a Política cita apenas o nome da plataforma.",
  "Lista completa de prestadores tecnológicos (hospedagem, e-mail, mensagens, analytics etc.): não confirmada — a Política cita somente categorias.",
  "Mecanismos de transferência internacional de dados: não confirmados — a cláusula descreve apenas o envio necessário a fornecedores e autoridades do destino, sem declarar mecanismo.",
  "Cookies: o site carrega o Google Tag Manager (GTM-5LBKQWFT) antes de qualquer escolha do visitante e o conteúdo desse contêiner é desconhecido. Não há painel de Configurações de Cookies; a Política não afirma bloqueio prévio e o link de preferências não foi criado.",
  "Encarregado (DPO): não há encarregado divulgado — o canal de privacidade é o e-mail, sem atribuir cargo a Amanda Larini.",
  "Pagamento online: o site público não processa pagamentos; confirmar se faturas/links enviados pela agência usam algum meio de pagamento integrado.",
  "Dados sensíveis (saúde, mobilidade, acessibilidade) e uso de inteligência artificial sobre dados de clientes: não confirmados — cláusulas específicas omitidas.",
  "Cadastur: número e validade transcritos do certificado já existente no projeto (impresso: 07/10/2026 a 07/10/2028); não houve consulta externa oficial.",
  "Exclusão de conta ou de dados por autoatendimento não está implementada: os pedidos de titulares são atendidos pelo e-mail de privacidade.",
  "Revisão jurídica e aprovação final do texto pela agência antes da ativação em produção.",
];

export function isLimites100Host(agencyHostname: string): boolean {
  return (LIMITES100_LEGAL_HOSTS as readonly string[]).includes(normalizeHostname(agencyHostname));
}

/**
 * Único ponto de ativação. `browserHostname` é o host real da aba; o tenant
 * pode vir do override técnico existente, que só funciona em host técnico.
 */
export function isLimites100LegalPreviewActive(agencyHostname: string, browserHostname?: string): boolean {
  const browser =
    browserHostname ?? (typeof window === "undefined" ? "" : window.location.hostname);
  return isTechnicalPreviewHost(browser) && isLimites100Host(agencyHostname);
}

const D = LIMITES100_LEGAL_DATA;
const lastUpdated = `Rascunho de ${D.draftDate} — prévia para revisão`;

export const LIMITES100_PRIVACY: LegalPreviewDocument = {
  kind: "privacy",
  title: "Política de Privacidade",
  lastUpdated,
  intro: [],
  sections: [
    {
      heading: "1. Objetivo e abrangência",
      paragraphs: [
        `A ${D.tradeName}, nome comercial de ${D.legalName}, inscrita no CNPJ sob o nº ${D.cnpj}, respeita a sua privacidade e está comprometida com a proteção dos dados pessoais tratados por meio do site ${D.site}, de seus formulários, canais de atendimento, Área do Cliente e demais serviços digitais relacionados.`,
        "Esta Política de Privacidade explica quais dados pessoais podemos coletar, como e por que os utilizamos, com quem podemos compartilhá-los, por quanto tempo os mantemos e quais direitos podem ser exercidos pelos titulares. Ela se aplica aos visitantes do site, clientes, potenciais clientes, passageiros, representantes e demais pessoas que interajam conosco por meios digitais.",
        "Ao utilizar nossos canais, você declara ter lido esta Política. Quando o tratamento depender de consentimento, solicitaremos uma manifestação específica, livre, informada e destacada, que poderá ser revogada pelos meios indicados neste documento.",
      ],
    },
    {
      heading: "2. Quem é responsável pelos dados",
      paragraphs: [
        `Para os tratamentos relacionados ao atendimento, elaboração de propostas, intermediação e comercialização de serviços turísticos, assistência e acompanhamento, ${D.legalName}, CNPJ ${D.cnpj}, atua como controladora dos dados pessoais, pois define as finalidades e os meios essenciais dessas operações.`,
        `Nosso canal de privacidade é ${D.email}.`,
        `O site utiliza a infraestrutura tecnológica da plataforma ${D.platformName}. Quando a responsável pela plataforma trata dados seguindo instruções da agência, atua como operadora. Em atividades realizadas para cumprir obrigações próprias, garantir a segurança da plataforma ou administrar contas e serviços sob sua responsabilidade, poderá atuar como controladora independente, conforme sua própria política de privacidade.`,
      ],
    },
    {
      heading: "3. Dados pessoais que podemos tratar",
      paragraphs: [
        "Os dados tratados variam conforme a forma de interação e as funcionalidades utilizadas. Coletamos somente informações adequadas, pertinentes e necessárias às finalidades informadas.",
      ],
      items: [
        "Dados de identificação e contato: nome, e-mail, telefone, WhatsApp, cidade, Estado e demais informações inseridas voluntariamente nos formulários ou canais de atendimento.",
        "Dados da solicitação de viagem ou assistência: destino, origem, período, quantidade e perfil dos viajantes, preferências, serviços desejados e observações necessárias à elaboração de uma proposta.",
        "Dados de navegação e dispositivo: endereço IP, data e hora de acesso, páginas visitadas, identificadores do navegador e do dispositivo, registros de segurança e informações coletadas por cookies ou tecnologias semelhantes.",
        "Dados das comunicações: conteúdo e histórico das mensagens trocadas por formulário, e-mail, telefone, WhatsApp, Área do Cliente ou outros canais oficiais.",
        "Dados de conta: identificadores de acesso, registros de autenticação, preferências e atividades realizadas na Área do Cliente. Dados de acesso são protegidos e não devem ser compartilhados pelo usuário.",
        "Dados necessários à reserva, emissão ou assessoria documental: nome completo conforme documento, CPF, data de nascimento, nacionalidade, gênero quando exigido pelo fornecedor ou pela autoridade, número e validade de documentos, passaporte, vistos, dados de programa de fidelidade e informações dos acompanhantes.",
      ],
    },
    {
      heading: "4. Como os dados são coletados",
      paragraphs: [
        "Os dados podem ser fornecidos diretamente por você, gerados durante o uso do site e da plataforma, recebidos por meio de canais oficiais da agência ou enviados por uma pessoa responsável pela contratação da viagem.",
        "Quando você fornece dados de acompanhantes ou de outros passageiros, declara possuir legitimidade para fazê-lo e se compromete a informá-los sobre este tratamento. Dados de crianças deverão ser enviados por seus pais ou responsáveis legais e serão tratados de acordo com seu melhor interesse.",
      ],
    },
    {
      heading: "5. Finalidades e fundamentos do tratamento",
      paragraphs: [
        "Podemos tratar dados pessoais para responder solicitações, identificar necessidades, preparar e apresentar propostas, realizar contatos relacionados ao atendimento, executar procedimentos preliminares solicitados pelo titular, formalizar e executar contratos, processar reservas e emissões, prestar suporte e pós-venda, cumprir obrigações legais ou regulatórias, manter registros necessários ao exercício regular de direitos, prevenir fraudes, proteger o site e melhorar nossos serviços.",
        "Conforme a situação, o tratamento poderá se basear na execução de contrato ou de procedimentos preliminares a pedido do titular, no cumprimento de obrigação legal ou regulatória, no exercício regular de direitos, na proteção do crédito, no legítimo interesse avaliado de forma compatível com os direitos do titular ou no consentimento.",
        `Comunicações promocionais, novidades e campanhas serão enviadas conforme a base legal aplicável. Quando utilizarmos consentimento, a inscrição será opcional e poderá ser cancelada a qualquer momento pelo canal ${D.email}.`,
      ],
    },
    {
      heading: "6. Compartilhamento de dados",
      paragraphs: [
        "Os dados poderão ser compartilhados apenas na medida necessária para as finalidades descritas nesta Política, com prestadores tecnológicos, profissionais autorizados, empresas de comunicação, fornecedores turísticos e autoridades competentes.",
        `Entre os destinatários podem estar a plataforma ${D.platformName} e as categorias de serviços de hospedagem e armazenamento, provedores de e-mail e mensagens, WhatsApp, ferramentas de atendimento, medição de audiência, segurança e mapas, conforme a configuração efetivamente utilizada pela agência.`,
        "Quando você solicitar ou contratar uma viagem ou assistência, os dados necessários poderão ser enviados a companhias aéreas, hotéis, operadoras, consolidadoras, seguradoras, atrações, cruzeiros e outros fornecedores responsáveis pela cotação, reserva, emissão ou execução dos serviços. Quando necessário, podemos auxiliar na articulação com empresas parceiras para serviços de transporte, contratados separadamente; nesse caso, os dados indispensáveis poderão ser informados a essas empresas.",
        "Também poderemos compartilhar informações para cumprir determinação legal, regulatória, administrativa ou judicial, prevenir fraude, proteger direitos ou responder a autoridades competentes. Não autorizamos os destinatários a utilizar os dados para finalidades incompatíveis com a relação estabelecida.",
      ],
    },
    {
      heading: "7. Transferência internacional",
      paragraphs: [
        "Determinados serviços de viagem e assistência, especialmente em Portugal, na Europa e em outros destinos internacionais, exigem o envio de informações a fornecedores ou autoridades do país de destino. Esse envio ocorre na medida necessária à cotação ou execução dos serviços solicitados pelo próprio titular e será revisto sempre que houver mudança de fornecedor tecnológico ou operacional.",
      ],
    },
    {
      heading: "8. Cookies e tecnologias semelhantes",
      paragraphs: [
        "Utilizamos cookies e tecnologias semelhantes para viabilizar funções essenciais, proteger o site e guardar preferências. O site também carrega uma ferramenta de gerenciamento de tags do Google, que pode acionar tecnologias de terceiros de medição de desempenho.",
        "Você pode bloquear ou apagar cookies nas configurações do seu navegador. Essa ação pode afetar funcionalidades do site.",
      ],
    },
    {
      heading: "9. Retenção e eliminação",
      paragraphs: [
        "Os dados serão mantidos somente pelo período necessário para cumprir as finalidades informadas. Contatos e solicitações comerciais serão conservados enquanto forem necessários ao atendimento, salvo se houver contratação, obrigação legal, necessidade de prevenção a fraude ou exercício regular de direitos que justifique prazo diferente.",
        "Registros contratuais, fiscais, financeiros, de atendimento e de segurança poderão ser mantidos pelos prazos exigidos ou permitidos pela legislação. Ao término do tratamento, os dados serão eliminados, anonimizados ou conservados de forma restrita quando houver fundamento jurídico para isso.",
      ],
    },
    {
      heading: "10. Segurança da informação",
      paragraphs: [
        "Adotamos medidas técnicas e administrativas razoáveis para proteger os dados contra acesso não autorizado, perda, alteração, divulgação ou destruição indevida. Essas medidas incluem controles de acesso, proteção de credenciais, atualizações e uso de prestadores compatíveis com a natureza das operações.",
        `Nenhum ambiente digital é absolutamente isento de riscos. Por isso, recomendamos que você utilize dispositivos confiáveis, proteja suas credenciais e não compartilhe senhas ou códigos de autenticação. Caso identifique uso indevido ou incidente relacionado aos nossos canais, entre em contato imediatamente por ${D.email}.`,
      ],
    },
    {
      heading: "11. Direitos do titular",
      paragraphs: [
        "Nos termos da legislação aplicável, você pode solicitar confirmação da existência de tratamento, acesso, correção de dados incompletos ou desatualizados, anonimização, bloqueio ou eliminação de dados desnecessários ou tratados irregularmente, portabilidade quando regulamentada, informação sobre compartilhamentos, revisão das condições de consentimento, revogação do consentimento e oposição ao tratamento nas hipóteses previstas em lei.",
        `A solicitação deve ser enviada para ${D.email}. Poderemos pedir informações adicionais para confirmar a identidade do solicitante e proteger os dados contra acesso indevido. O atendimento será gratuito e ocorrerá nos prazos aplicáveis. Algumas solicitações poderão não ser atendidas integralmente quando a conservação for necessária para cumprimento de obrigação legal, execução de contrato, prevenção a fraude ou exercício regular de direitos; nesse caso, apresentaremos a justificativa pertinente.`,
      ],
    },
    {
      heading: "12. Crianças e adolescentes",
      paragraphs: [
        "Nossos canais não são direcionados à contratação autônoma por crianças. Dados de crianças e adolescentes passageiros deverão ser fornecidos por seus pais, responsáveis legais ou pessoa legitimamente responsável pela viagem, sempre no melhor interesse do menor e limitados ao necessário para atendimento, cotação, reserva, emissão ou assistência solicitada.",
      ],
    },
    {
      heading: "13. Links e serviços de terceiros",
      paragraphs: [
        "O site pode conter links, mapas, vídeos, ferramentas ou páginas de terceiros, como WhatsApp e redes sociais. Ao acessar um ambiente externo, o tratamento de dados poderá ser regido pelas políticas daquele terceiro. Recomendamos a leitura das respectivas condições antes de fornecer informações pessoais.",
      ],
    },
    {
      heading: "14. Alterações desta Política",
      paragraphs: [
        "Esta Política poderá ser atualizada para refletir mudanças legais, tecnológicas, operacionais ou nas funcionalidades do site. A versão vigente estará sempre disponível nesta página, com a data da última atualização. Quando a alteração for relevante e houver um canal adequado, poderemos comunicar os titulares afetados.",
      ],
    },
    {
      heading: "15. Contato",
      paragraphs: [
        `Para dúvidas, solicitações ou reclamações sobre privacidade e proteção de dados, entre em contato com ${D.legalName} pelo e-mail ${D.email}, telefone ${D.phone} ou endereço ${D.address}.`,
      ],
    },
  ],
};

export const LIMITES100_TERMS: LegalPreviewDocument = {
  kind: "terms",
  title: "Termos de Uso",
  lastUpdated,
  intro: [],
  sections: [
    {
      heading: "1. Identificação e aceitação",
      paragraphs: [
        `Este site é mantido por ${D.tradeName}, nome comercial de ${D.legalName}, inscrita no CNPJ sob o nº ${D.cnpj} e no Cadastur sob o nº ${D.cadastur}, com endereço em ${D.address}.`,
        `Estes Termos disciplinam o acesso ao site ${D.site}, o envio de solicitações, o uso de conteúdos e da Área do Cliente. Ao navegar ou utilizar as funcionalidades, você declara ter lido e compreendido estes Termos. Se não concordar, interrompa o uso das funcionalidades correspondentes e entre em contato para obter esclarecimentos.`,
      ],
    },
    {
      heading: "2. Finalidade do site",
      paragraphs: [
        "O site apresenta informações sobre a agência, destinos, experiências, serviços turísticos, serviços de assistência, concierge e acompanhamento personalizado, conteúdos e ofertas, além de permitir que o usuário solicite atendimento, proposta, orçamento, roteiro ou outros serviços disponibilizados.",
        "Salvo quando a página indicar expressamente uma etapa de contratação, o preenchimento de formulário, a montagem de uma lista de solicitação, o envio de mensagem ou o recebimento de proposta não confirma reserva, emissão ou disponibilidade. A contratação será considerada concluída somente após o cumprimento das etapas informadas pela agência, a aceitação das condições aplicáveis e, quando exigido, a confirmação do pagamento e do fornecedor.",
      ],
    },
    {
      heading: "3. Atendimento e solicitações",
      paragraphs: [
        "Para receber atendimento, o usuário deverá fornecer informações verdadeiras, completas e atualizadas. A agência poderá entrar em contato pelos dados informados para esclarecer preferências, apresentar alternativas, enviar propostas e acompanhar a solicitação.",
        `O prazo de resposta pode variar conforme a complexidade, o horário de envio e a disponibilidade dos fornecedores. Os canais oficiais são ${D.email} e ${D.phone}, também pelo WhatsApp. ${D.editorialLocation}`,
      ],
    },
    {
      heading: "4. Ofertas, preços e disponibilidade",
      paragraphs: [
        "As ofertas devem ser interpretadas em conjunto com suas condições específicas, incluindo datas, origem, ocupação, itens incluídos, taxas, forma de pagamento, prazo de validade e restrições. Informações essenciais não serão substituídas por estes Termos.",
        "Preços indicados como a partir de representam a menor condição disponível dentro dos parâmetros informados. Tarifas turísticas são dinâmicas e podem sofrer alteração até a efetiva confirmação da reserva, quando essa característica estiver claramente indicada na oferta. Nenhuma alteração prejudicará direitos já constituídos após a contratação.",
        "Se for identificado erro material evidente de conteúdo ou preço, a agência corrigirá a informação e comunicará o usuário, observando a legislação aplicável e oferecendo as alternativas legalmente cabíveis. Imagens podem ser ilustrativas, sem prejuízo das características expressamente contratadas.",
      ],
    },
    {
      heading: "5. Intermediação de serviços turísticos",
      paragraphs: [
        "A agência atua na consultoria, organização, assistência e intermediação de serviços que podem ser executados por companhias aéreas, meios de hospedagem, operadoras, seguradoras, atrações, cruzeiros e outros fornecedores identificados na proposta ou documentação da viagem.",
        "Quando necessário, podemos auxiliar na articulação com empresas parceiras para serviços de transporte, contratados separadamente.",
        "Cada serviço também poderá estar sujeito às regras tarifárias e operacionais do respectivo fornecedor, desde que informadas ao consumidor antes da contratação. A atuação de terceiros não elimina as responsabilidades atribuídas à agência pela legislação aplicável.",
      ],
    },
    {
      heading: "6. Reserva, emissão e contratação",
      paragraphs: [
        "Antes da confirmação, o usuário deverá conferir nomes, datas, horários, destinos, serviços, valores, forma de pagamento, regras de alteração e cancelamento, exigências documentais e demais condições da proposta.",
        "Uma solicitação somente será considerada confirmada após comunicação expressa da agência ou disponibilização do respectivo comprovante, voucher, bilhete, contrato ou documento equivalente. Prazos de emissão e pagamento devem ser observados, pois tarifas e disponibilidade podem expirar.",
        "Condições particulares apresentadas na oferta, proposta, contrato, regra tarifária, confirmação ou voucher prevalecem para o serviço específico, desde que não contrariem direitos assegurados por lei.",
      ],
    },
    {
      heading: "7. Responsabilidades do usuário",
      paragraphs: [
        "O usuário é responsável por fornecer dados corretos, revisar cuidadosamente as informações recebidas, respeitar prazos, manter seus canais de contato atualizados, proteger credenciais de acesso e utilizar o site de forma lícita.",
        "É proibido tentar acessar áreas não autorizadas, interferir no funcionamento do site, introduzir códigos maliciosos, praticar fraude, utilizar identidade de terceiros sem legitimidade, realizar reservas fictícias, copiar conteúdos de forma não autorizada ou empregar o site para finalidade ilegal.",
      ],
    },
    {
      heading: "8. Documentos, requisitos e saúde do viajante",
      paragraphs: [
        "Cabe ao viajante verificar e portar documentos válidos e compatíveis com o roteiro, incluindo documento de identidade, passaporte, vistos, autorizações para menores, certificados, vacinas e demais exigências das autoridades e fornecedores.",
        "A agência poderá fornecer orientações gerais, inclusive na assessoria para visto americano, mas requisitos migratórios, sanitários e de entrada podem mudar, e a decisão sobre vistos cabe exclusivamente às autoridades competentes. O viajante deve confirmar informações atualizadas nos canais oficiais e informar previamente necessidades de acessibilidade, mobilidade, saúde ou assistência especial que possam impactar a prestação dos serviços.",
      ],
    },
    {
      heading: "9. Área do Cliente",
      paragraphs: [
        "A Área do Cliente é pessoal e destinada à consulta de propostas, roteiros, documentos, carteiras digitais, faturas, comprovantes e demais recursos disponibilizados. O usuário deve manter seus dados e links de acesso em sigilo, não permitir o uso por pessoas não autorizadas e comunicar imediatamente qualquer suspeita de comprometimento.",
        "A agência poderá suspender acesso em caso de risco de segurança, fraude, violação destes Termos, encerramento da relação ou necessidade técnica, preservando o acesso do consumidor aos documentos que devam ser fornecidos por outro meio.",
      ],
    },
    {
      heading: "10. Pagamentos",
      paragraphs: [
        "O site público não processa pagamentos diretamente. Eventuais instruções de pagamento serão enviadas pela agência por canais oficiais, vinculadas à proposta ou contratação específica.",
      ],
    },
    {
      heading: "11. Alterações, cancelamentos e reembolsos",
      paragraphs: [
        "Pedidos de alteração ou cancelamento deverão ser encaminhados pelos canais oficiais. Valores, multas, diferenças tarifárias, créditos e prazos de reembolso dependerão da legislação aplicável e das condições específicas aceitas antes da contratação.",
        "Quando houver direito de arrependimento ou outro direito de cancelamento aplicável à modalidade contratada, a agência disponibilizará meio adequado para seu exercício. Nenhuma cláusula destes Termos limita direitos obrigatórios do consumidor.",
      ],
    },
    {
      heading: "12. Comunicações",
      paragraphs: [
        "Mensagens operacionais sobre solicitações, propostas, reservas, pagamentos, alterações, documentos, segurança e pós-venda poderão ser enviadas pelos canais cadastrados, por serem necessárias ao atendimento ou à relação contratual.",
        `Mensagens promocionais serão tratadas separadamente. O recebimento poderá ser interrompido pelo canal ${D.email}, sem afetar comunicações indispensáveis a uma solicitação ou contratação em andamento.`,
      ],
    },
    {
      heading: "13. Propriedade intelectual",
      paragraphs: [
        "Textos, marcas, logotipos, identidade visual, fotografias, vídeos, roteiros, layouts, bancos de dados e demais conteúdos próprios ou licenciados são protegidos pela legislação aplicável. O acesso ao site não transfere direitos de propriedade intelectual.",
        "É permitida a utilização pessoal das informações para planejar ou consultar uma viagem. Reprodução comercial, modificação, distribuição, extração automatizada ou uso de conteúdo sem autorização poderá ser impedido, ressalvadas as hipóteses permitidas por lei.",
      ],
    },
    {
      heading: "14. Links e ambientes de terceiros",
      paragraphs: [
        "O site pode direcionar a páginas de fornecedores, mapas, redes sociais, WhatsApp e outros ambientes externos. A agência não controla integralmente esses ambientes, que poderão possuir termos e políticas próprios. A existência do link não representa garantia ampla sobre conteúdos alheios, sem prejuízo das responsabilidades legais relacionadas aos serviços intermediados ou contratados.",
      ],
    },
    {
      heading: "15. Disponibilidade e segurança do site",
      paragraphs: [
        "Buscamos manter o site disponível e seguro, mas poderão ocorrer interrupções para manutenção, atualização, falhas de fornecedores, eventos externos ou medidas de segurança. Sempre que razoável, serão adotadas providências para restabelecer o serviço e preservar os dados.",
        "Nada nestes Termos exclui ou restringe responsabilidade que não possa ser afastada pela legislação. Eventual responsabilidade será analisada conforme o fato, o serviço envolvido, a participação de cada agente e as normas aplicáveis.",
      ],
    },
    {
      heading: "16. Privacidade",
      paragraphs: [
        "O tratamento de dados pessoais decorrente do uso do site é explicado na Política de Privacidade.",
      ],
    },
    {
      heading: "17. Alterações dos Termos",
      paragraphs: [
        "Estes Termos poderão ser atualizados para refletir mudanças legais, operacionais ou nas funcionalidades. A versão vigente e sua data de atualização permanecerão disponíveis nesta página. Alterações não modificarão retroativamente condições já contratadas, salvo quando necessárias por lei ou aceitas pelas partes.",
      ],
    },
    {
      heading: "18. Legislação e solução de dúvidas",
      paragraphs: [
        `Estes Termos são regidos pelas leis da República Federativa do Brasil. Dúvidas e reclamações poderão ser encaminhadas para ${D.email}, ${D.phone} ou ${D.address}.`,
        "Eventuais controvérsias serão submetidas aos órgãos e ao foro competentes segundo a legislação aplicável, preservado o direito do consumidor de utilizar o foro de seu domicílio quando cabível.",
      ],
    },
  ],
};
