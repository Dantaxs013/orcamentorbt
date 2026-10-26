'use client';

import React from 'react';
import { Building2, Calendar, Wrench, User, Users, Clock, AlertTriangle, CloudSun } from 'lucide-react';

export interface ObraOption {
  id: string;
  codigo: string;
  nome: string;
  cliente?: string;
}

export interface RdpHeaderState {
  obraId: string;
  data: string; // YYYY-MM-DD
  turno: string;
  maquinaEquipamento: string;
  operador: string;
  encarregado: string;
  soldador: string;
  equipeDescricao: string;
  condicaoClimatica: string;
  horarioInicio: string;
  horarioTermino: string;
  intervaloAlmocoInicio: string;
  intervaloAlmocoFim: string;
  horasParadas: string | number;
  motivoParada: string;
  horimetroInicial?: string | number;
  horimetroFinal?: string | number;
  observacoes?: string;
}

interface RdpHeaderFormProps {
  obras: ObraOption[];
  apontadorNome: string;
  state: RdpHeaderState;
  onChange: (field: keyof RdpHeaderState, value: string | number) => void;
  horasTrabalhadas?: number;
}

export function RdpHeaderForm({
  obras,
  apontadorNome,
  state,
  onChange,
  horasTrabalhadas = 0,
}: RdpHeaderFormProps) {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          <span>Informações Gerais da Operação (Cabeçalho)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Identificação da obra, apontador, equipamentos, horários e equipe de produção
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Obra */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <span>Obra Ativa</span>
            <span className="text-rose-500">*</span>
          </label>
          <select
            value={state.obraId}
            onChange={(e) => onChange('obraId', e.target.value)}
            className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          >
            <option value="">Selecione uma obra...</option>
            {obras.map((obra) => (
              <option key={obra.id} value={obra.id}>
                {obra.codigo} - {obra.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Apontador (Auto-filled) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Apontador</span>
          </label>
          <input
            type="text"
            readOnly
            value={apontadorNome || 'Apontador Autenticado'}
            className="w-full h-11 px-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 font-medium cursor-not-allowed"
          />
        </div>

        {/* Data */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Data de Execução</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={state.data}
            onChange={(e) => onChange('data', e.target.value)}
            className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Turno & Clima */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span>Turno</span>
            </label>
            <select
              value={state.turno || 'DIURNO'}
              onChange={(e) => onChange('turno', e.target.value)}
              className="w-full h-11 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            >
              <option value="DIURNO">Diurno</option>
              <option value="NOTURNO">Noturno</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <CloudSun className="w-3.5 h-3.5 text-slate-400" />
              <span>Clima</span>
            </label>
            <select
              value={state.condicaoClimatica || 'BOM_SOL'}
              onChange={(e) => onChange('condicaoClimatica', e.target.value)}
              className="w-full h-11 px-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            >
              <option value="BOM_SOL">Sol / Bom</option>
              <option value="NUBLADO">Nublado</option>
              <option value="CHUVA_LEVE">Chuva Leve</option>
              <option value="CHUVA_FORTE">Chuva Forte</option>
              <option value="IMPRACTICAVEL">Impraticável</option>
            </select>
          </div>
        </div>

        {/* Máquina / Equipamento */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-slate-400" />
            <span>Máquina / Equipamento</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Bate-Estaca Hidráulico 01 - Junttan PM20"
            value={state.maquinaEquipamento}
            onChange={(e) => onChange('maquinaEquipamento', e.target.value)}
            className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Operador */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Operador</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Nome do operador"
            value={state.operador}
            onChange={(e) => onChange('operador', e.target.value)}
            className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Encarregado */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <span>Encarregado</span>
          </label>
          <input
            type="text"
            placeholder="Nome do encarregado"
            value={state.encarregado || ''}
            onChange={(e) => onChange('encarregado', e.target.value)}
            className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Soldador */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <span>Soldador</span>
          </label>
          <input
            type="text"
            placeholder="Nome do soldador responsável"
            value={state.soldador || ''}
            onChange={(e) => onChange('soldador', e.target.value)}
            className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Equipe / Ajudantes */}
        <div className="space-y-1.5 sm:col-span-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Ajudantes / Equipe de Apoio</span>
          </label>
          <input
            type="text"
            placeholder="Ex: 2 ajudantes de cravação e 1 operador de guincho"
            value={state.equipeDescricao || ''}
            onChange={(e) => onChange('equipeDescricao', e.target.value)}
            className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Jornada e Horários */}
      <div className="pt-4 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>Horários e Jornada de Trabalho</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Início Turno</label>
            <input
              type="time"
              value={state.horarioInicio || '07:00'}
              onChange={(e) => onChange('horarioInicio', e.target.value)}
              className="w-full h-10 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Término Turno</label>
            <input
              type="time"
              value={state.horarioTermino || '17:00'}
              onChange={(e) => onChange('horarioTermino', e.target.value)}
              className="w-full h-10 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Almoço Início</label>
            <input
              type="time"
              value={state.intervaloAlmocoInicio || '12:00'}
              onChange={(e) => onChange('intervaloAlmocoInicio', e.target.value)}
              className="w-full h-10 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Almoço Fim</label>
            <input
              type="time"
              value={state.intervaloAlmocoFim || '13:00'}
              onChange={(e) => onChange('intervaloAlmocoFim', e.target.value)}
              className="w-full h-10 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Horas Paradas (h)</label>
            <input
              type="text"
              placeholder="0,0"
              value={state.horasParadas ?? '0'}
              onChange={(e) => onChange('horasParadas', e.target.value)}
              className="w-full h-10 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Horas Produtivas</label>
            <div className="w-full h-10 px-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-center">
              {horasTrabalhadas.toFixed(1)} h
            </div>
          </div>
        </div>

        {/* Motivo de Parada (se houver horas paradas > 0) */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Motivo da Parada / Ocorrência</span>
            </label>
            <input
              type="text"
              placeholder="Ex: CHUVA_FORTE, Manutenção na mangueira, Falta de energia"
              value={state.motivoParada || ''}
              onChange={(e) => onChange('motivoParada', e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Horímetro Inicial</label>
              <input
                type="text"
                placeholder="Ex: 1450.2"
                value={state.horimetroInicial ?? ''}
                onChange={(e) => onChange('horimetroInicial', e.target.value)}
                className="w-full h-10 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Horímetro Final</label>
              <input
                type="text"
                placeholder="Ex: 1458.7"
                value={state.horimetroFinal ?? ''}
                onChange={(e) => onChange('horimetroFinal', e.target.value)}
                className="w-full h-10 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
