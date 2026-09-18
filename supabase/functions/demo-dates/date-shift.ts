/**
 * Datas relativas do cenário demonstrativo.
 *
 * A implementação vive em `../_shared/dateShift.ts` porque é COMPARTILHADA com o
 * provisionamento da carga canônica (`demo-canonical-load`): o mecanismo de
 * deslocamento é único, sem segunda versão concorrente. Este arquivo permanece
 * como ponto de entrada estável da função e dos testes já existentes.
 */
export * from "../_shared/dateShift.ts";
