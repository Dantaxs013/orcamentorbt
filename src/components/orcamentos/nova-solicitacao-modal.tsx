'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, X, Check, Copy, ExternalLink, Mail, User, Phone, Building } from 'lucide-react';
import { formatPhoneBR } from '@/lib/masks';
import { useToast } from '@/components/ui/toast-provider';

export function NovaSolicitacaoModal() {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdData, setCreatedData] = useState<{
    protocolo: string;
    magicLinkUrl: string;
    emailEnviado: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    empresa: '',
    mensagemInicial: '',
  });

  const handleOpen = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      empresa: '',
      mensagemInicial: '',
    });
    setError('');
    setCreatedData(null);
    setCopied(false);
    setIsOpen(true);
  };

  const fillSample = () => {
    setFormData({
      nome: 'Eng. Carlos Mendonça',
      email: 'carlos.mendonca@construtoraparceira.com.br',
      telefone: formatPhoneBR('11987654321'),
      empresa: 'Construtora Horizonte Sul Ltda',
      mensagemInicial: 'Necessitamos de cotação para fornecimento de estacas metálicas e fundações especiais para obra industrial em Paulínia/SP.',
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        const err = data.error || 'Erro ao criar solicitação.';
        setError(err);
        toast.error('Erro na Solicitação', err);
        setLoading(false);
        return;
      }

      setCreatedData({
        protocolo: data.orcamento.numeroProtocolo,
        magicLinkUrl: data.magicLink.url,
        emailEnviado: data.magicLink.emailEnviado,
      });

      toast.success(
        'Solicitação Criada com Sucesso!',
        `Protocolo ${data.orcamento.numeroProtocolo} gerado e encaminhado para Em Análise.`
      );

      router.refresh();
    } catch {
      const err = 'Erro de conexão ao servidor.';
      setError(err);
      toast.error('Erro de Conexão', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdData?.magicLinkUrl) return;
    navigator.clipboard.writeText(createdData.magicLinkUrl);
    setCopied(true);
    toast.success('Link Copiado!', 'Magic Link copiado para a área de transferência.');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#BA1A1A] hover:bg-[#991B1B] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-red-950/20 transition-all hover:scale-[1.02]"
      >
        <PlusCircle className="w-4 h-4" />
        <span>Nova Proposta</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-[#111827] p-5 text-white flex items-center justify-between border-b-2 border-[#BA1A1A]">
              <div>
                <h3 className="text-base font-bold">Nova Proposta / Solicitação de Orçamento</h3>
                <p className="text-xs text-slate-400">
                  Cadastra a solicitação e encaminha diretamente para o bloco de análise
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {createdData ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Proposta Criada com Sucesso!
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      Protocolo: <strong className="font-mono text-emerald-900">{createdData.protocolo}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Magic Link Seguro Gerado para o Cliente:
                    </label>
                    <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-mono break-all text-slate-800 select-all">
                      {createdData.magicLinkUrl}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Link Copiado!' : 'Copiar Magic Link'}</span>
                    </button>
                    <a
                      href={createdData.magicLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 px-3 bg-[#BA1A1A] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir Formulário</span>
                    </a>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Fechar e voltar ao Dashboard
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Preencha os dados do cliente:</span>
                    <button
                      type="button"
                      onClick={fillSample}
                      className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
                    >
                      Preencher Formulário da RBT
                    </button>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Cliente / Contato *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: Carlos Silva"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        E-mail *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="cliente@empresa.com"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Telefone / WhatsApp
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={formData.telefone}
                          onChange={(e) =>
                            setFormData({ ...formData, telefone: formatPhoneBR(e.target.value) })
                          }
                          placeholder="(11) 99999-9999"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Empresa
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formData.empresa}
                        onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                        placeholder="Nome da Construtora / Indústria"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mensagem / Escopo Inicial
                    </label>
                    <textarea
                      rows={2}
                      value={formData.mensagemInicial}
                      onChange={(e) => setFormData({ ...formData, mensagemInicial: e.target.value })}
                      placeholder="Resumo inicial recebido por e-mail..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2.5 bg-[#BA1A1A] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {loading ? 'Processando...' : 'Gerar Proposta'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
