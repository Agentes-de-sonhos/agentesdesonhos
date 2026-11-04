/**
 * Páginas Disney (/disney e /disney/hoteis/:slug) liberadas para todas as agências white-label,
 * em domínio real e em prévia. Conteúdo pessoal da Ju fica restrito ao perfil dela no configurador.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isDisneyPreviewRouteEnabled(_agencyHostname: string, _browserHostname?: string): boolean {
  return true;
}
