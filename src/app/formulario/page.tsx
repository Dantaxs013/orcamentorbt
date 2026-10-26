'use client';

import React, { useState, useEffect } from 'react';
import { RBTLogo } from '@/components/ui/rbt-logo';
import { useToast } from '@/components/ui/toast-provider';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { formatPhoneBR } from '@/lib/masks';
import { FileUploadField } from '@/components/formulario/file-upload-field';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Building,
  User,
  Mail,
  Phone,
  Calendar,
  Layers,
  HardHat,
  Compass,
  Paperclip,
  Copy,
  Check,
} from 'lucide-react';

export default function FormularioPublicoPage() {
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submittedProtocol, setSubmittedProtocol] = useState<string | null>(null);
  const [copiedProtocol, setCopiedProtocol] = useState(false);

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

  // Recalcula metragem total estimada em tempo real
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
    if (!formData.empresa.trim() || !formData.contatoNome.trim() || !formData.email.trim() || !formData.telefone.trim()) {
      toast.warning('Campos Obrigatórios', 'Por favor, preencha todos os dados de contato da sua empresa.');
      return;
    }
    setShowConfirmModal(true);
  };

  const executeConfirmSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/formulario/publico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Erro no Envio', data.error || 'Falha ao processar as informações.');
        setError(data.error || 'Falha ao processar o formulário. Verifique os dados preenchidos.');
        setSubmitting(false);
        return;
      }

      toast.success(
        'Solicitação Registrada!',
        `Protocolo ${data.protocolo} gerado. Seus dados foram encaminhados à engenharia RBT.`
      );
      setSubmittedProtocol(data.protocolo);
    } catch {
      const msg = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
      setError(msg);
      toast.error('Erro de Conexão', msg);
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const handleCopyProtocol = () => {
    if (!submittedProtocol) return;
    navigator.clipboard.writeText(submittedProtocol);
    setCopiedProtocol(true);
    toast.success('Protocolo Copiado!', 'Número de protocolo copiado para sua área de transferência.');
    setTimeout(() => setCopiedProtocol(false), 3000);
  };

  const resetForm = () => {
    setSubmittedProtocol(null);
    setFormData({
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
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 flex flex-col font-sans py-6 sm:py-10 px-4">
      {/* Container Central no estilo Forms com largura confortável */}
      <main className="w-full max-w-4xl mx-auto space-y-4">
        
        {/* Card de Topo: Logo Oficial RBT + Título do Formulário */}
        <div className="bg-white rounded-xl border border-slate-200 border-t-8 border-t-[#BA1A1A] p-6 sm:p-8 shadow-sm">
          <div className="mb-4">
            <RBTLogo size="md" subtitle="FUNDAÇÕES" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Solicitação Técnica de Orçamento de Fundações
          </h1>

          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Preencha as informações da sua obra abaixo. Com esses dados, nossos engenheiros geotécnicos dimensionarão a solução técnica ideal com precisão e agilidade comercial.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>* Campos de preenchimento obrigatório</span>
            <span className="font-medium text-slate-500">RBT Engenharia & Fundações</span>
          </div>
        </div>

        {submittedProtocol ? (
          /* Card de Confirmação e Recibo */
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-emerald-600 p-6 sm:p-8 shadow-sm text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Sua resposta foi registrada com sucesso!
            </h2>

            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              As informações da sua obra foram encaminhadas diretamente para a equipe técnica da RBT Fundações.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 my-5 max-w-md mx-auto text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Número do Protocolo
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-2xl font-bold text-[#BA1A1A]">
                  {submittedProtocol}
                </span>
                <button
                  type="button"
                  onClick={handleCopyProtocol}
                  className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 transition"
                  title="Copiar Protocolo"
                >
                  {copiedProtocol ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Guarde este número para acompanhamento da sua proposta.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left space-y-2 text-xs text-slate-600 max-w-md mx-auto mb-6">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 pb-1 border-b border-slate-200">
                <Clock className="w-4 h-4 text-[#BA1A1A]" />
                <span>Próximas Etapas:</span>
              </div>
              <p>1. Avaliação do perfil geológico e das sondagens encaminhadas.</p>
              <p>2. Dimensionamento dos equipamentos da frota de bate-estacas e perfuratrizes.</p>
              <p>3. Envio da proposta comercial detalhada em PDF para o e-mail informado ({formData.email}).</p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-[#BA1A1A] hover:underline font-semibold"
            >
              Enviar outra resposta
            </button>
          </div>
        ) : (
          /* Formulário no formato Forms em Blocos de Perguntas */
          <form onSubmit={handleFormSubmitClick} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#BA1A1A] flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* SEÇÃO 1: Dados da Empresa e Contato */}
            <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-[#BA1A1A] p-5 sm:p-7 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#BA1A1A] flex items-center justify-center flex-shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    1. Dados da Empresa e Contato Responsável
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Informe os dados da empresa contratante para elaboração da proposta.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Empresa Contratante <span className="text-[#BA1A1A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.empresa}
                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                    placeholder="Sua resposta"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Contato / Responsável Técnico <span className="text-[#BA1A1A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contatoNome}
                    onChange={(e) => setFormData({ ...formData, contatoNome: e.target.value })}
                    placeholder="Sua resposta"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail para Envio da Proposta <span className="text-[#BA1A1A]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="seu.email@empresa.com.br"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Telefone / WhatsApp Direto <span className="text-[#BA1A1A]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.telefone}
                      onChange={handlePhoneChange}
                      placeholder="(11) 98765-4321"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Natureza da Contratação e Prazos */}
            <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-[#BA1A1A] p-5 sm:p-7 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#BA1A1A] flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    2. Natureza da Contratação e Prazos
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contexto comercial da obra e cronograma de mobilização.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Concorrência ou Obra Própria? <span className="text-[#BA1A1A]">*</span>
                  </label>
                  <div className="space-y-2 text-sm text-slate-700">
                    {[
                      'Obra Própria / Execução Direta',
                      'Concorrência Privada / Bid',
                      'Licitação Pública',
                      'Estudo de Viabilidade',
                    ].map((opcao) => (
                      <label key={opcao} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="naturezaContratacao"
                          value={opcao}
                          checked={formData.naturezaContratacao === opcao}
                          onChange={(e) => setFormData({ ...formData, naturezaContratacao: e.target.value })}
                          className="accent-[#BA1A1A] w-4 h-4"
                        />
                        <span>{opcao}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {formData.naturezaContratacao.includes('Concorrência') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data Limite para Entrega da Proposta Comercial
                    </label>
                    <input
                      type="date"
                      value={formData.dataLimiteConcorrencia}
                      onChange={(e) => setFormData({ ...formData, dataLimiteConcorrencia: e.target.value })}
                      className="w-full sm:w-60 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Previsão de Início das Obras / Mobilização <span className="text-[#BA1A1A]">*</span>
                  </label>
                  <select
                    value={formData.previsaoInicio}
                    onChange={(e) => setFormData({ ...formData, previsaoInicio: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition"
                  >
                    <option value="Imediato (em até 15 dias)">Imediato (em até 15 dias)</option>
                    <option value="Curto Prazo (15 a 30 dias)">Curto Prazo (15 a 30 dias)</option>
                    <option value="Médio Prazo (30 a 60 dias)">Médio Prazo (30 a 60 dias)</option>
                    <option value="Mais de 60 dias">Mais de 60 dias / A definir</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: Sondagens e Projetos */}
            <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-[#BA1A1A] p-5 sm:p-7 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#BA1A1A] flex items-center justify-center flex-shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    3. Geotecnia e Projetos Técnicos
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Disponibilidade de laudos de solo e arquivos executivos.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sondagens de Solo (SPT / CPTU / Rotativa) <span className="text-[#BA1A1A]">*</span>
                  </label>
                  <select
                    value={formData.sondagensStatus}
                    onChange={(e) => setFormData({ ...formData, sondagensStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition mb-2"
                  >
                    <option value="Sim, possuo laudo de sondagem concluído">Sim, possuo laudo de sondagem concluído (SPT)</option>
                    <option value="Sondagem em andamento">Sondagem em andamento / Prevista para os próximos dias</option>
                    <option value="Não possuo sondagem">Não possuo sondagem (estimar com histórico da região)</option>
                  </select>

                  <FileUploadField
                    value={formData.sondagensArquivoUrl}
                    onChange={(url) => setFormData({ ...formData, sondagensArquivoUrl: url })}
                    categoria="sondagens"
                    helperText="Envie o laudo de sondagem em PDF ou fotos dos relatórios, ou informe o link."
                    placeholderLink="Link do laudo de sondagem (Google Drive, OneDrive, etc.)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disponibilidade de Projetos Técnicos de Fundação <span className="text-[#BA1A1A]">*</span>
                  </label>
                  <select
                    value={formData.projetosStatus}
                    onChange={(e) => setFormData({ ...formData, projetosStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition mb-2"
                  >
                    <option value="Projeto Executivo de Fundações Completo">Projeto Executivo de Fundações Completo (Locação, Formas e Cargas)</option>
                    <option value="Projeto Básico / Cargas de Pilares">Projeto Básico / Tabela de Cargas de Pilares (Necessita Dimensionamento)</option>
                    <option value="Apenas Projeto Arquitetônico">Apenas Projeto Arquitetônico (Necessita Solução de Engenharia RBT)</option>
                  </select>

                  <FileUploadField
                    value={formData.projetosArquivoUrl}
                    onChange={(url) => setFormData({ ...formData, projetosArquivoUrl: url })}
                    categoria="projetos"
                    helperText="Envie arquivos de projeto (PDF, fotos, pranchas) ou informe o link de download."
                    placeholderLink="Link das plantas e projetos executivos (DWG / PDF / Drive)"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: Quantitativos e Especificação Técnica */}
            <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-[#BA1A1A] p-5 sm:p-7 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#BA1A1A] flex items-center justify-center flex-shrink-0">
                  <HardHat className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    4. Quantitativos e Solução Técnica Prevista
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Estimativas de volume e tipo de estaca desejado.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tipo de Fundação Previsto <span className="text-[#BA1A1A]">*</span>
                    </label>
                    <select
                      value={formData.tipoFundacao}
                      onChange={(e) => setFormData({ ...formData, tipoFundacao: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition"
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantidade Estimada de Estacas <span className="text-[#BA1A1A]">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formData.quantidadeEstacas}
                      onChange={(e) => setFormData({ ...formData, quantidadeEstacas: Number(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Profundidade Média Estimada (m)
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={formData.profundidadeMedia}
                      onChange={(e) => setFormData({ ...formData, profundidadeMedia: Number(e.target.value) || 0 })}
                      placeholder="Ex: 12"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Metragem Linear Total Estimada (m)
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={formData.metragemTotalEstimada}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ensaios Requeridos no Canteiro
                  </label>
                  <input
                    type="text"
                    value={formData.ensaiosRequeridos}
                    onChange={(e) => setFormData({ ...formData, ensaiosRequeridos: e.target.value })}
                    placeholder="Ex: PDA (Carregamento Dinâmico), Prova de Carga Estática, PIT"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observações Técnicas e Restrições do Canteiro
                  </label>
                  <textarea
                    rows={3}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Restrições de acesso, horários de ruído, média tensão ou particularidades da obra..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition"
                  />
                </div>
              </div>
            </div>

            {/* Bloco de Envio Conectado e Alinhado à Direita */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium transition cursor-pointer"
              >
                Limpar formulário
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-[#BA1A1A] hover:bg-[#991B1B] text-white font-bold text-sm rounded-lg shadow-md shadow-red-950/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>Enviando...</span>
                ) : (
                  <>
                    <span>Enviar Solicitação de Orçamento</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Rodapé Institucional com Assinatura solicitada */}
        <footer className="pt-6 pb-4 text-center space-y-1">
          <p className="text-xs text-slate-500 font-medium">
            RBT Fundações & Engenharia © 2026
          </p>
          <p className="text-[11px] text-slate-400">
            Desenvolvido por <strong className="text-slate-600 font-semibold">Wellington Dantas</strong>
          </p>
        </footer>
      </main>

      {/* Modal de Confirmação antes do envio */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Envio da Solicitação Técnica"
        description={`Deseja enviar a solicitação da empresa "${formData.empresa || 'sua empresa'}" para análise da equipe técnica da RBT?`}
        confirmLabel="Enviar"
        cancelLabel="Revisar"
        variant="primary"
        isLoading={submitting}
        onConfirm={executeConfirmSubmit}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
