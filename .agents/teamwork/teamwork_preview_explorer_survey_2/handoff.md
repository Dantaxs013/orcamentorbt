# Relatório de Investigação UX, Máscaras de Entrada, Feedback & Modais (R2)

**Agente**: Explorer 2 (Survey - UX, Input Masks, Feedback & Modals)  
**Data**: 2026-10-07  
**Alvo**: Requisito R2 — Usabilidade, Ergonomia de Uso e Feedback (UX) da Aplicação Web RBT Fundações  
**Diretório de Trabalho**: `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/teamwork_preview_explorer_survey_2`

---

## 1. Observações (Observations)

### 1.1 Dependências e Bibliotecas de Interface (`package.json`)
- **Arquivo**: `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/package.json`
- **Linhas 18 a 30**:
  ```json
  "dependencies": {
    "@prisma/client": "^5.21.1",
    "@react-pdf/renderer": "^3.4.4",
    "bcryptjs": "^2.4.3",
    "clsx": "^2.1.1",
    "lucide-react": "^0.453.0",
    "next": "^14.2.15",
    "nodemailer": "^6.9.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.4",
    "zod": "^3.23.8"
  }
  ```
- **Constatação direta**: Não há nenhuma biblioteca de toast instalada (nem `sonner`, nem `react-hot-toast`), nenhuma biblioteca de máscaras de entrada (nem `react-imask`, nem `react-number-format`), e nenhum headless modal do Radix UI. Os componentes atuais são 100% customizados em React puro com Tailwind CSS.

### 1.2 Layout Raiz (`src/app/layout.tsx`)
- **Arquivo**: `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/src/app/layout.tsx`
- **Linhas 9 a 20**:
  ```tsx
  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <html lang="pt-BR">
        <body className="antialiased min-h-screen bg-slate-100 text-slate-900">
          {children}
        </body>
      </html>
    );
  }
  ```
- **Constatação direta**: Não existe nenhum `ToastProvider`, `Toaster` ou container global montado no DOM para gerenciar notificações flutuantes ou assíncronas.

### 1.3 Formulários e Campos de Entrada Identificados

#### A. Formulário de Elaboração e Precificação de Proposta (`src/components/orcamentos/detalhes-orcamento-client.tsx`)
- **Entradas Monetárias (Linhas 434-470)**:
  ```tsx
  // Custo Mão de Obra
  <input
    type="number"
    min={0}
    step={10}
    value={custoMaoDeObra}
    onChange={(e) => setCustoMaoDeObra(Number(e.target.value) || 0)}
    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
  />
  // Custo Materiais
  <input
    type="number"
    min={0}
    step={10}
    value={custoMateriais}
    onChange={(e) => setCustoMateriais(Number(e.target.value) || 0)}
    ...
  />
  // Custos Extras / Frete
  <input
    type="number"
    min={0}
    step={10}
    value={custosExtras}
    onChange={(e) => setCustosExtras(Number(e.target.value) || 0)}
    ...
  />
  ```
  - **Problema de UX**: Os inputs utilizam `<input type="number">`. Não possuem formatação visual monetária brasileira (sem prefixo `R$`, sem separadores de milhar `.` e decimais `,`). O usuário precisa digitar valores brutos em ponto flutuante em vez de ver a formatação monetária padrão brasileira em tempo real.
- **Entradas de Margem e Prazos (Linhas 477-513)**:
  - `bdiMargemPerc`: `<input type="number" min={0} max={100} ... />`
  - `prazoExecucaoDias`: `<input type="number" min={1} ... />`
  - `validadePropostaDias`: `<input type="number" min={1} ... />`
  - `condicoesPagamento`: `<input type="text" ... />`
- **Despacho Imediato de Proposta por E-mail (Linhas 576-591)**:
  ```tsx
  <button
    type="button"
    disabled={loading}
    onClick={() => handleSalvarProposta(true)}
    className="w-full sm:w-1/2 py-3.5 px-4 bg-[#BA1A1A] hover:bg-[#991B1B] text-white font-bold ..."
  >
    <Send className="w-4 h-4" />
    <span>Gerar PDF & Enviar por E-mail</span>
  </button>
  ```
  - **Problema Crítico de UX / Segurança Operacional**: Ao clicar no botão, a função `handleSalvarProposta(true)` é executada **diretamente sem qualquer modal de confirmação**. Isso dispara imediatamente uma requisição POST que gera o PDF e envia o e-mail oficial ao cliente real com anexos. Não há chance para o operador revisar os dados nem evitar envios acidentais.
