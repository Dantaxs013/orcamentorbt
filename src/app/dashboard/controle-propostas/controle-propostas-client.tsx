'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Proposal, ProposalStatus, PROPOSAL_GROUPS_ORDER } from '@/lib/proposals-types';
import { INITIAL_PROPOSALS } from '@/lib/initialData';
import { BoardHeader } from '@/components/controle-propostas/board/BoardHeader';
import { BoardGroup } from '@/components/controle-propostas/board/BoardGroup';
import { NewProposalModal } from '@/components/controle-propostas/modals/NewProposalModal';
import { RevisionHistoryModal } from '@/components/controle-propostas/modals/RevisionHistoryModal';
import { EditProposalModal } from '@/components/controle-propostas/modals/EditProposalModal';
import { ProposalReportModal } from '@/components/controle-propostas/modals/ProposalReportModal';
import { CalendarSyncModal } from '@/components/controle-propostas/modals/CalendarSyncModal';
import { ReportsPage } from '@/components/controle-propostas/reports/ReportsPage';
import { BarChart2, LayoutDashboard, PlusCircle, RefreshCw } from 'lucide-react';

interface ControlePropostasClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function ControlePropostasClient({ user }: ControlePropostasClientProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'relatorios' ? 'relatorios' : 'board';
  const [activeTab, setActiveTab] = useState<'board' | 'relatorios'>(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'relatorios') {
      setActiveTab('relatorios');
    } else if (tab === 'board') {
      setActiveTab('board');
    }
  }, [searchParams]);
  const [proposals, setProposals] = useState<Proposal[]>(INITIAL_PROPOSALS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTechLead, setSelectedTechLead] = useState('ALL');
  const [selectedCommLead, setSelectedCommLead] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [targetGroupForNew, setTargetGroupForNew] = useState<ProposalStatus>('NEW');
  const [historyModalProposal, setHistoryModalProposal] = useState<Proposal | null>(null);
  const [isEditModeModal, setIsEditModeModal] = useState(false);
  const [editModalProposal, setEditModalProposal] = useState<Proposal | null>(null);

  // Carregar propostas da API / Banco
  const loadProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/proposals');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProposals(data);
        }
      }
    } catch (err) {
      console.warn('API Load fallback to local initial proposals:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  // Listas de responsáveis para os filtros
  const techLeadsList = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach((p) => {
      if (p.techLead) set.add(p.techLead);
    });
    return Array.from(set);
  }, [proposals]);

  const commLeadsList = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach((p) => {
      if (p.commLead) set.add(p.commLead);
    });
    return Array.from(set);
  }, [proposals]);

  // Filtragem de propostas
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = p.code.toLowerCase().includes(q);
        const matchClient = p.clientName.toLowerCase().includes(q);
        const matchReq = p.requesterName.toLowerCase().includes(q);
        const matchTech = p.techLead.toLowerCase().includes(q);
        const matchComm = p.commLead.toLowerCase().includes(q);
        if (!matchCode && !matchClient && !matchReq && !matchTech && !matchComm) {
          return false;
        }
      }

      if (selectedTechLead !== 'ALL' && p.techLead !== selectedTechLead) {
        return false;
      }

      if (selectedCommLead !== 'ALL' && p.commLead !== selectedCommLead) {
        return false;
      }

      if (selectedStatusFilter !== 'ALL' && p.status !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [proposals, searchQuery, selectedTechLead, selectedCommLead, selectedStatusFilter]);

  const totalFilteredValue = useMemo(() => {
    return filteredProposals.reduce((sum, p) => sum + (p.value || 0), 0);
  }, [filteredProposals]);

  const handleUpdateProposal = useCallback(
    async (id: string | number, fieldOrData: keyof Proposal | Partial<Proposal>, value?: any) => {
      setIsSaving(true);
      const updates = typeof fieldOrData === 'object' ? fieldOrData : { [fieldOrData]: value };

      setProposals((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
        )
      );

      try {
        await fetch(`/api/proposals/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (e) {
        console.warn('Persist error:', e);
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    },
    []
  );

  const handleDeleteProposal = useCallback(async (id: string | number) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/proposals/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Delete error:', e);
    }
  }, []);

  const handleCreateRevision = useCallback(
    async (id: string | number) => {
      const found = proposals.find((p) => p.id === id);
      if (!found) return;

      const currentRev = found.revision || 0;
      const nextRev = currentRev + 1;

      setProposals((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                revision: nextRev,
                status: 'IN_REVISION',
                revisions: [
                  ...((item.revisions as any[]) || []),
                  {
                    id: Date.now(),
                    proposalId: id,
                    revisionNumber: currentRev,
                    createdBy: item.techLead || 'Engenharia RBT Fundações',
                    createdAt: new Date().toISOString(),
                    notes: `Versão R${currentRev} arquivada no histórico.`,
                    snapshot: { ...item },
                  },
                ],
              }
            : item
        )
      );

      try {
        await fetch(`/api/proposals/${id}/revision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposal: found,
            createdBy: found.techLead || 'Engenharia RBT Fundações',
            notes: `Versão R${currentRev} arquivada no histórico.`,
          }),
        });
      } catch (e) {
        console.warn('Erro ao salvar histórico da revisão:', e);
      }
    },
    [proposals]
  );

  const handleCreateNewProposalSubmit = useCallback(async (newPropData: any) => {
    setIsSaving(true);
    const tempId = `prop-${Date.now()}`;
    const fullProp: Proposal = {
      id: tempId,
      ...newPropData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProposals((prev) => [fullProp, ...prev]);

    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPropData),
      });

      if (res.ok) {
        const created = await res.json();
        setProposals((prev) => prev.map((p) => (p.id === tempId ? created : p)));
      }
    } catch (e) {
      console.warn('API create error:', e);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header com estilo RBT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-900 border border-slate-200">
              RBT Fundações
            </span>
            <span className="text-xs text-slate-400 font-mono">Controle de Propostas Comerciais</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Controle de Propostas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gestão de propostas, prazos, revisões e responsáveis técnicos no formato clássico RBT.
          </p>
        </div>

        {/* Abas e Ações */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'board'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Quadro</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('relatorios')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'relatorios'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Relatórios</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadProposals}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-slate-900' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setTargetGroupForNew('NEW');
              setIsNewModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#BA1A1A] hover:bg-[#991B1B] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-red-950/20 transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova Proposta</span>
          </button>
        </div>
      </div>

      {activeTab === 'relatorios' ? (
        <ReportsPage proposals={proposals} />
      ) : (
        <div className="space-y-4">
          {/* Top Board Filter & Control Header */}
          <BoardHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTechLead={selectedTechLead}
            onTechLeadChange={setSelectedTechLead}
            selectedCommLead={selectedCommLead}
            onCommLeadChange={setSelectedCommLead}
            selectedStatusFilter={selectedStatusFilter}
            onStatusFilterChange={setSelectedStatusFilter}
            techLeadsList={techLeadsList}
            commLeadsList={commLeadsList}
            totalValue={totalFilteredValue}
            totalCount={filteredProposals.length}
            isSaving={isSaving}
            onNewProposal={() => {
              setTargetGroupForNew('NEW');
              setIsNewModalOpen(true);
            }}
            onOpenReport={() => setIsReportModalOpen(true)}
            onSyncCalendar={() => setIsCalendarSyncOpen(true)}
          />

          {/* Groups Board Container */}
          <div className="space-y-4">
            {PROPOSAL_GROUPS_ORDER.map((groupStatus) => {
              if (selectedStatusFilter !== 'ALL' && selectedStatusFilter !== groupStatus) {
                return null;
              }

              const groupProposals = filteredProposals.filter((p) => p.status === groupStatus);

              return (
                <BoardGroup
                  key={groupStatus}
                  statusKey={groupStatus}
                  proposals={groupProposals}
                  onUpdateProposal={handleUpdateProposal}
                  onDeleteProposal={handleDeleteProposal}
                  onCreateRevision={handleCreateRevision}
                  onViewHistory={(proposal) => {
                    setHistoryModalProposal(proposal);
                    setIsEditModeModal(false);
                  }}
                  onEditProposal={(proposal) => {
                    setHistoryModalProposal(proposal);
                    setIsEditModeModal(true);
                  }}
                  onAddProposalToGroup={(st) => {
                    setTargetGroupForNew(st);
                    setIsNewModalOpen(true);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <CalendarSyncModal
        proposals={proposals}
        isOpen={isCalendarSyncOpen}
        onClose={() => setIsCalendarSyncOpen(false)}
        techLeads={techLeadsList}
        commLeads={commLeadsList}
      />

      <NewProposalModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateNewProposalSubmit}
        initialStatus={targetGroupForNew}
      />

      <RevisionHistoryModal
        proposal={historyModalProposal}
        isOpen={Boolean(historyModalProposal)}
        onClose={() => setHistoryModalProposal(null)}
        onUpdateProposal={handleUpdateProposal}
        startInEditMode={isEditModeModal}
      />

      <EditProposalModal
        proposal={editModalProposal}
        isOpen={Boolean(editModalProposal)}
        onClose={() => setEditModalProposal(null)}
        onSave={(data) => {
          if (editModalProposal) {
            Object.entries(data).forEach(([key, val]) => {
              handleUpdateProposal(editModalProposal.id, key as any, val);
            });
          }
        }}
      />

      <ProposalReportModal
        proposals={proposals}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
