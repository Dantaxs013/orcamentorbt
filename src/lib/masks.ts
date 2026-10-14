/**
 * Utilitários de Máscaras e Formatação em Tempo Real
 * RBT Fundações & Engenharia — Gestão de Orçamentos
 */

/**
 * Formata um valor numérico ou string para moeda brasileira (BRL: R$ 0.000,00).
 * Compatível tanto com exibição estática quanto com digitação em tempo real baseada em centavos.
 */
export function formatCurrencyBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return 'R$ 0,00';
  }

  let numeric: number;

  if (typeof value === 'number') {
    numeric = isNaN(value) ? 0 : value;
  } else {
    const trimmed = String(value).trim();
    // Se a string já tiver vírgula (padrão brasileiro)
    if (trimmed.includes(',')) {
      const clean = trimmed.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
      numeric = parseFloat(clean);
    } else if (trimmed.includes('.')) {
      // String de float padrão (ex: "1250.50")
      const clean = trimmed.replace(/[^\d.-]/g, '');
      numeric = parseFloat(clean);
    } else {
      // Digitação bruta (apenas dígitos)
      const digits = trimmed.replace(/\D/g, '');
      numeric = digits ? parseInt(digits, 10) / 100 : 0;
    }
  }

  if (isNaN(numeric)) {
    numeric = 0;
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(numeric)
    .replace(/\u00A0/g, ' '); // Substitui NBSP por espaço comum
}

/**
 * Extrai o valor numérico (float) limpo a partir de uma string formatada ou mascarada em BRL.
 * Exemplo: "R$ 12.500,50" -> 12500.5
 */
export function parseCurrencyBRL(masked: string | number | null | undefined): number {
  if (masked === null || masked === undefined || masked === '') {
    return 0;
  }

  if (typeof masked === 'number') {
    return isNaN(masked) ? 0 : masked;
  }

  const str = String(masked).trim();

  // Formato brasileiro com vírgula decimal
  if (str.includes(',')) {
    const clean = str.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  // Float com ponto decimal
  if (str.includes('.')) {
    const clean = str.replace(/[^\d.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  // Apenas dígitos puros (centavos)
  const digits = str.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

/**
 * Processa a digitação em tempo real em um input monetário (shift de centavos).
 * Retorna tanto a string mascarada quanto o valor numérico em ponto flutuante.
 */
export function maskCurrencyKeystroke(input: string): { masked: string; numericValue: number } {
  const digits = input.replace(/\D/g, '');
  if (!digits) {
    return { masked: 'R$ 0,00', numericValue: 0 };
  }

  const cents = parseInt(digits, 10);
  const numericValue = cents / 100;
  const masked = formatCurrencyBRL(numericValue);

  return { masked, numericValue };
}

/**
 * Formata um número de telefone brasileiro no padrão (XX) XXXX-XXXX ou (XX) XXXXX-XXXX.
 * Aplica máscara progressiva conforme a digitação.
 */
export function formatPhoneBR(value: string | null | undefined): string {
  if (!value) return '';

  const digits = String(value).replace(/\D/g, '').slice(0, 11);

  if (!digits) return '';

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  // Telefone fixo (até 10 dígitos)
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  // Celular / WhatsApp (11 dígitos)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Normaliza formatação de dimensões e medidas técnicas de engenharia.
 * Padroniza espaçamento em multiplicadores (ex: "10x20" -> "10 x 20").
 */
export function formatDimension(value: string | null | undefined): string {
  if (!value) return '';

  return String(value)
    .replace(/\s*([xX×*])\s*/g, ' x ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Modelos e atalhos rápidos de dimensões para formulários de engenharia da RBT.
 */
export const DIMENSION_GUIDES = [
  { label: 'Ø Diâmetro x Comp.', template: 'Ø 310mm x 12m' },
  { label: 'Larg. x Comp. x Alt.', template: '1000 x 2000 x 500 mm' },
  { label: 'Perfil Metálico W', template: 'Perfil W 250 x 32.7 kg/m' },
  { label: 'Chapa de Aço (pol)', template: 'Chapa 1/2" (12.7mm)' },
  { label: 'Metragem Linear', template: '35 metros lineares' },
];
