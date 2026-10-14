'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Building,
  Mail,
  Phone,
  Calendar,
  FileText,
  DollarSign,
  Download,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  Shield,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { formatCurrencyBRL, maskCurrencyKeystroke, formatPhoneBR } from '@/lib/masks';
import { useToast } from '@/components/ui/toast-provider';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface UsuarioDisponivel {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Props {
  orcamento: any;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  usuariosDisponiveis?: UsuarioDisponivel[];
}

export function DetalhesOrcamentoClient({
  orcamento,
  currentUser,
  usuariosDisponiveis = [],
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Atribuição de Orçamentista
  const [orcamentistaId, setOrcamentistaId] = useState<string>(
    orcamento.orcamentistaId || ''
  );
  const [updatingOrcamentista, setUpdatingOrcamentista] = useState(false);

  const handleAtualizarOrcamentista = async (novoId: string) => {
    setUpdatingOrcamentista(true);
    try {
      const res = await fetch(`/api/orcamentos/${orcamento.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orcamentistaId: novoId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Erro ao Atribuir', data.error || 'Não foi possível definir o responsável.');
        return;
      }
      setOrcamentistaId(novoId);
      toast.success(
        'Responsável Atualizado!',
        novoId
          ? 'Orçamentista atribuído com sucesso à solicitação.'
          : 'Solicitação desvinculada de responsável técnico.'
      );
      router.refresh();
    } catch {
      toast.error('Erro de Conexão', 'Não foi possível salvar a alteração.');
    } finally {
      setUpdatingOrcamentista(false);
    }
  };

  // Proposta Form
  const existingProp = orcamento.propostaComercial;
  const [custoMaoDeObra, setCustoMaoDeObra] = useState<number>(
    existingProp ? Number(existingProp.custoMaoDeObra) : 0
  );
  const [custoMateriais, setCustoMateriais] = useState<number>(
    existingProp ? Number(existingProp.custoMateriais) : 0
  );
  const [custosExtras, setCustosExtras] = useState<number>(
    existingProp ? Number(existingProp.custosExtras) : 0
  );

  // Masked values for real-time currency display
  const [custoMaoDeObraMasked, setCustoMaoDeObraMasked] = useState<string>(
    formatCurrencyBRL(existingProp ? Number(existingProp.custoMaoDeObra) : 0)
  );
  const [custoMateriaisMasked, setCustoMateriaisMasked] = useState<string>(
    formatCurrencyBRL(existingProp ? Number(existingProp.custoMateriais) : 0)
  );
  const [custosExtrasMasked, setCustosExtrasMasked] = useState<string>(
    formatCurrencyBRL(existingProp ? Number(existingProp.custosExtras) : 0)
  );

  const [bdiMargemPerc, setBdiMargemPerc] = useState<number>(
    existingProp ? Number(existingProp.bdiMargemPerc) : 15
  );
  const [condicoesPagamento, setCondicoesPagamento] = useState<string>(
    existingProp?.condicoesPagamento || '30% de entrada + saldo em 30/60 dias após entrega técnica'
  );
  const [prazoExecucaoDias, setPrazoExecucaoDias] = useState<number>(
    existingProp ? existingProp.prazoExecucaoDias : 15
  );
  const [validadePropostaDias, setValidadePropostaDias] = useState<number>(
    existingProp ? existingProp.validadePropostaDias : 10
  );
  const [observacoes, setObservacoes] = useState<string>(
    existingProp?.observacoes || ''
  );

  // Status changer & modals
  const [currentStatus, setCurrentStatus] = useState(orcamento.status);
  const [showSendProposalModal, setShowSendProposalModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusMotivo, setStatusMotivo] = useState('');

  const handleExcluirOrcamento = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/orcamentos/${orcamento.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error('Erro ao Excluir', data.error || 'Não foi possível excluir o orçamento.');
        setDeleting(false);
        return;
      }

      toast.success('Orçamento Excluído', `Protocolo ${orcamento.numeroProtocolo} foi excluído permanentemente.`);
      router.push('/dashboard');
    } catch {
      toast.error('Erro de Conexão', 'Falha ao comunicar com o servidor.');
      setDeleting(false);
    }
  };

  // Live calculation
  const subtotalCustos = (Number(custoMaoDeObra) || 0) + (Number(custoMateriais) || 0) + (Number(custosExtras) || 0);
  const valorMargem = subtotalCustos * ((Number(bdiMargemPerc) || 0) / 100);
  const valorTotalCalculado = subtotalCustos + valorMargem;

  // Mask handlers
  const handleCustoMaoDeObraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { masked, numericValue } = maskCurrencyKeystroke(e.target.value);
    setCustoMaoDeObraMasked(masked);
    setCustoMaoDeObra(numericValue);
  };

  const handleCustoMateriaisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { masked, numericValue } = maskCurrencyKeystroke(e.target.value);
    setCustoMateriaisMasked(masked);
    setCustoMateriais(numericValue);
  };

  const handleCustosExtrasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { masked, numericValue } = maskCurrencyKeystroke(e.target.value);
    setCustosExtrasMasked(masked);
    setCustosExtras(numericValue);
  };

  const handleSalvarProposta = async (enviarEmail: boolean) => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload = {
        custoMaoDeObra,
        custoMateriais,
        custosExtras,
        bdiMargemPerc,
        valorTotal: valorTotalCalculado,
        condicoesPagamento,
        prazoExecucaoDias,
        validadePropostaDias,
        observacoes,
        enviarEmailCliente: enviarEmail,
      };

      const res = await fetch(`/api/orcamentos/${orcamento.id}/proposta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const err = data.error || 'Erro ao salvar proposta comercial.';
        setErrorMsg(err);
        toast.error('Erro na Proposta', err);
        setLoading(false);
        return;
      }

      setSuccessMsg(data.message);
      if (enviarEmail) {
        setCurrentStatus('PROPOSTA_ENVIADA');
        toast.success(
          'Proposta Enviada com Sucesso!',
          `PDF gerado e enviado por e-mail para ${orcamento.lead.email}.`
        );
      } else {
        toast.success('Rascunho Salvo!', 'Os valores da proposta foram atualizados com sucesso.');
      }
      router.refresh();
    } catch {
      const err = 'Erro de conexão ao processar proposta.';
      setErrorMsg(err);
      toast.error('Erro de Conexão', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMudarStatus = async (novoStatus: string, motivo?: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/orcamentos/${orcamento.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus, motivo }),
      });

      const data = await res.json();

      if (!res.ok) {
        const err = data.error || 'Erro ao atualizar status.';
        setErrorMsg(err);
        toast.error('Erro ao Atualizar Status', err);
        setLoading(false);
        return;
      }

      setCurrentStatus(novoStatus);
      const msg = `Status atualizado com sucesso para ${novoStatus.replace(/_/g, ' ')}.`;
      setSuccessMsg(msg);
      toast.success('Status Atualizado', msg);
      router.refresh();
    } catch {
      const err = 'Erro ao atualizar status.';
      setErrorMsg(err);
      toast.error('Erro de Conexão', err);
    } finally {
      setLoading(false);
    }
  };

  const onSelectStatusChange = (novoStatus: string) => {
    if (novoStatus === currentStatus) return;
    if (novoStatus === 'REJEITADO' || novoStatus === 'APROVADO') {
      setPendingStatus(novoStatus);
      setStatusMotivo('');
      setShowStatusModal(true);
    } else {
      handleMudarStatus(novoStatus);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#BA1A1A] bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-lg">
                {orcamento.numeroProtocolo}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {new Date(orcamento.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {orcamento.lead.nome}
              {orcamento.lead.empresa && (
                <span className="text-slate-500 font-normal"> · {orcamento.lead.empresa}</span>
              )}
            </h1>
          </div>
        </div>

        {/* Quick Status Pill & Manual Action */}
        <div className="flex items-center gap-2">
          <select
            value={pendingStatus || currentStatus}
            onChange={(e) => onSelectStatusChange(e.target.value)}
            disabled={loading || deleting}
            className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
          >
            <option value="AGUARDANDO_CLIENTE">Aguardando Cliente</option>
            <option value="AGUARDANDO_ANALISE">Aguardando Análise</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="PROPOSTA_ENVIADA">Proposta Enviada</option>
            <option value="APROVADO">Aprovado</option>
            <option value="REJEITADO">Rejeitado</option>
          </select>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={loading || deleting}
            className="px-3 py-2 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            title="Excluir este orçamento"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span className="hidden sm:inline">Excluir</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2-Column Grid: Left (Client Info & Answers) / Right (Pricing Calculator) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Lead Information */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <User className="w-3.5 h-3.5 text-slate-600" />
              <span>Dados do Solicitante</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nome:</span>
                <span className="font-semibold text-slate-800">{orcamento.lead.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">E-mail:</span>
                <span className="font-semibold text-slate-800">{orcamento.lead.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Telefone:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {orcamento.lead.telefone ? formatPhoneBR(orcamento.lead.telefone) : 'Não informado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Empresa:</span>
                <span className="font-semibold text-slate-800">
                  {orcamento.lead.empresa || 'Não informada'}
                </span>
              </div>

              {orcamento.lead.mensagemInicial && (
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <span className="text-slate-500 block mb-1">Mensagem Inicial recebida:</span>
                  <p className="bg-slate-50 p-2.5 rounded-lg text-slate-700 leading-relaxed font-mono text-[11px]">
                    {orcamento.lead.mensagemInicial}
                  </p>
                </div>
              )}
            </div>

            {/* Magic Link Info */}
            {orcamento.magicLink && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Status do Magic Link:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      orcamento.magicLink.used
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {orcamento.magicLink.used ? 'Preenchido' : 'Pendente de Resposta'}
                  </span>
                </div>
                {!orcamento.magicLink.used && (
                  <div className="mt-2">
                    <a
                      href={`/formulario/${orcamento.magicLink.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#BA1A1A] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir link do cliente no navegador</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Card: Responsável Técnico da RBT (Orçamentista / Gestor) */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-slate-600 font-bold flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5 text-[#BA1A1A]" />
                  <span>Orçamentista Responsável:</span>
                </span>
                {updatingOrcamentista && (
                  <span className="text-[10px] text-slate-400 animate-pulse font-medium">
                    Salvando...
                  </span>
                )}
              </div>

              <select
                value={orcamentistaId}
                onChange={(e) => handleAtualizarOrcamentista(e.target.value)}
                disabled={updatingOrcamentista}
                className="w-full p-2 bg-slate-50 hover:bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#BA1A1A] transition cursor-pointer"
              >
                <option value="">Não atribuído (Pendente de Orçamentista)</option>
                {usuariosDisponiveis.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.role === 'ADMIN' ? 'Gestor' : 'Orçamentista'}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Define qual engenheiro ou gestor da RBT é o titular desta proposta.
              </p>
            </div>
          </div>

          {/* Card 2: Respostas do Formulário Técnico */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Respostas do Formulário Técnico</span>
            </h3>

            {orcamento.respostaFormulario ? (
              <div className="space-y-3.5 text-xs">
                {/* 1. Contratação e Prazos */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    1. Contratação & Cronograma
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Natureza da Obra:</span>
                    <span className="font-bold text-slate-900">{orcamento.respostaFormulario.naturezaContratacao}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Previsão de Início:</span>
                    <span className="font-bold text-slate-900">{orcamento.respostaFormulario.previsaoInicio}</span>
                  </div>
                  {orcamento.respostaFormulario.dataLimiteConcorrencia && (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="text-red-700 font-semibold">Prazo da Concorrência:</span>
                      <span className="font-mono font-bold text-red-900">{orcamento.respostaFormulario.dataLimiteConcorrencia}</span>
                    </div>
                  )}
                </div>

                {/* 2. Sondagens Geotécnicas */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    2. Sondagem de Solo (SPT)
                  </span>
                  <p className="font-semibold text-slate-800">{orcamento.respostaFormulario.sondagensStatus}</p>
                  {orcamento.respostaFormulario.sondagensArquivoUrl && (
                    <a
                      href={orcamento.respostaFormulario.sondagensArquivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#BA1A1A] font-bold hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Visualizar Laudo de Sondagem Anexo</span>
                    </a>
                  )}
                </div>

                {/* 3. Projetos Técnicos */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    3. Projetos de Engenharia
                  </span>
                  <p className="font-semibold text-slate-800">{orcamento.respostaFormulario.projetosStatus}</p>
                  {orcamento.respostaFormulario.projetosArquivoUrl && (
                    <a
                      href={orcamento.respostaFormulario.projetosArquivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#BA1A1A] font-bold hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Pasta de Projetos / Plantas</span>
                    </a>
                  )}
                </div>

                {/* 4. Quantitativos de Fundações */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    4. Quantitativos e Tipo de Estaca
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase">Tipo de Fundação</span>
                      <span className="font-bold text-slate-800">{orcamento.respostaFormulario.tipoFundacao}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase">Quantidade</span>
                      <span className="font-bold text-slate-800">{orcamento.respostaFormulario.quantidadeEstacas} un</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase">Profundidade Média</span>
                      <span className="font-bold text-slate-800">{orcamento.respostaFormulario.profundidadeMedia || '-'} m</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase">Metragem Total</span>
                      <span className="font-bold text-slate-800 font-mono text-[#BA1A1A]">{orcamento.respostaFormulario.metragemTotalEstimada || '-'} m</span>
                    </div>
                  </div>

                  {orcamento.respostaFormulario.ensaiosRequeridos && (
                    <div className="pt-1 text-[11px]">
                      <span className="text-slate-500 font-medium">Ensaios: </span>
                      <span className="font-semibold text-slate-800">{orcamento.respostaFormulario.ensaiosRequeridos}</span>
                    </div>
                  )}

                  {orcamento.respostaFormulario.observacoes && (
                    <div className="pt-1 text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Observações de Campo</span>
                      <p className="text-slate-700 mt-0.5">{orcamento.respostaFormulario.observacoes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                O cliente ainda não preencheu o formulário técnico.
              </div>
            )}
          </div>

          {/* Card 3: Histórico de Auditoria */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <History className="w-3.5 h-3.5 text-slate-600" />
              <span>Trilha de Auditoria (Status Logs)</span>
            </h3>

            <div className="space-y-3">
              {orcamento.logs.map((log: any) => (
                <div key={log.id} className="text-xs border-l-2 border-[#BA1A1A] pl-3 py-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{log.statusNovo}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {log.motivo && <p className="text-slate-600 mt-0.5">{log.motivo}</p>}
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Autor: {log.usuarioNome || 'Sistema'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Proposal Generator (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-[#111827] text-white p-5 border-b-2 border-[#BA1A1A]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold">Calculadora de Custos & Proposta Comercial</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Precificação técnica oficial da RBT Fundações & Engenharia
                  </p>
                </div>
                {existingProp && (
                  <a
                    href={`/api/orcamentos/${orcamento.id}/proposta`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-red-400" />
                    <span>Baixar PDF Atual</span>
                  </a>
                )}
              </div>
            </div>

            {/* Pricing Form */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Custo Mão de Obra (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={custoMaoDeObraMasked}
                    onChange={handleCustoMaoDeObraChange}
                    placeholder="R$ 0,00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Custo Materiais (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={custoMateriaisMasked}
                    onChange={handleCustoMateriaisChange}
                    placeholder="R$ 0,00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Custos Extras / Frete (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={custosExtrasMasked}
                    onChange={handleCustosExtrasChange}
                    placeholder="R$ 0,00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              {/* BDI & Deadlines */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    BDI / Margem (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={bdiMargemPerc}
                    onChange={(e) => setBdiMargemPerc(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Prazo de Execução (dias)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={prazoExecucaoDias}
                    onChange={(e) => setPrazoExecucaoDias(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Validade da Proposta (dias)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={validadePropostaDias}
                    onChange={(e) => setValidadePropostaDias(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Condições de Pagamento
                </label>
                <input
                  type="text"
                  value={condicoesPagamento}
                  onChange={(e) => setCondicoesPagamento(e.target.value)}
                  placeholder="Ex: 50% de sinal e 50% contra entrega do laudo técnico"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Observações Técnicas / Resalvas Comerciais
                </label>
                <textarea
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações que constarão no corpo do PDF..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>

              {/* Total Calculation Display Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 border-2 border-[#BA1A1A] space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Subtotal Custos Diretos:</span>
                  <span className="font-mono text-slate-200">
                    {formatCurrencyBRL(subtotalCustos)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Margem BDI ({bdiMargemPerc}%):</span>
                  <span className="font-mono text-slate-200">
                    {formatCurrencyBRL(valorMargem)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <span className="text-sm font-bold uppercase text-white">Valor Final da Proposta:</span>
                  <span className="text-2xl font-black text-[#BA1A1A] font-mono">
                    {formatCurrencyBRL(valorTotalCalculado)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSalvarProposta(false)}
                  className="w-full sm:w-1/2 py-3.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Salvar Rascunho</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowSendProposalModal(true)}
                  className="w-full sm:w-1/2 py-3.5 px-4 bg-[#BA1A1A] hover:bg-[#991B1B] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-red-950/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Gerar PDF & Enviar por E-mail</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação: Envio de Proposta por E-mail */}
      <ConfirmModal
        isOpen={showSendProposalModal}
        title="Confirmar Envio da Proposta Comercial?"
        description="Você está prestes a gerar a versão final em PDF do orçamento e dispará-la com anexo oficial diretamente por e-mail para o cliente."
        confirmLabel="Confirmar & Enviar E-mail"
        cancelLabel="Voltar e Revisar"
        variant="danger"
        isLoading={loading}
        onConfirm={async () => {
          await handleSalvarProposta(true);
          setShowSendProposalModal(false);
        }}
        onCancel={() => setShowSendProposalModal(false)}
      >
        <div className="space-y-2.5">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-700">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-500">Destinatário:</span>
              <span className="font-bold text-slate-900">{orcamento.lead.nome} ({orcamento.lead.email})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500">Subtotal Custos:</span>
              <span className="font-mono text-slate-700">{formatCurrencyBRL(subtotalCustos)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500">Margem BDI ({bdiMargemPerc}%):</span>
              <span className="font-mono text-slate-700">{formatCurrencyBRL(valorMargem)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-bold uppercase text-slate-800">Valor Total Oficial:</span>
              <span className="font-black text-base text-[#BA1A1A] font-mono">{formatCurrencyBRL(valorTotalCalculado)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
              <span>Prazo de Execução: <strong>{prazoExecucaoDias} dias</strong></span>
              <span>Validade: <strong>{validadePropostaDias} dias</strong></span>
            </div>
          </div>
          <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-snug">
            Nota: Ao confirmar, o PDF oficial será renderizado, o e-mail despachado e o status passará para <strong>PROPOSTA_ENVIADA</strong>.
          </p>
        </div>
      </ConfirmModal>

      {/* Modal de Confirmação: Mudança de Status Crítico */}
      <ConfirmModal
        isOpen={showStatusModal && !!pendingStatus}
        title={
          pendingStatus === 'REJEITADO'
            ? 'Confirmar Rejeição do Orçamento?'
            : 'Confirmar Aprovação do Orçamento?'
        }
        description={
          pendingStatus === 'REJEITADO'
            ? 'Esta ação marcará a solicitação como REJEITADA no pipeline comercial e registrará o encerramento do processo.'
            : 'Esta ação marcará a solicitação como APROVADA e autorizará a emissão da ordem técnica de serviço.'
        }
        confirmLabel={pendingStatus === 'REJEITADO' ? 'Confirmar Rejeição' : 'Confirmar Aprovação'}
        cancelLabel="Cancelar"
        variant={pendingStatus === 'REJEITADO' ? 'danger' : 'primary'}
        isLoading={loading}
        onConfirm={async () => {
          if (pendingStatus) {
            await handleMudarStatus(pendingStatus, statusMotivo);
            setShowStatusModal(false);
            setPendingStatus(null);
          }
        }}
        onCancel={() => {
          setShowStatusModal(false);
          setPendingStatus(null);
          setStatusMotivo('');
        }}
      >
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Motivo ou Observação do Registro {pendingStatus === 'REJEITADO' ? '(Recomendado)' : '(Opcional)'}
          </label>
          <textarea
            rows={2}
            value={statusMotivo}
            onChange={(e) => setStatusMotivo(e.target.value)}
            placeholder={
              pendingStatus === 'REJEITADO'
                ? 'Ex: Cliente optou por concorrente com valor inferior / Obra adiada...'
                : 'Ex: Proposta aceita pelo cliente, assinado contrato...'
            }
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
          />
        </div>
      </ConfirmModal>

      {/* Modal de Confirmação: Exclusão Permanente */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Excluir Orçamento Permanentemente?"
        description={`Tem certeza que deseja excluir o orçamento com protocolo ${orcamento.numeroProtocolo}? Todas as respostas técnicas, histórico e propostas associadas serão removidos definitivamente.`}
        confirmLabel="Sim, Excluir Definitivamente"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={deleting}
        onConfirm={handleExcluirOrcamento}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
