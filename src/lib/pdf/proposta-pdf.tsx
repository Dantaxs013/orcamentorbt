import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#BA1A1A',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#BA1A1A',
  },
  brandSubtitle: {
    fontSize: 9,
    color: '#475569',
    marginTop: 2,
    letterSpacing: 1.5,
  },
  proposalMeta: {
    alignItems: 'flex-end',
  },
  protocolBadge: {
    backgroundColor: '#111827',
    color: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 'bold',
  },
  metaDate: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  grid2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 10,
    color: '#0f172a',
    marginBottom: 6,
  },
  valueBox: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    color: '#ffffff',
    padding: 6,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 6,
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 6,
    backgroundColor: '#f8fafc',
  },
  tableColDesc: {
    flex: 3,
  },
  tableColVal: {
    flex: 1,
    textAlign: 'right',
  },
  totalSection: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  totalCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#BA1A1A',
    borderRadius: 6,
    padding: 10,
    width: 220,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalHighlight: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#BA1A1A',
  },
  termsBox: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 4,
    fontSize: 8,
    color: '#475569',
    lineHeight: 1.4,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94a3b8',
  },
});

export interface PropostaPdfProps {
  protocolo: string;
  dataEmissao: string;
  cliente: {
    nome: string;
    email: string;
    telefone?: string | null;
    empresa?: string | null;
  };
  especificacoes: {
    tipoServico: string;
    detalhes: string;
    dimensoes?: string | null;
    quantidade: number;
    material?: string | null;
    prazoDesejado?: string | null;
    localEntrega?: string | null;
  };
  comercial: {
    custoMaoDeObra: number;
    custoMateriais: number;
    custosExtras: number;
    bdiMargemPerc: number;
    valorTotal: number;
    condicoesPagamento?: string | null;
    prazoExecucaoDias: number;
    validadeDias: number;
    observacoes?: string | null;
  };
}

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PropostaDocument({
  protocolo,
  dataEmissao,
  cliente,
  especificacoes,
  comercial,
}: PropostaPdfProps) {
  return (
    <Document title={`Proposta_Comercial_${protocolo}`} author="RBT Engenharia">
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>RBT FUNDAÇÕES & ENGENHARIA</Text>
            <Text style={styles.brandSubtitle}>PROPOSTA TÉCNICA E COMERCIAL</Text>
          </View>
          <View style={styles.proposalMeta}>
            <Text style={styles.protocolBadge}>{protocolo}</Text>
            <Text style={styles.metaDate}>Emissão: {dataEmissao}</Text>
          </View>
        </View>

        {/* 1. Dados do Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Informações do Solicitante / Cliente</Text>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <Text style={styles.label}>Cliente / Razão Social</Text>
              <Text style={styles.value}>{cliente.nome}</Text>
              <Text style={styles.label}>Empresa</Text>
              <Text style={styles.value}>{cliente.empresa || 'Não informada'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>E-mail</Text>
              <Text style={styles.value}>{cliente.email}</Text>
              <Text style={styles.label}>Telefone / Contato</Text>
              <Text style={styles.value}>{cliente.telefone || 'Não informado'}</Text>
            </View>
          </View>
        </View>

        {/* 2. Escopo Técnico Solicitado */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Escopo e Especificação Técnica</Text>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <Text style={styles.label}>Tipo de Serviço / Peça</Text>
              <Text style={styles.value}>{especificacoes.tipoServico}</Text>
              <Text style={styles.label}>Quantidade</Text>
              <Text style={styles.value}>{especificacoes.quantidade} un</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Material / Acabamento</Text>
              <Text style={styles.value}>{especificacoes.material || 'Padrão RBT'}</Text>
              <Text style={styles.label}>Dimensões / Medidas</Text>
              <Text style={styles.value}>{especificacoes.dimensoes || 'Conforme projeto'}</Text>
            </View>
          </View>
          <View style={{ marginTop: 4 }}>
            <Text style={styles.label}>Detalhamento Técnico / Requisitos</Text>
            <View style={styles.valueBox}>
              <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{especificacoes.detalhes}</Text>
            </View>
          </View>
        </View>

        {/* 3. Discriminação de Custos e Proposta Comercial */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Demonstrativo Financeiro</Text>
          <View style={styles.table}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableColDesc, { color: '#ffffff' }]}>Descrição do Item</Text>
              <Text style={[styles.tableColVal, { color: '#ffffff' }]}>Subtotal</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableColDesc}>Mão de Obra Especializada & Engenharia</Text>
              <Text style={styles.tableColVal}>{formatBRL(comercial.custoMaoDeObra)}</Text>
            </View>
            <View style={styles.tableRowAlt}>
              <Text style={styles.tableColDesc}>Insumos, Matéria-Prima e Materiais de Fabricação</Text>
              <Text style={styles.tableColVal}>{formatBRL(comercial.custoMateriais)}</Text>
            </View>
            {comercial.custosExtras > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableColDesc}>Logística, Deslocamento e Custos Acessórios</Text>
                <Text style={styles.tableColVal}>{formatBRL(comercial.custosExtras)}</Text>
              </View>
            )}
            <View style={styles.tableRowAlt}>
              <Text style={styles.tableColDesc}>BDI / Margem Operacional ({comercial.bdiMargemPerc}%)</Text>
              <Text style={styles.tableColVal}>Incluso no Total</Text>
            </View>
          </View>

          <View style={styles.totalSection}>
            <View style={styles.totalCard}>
              <View style={styles.totalRow}>
                <Text style={styles.label}>Prazo Estimado:</Text>
                <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{comercial.prazoExecucaoDias} dias úteis</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.label}>Validade:</Text>
                <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{comercial.validadeDias} dias corridos</Text>
              </View>
              <View style={[styles.totalRow, { marginTop: 6, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6 }]}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#111827' }}>VALOR TOTAL:</Text>
                <Text style={styles.totalHighlight}>{formatBRL(comercial.valorTotal)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Condições Comerciais */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Condições de Fornecimento e Pagamento</Text>
          <Text style={styles.value}>
            <Text style={{ fontWeight: 'bold' }}>Condições de Pagamento: </Text>
            {comercial.condicoesPagamento || 'A combinar'}
          </Text>
          {comercial.observacoes && (
            <Text style={[styles.value, { marginTop: 4 }]}>
              <Text style={{ fontWeight: 'bold' }}>Observações: </Text>
              {comercial.observacoes}
            </Text>
          )}

          <View style={styles.termsBox}>
            <Text>
              Esta proposta comercial foi calculada com base nas especificações técnicas fornecidas pelo solicitante. Qualquer alteração de escopo, medidas ou matéria-prima sujeitará readequação de valores. Valores com impostos incidentes incluídos conforme legislação vigente.
            </Text>
          </View>
        </View>

        {/* Rodapé fixo */}
        <View style={styles.footer}>
          <Text>RBT Fundações & Engenharia — CNPJ e Registro CREA ativos</Text>
          <Text>Documento confidencial gerado pelo Sistema de Orçamentos RBT</Text>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Renderiza o documento PDF diretamente em um Buffer Node.js
 */
export async function generatePropostaPdfBuffer(props: PropostaPdfProps): Promise<Buffer> {
  return await renderToBuffer(<PropostaDocument {...props} />);
}
