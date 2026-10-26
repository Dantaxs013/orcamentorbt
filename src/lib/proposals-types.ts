export type ProposalStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'SENT'
  | 'WON'
  | 'DECLINED'
  | 'LOST'
  | 'IN_REVISION'
  | 'HISTORY';

export interface DocChecklistItem {
  id: string;
  label: string;
  received: boolean;
  fileUrl?: string;
  updatedAt?: string;
}

export interface Proposal {
  id: string | number;
  code: string;
  status: ProposalStatus;
  groupOrder?: number;
  
  clientName: string;
  requesterName: string;
  requesterEmail: string;
  requesterEmails?: string[];
  
  deliveryDate: string; // ISO date string (YYYY-MM-DD)
  serviceStartDate: string | null;
  contractEndDate: string | null;
  
  techLead: string;
  commLead: string;
  value: number;
  
  revision: number;
  docsReceived: DocChecklistItem[];
  sharepointUrl?: string;
  
  // Escopo do Projeto & Observações
  projectArea?: string;
  quantidade?: number;
  unidadeMedida?: string;
  projectType?: string;
  observations?: string;
  
  createdAt?: string;
  updatedAt?: string;
  revisions?: any[];
}

export interface ProposalRevision {
  id: string | number;
  proposalId: string | number;
  revisionNumber: number;
  snapshot: Proposal;
  createdBy: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string | number;
  proposalId: string | number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  createdAt: string;
}

export interface StatusConfig {
  key: ProposalStatus;
  label: string;
  badgeBg: string;
  badgeText: string;
  borderAccent: string;
  groupHeaderBg: string;
  description: string;
}

export const STATUS_CONFIGS: Record<ProposalStatus, StatusConfig> = {
  NEW: {
    key: 'NEW',
    label: 'Novas Propostas',
    badgeBg: 'bg-blue-600 text-white shadow-xs',
    badgeText: 'text-white',
    borderAccent: 'border-l-[#111827]',
    groupHeaderBg: 'bg-[#111827] text-white border-slate-800',
    description: 'Propostas recentemente recebidas em triagem inicial',
  },
  IN_PROGRESS: {
    key: 'IN_PROGRESS',
    label: 'Em Elaboração',
    badgeBg: 'bg-amber-500 text-white shadow-xs',
    badgeText: 'text-white',
    borderAccent: 'border-l-[#111827]',
    groupHeaderBg: 'bg-[#111827] text-white border-slate-800',
    description: 'Em levantamento técnico e orçamentação',
  },
  SENT: {
    key: 'SENT',
    label: 'Enviadas',
    badgeBg: 'bg-purple-600 text-white shadow-xs',
    badgeText: 'text-white',
    borderAccent: 'border-l-[#111827]',
    groupHeaderBg: 'bg-[#111827] text-white border-slate-800',
    description: 'Submetidas ao cliente para negociação comercial',
  },
  WON: {
    key: 'WON',
    label: 'Propostas Ganhas',
    badgeBg: 'bg-emerald-600 text-white shadow-xs',
    badgeText: 'text-white',
    borderAccent: 'border-l-[#111827]',
    groupHeaderBg: 'bg-[#111827] text-white border-slate-800',
    description: 'Aprovadas e prontas para execução contratual',
  },
  DECLINED: {
    key: 'DECLINED',
    label: 'Declinadas',
    badgeBg: 'bg-rose-600 text-white shadow-xs',
    badgeText: 'text-white',
    borderAccent: 'border-l-[#111827]',
    groupHeaderBg: 'bg-[#111827] text-white border-slate-800',
    description: 'Não aprovadas ou declinadas comercialmente',
  },
  LOST: {
    key: 'LOST',
    label: 'Propostas Perdidas',
    badgeBg: 'bg-slate-500 text-white shadow-xs',
    badgeText: 'text-white',
    borderAccent: 'border-l-[#111827]',
    groupHeaderBg: 'bg-[#111827] text-white border-slate-800',
    description: 'Propostas perdidas para a concorrência ou canceladas',
  },
  IN_REVISION: {
    key: 'IN_REVISION',
    label: 'Em Revisão',
    badgeBg: 'bg-orange-600 text-white shadow-xs',
    badgeText: 'text-white',
    borderAccent: 'border-l-[#111827]',
    groupHeaderBg: 'bg-[#111827] text-white border-slate-800',
    description: 'Ajuste de escopo, preços ou cronograma',
  },
  HISTORY: {
    key: 'HISTORY',
    label: 'Histórico',
    badgeBg: 'bg-slate-700 text-white shadow-xs',
    badgeText: 'text-white',
    borderAccent: 'border-l-[#111827]',
    groupHeaderBg: 'bg-[#111827] text-white border-slate-800',
    description: 'Propostas finalizadas e arquivadas',
  },
};

export const PROPOSAL_GROUPS_ORDER: ProposalStatus[] = [
  'NEW',
  'IN_PROGRESS',
  'SENT',
  'WON',
  'DECLINED',
  'LOST',
  'IN_REVISION',
];

export const DEFAULT_CHECKLIST_ITEMS: Omit<DocChecklistItem, 'received'>[] = [
  { id: 'memorial', label: 'Memorial Descritivo' },
  { id: 'orcamento', label: 'Planilha Orçamentária' },
  { id: 'cronograma', label: 'Cronograma Físico-Financeiro' },
  { id: 'art', label: 'ART / RRT Técnica' },
  { id: 'minuta', label: 'Minuta de Contrato' },
];
