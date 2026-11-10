export const agencySiteHref = (path: string) => path;
export const agencyContextHref = (path: string) => path.startsWith('/cruzeiros/') ? `/preview/navios/?navio=${path.split('/').pop()}` : '/preview/navios/?temporada=1';
