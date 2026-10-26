import { Proposal } from '@/lib/proposals-types';

/**
 * Gera uma string no formato padrão iCalendar (.ics) compatível com Microsoft Teams, Outlook e Google Calendar.
 * Filtra apenas as propostas atribuídas ao responsável informado.
 */
export function generateICalFeed(proposals: Proposal[], leadName: string): string {
  // Filtrar apenas propostas onde o usuário é Resp. Técnica ou Resp. Comercial
  const userProposals = proposals.filter((p) => {
    if (!leadName || leadName === 'ALL') return true;
    const norm = leadName.toLowerCase().trim();
    const isTech = p.techLead?.toLowerCase().trim().includes(norm);
    const isComm = p.commLead?.toLowerCase().trim().includes(norm);
    return isTech || isComm;
  });

  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Piatec Engenharia//Quadro de Propostas//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Propostas Piatec - ${leadName}`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ];

  userProposals.forEach((p) => {
    if (!p.deliveryDate) return;

    // Data de entrega
    const dt = new Date(p.deliveryDate);
    const year = dt.getUTCFullYear();
    const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const summary = `[ENTREGA] ${p.code} - ${p.clientName} (${p.projectType || 'ONSHORE'})`;
    const description = `Proposta Comercial Piatec\\n` +
      `Código: ${p.code}\\n` +
      `Cliente: ${p.clientName}\\n` +
      `Tipo: ${p.projectType || 'ONSHORE'}\\n` +
      `Valor: R$ ${p.value ? p.value.toLocaleString('pt-BR') : '0'}\\n` +
      `Resp. Técnica: ${p.techLead}\\n` +
      `Resp. Comercial: ${p.commLead}\\n` +
      `Solicitante: ${p.requesterName} (${p.requesterEmail})`;

    ical.push(
      'BEGIN:VEVENT',
      `UID:prop-${p.id}@piatec.com.br`,
      `DTSTAMP:${nowStr}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${dateStr}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  ical.push('END:VCALENDAR');
  return ical.join('\r\n');
}
