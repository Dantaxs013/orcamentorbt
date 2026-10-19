'use client';

import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  Mail,
  Sparkles,
  HelpCircle,
  X,
  FileText,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';

export function LinkPublicoCard() {
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [publicUrl, setPublicUrl] = useState('/formulario');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPublicUrl(`${window.location.origin}/formulario`);
    }
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    toast.success('Link Copiado!', 'Link do formulário copiado para a área de transferência.');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const emailTemplateText = `Olá! Agradecemos pelo contato e interesse nos serviços da RBT Fundações & Engenharia.

Para que nossa equipe técnica possa dimensionar sua solução e enviar a Proposta Comercial com agilidade e assertividade, por favor acesse nosso formulário técnico pelo link abaixo:

👉 ${publicUrl}

Assim que você enviar as informações da obra, nosso time de engenharia iniciará a análise das sondagens e quantitativos para emissão da proposta em PDF.

Atenciosamente,
Equipe Comercial & Orçamentos
RBT Fundações & Engenharia
orcamento@rbtfundacoes.com.br`;

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(emailTemplateText);
    setCopiedTemplate(true);
    toast.success('Texto Copiado!', 'Modelo de auto-resposta copiado pronto para colar no seu e-mail.');
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-700/60 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Informações explicativas */}
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-[#BA1A1A] text-white">
                <LinkIcon className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-red-300">
                Link Fixo para Auto-Resposta de E-mail
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.2 rounded-full">
                Ativo
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cole este link na resposta automática do seu e-mail (Outlook/Gmail). Quando o cliente preencher, a solicitação cai diretamente no quadro na coluna <strong className="text-white font-semibold">Em Análise</strong> com protocolo gerado.
            </p>
          </div>

          {/* Campo com Link e Ações */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
            <div className="flex items-center bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 select-all overflow-hidden max-w-full sm:max-w-xs">
              <span className="truncate">{publicUrl}</span>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-[#BA1A1A] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer flex-shrink-0"
              title="Copiar link permanente para a área de transferência"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="px-3.5 py-2 bg-slate-700/80 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-600 transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer flex-shrink-0"
              title="Ver modelo pronto para colar no seu e-mail"
            >
              <Mail className="w-3.5 h-3.5 text-slate-300" />
              <span>Modelo de E-mail</span>
            </button>

            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition flex items-center justify-center flex-shrink-0"
              title="Abrir e testar o formulário em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Modal com o modelo pronto de auto-resposta */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-[#BA1A1A] flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Modelo de Resposta Automática
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Copie este texto e cole na resposta automática do seu e-mail corporativo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Caixa com o texto */}
            <div className="relative">
              <textarea
                readOnly
                rows={9}
                value={emailTemplateText}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-700 leading-relaxed focus:outline-none resize-none"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Como configurar:</strong> No seu Outlook ou Gmail, acesse Configurações &gt; Resposta Automática de Ausência/Férias ou Regra de Resposta Automática, e cole este texto.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleCopyTemplate}
                className="px-5 py-2.5 bg-[#BA1A1A] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
              >
                {copiedTemplate ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Texto Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Texto Completo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
