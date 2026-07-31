/**
 * Standard legal documents (LGPD privacy policy + terms of use) for the
 * white-label product landings. Reusable across products: every dynamic value
 * comes from the agency that owns the landing URL, and nothing is invented —
 * absent data simply does not appear in the document.
 *
 * NOTE: this is a product standard text and must be reviewed by a lawyer
 * before being treated as a definitive legal document.
 */

export const PRIVACY_POLICY_VERSION = "1.0";
export const TERMS_VERSION = "1.0";
export const LEGAL_LAST_UPDATED = "31/07/2026";

export const PLATFORM_NAME = "Agentes de Sonhos";

export type AgencyLegalInfo = {
  /** Trade name (always present — falls back to the agency display name). */
  name: string;
  legalName: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  /** Digits only, E.164 (e.g. 5535999540212). */
  whatsapp: string;
  email: string;
  website: string;
  privacyEmail: string;
  privacyOfficer: string;
};

export const EMPTY_LEGAL_INFO: AgencyLegalInfo = {
  name: "",
  legalName: "",
  cnpj: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  privacyEmail: "",
  privacyOfficer: "",
};

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
};

export type LegalDocument = {
  title: string;
  version: string;
  lastUpdated: string;
  intro: string[];
  sections: LegalSection[];
};