- **Alteração de Status sem Confirmação (Linhas 173-186)**:
  ```tsx
  <select
    value={currentStatus}
    onChange={(e) => handleMudarStatus(e.target.value)}
    disabled={loading}
    className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
  >
    <option value="AGUARDANDO_CLIENTE">Aguardando Cliente</option>
    <option value="AGUARDANDO_ANALISE">Aguardando Análise</option>
    <option value="EM_ANALISE">Em Análise</option>
    <option value="PROPOSTA_ENVIADA">Proposta Enviada</option>
    <option value="APROVADO">Aprovado</option>
    <option value="REJEITADO">Rejeitado</option>
  </select>
  ```
  - **Problema de UX**: Alterar o status para `REJEITADO` ou `APROVADO` dispara a alteração imediatamente no banco de dados sem confirmação e sem solicitar o motivo (`motivo`), apesar da API `PATCH /api/orcamentos/[id]/status` e da tabela `StatusLog` suportarem o campo `motivo`.
- **Mecanismo de Feedback (Linhas 190-201)**:
  ```tsx
  {successMsg && (
    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      <span>{successMsg}</span>
    </div>
  )}
  {errorMsg && (
    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-800 flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
      <span>{errorMsg}</span>
    </div>
  )}
  ```
  - **Problema de UX**: A mensagem é exibida no topo da página. Se o usuário estiver no fim da página (onde estão os botões de ação), ele não visualiza a mensagem caso não role a tela para cima.

#### B. Formulário de Nova Solicitação (`src/components/orcamentos/nova-solicitacao-modal.tsx`)
- **Campo de Telefone / WhatsApp (Linhas 237-245)**:
  ```tsx
  <input
    type="text"
    value={formData.telefone}
    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
    placeholder="(11) 99999-9999"
    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
  />
  ```
  - **Problema de UX**: Apenas o placeholder possui formatação. O input aceita texto livre sem qualquer máscara numérica de DDD e 8 ou 9 dígitos (`(99) 99999-9999` ou `(99) 9999-9999`).
- **Feedback de Notificação**:
  - Em caso de erro: banner estático `{error && <div className="p-3 bg-red-50 ...">{error}</div>}` (Linhas 190-194).
  - Em caso de cópia do link: estado booleano `copied` temporário de 2500ms (Linha 90). Sem toast.

#### C. Formulário Público do Cliente via Magic Link (`src/app/formulario/[token]/page.tsx`)
- **Campo de Dimensões / Medidas (Linhas 280-286)**:
  ```tsx
  <input
    type="text"
    value={formData.dimensoes}
    onChange={(e) => setFormData({ ...formData, dimensoes: e.target.value })}
    placeholder="Ex: Diâmetro 310mm x Comprimento 12 metros"
    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
  />
  ```
  - **Problema de UX**: Campo de texto livre sem formatação guiada ou botões auxiliares para padrões de engenharia (ex: Ø Diâmetro, Comprimento, Largura x Altura, Unidades métricas mm/m).
- **Submissão do Formulário (Linhas 368-382)**:
  - Envia diretamente ao clicar no botão "Enviar Especificações para Análise". Uma vez enviado, o Magic Link é invalidado atomicamente no backend (`used: true`) e o cliente não pode mais editar. Não há modal de confirmação ou revisão para evitar envios com dados incompletos.

#### D. Quadro Kanban (`src/components/orcamentos/kanban-board.tsx`)
- **Ação de Copiar Link (Linhas 110-117)**:
  - Usa estado local `copiedToken` que altera o ícone por 2 segundos. Sem toast flutuante notificando "Magic Link copiado para a área de transferência!".

### 1.4 Estado de Compilação e Tipagem
- **Comandos executados**:
  - `npx tsc --noEmit`: Código de saída **0** (sem erros de compilação de tipos).
  - `npm run build`: Código de saída **0** (Next.js 14 compilou todas as 10 rotas com sucesso).

---

## 2. Cadeia Lógica (Logic Chain)

