export const Role = {
  APONTADOR: 'APONTADOR',
  ENGENHEIRO: 'ENGENHEIRO',
  ADMINISTRADOR: 'ADMINISTRADOR',
  ADMIN: 'ADMIN',
  ORCAMENTISTA: 'ORCAMENTISTA',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const StatusRelatorio = {
  RASCUNHO: 'RASCUNHO',
  SUBMETIDO: 'SUBMETIDO',
  APROVADO: 'APROVADO',
  REJEITADO: 'REJEITADO',
} as const;
export type StatusRelatorio = (typeof StatusRelatorio)[keyof typeof StatusRelatorio];

export const StatusMedicao = {
  EM_ELABORACAO: 'EM_ELABORACAO',
  SUBMETIDA_GESTAO: 'SUBMETIDA_GESTAO',
  APROVADA: 'APROVADA',
  FATURADA: 'FATURADA',
} as const;
export type StatusMedicao = (typeof StatusMedicao)[keyof typeof StatusMedicao];

export const StatusContrato = {
  ATIVO: 'ATIVO',
  PAUSADO: 'PAUSADO',
  FINALIZADO: 'FINALIZADO',
} as const;
export type StatusContrato = (typeof StatusContrato)[keyof typeof StatusContrato];

export const CondicaoClimatica = {
  BOM_SOL: 'BOM_SOL',
  NUBLADO: 'NUBLADO',
  CHUVA_LEVE: 'CHUVA_LEVE',
  CHUVA_FORTE: 'CHUVA_FORTE',
  IMPRACTICAVEL: 'IMPRACTICAVEL',
} as const;
export type CondicaoClimatica = (typeof CondicaoClimatica)[keyof typeof CondicaoClimatica];

export const TipoEmenda = {
  NENHUMA: 'NENHUMA',
  W150: 'W150',
  W310: 'W310',
  OUTRA: 'OUTRA',
} as const;
export type TipoEmenda = (typeof TipoEmenda)[keyof typeof TipoEmenda];

export const TipoNotificacao = {
  RELATORIO_SUBMETIDO: 'RELATORIO_SUBMETIDO',
  RELATORIO_APROVADO: 'RELATORIO_APROVADO',
  RELATORIO_REJEITADO: 'RELATORIO_REJEITADO',
  MEDICAO_SUBMETIDA: 'MEDICAO_SUBMETIDA',
  MEDICAO_APROVADA: 'MEDICAO_APROVADA',
  ALERTA_SISTEMA: 'ALERTA_SISTEMA',
} as const;
export type TipoNotificacao = (typeof TipoNotificacao)[keyof typeof TipoNotificacao];