/** Strips control characters and collapses whitespace on dynamic values. */
export function sanitizeLegalValue(value: string | null | undefined): string {
  return String(value ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export function normalizeLegalInfo(raw: Partial<AgencyLegalInfo> & { name?: string }): AgencyLegalInfo {
  const out = { ...EMPTY_LEGAL_INFO };
  (Object.keys(EMPTY_LEGAL_INFO) as (keyof AgencyLegalInfo)[]).forEach((key) => {
    out[key] = sanitizeLegalValue(raw[key]);
  });
  return out;
}

/** Human formatting for the WhatsApp digits (never shows raw "undefined"). */
function formatWhatsapp(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (!d) return "";
  return `+${d}`;
}

/** Contact lines that are proven to exist for this agency. */
export function legalContactLines(info: AgencyLegalInfo): string[] {
  const lines: string[] = [];
  if (info.privacyEmail) lines.push(`E-mail para assuntos de privacidade: ${info.privacyEmail}`);
  if (info.email && info.email !== info.privacyEmail) lines.push(`E-mail de contato: ${info.email}`);
  if (info.whatsapp) lines.push(`WhatsApp: ${formatWhatsapp(info.whatsapp)}`);
  if (info.phone) lines.push(`Telefone: ${info.phone}`);
  if (info.website) lines.push(`Site: ${info.website}`);
  return lines;
}

/** Identification block with only the data the agency really registered. */
export function legalIdentificationItems(info: AgencyLegalInfo): string[] {
  const items: string[] = [];
  if (info.name) items.push(`Nome fantasia: ${info.name}`);
  if (info.legalName) items.push(`Razão social: ${info.legalName}`);
  if (info.cnpj) items.push(`CNPJ: ${info.cnpj}`);
  if (info.address) items.push(`Endereço: ${info.address}`);
  const cityState = [info.city, info.state].filter(Boolean).join(" / ");
  if (cityState) items.push(`Cidade/UF: ${cityState}`);
  if (info.privacyOfficer) items.push(`Responsável pelo tratamento de dados: ${info.privacyOfficer}`);
  return [...items, ...legalContactLines(info)];
}

export type MissingLegalField = { key: keyof AgencyLegalInfo; label: string; where: string };

/** Fields recommended for the legal documents that are still missing. */
export function missingLegalFields(info: AgencyLegalInfo): MissingLegalField[] {
  const checks: MissingLegalField[] = [
    { key: "legalName", label: "Razão social", where: "Configuração da landing" },
    { key: "cnpj", label: "CNPJ", where: "Meu perfil › Dados da agência" },
    { key: "address", label: "Endereço", where: "Meu perfil › Dados da agência" },
    { key: "city", label: "Cidade", where: "Meu perfil › Dados da agência" },
    { key: "state", label: "Estado (UF)", where: "Meu perfil › Dados da agência" },
    { key: "privacyEmail", label: "E-mail de privacidade", where: "Configuração da landing" },
    { key: "website", label: "Site", where: "Configuração da landing" },
    { key: "privacyOfficer", label: "Encarregado / responsável por dados", where: "Configuração da landing" },
  ];
  return checks.filter((c) => !info[c.key]);
}

/** True when the documents can be shown with at least name + one real channel. */
export function hasMinimumLegalData(info: AgencyLegalInfo): boolean {
  return !!info.name && legalContactLines(info).length > 0;
}

export function buildPrivacyPolicy(info: AgencyLegalInfo, productName: string): LegalDocument {
  const agency = info.name || "a agência responsável por esta página";
  const channels = legalContactLines(info);

  return {
    title: "Política de Privacidade",
    version: PRIVACY_POLICY_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED,
    intro: [
      `Esta Política de Privacidade explica como ${agency} trata os dados pessoais coletados nesta página de divulgação do ${productName}.`,
      `${agency} é a controladora dos dados pessoais enviados por esta página e é responsável pelas decisões comerciais do atendimento. A plataforma ${PLATFORM_NAME} atua como fornecedora da infraestrutura tecnológica que hospeda a página, armazena os registros e envia as comunicações operacionais em nome da agência, seguindo as instruções dela.`,
      "Este é um texto padrão do produto e deve passar por revisão jurídica da agência antes de ser tratado como documento jurídico definitivo.",
    ],
    sections: [
      {
        heading: "1. Quem é a controladora",
        items: legalIdentificationItems(info),
        paragraphs: channels.length
          ? []
          : ["Os canais de contato podem ser solicitados diretamente à agência responsável pela divulgação desta página."],
      },
      {
        heading: "2. Escopo desta política",
        paragraphs: [
          "Esta política se aplica exclusivamente a esta página de divulgação do destino e ao formulário de solicitação de cotação nela disponível. Outros sites, redes sociais, canais de terceiros e páginas de fornecedores possuem políticas próprias.",
        ],
      },
      {
        heading: "3. Dados que você fornece no formulário",
        items: [
          "Nome",
          "WhatsApp",
          "E-mail, quando informado",
          "Cidade de origem",
          "Período pretendido da viagem",
          "Quantidade de adultos e de crianças",
          "Idades das crianças, quando informadas pelo responsável",
          "Categoria de acomodação de interesse",
          "Observações que você escrever",
          "Registro do consentimento, com data e hora e a versão desta política",
        ],
      },
      {
        heading: "4. Dados técnicos de navegação",
        paragraphs: [
          "Ao acessar e enviar o formulário, podem ser registrados dados técnicos como endereço IP quando disponível, informações do navegador (user agent), URL acessada, página de origem (referrer), data e hora, parâmetros de campanha (UTMs), visualizações da página e interações relacionadas ao envio do formulário.",
        ],
      },
      {
        heading: "5. Para que usamos os dados",
        items: [
          "Responder à sua solicitação",
          "Elaborar contato e preparar cotação de viagem",
          "Organizar e registrar o atendimento",
          "Criar o seu cadastro de cliente e a oportunidade de atendimento no sistema de gestão da agência",
          "Comunicar-se com você por telefone, WhatsApp ou e-mail sobre esta solicitação",
          "Medir o desempenho da página de divulgação",
          "Prevenir fraude, abuso e envios duplicados",
          "Cumprir obrigações legais e regulatórias aplicáveis",
        ],
      },
      {
        heading: "6. Bases legais",
        paragraphs: [
          "O tratamento pode se apoiar, conforme o caso, no consentimento que você manifesta ao enviar o formulário, na execução de procedimentos preliminares relacionados ao seu pedido de cotação, no legítimo interesse para segurança, prevenção a fraude e melhoria do atendimento — sempre com avaliação adequada e respeito aos seus direitos — e no cumprimento de obrigação legal ou regulatória.",
        ],
      },
      {
        heading: "7. Com quem os dados podem ser compartilhados",
        items: [
          "Equipe autorizada da agência envolvida no atendimento",
          `Infraestrutura tecnológica da plataforma ${PLATFORM_NAME}`,
          "Provedores estritamente necessários de hospedagem, banco de dados, envio de e-mail e comunicação",
          "Autoridades públicas, quando houver exigência legal",
          "Fornecedores turísticos, apenas quando necessário para o atendimento e a cotação solicitada e de forma compatível com essa finalidade",
        ],
        paragraphs: ["Seus dados pessoais não são vendidos."],
      },
      {
        heading: "8. Armazenamento e retenção",
        paragraphs: [
          "Os dados ficam armazenados em ambiente tecnológico contratado pela plataforma e são mantidos pelo período necessário para o atendimento da solicitação, para o cumprimento de obrigações legais e para o exercício regular de direitos. Quando não houver mais necessidade ou base legal para a manutenção, os dados podem ser eliminados ou anonimizados.",
        ],
      },
      {
        heading: "9. Segurança da informação",
        paragraphs: [
          "São adotadas medidas técnicas e administrativas razoáveis para proteger os dados contra acessos não autorizados, perda e alteração indevida, incluindo controle de acesso por usuário autenticado. Nenhum ambiente digital, no entanto, pode garantir segurança absoluta.",
        ],
      },
      {
        heading: "10. Cookies e medição",
        paragraphs: [
          "Esta página utiliza armazenamento local do navegador apenas para funcionamento essencial, como identificar a sessão de visita e evitar contagem duplicada de acessos, e pode registrar parâmetros de campanha presentes na URL. Se, no futuro, forem ativadas ferramentas adicionais de medição ou publicidade, esta política será atualizada.",
        ],
      },
      {
        heading: "11. Transferência internacional",
        paragraphs: [
          "Como parte dos provedores de tecnologia pode operar servidores fora do Brasil, é possível que ocorra transferência internacional de dados. Nesses casos, aplicam-se as salvaguardas contratuais e legais cabíveis previstas na legislação brasileira de proteção de dados.",
        ],
      },
      {
        heading: "12. Dados de crianças e adolescentes",
        paragraphs: [
          "O formulário não é direcionado a crianças. As idades eventualmente informadas referem-se apenas à composição do grupo de viagem e devem ser fornecidas pelo adulto responsável, exclusivamente para permitir a correta cotação de acomodação e serviços.",
        ],
      },
      {
        heading: "13. Seus direitos como titular",
        items: [
          "Confirmação da existência de tratamento",
          "Acesso aos dados",
          "Correção de dados incompletos, inexatos ou desatualizados",
          "Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade, quando cabível",
          "Informação sobre as entidades com as quais houve compartilhamento",
          "Informação sobre a possibilidade de não fornecer consentimento e as consequências disso",
          "Revogação do consentimento",
          "Oposição a tratamento realizado com base em outra hipótese legal, quando cabível",
          "Petição à Autoridade Nacional de Proteção de Dados (ANPD)",
        ],
      },
      {
        heading: "14. Como exercer seus direitos",
        paragraphs: [
          channels.length
            ? "Você pode exercer seus direitos pelos canais de contato da agência indicados abaixo. Poderemos solicitar informações adicionais para confirmar a sua identidade antes de atender ao pedido."
            : "Você pode exercer seus direitos solicitando contato diretamente à agência responsável por esta página.",
        ],
        items: channels,
      },
      {
        heading: "15. Atualizações desta política",
        paragraphs: [
          `Esta política pode ser atualizada para refletir mudanças legais, operacionais ou tecnológicas. A versão vigente é a ${PRIVACY_POLICY_VERSION}, com última atualização em ${LEGAL_LAST_UPDATED}.`,
        ],
      },
    ],
  };
}

export function buildTermsOfUse(info: AgencyLegalInfo, productName: string): LegalDocument {
  const agency = info.name || "a agência responsável por esta página";
  const channels = legalContactLines(info);

  return {
    title: "Termos de Uso",
    version: TERMS_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED,
    intro: [
      `Estes Termos de Uso se aplicam a esta página de divulgação do ${productName}, mantida por ${agency} com a infraestrutura tecnológica da plataforma ${PLATFORM_NAME}.`,
      "Este é um texto padrão do produto e deve passar por revisão jurídica da agência antes de ser tratado como documento jurídico definitivo.",
    ],
    sections: [
      {
        heading: "1. Responsável pela página",
        items: legalIdentificationItems(info),
      },
      {
        heading: "2. Finalidade da página",
        paragraphs: [
          "Esta página tem finalidade informativa e comercial: apresentar o destino e permitir que você solicite uma cotação personalizada à agência. O conteúdo é uma apresentação geral e não substitui a proposta formal de viagem.",
        ],
      },
      {
        heading: "3. A página não confirma reserva",
        paragraphs: [
          "O envio do formulário não confirma reserva, não garante disponibilidade de datas, acomodações ou serviços e não representa contrato de viagem. Qualquer reserva depende de confirmação posterior pela agência e pelos fornecedores envolvidos.",
        ],
      },
      {
        heading: "4. Informações sujeitas a alteração",
        paragraphs: [
          "Estrutura, serviços, experiências, rotas, companhias aéreas, horários, transfers, travessias e condições operacionais podem mudar a qualquer momento por decisão dos fornecedores e devem ser confirmados no momento da cotação.",
        ],
      },
      {
        heading: "5. Preços e condições comerciais",
        paragraphs: [
          "Preços, tarifas, formas de pagamento, políticas de cancelamento e demais condições comerciais somente são válidos quando formalmente apresentados pela agência em proposta específica, com prazo de validade próprio.",
        ],
      },
      {
        heading: "6. Envio do formulário",
        paragraphs: [
          "O envio do formulário não obriga você a contratar qualquer serviço, nem obriga a agência a comercializar em condições diferentes das que vier a apresentar formalmente.",
        ],
      },
      {
        heading: "7. Responsabilidades do usuário",
        items: [
          "Fornecer informações verdadeiras, completas e atualizadas",
          "Utilizar a página de forma adequada e de boa-fé",
          "Não praticar fraude, abuso, envios automatizados em massa ou tentativa de interferência técnica na página, nos sistemas ou nos dados",
        ],
      },
      {
        heading: "8. Canais de atendimento",
        paragraphs: [
          channels.length
            ? "O atendimento pode ocorrer pelo formulário desta página, por WhatsApp e pelos demais canais informados pela agência:"
            : "O atendimento ocorre pelo formulário desta página e pelos canais informados pela agência.",
        ],
        items: channels,
      },
      {
        heading: "9. Links e serviços de terceiros",
        paragraphs: [
          "A página pode conter links ou direcionamentos para serviços de terceiros, como aplicativos de mensagem e sites de fornecedores. O uso desses serviços é regido pelas condições e políticas dos respectivos responsáveis.",
        ],
      },
      {
        heading: "10. Propriedade intelectual",
        paragraphs: [
          `O layout, os textos e a organização desta página são protegidos e não podem ser reproduzidos sem autorização. As marcas, nomes, imagens e materiais do ${productName} e dos demais fornecedores pertencem aos seus respectivos titulares e são utilizados apenas para fins de divulgação do destino.`,
        ],
      },
      {
        heading: "11. Limitação de responsabilidade",
        paragraphs: [
          "A agência atua com diligência nas informações divulgadas, mas não responde por indisponibilidades técnicas momentâneas, por alterações promovidas por fornecedores ou por informações desatualizadas divulgadas por terceiros. Nada nestes termos afasta os direitos assegurados ao consumidor pelo Código de Defesa do Consumidor e pela legislação aplicável.",
        ],
      },
      {
        heading: "12. Privacidade",
        paragraphs: [
          "O tratamento de dados pessoais realizado nesta página é descrito na Política de Privacidade, que integra estes Termos de Uso.",
        ],
      },
      {
        heading: "13. Alterações destes termos",
        paragraphs: [
          `Estes termos podem ser atualizados a qualquer momento. A versão vigente é a ${TERMS_VERSION}, com última atualização em ${LEGAL_LAST_UPDATED}.`,
        ],
      },
      {
        heading: "14. Legislação aplicável e solução de conflitos",
        paragraphs: [
          "Estes termos são regidos pela legislação brasileira. Eventuais questões serão preferencialmente resolvidas de forma amigável pelos canais de atendimento da agência e, se necessário, pelo foro legalmente competente, preservados os direitos do consumidor, inclusive o de demandar no foro de seu domicílio quando aplicável.",
        ],
      },
    ],
  };
}
