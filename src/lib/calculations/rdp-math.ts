/**
 * Live Math and Calculation Engine for RBT Fundações - Relatório Diário de Produção (RDP)
 * Specifications: ORIGINAL_REQUEST.md §R2, §AC; PROJECT.md §Features 11-13; Spec Miner Section 4.1
 */

export interface LinhaProducaoItem {
  numeroLinha: number; // 1 to 25
  numeroEstaca?: string | null;
  perfil?: string | null; // e.g. "W150", "W310", "W150x22.5", "W310x32.7"
  comprimento?: number; // in meters (also maps to profundidade)
  profundidade?: number; // alias for database schema compatibility
  diametro?: number | null;
  cotaTerreno?: number | null;
  cotaArrasamento?: number | null;
  emendaW150: number;
  emendaW310: number;
  talas: number;
  arrasamento: number; // in meters
  comprimentoUtil?: number | null; // max(0, round2(comprimento - arrasamento))
  negaRepique?: string | null;
  horarioCravacao?: string | null;
  horaInicio?: string | null;
  horaFim?: string | null;
  tempoParadaMinutos?: number;
  motivoParada?: string | null;
  observacao?: string | null;
}

export interface ShiftHours {
  inicio?: string;
  fim?: string;
  almocoInicio?: string;
  almocoFim?: string;
  horasParadas?: number | string;
}

export interface RdpTotals {
  totalEstacas: number;
  metragemTotal: number;
  totalW150: number;
  totalW310: number;
  totalEmendas: number;
  totalTalas: number;
  totalArrasamento: number;
  metragemLiquida: number;
  horasTrabalhadas?: number;
  horasParadas?: number;
}

export interface RelatorioDiarioData {
  id?: string;
  obraId: string;
  apontadorId?: string;
  revisadoPorId?: string | null;
  numeroSequencial?: number;
  data: string | Date;
  turno?: string;
  maquinaEquipamento: string;
  operador: string;
  soldador?: string | null;
  encarregado?: string | null;
  equipeDescricao?: string | null;
  condicaoClimatica?: string;
  status?: string;
  horarioInicio?: string | null;
  horaInicio?: string | null;
  horarioTermino?: string | null;
  horaFim?: string | null;
  intervaloAlmocoInicio?: string | null;
  intervaloAlmocoFim?: string | null;
  horasTrabalhadas?: number | null;
  horasParadas?: number | null;
  motivoParada?: string | null;
  observacoes?: string | null;
  motivoRejeicao?: string | null;
  assinadoApontador?: boolean;
  dataAssinaturaApontador?: Date | string | null;
  assinadoEngenheiro?: boolean;
  dataAssinaturaEngenheiro?: Date | string | null;
  assinadoFiscal?: boolean;
  dataAssinaturaFiscal?: Date | string | null;
  linhas: LinhaProducaoItem[];
}

/**
 * Parses numbers with support for Brazilian comma notation ("12,50" -> 12.50)
 * and thousands separators ("1.250,50" -> 1250.50).
 * Safely handles null, undefined, strings, whitespace, and NaN.
 */
