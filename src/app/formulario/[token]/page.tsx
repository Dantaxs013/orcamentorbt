'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { RBTLogo } from '@/components/ui/rbt-logo';
import { useToast } from '@/components/ui/toast-provider';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { formatPhoneBR } from '@/lib/masks';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Building,
  User,
  Mail,
  Phone,
  ShieldCheck,
  FileText,
  Calendar,
  Layers,
  HardHat,
  Compass,
  Paperclip,
} from 'lucide-react';

export default function FormularioMagicLinkPage() {
  const params = useParams();
  const token = params.token as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [tokenInfo, setTokenInfo] = useState<{
    valid?: boolean;
    alreadySubmitted?: boolean;
    protocolo: string;
    clienteNome?: string;
    cliente?: {
      nome: string;
      email: string;
      telefone?: string | null;
      empresa?: string | null;
      mensagemInicial?: string | null;
    };
    message?: string;
  } | null>(null);

  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Form State das 9 Perguntas Oficiais RBT
  const [formData, setFormData] = useState({
    empresa: '',
    contatoNome: '',
    email: '',
    telefone: '',
    naturezaContratacao: 'Obra Própria / Execução Direta',
    dataLimiteConcorrencia: '',
    previsaoInicio: 'Imediato (em até 15 dias)',
    sondagensStatus: 'Sim, possuo laudo de sondagem concluído',
    sondagensArquivoUrl: '',
    sondagensDetalhes: '',
    projetosStatus: 'Projeto Executivo de Fundações Completo',
    projetosArquivoUrl: '',
    tipoFundacao: 'Estaca Metálica',
    especificacoes: '',
    quantidadeEstacas: 20,
    profundidadeMedia: 12,
    metragemTotalEstimada: 240,
    ensaiosRequeridos: 'PDA (Ensaio de Carregamento Dinâmico)',
    observacoes: '',
  });

  useEffect(() => {
    async function loadToken() {
      try {
        const res = await fetch(`/api/formulario/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Link inválido ou expirado.');
          setLoading(false);
          return;
        }

        setTokenInfo(data);
        if (data.cliente) {
          setFormData((prev) => ({
            ...prev,
            empresa: data.cliente.empresa || '',
            contatoNome: data.cliente.nome || '',
            email: data.cliente.email || '',
            telefone: data.cliente.telefone ? formatPhoneBR(data.cliente.telefone) : '',
          }));
        }
      } catch {
        setError('Erro ao carregar dados do formulário.');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadToken();
    }
  }, [token]);

  // Recalcula metragem total estimada
  useEffect(() => {
    const qtd = Number(formData.quantidadeEstacas) || 0;
    const prof = Number(formData.profundidadeMedia) || 0;
    setFormData((prev) => ({
      ...prev,
      metragemTotalEstimada: qtd * prof,
    }));
  }, [formData.quantidadeEstacas, formData.profundidadeMedia]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      telefone: formatPhoneBR(e.target.value),
    }));
  };

  const handleFormSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.empresa || !formData.contatoNome || !formData.email || !formData.telefone) {
      toast.warning('Campos Obrigatórios', 'Preencha todos os dados de contato da sua empresa.');
      return;
    }
    setShowConfirmModal(true);
  };

  const executeConfirmSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/formulario/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Erro no Envio', data.error || 'Falha ao processar as respostas.');
        setSubmitting(false);
        return;
      }

      toast.success(
        'Orçamento Enviado!',
        'Seus dados técnicos foram encaminhados para a equipe de engenharia da RBT.'
      );
      setSubmittedSuccess(true);
    } catch {
      toast.error('Erro de Conexão', 'Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-red-200 border-t-[#BA1A1A] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Carregando formulário RBT Fundações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-[#111827] text-white border-b-4 border-[#BA1A1A] py-4 px-4 sm:px-8 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="bg-white rounded-xl px-3 py-1.5 shadow-sm inline-flex items-center">
            <RBTLogo size="sm" subtitle="FUNDAÇÕES" />
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs text-slate-400 uppercase font-mono tracking-wider">
              Portal do Cliente · RBT Fundações & Engenharia
            </p>
            {tokenInfo?.protocolo && (
              <p className="text-xs font-bold text-white font-mono mt-0.5">
                Protocolo: <span className="text-[#BA1A1A]">{tokenInfo.protocolo}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {error ? (
          <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-md text-center max-w-lg mx-auto mt-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-[#BA1A1A]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Atenção</h2>
            <p className="text-sm text-slate-600 mt-2">{error}</p>
          </div>
        ) : tokenInfo?.alreadySubmitted || submittedSuccess ? (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-xl text-center max-w-xl mx-auto mt-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              Status: Aguardando Análise
            </span>
            <h2 className="text-2xl font-bold text-slate-900">
              Formulário Técnico Enviado com Sucesso!
            </h2>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Obrigado! Os dados técnicos do protocolo{' '}
              <strong className="font-mono text-slate-900">{tokenInfo?.protocolo}</strong> já estão na mesa de trabalho dos nossos engenheiros orçamentistas.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6 text-left space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Clock className="w-4 h-4 text-[#BA1A1A]" />
                <span>Próximas Etapas da RBT:</span>
              </div>
              <p>1. Avaliação do perfil geológico e das sondagens encaminhadas.</p>
              <p>2. Dimensionamento dos quantitativos e cronograma de bate-estacas/perfuratrizes.</p>
              <p>3. Emissão da Proposta Comercial Oficial em PDF diretamente no seu e-mail.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Header Hero */}
            <div className="bg-slate-900 text-white p-6 sm:p-8 border-b-2 border-[#BA1A1A]">
              <span className="inline-block bg-red-950/60 text-red-300 border border-red-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                Solicitação de Proposta Técnica
              </span>
              <h1 className="text-xl sm:text-2xl font-bold">
                Questionário Técnico para Orçamento de Fundações
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Por favor, preencha as informações da obra abaixo para que nossa equipe elabore uma proposta assertiva.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmitClick} className="p-6 sm:p-8 space-y-8">
              {/* 1. SEÇÃO: DADOS CADASTRAIS E CONTATO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <User className="w-4 h-4 text-[#BA1A1A]" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    1. Dados da Empresa e Contato
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Empresa Contratante *
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formData.empresa}
                        onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                        placeholder="Ex: Construtora Horizonte Sul Ltda"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nome do Contato / Responsável *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formData.contatoNome}
                        onChange={(e) => setFormData({ ...formData, contatoNome: e.target.value })}
                        placeholder="Ex: Eng. Roberto Carlos"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      E-mail Corporativo *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="orcamentos@empresa.com.br"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Telefone / WhatsApp *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formData.telefone}
                        onChange={handlePhoneChange}
                        placeholder="(11) 98765-4321"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. SEÇÃO: CARACTERIZAÇÃO DA CONTRATAÇÃO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Calendar className="w-4 h-4 text-[#BA1A1A]" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    2. Natureza da Contratação e Prazos
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Concorrência ou Obra Própria? *
                    </label>
                    <select
                      value={formData.naturezaContratacao}
                      onChange={(e) => setFormData({ ...formData, naturezaContratacao: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                    >
                      <option value="Obra Própria / Execução Direta">Obra Própria / Execução Direta (Contratação Direta)</option>
                      <option value="Concorrência Privada / Bid">Concorrência Privada / Processo de Tomada de Preços</option>
                      <option value="Licitação Pública">Licitação Pública / Concorrência Governamental</option>
                      <option value="Estudo de Viabilidade">Estudo de Viabilidade / Estimativa Orçamentária</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Indica o contexto da tomada de preços para nossa diretoria comercial.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Previsão de Início das Obras / Mobilização *
                    </label>
                    <select
                      value={formData.previsaoInicio}
                      onChange={(e) => setFormData({ ...formData, previsaoInicio: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                    >
                      <option value="Imediato (em até 15 dias)">Imediato (em até 15 dias)</option>
                      <option value="Curto Prazo (15 a 30 dias)">Curto Prazo (15 a 30 dias)</option>
                      <option value="Médio Prazo (30 a 60 dias)">Médio Prazo (30 a 60 dias)</option>
                      <option value="Mais de 60 dias">Mais de 60 dias / A definir</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Usado para verificar a disponibilidade de equipamentos da frota RBT.
                    </p>
                  </div>
                </div>

                {formData.naturezaContratacao.includes('Concorrência') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Data Limite para Entrega da Proposta Comercial
                    </label>
                    <input
                      type="date"
                      value={formData.dataLimiteConcorrencia}
                      onChange={(e) => setFormData({ ...formData, dataLimiteConcorrencia: e.target.value })}
                      className="w-full sm:w-64 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                    />
                  </div>
                )}
              </div>

              {/* 3. SEÇÃO: SONDAGENS E PROJETOS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Compass className="w-4 h-4 text-[#BA1A1A]" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    3. Geotecnia e Projetos Técnicos
                  </h2>
                </div>

                {/* Sondagens */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Sondagens de Solo (SPT / CPTU / Rotativa) *
                  </label>
                  <select
                    value={formData.sondagensStatus}
                    onChange={(e) => setFormData({ ...formData, sondagensStatus: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  >
                    <option value="Sim, possuo laudo de sondagem concluído">Sim, possuo laudo de sondagem concluído (SPT)</option>
                    <option value="Sondagem em andamento">Sondagem em andamento / Prevista para os próximos dias</option>
                    <option value="Não possuo sondagem">Não possuo sondagem (estimar com histórico da região)</option>
                  </select>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Link da Sondagem (Google Drive, Dropbox, OneDrive ou link de visualização)
                    </label>
                    <input
                      type="url"
                      value={formData.sondagensArquivoUrl}
                      onChange={(e) => setFormData({ ...formData, sondagensArquivoUrl: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                    />
                  </div>
                </div>

                {/* Projetos */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Disponibilidade de Projetos Técnicos de Fundação *
                  </label>
                  <select
                    value={formData.projetosStatus}
                    onChange={(e) => setFormData({ ...formData, projetosStatus: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  >
                    <option value="Projeto Executivo de Fundações Completo">Projeto Executivo de Fundações Completo (Locação, Formas e Cargas)</option>
                    <option value="Projeto Básico / Cargas de Pilares">Projeto Básico / Tabela de Cargas de Pilares (Necessita Dimensionamento)</option>
                    <option value="Apenas Projeto Arquitetônico">Apenas Projeto Arquitetônico (Necessita Solução de Engenharia RBT)</option>
                  </select>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Link dos Projetos / Plantas (DWG, PDF ou pasta compartilhada)
                    </label>
                    <input
                      type="url"
                      value={formData.projetosArquivoUrl}
                      onChange={(e) => setFormData({ ...formData, projetosArquivoUrl: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                    />
                  </div>
                </div>
              </div>

              {/* 4. SEÇÃO: QUANTITATIVOS E ESPECIFICAÇÃO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <HardHat className="w-4 h-4 text-[#BA1A1A]" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    4. Quantitativos e Solução Técnica Prevista
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tipo de Fundação Previsto *
                    </label>
                    <select
                      value={formData.tipoFundacao}
                      onChange={(e) => setFormData({ ...formData, tipoFundacao: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                    >
                      <option value="Estaca Metálica">Estaca Metálica (Perfis laminados / soldados)</option>
                      <option value="Estaca Hélice Contínua">Estaca Hélice Contínua Monitorada</option>
                      <option value="Estaca Raiz / Microestaca">Estaca Raiz / Microestaca</option>
                      <option value="Estaca Escavada com Trado Mecânico">Estaca Escavada com Trado Mecânico</option>
                      <option value="Tubulão a Céu Aberto / Ar Comprimido">Tubulão a Céu Aberto / Ar Comprimido</option>
                      <option value="A Definir pela RBT">A Definir pela Engenharia da RBT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Quantidade Estimada de Estacas *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formData.quantidadeEstacas}
                      onChange={(e) => setFormData({ ...formData, quantidadeEstacas: Number(e.target.value) || 1 })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Profundidade Média Estimada (Metros)
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={formData.profundidadeMedia}
                      onChange={(e) => setFormData({ ...formData, profundidadeMedia: Number(e.target.value) || 0 })}
                      placeholder="Ex: 12 metros"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Metragem Linear Total Estimada (m)
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={formData.metragemTotalEstimada}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Calculado automaticamente (Qtd × Profundidade)</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ensaios Requeridos no Canteiro
                  </label>
                  <input
                    type="text"
                    value={formData.ensaiosRequeridos}
                    onChange={(e) => setFormData({ ...formData, ensaiosRequeridos: e.target.value })}
                    placeholder="Ex: PDA (Carregamento Dinâmico), Prova de Carga Estática, PIT"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Observações Técnicas e Restrições do Canteiro
                  </label>
                  <textarea
                    rows={3}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Ex: Canteiro com acesso restrito para carretas, presença de rede de média tensão, restrição de horário de ruído..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              {/* Botão de Envio */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Seus projetos e dados geológicos são tratados com confidencialidade técnica.</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#BA1A1A] hover:bg-[#991B1B] text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enviar Questionário Técnico</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Envio do Questionário Técnico"
        description="Deseja enviar as informações de fundação da sua obra para análise da RBT? O status do seu protocolo passará para 'Aguardando Análise'."
        confirmLabel="Confirmar e Enviar"
        cancelLabel="Revisar Dados"
        variant="primary"
        isLoading={submitting}
        onConfirm={executeConfirmSubmit}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto text-center text-xs text-slate-500">
        RBT Fundações & Engenharia © 2026 — Gestão e Automação de Orçamentos
      </footer>
    </div>
  );
}
