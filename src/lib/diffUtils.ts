import { Proposal } from '@/lib/proposals-types';
import { formatCurrency, formatDate } from '@/lib/proposals-utils';

export interface ProposalDiffItem {
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  type: 'value' | 'scope' | 'status' | 'text' | 'date';
}

/**
 * Compara duas revisões de uma proposta e retorna exatamente o que foi modificado!
 */
export function compareProposalRevisions(
  oldSnap: Partial<Proposal>,
  newSnap: Partial<Proposal>
): ProposalDiffItem[] {
  const diffs: ProposalDiffItem[] = [];

  // 1. Valor Total (R$)
  if (oldSnap.value !== undefined && newSnap.value !== undefined && oldSnap.value !== newSnap.value) {
    diffs.push({
      fieldLabel: 'Valor Total (R$)',
      oldValue: formatCurrency(oldSnap.value),
      newValue: formatCurrency(newSnap.value),
      type: 'value',
    });
  }

  // 2. Status / Estágio Comercial
  if (oldSnap.status && newSnap.status && oldSnap.status !== newSnap.status) {
    diffs.push({
      fieldLabel: 'Status Comercial',
      oldValue: oldSnap.status,
      newValue: newSnap.status,
      type: 'status',
    });
  }

  // 3. Tipo de Projeto (ONSHORE, OFFSHORE, TERRAPLANAGEM)
  const oldType = oldSnap.projectType || 'ONSHORE';
  const newType = newSnap.projectType || 'ONSHORE';
  if (oldType !== newType) {
    diffs.push({
      fieldLabel: 'Tipo de Projeto (CPU)',
      oldValue: oldType,
      newValue: newType,
      type: 'scope',
    });
  }

  // 4. Quantidade & Unidade de Medida
  const oldQtd = oldSnap.quantidade;
  const newQtd = newSnap.quantidade;
  const oldUnid = oldSnap.unidadeMedida || '';
  const newUnid = newSnap.unidadeMedida || '';
  if (oldQtd !== undefined && newQtd !== undefined && (oldQtd !== newQtd || oldUnid !== newUnid)) {
    diffs.push({
      fieldLabel: 'Quantidade do Escopo',
      oldValue: oldQtd ? `${oldQtd} ${oldUnid}` : '(Não informada)',
      newValue: newQtd ? `${newQtd} ${newUnid}` : '(Não informada)',
      type: 'scope',
    });
  }

  // 5. Área do Projeto (m²)
  const oldArea = oldSnap.projectArea || '';
  const newArea = newSnap.projectArea || '';
  if (oldArea && newArea && oldArea !== newArea) {
    diffs.push({
      fieldLabel: 'Área do Projeto',
      oldValue: oldArea,
      newValue: newArea,
      type: 'scope',
    });
  }

  // 5. Empresa Cliente
  if (oldSnap.clientName && newSnap.clientName && oldSnap.clientName !== newSnap.clientName) {
    diffs.push({
      fieldLabel: 'Empresa Cliente',
      oldValue: oldSnap.clientName,
      newValue: newSnap.clientName,
      type: 'text',
    });
  }

  // 6. Contato Solicitante
  if (oldSnap.requesterName && newSnap.requesterName && oldSnap.requesterName !== newSnap.requesterName) {
    diffs.push({
      fieldLabel: 'Contato Solicitante',
      oldValue: oldSnap.requesterName,
      newValue: newSnap.requesterName,
      type: 'text',
    });
  }

  // 7. E-mails do Solicitante
  const oldEmails = (oldSnap.requesterEmails || [oldSnap.requesterEmail]).filter(Boolean).join(', ');
  const newEmails = (newSnap.requesterEmails || [newSnap.requesterEmail]).filter(Boolean).join(', ');
  if (oldEmails && newEmails && oldEmails !== newEmails) {
    diffs.push({
      fieldLabel: 'E-mails do Solicitante',
      oldValue: oldEmails,
      newValue: newEmails,
      type: 'text',
    });
  }

  // 8. Data de Entrega
  if (oldSnap.deliveryDate && newSnap.deliveryDate && oldSnap.deliveryDate !== newSnap.deliveryDate) {
    diffs.push({
      fieldLabel: 'Data de Entrega',
      oldValue: formatDate(oldSnap.deliveryDate),
      newValue: formatDate(newSnap.deliveryDate),
      type: 'date',
    });
  }

  // 9. Responsável Técnico
  if (oldSnap.techLead && newSnap.techLead && oldSnap.techLead !== newSnap.techLead) {
    diffs.push({
      fieldLabel: 'Responsável Técnica',
      oldValue: oldSnap.techLead,
      newValue: newSnap.techLead,
      type: 'text',
    });
  }

  // 10. Responsável Comercial
  if (oldSnap.commLead && newSnap.commLead && oldSnap.commLead !== newSnap.commLead) {
    diffs.push({
      fieldLabel: 'Responsável Comercial',
      oldValue: oldSnap.commLead,
      newValue: newSnap.commLead,
      type: 'text',
    });
  }

  // 11. Observações Técnicas
  const oldObs = oldSnap.observations || '';
  const newObs = newSnap.observations || '';
  if (oldObs !== newObs) {
    diffs.push({
      fieldLabel: 'Observações & Escopo Técnico',
      oldValue: oldObs || '(Vazio)',
      newValue: newObs || '(Vazio)',
      type: 'text',
    });
  }

  return diffs;
}