export function parseBrazilianNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (typeof val === 'string') {
    let cleaned = val.trim().replace(/\s/g, '');
    if (cleaned === '') return 0;
    if (cleaned.includes(',') && cleaned.includes('.')) {
      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
        // Brazilian format: 1.250,50 -> 1250.50
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // US format: 1,250.50 -> 1250.50
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Rounds a floating point number to 2 decimal places with BRL financial stability
 */
export function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate per-line derived fields:
 * comprimentoUtil = max(0, round2(comprimento - arrasamento))
 */
export function calculateLineMetrics(line: Partial<LinhaProducaoItem> & { profundidade?: unknown }): LinhaProducaoItem & { comprimento: number } {
  const numeroLinha = line.numeroLinha ?? 1;
  const compVal = line.comprimento !== undefined ? line.comprimento : line.profundidade;
  const comprimento = Math.max(0, parseBrazilianNumber(compVal));
  const arrasamento = Math.max(0, parseBrazilianNumber(line.arrasamento));
  const emendaW150 = Math.max(0, Math.floor(parseBrazilianNumber(line.emendaW150)));
  const emendaW310 = Math.max(0, Math.floor(parseBrazilianNumber(line.emendaW310)));
  const talas = Math.max(0, Math.floor(parseBrazilianNumber(line.talas)));
  const cotaTerreno = line.cotaTerreno !== undefined && line.cotaTerreno !== null && (line.cotaTerreno as unknown) !== '' ? parseBrazilianNumber(line.cotaTerreno) : null;
  const cotaArrasamento = line.cotaArrasamento !== undefined && line.cotaArrasamento !== null && (line.cotaArrasamento as unknown) !== '' ? parseBrazilianNumber(line.cotaArrasamento) : null;
  const comprimentoUtil = Math.max(0, round2(comprimento - arrasamento));

  return {
    numeroLinha,
    numeroEstaca: line.numeroEstaca ? String(line.numeroEstaca).trim() : null,
    perfil: line.perfil ? String(line.perfil).trim() : null,
    comprimento: round2(comprimento),
    profundidade: round2(comprimento),
    diametro: line.diametro !== undefined && line.diametro !== null ? Math.round(parseBrazilianNumber(line.diametro)) : null,
    cotaTerreno,
    cotaArrasamento,
    emendaW150,
    emendaW310,
    talas,
    arrasamento: round2(arrasamento),
    comprimentoUtil: round2(comprimentoUtil),
    negaRepique: line.negaRepique || null,
    horarioCravacao: line.horarioCravacao || null,
    horaInicio: line.horaInicio || null,
    horaFim: line.horaFim || null,
    tempoParadaMinutos: line.tempoParadaMinutos ? Math.max(0, Math.floor(parseBrazilianNumber(line.tempoParadaMinutos))) : 0,
    motivoParada: line.motivoParada || null,
    observacao: line.observacao || null,
  };
}

/**
 * Real-Time Live Math Engine: Recalculates all dynamic total metrics across the 25 rows
 * 1. Total Estacas: count of lines with non-empty numeroEstaca
 * 2. Metragem Total Cravada (m): sum of comprimento
 * 3. Total Emendas W150: sum of emendaW150
 * 4. Total Emendas W310: sum of emendaW310
 * 5. Total Geral de Emendas: W150 + W310
 * 6. Total de Talas: sum of talas
 * 7. Total Metragem Arrasamento (m): sum of arrasamento
 * 8. Metragem Líquida Final (m): Metragem Total - Total Arrasamento
 * 9. Horas Trabalhadas: (Fim - Inicio) - Almoço - HorasParadas
 */
export function calculateRdpTotals(
  rawLines: Partial<LinhaProducaoItem>[],
  shiftHours?: ShiftHours
): RdpTotals {
  let totalEstacas = 0;
  let metragemTotal = 0;
  let totalW150 = 0;
  let totalW310 = 0;
  let totalTalas = 0;
  let totalArrasamento = 0;

  const linesToProcess = (rawLines || []).slice(0, 25);

  for (const rawLine of linesToProcess) {
    const line = calculateLineMetrics(rawLine);
    if (line.numeroEstaca && line.numeroEstaca.length > 0) {
      totalEstacas += 1;
    }
    metragemTotal += line.comprimento;
    totalW150 += line.emendaW150;
    totalW310 += line.emendaW310;
    totalTalas += line.talas;
    totalArrasamento += line.arrasamento;
  }

  const metragemLiquida = round2(metragemTotal - totalArrasamento);

  let horasTrabalhadas = 0;
  let horasParadas = shiftHours?.horasParadas !== undefined ? parseBrazilianNumber(shiftHours.horasParadas) : 0;

  if (shiftHours?.inicio && shiftHours?.fim) {
    const [hIn, mIn] = shiftHours.inicio.split(':').map(Number);
    const [hOut, mOut] = shiftHours.fim.split(':').map(Number);
    if (!isNaN(hIn) && !isNaN(hOut)) {
      const startMin = hIn * 60 + (mIn || 0);
      const endMin = hOut * 60 + (mOut || 0);
      let grossMinutes = Math.max(0, endMin - startMin);

      // Deduct lunch
      if (shiftHours.almocoInicio && shiftHours.almocoFim) {
        const [hLIn, mLIn] = shiftHours.almocoInicio.split(':').map(Number);
        const [hLOut, mLOut] = shiftHours.almocoFim.split(':').map(Number);
        if (!isNaN(hLIn) && !isNaN(hLOut)) {
          const lunchMin = Math.max(0, (hLOut * 60 + (mLOut || 0)) - (hLIn * 60 + (mLIn || 0)));
          grossMinutes = Math.max(0, grossMinutes - lunchMin);
        }
      }

      const productiveMinutes = Math.max(0, grossMinutes - Math.round(horasParadas * 60));
      horasTrabalhadas = round2(productiveMinutes / 60);
    }
  }

  return {
    totalEstacas,
    metragemTotal: round2(metragemTotal),
    totalW150,
    totalW310,
    totalEmendas: totalW150 + totalW310,
    totalTalas,
    totalArrasamento: round2(totalArrasamento),
    metragemLiquida,
    horasTrabalhadas,
    horasParadas: round2(horasParadas),
  };
}

/**
 * Validates integrity of a single production line according to domain rules
 */
export function validateLineIntegrity(line: Partial<LinhaProducaoItem> & { profundidade?: unknown }): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const numeroLinha = line.numeroLinha ?? 1;

  if (numeroLinha < 1 || numeroLinha > 25) {
    errors.push(`Linha ${numeroLinha}: O número da linha deve estar entre 1 e 25.`);
  }

  const hasEstaca = Boolean(line.numeroEstaca && String(line.numeroEstaca).trim().length > 0);
  const compVal = line.comprimento !== undefined ? line.comprimento : line.profundidade;
  const comprimento = parseBrazilianNumber(compVal);
  const arrasamento = parseBrazilianNumber(line.arrasamento);

  if (arrasamento < 0) {
    errors.push(`Linha ${numeroLinha}: O arrasamento não pode ser negativo.`);
  }

  if (comprimento < 0) {
    errors.push(`Linha ${numeroLinha}: O comprimento cravado não pode ser negativo.`);
  }

  if (hasEstaca && comprimento <= 0) {
    errors.push(`Linha ${numeroLinha}: Estaca "${line.numeroEstaca}" informada, mas o comprimento cravado não foi preenchido.`);
  }

  if (arrasamento > comprimento && comprimento >= 0 && arrasamento >= 0) {
    errors.push(
      `Linha ${numeroLinha}: O arrasamento (${arrasamento.toFixed(2)}m) não pode ser superior ao comprimento cravado (${comprimento.toFixed(2)}m).`
    );
  }

  if (parseBrazilianNumber(line.emendaW150) < 0 || parseBrazilianNumber(line.emendaW310) < 0) {
    errors.push(`Linha ${numeroLinha}: Quantidade de emendas não pode ser negativa.`);
  }
  if (parseBrazilianNumber(line.talas) < 0) {
    errors.push(`Linha ${numeroLinha}: Quantidade de talas não pode ser negativa.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates entire RDP for submission
 */
export function validateRdpSubmission(rdp: Partial<RelatorioDiarioData>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rdp.obraId) errors.push('Obra é obrigatória.');
  if (!rdp.data) errors.push('Data é obrigatória.');
  if (!rdp.maquinaEquipamento) errors.push('Máquina/Equipamento é obrigatório.');
  if (!rdp.operador) errors.push('Nome do operador é obrigatório.');

  const lines = (rdp.linhas || []).slice(0, 25);
  for (const line of lines) {
    const lineValidation = validateLineIntegrity(line);
    if (!lineValidation.valid) {
      errors.push(...lineValidation.errors);
    }
  }

  const totals = calculateRdpTotals(lines);
  if (totals.totalEstacas === 0) {
    const horasParadas = parseBrazilianNumber(rdp.horasParadas);
    const hasMotivo = Boolean(rdp.motivoParada || rdp.observacoes);
    if (horasParadas <= 0 || !hasMotivo) {
      errors.push(
        'Para relatórios sem estacas cravadas, é obrigatório informar as Horas Paradas (> 0) e a justificativa/motivo da paralisação.'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