1. **A partir de [1.1] e [1.2]**:
   - A aplicação não possui nenhuma biblioteca de terceiros para toasts ou máscaras, e o `RootLayout` não possui provedor de contexto para feedback global.
   - *Inferência*: Para adicionar toasts e máscaras, é necessário ou instalar bibliotecas consagradas (`sonner` para toasts) ou implementar um sistema próprio e limpo via React Context + Tailwind CSS. Dada a arquitetura Next.js 14 (App Router), `sonner` ou um hook/context nativo de Toast integrado ao `RootLayout` fornece feedback consistente sem poluir o DOM.

2. **A partir de [1.3 - A]**:
   - Os inputs de custos (`custoMaoDeObra`, `custoMateriais`, `custosExtras`) são manipulados como `number` bruto em inputs `type="number"`. O schema de validação (`propostaComercialSchema` em `orcamento.schema.ts`) valida valores numéricos com `z.coerce.number().min(0)`.
   - *Inferência*: Para satisfazer a exigência de máscaras monetárias em tempo real em R$ sem quebrar o Zod no backend, deve-se criar um componente utilitário ou hook de máscara monetária (ex: `CurrencyInput` ou `maskBRL`) que formate visualmente para `R$ 1.250,00` enquanto sincroniza o valor numérico em ponto flutuante (`1250.00`) para os cálculos de subtotal, BDI e payload da API.

3. **A partir de [1.3 - B]**:
   - O campo de telefone em `NovaSolicitacaoModal` aceita qualquer caractere e não impõe estrutura telefônica brasileira.
   - *Inferência*: Uma função utilitária de máscara `maskPhone(value)` com adaptação automática para 10 dígitos (`(XX) XXXX-XXXX`) e 11 dígitos (`(XX) XXXXX-XXXX` celular/WhatsApp) proporcionará preenchimento imediato e legível, padronizando os registros no banco de dados.

4. **A partir de [1.3 - C]**:
   - O campo de medidas em `formulario/[token]/page.tsx` aceita qualquer entrada livre e a submissão bloqueia o Magic Link permanentemente.
   - *Inferência*: Adicionar sugestões/padrões contextuais de medidas (ex.: `mm`, `m`, `cm`, `Ø`, `pol`) e um modal de confirmação pré-envio evita submissões equivocadas e eleva a clareza técnica.

5. **A partir de [1.3 - A]**:
   - O botão "Gerar PDF & Enviar por E-mail" e o seletor de status realizam operações de alto impacto (disparo real de e-mail ao cliente, mudança definitiva de status) sem confirmação prévia do usuário.
   - *Inferência*: É indispensável criar um componente reutilizável de modal de confirmação (`ConfirmModal` / `ConfirmDialog`), parametrizável com título, mensagem descritiva, badge de alerta e botões de confirmação/cancelamento. Ele deve ser acionado:
     a) Antes de despachar a proposta por e-mail, exibindo o resumo do valor total calculado e o e-mail de destino.
     b) Ao alterar para status sensíveis (`REJEITADO`, `APROVADO`), solicitando opcionalmente o motivo (`motivo`) para registro em log de auditoria.

---

## 3. Ressalvas e Limitações (Caveats)

- **Sem alteração de código fonte**: Esta investigação é estritamente de leitura (read-only), sem modificações aplicadas aos arquivos da aplicação neste turno.
- **Transição de formato de dados**: Ao introduzir máscaras monetárias na interface, deve-se garantir que o componente entregue valores numéricos (`number`) para a API, mantendo total retrocompatibilidade com o schema Zod e as colunas `Decimal` do Prisma.
- **Ambiente de e-mail**: Conforme visto em `src/lib/email.ts`, em ambiente local sem variáveis SMTP válidas, o envio de e-mails opera em modo simulado no console (`simulated: true`), o que permite testes locais seguros do fluxo de despacho.

---

## 4. Conclusão e Recomendações de Implementação para R2

Para atender integralmente aos critérios de aceitação do **Requisito R2**:

### 4.1 Máscaras de Entrada e Formatação em Tempo Real
1. **Utilitário de Máscaras (`src/lib/utils/masks.ts`)**:
   - `maskBRL(value: number | string): string` / `unmaskBRL(value: string): number`: Conversão bidirecional entre centavos/reais e formato legível `R$ X.XXX,XX`.
   - `maskPhone(value: string): string`: Formatação dinâmica de telefones brasileiros (`(11) 98765-4321` ou `(11) 3456-7890`).
   - `formatDimension(value: string): string`: Auxiliar para normalização de símbolos técnicos métricos (ex.: `x`, `×`, `Ø`, `mm`, `m`).
2. **Componente `CurrencyInput` (`src/components/ui/currency-input.tsx`)**:
   - Input customizado com prefixo `R$`, máscara durante a digitação e emissão limpa do valor numérico float para o estado pai via `onChange(val: number)`.
   - Substituição dos três inputs numéricos de custos em `src/components/orcamentos/detalhes-orcamento-client.tsx`.
3. **Máscara de Telefone**:
   - Aplicar `maskPhone` no `input` de telefone em `src/components/orcamentos/nova-solicitacao-modal.tsx`.

### 4.2 Sistema de Notificações Visuais (Toasts)
1. **Opção Recomendada (Alta Estabilidade e Zero Dependência Quebrada)**:
   - Criar `src/components/ui/toast.tsx` e `src/components/ui/toast-context.tsx` (ou instalar e configurar `sonner` com `npm install sonner`).
   - Montar o container `<Toaster position="top-right" richColors />` no `src/app/layout.tsx`.
   - Disparar toasts em ações chave:
     - `toast.success('Proposta gerada e enviada com sucesso!')` ao despachar proposta.
     - `toast.success('Status atualizado para ...')` ao alterar status.
     - `toast.success('Link copiado para a área de transferência!')` nos botões de cópia.
     - `toast.error(errorMessage)` ao falhar requisições da API.

### 4.3 Modais de Confirmação para Ações de Impacto
1. **Componente Reutilizável `ConfirmModal` (`src/components/ui/confirm-modal.tsx`)**:
   - Modal com backdrop escurecido, título, corpo com detalhes, ícones de aviso e botões customizáveis de Cancelar/Confirmar.
2. **Integrações Obrigatórias**:
   - **Despacho de Proposta por E-mail**: Em `detalhes-orcamento-client.tsx`, o botão "Gerar PDF & Enviar por E-mail" abre o modal mostrando:
     - "Confirmar Envio da Proposta Comercial?"
     - Destinatário: `{orcamento.lead.nome} ({orcamento.lead.email})`
     - Valor Total: `{formatCurrency(valorTotalCalculado)}`
     - "Esta ação enviará o documento oficial em PDF para o cliente externo e atualizará o status para 'Proposta Enviada'."
   - **Mudança de Status Crítica**: Modal ao selecionar `REJEITADO` ou `APROVADO`, permitindo registrar o motivo (`motivo`) enviado ao `PATCH /api/orcamentos/[id]/status`.
   - **Envio do Formulário pelo Cliente**: Em `formulario/[token]/page.tsx`, modal de confirmação antes de concluir e invalidar o Magic Link.

---

## 5. Método de Verificação (Verification Method)

Para o Implementador verificar de forma independente as alterações propostas:

1. **Checagem de Tipos Estrita**:
   ```bash
   npx tsc --noEmit
   ```
   Deve concluir com código de saída 0 e sem erros de tipagem.

2. **Compilação de Produção**:
   ```bash
   npm run build
   ```
   Todas as rotas estáticas e dinâmicas devem compilar sem advertências ou quebras de hydration.

3. **Verificação Visual e Funcional no Navegador**:
   - Acessar `http://localhost:3000/dashboard` e abrir "Nova Solicitação":
     - Digitar no campo de telefone: verificar aplicação da máscara `(XX) XXXXX-XXXX`.
   - Acessar um orçamento em `http://localhost:3000/dashboard/orcamentos/[id]`:
     - Digitar nos campos "Custo Mão de Obra", "Custo Materiais" e "Custos Extras": verificar formatação em `R$` em tempo real e atualização instantânea do Subtotal, BDI e Valor Total.
     - Clicar em "Gerar PDF & Enviar por E-mail": verificar abertura do modal de confirmação antes de disparar o e-mail.
     - Confirmar envio no modal: verificar notificação toast de sucesso no canto da tela.
     - Alterar status para `REJEITADO` ou `APROVADO`: verificar modal de confirmação e gravação do log de auditoria.
   - Acessar o formulário do cliente via Magic Link:
     - Submeter respostas: verificar modal de confirmação antes do envio final.
