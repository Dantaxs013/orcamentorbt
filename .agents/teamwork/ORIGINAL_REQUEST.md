# Original User Request

## 2026-10-07T14:11:24Z

Aprimorar a segurança, a usabilidade e a experiência visual (layout) da aplicação web corporativa de Gestão e Automação de Orçamentos RBT, garantindo proteção ativa contra abuso, fluxo de uso intuitivo com feedback imediato e refinamento visual de alto padrão.

Working directory: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT
Integrity mode: development

## Requirements

### R1. Proteção de Acesso e Segurança em Camadas
Implementar middleware de proteção de rotas para interceptar e redirecionar requisições não autenticadas às rotas internas (`/dashboard` e sub-rotas). Implementar controle de taxa de requisições (rate limiting) para evitar ataques de força bruta no login e mitigar abuso de envios nos formulários de solicitação e Magic Link. Adicionar headers de segurança HTTP robustos nas respostas da aplicação contra vulnerabilidades web (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).

### R2. Usabilidade, Ergonomia de Uso e Feedback (UX)
Implementar máscaras de preenchimento e formatação em tempo real para campos críticos (valores monetários em R$, telefones/WhatsApp e medidas). Adicionar sistema de notificações visuais (toasts de sucesso, aviso e erro) e modais de confirmação para ações de impacto (como envio de proposta comercial por e-mail ou alteração definitiva de status).

### R3. Refinamento Visual do Layout e Responsividade (Padrão Medicaodiaria)
Refinar os componentes de interface seguindo os padrões institucionais da RBT Fundações: enriquecer o quadro Kanban com badges contextuais, estados vazios estilizados, micro-interações suaves de hover e foco, tipografia equilibrada e adaptação fluida para dispositivos móveis e telas amplas.

## Acceptance Criteria

### Segurança e Controle de Acesso
- [ ] Acessos diretos de usuários não autenticados a rotas sob `/dashboard` são barrados pelo middleware e redirecionados para `/login`.
- [ ] Múltiplas tentativas abusivas de login ou submissão de formulário em curto intervalo acionam proteção de taxa retornando status HTTP 429 com tempo de espera.
- [ ] Cabeçalhos de segurança HTTP estão configurados e presentes nas respostas do servidor.

### Usabilidade e Validações
- [ ] Entradas de valor monetário e telefone possuem formatação legível e máscara automática durante a digitação.
- [ ] Ações de geração e despacho de proposta possuem modal de confirmação e feedback visual imediato via notificação/toast.

### Verificação e Integridade
- [ ] A checagem de tipos estrita (`npx tsc --noEmit`) executa com zero erros de tipagem.
- [ ] O build de produção do Next.js (`npm run build`) conclui com sucesso compilando todas as páginas e rotas de API.
- [ ] Scripts automatizados de verificação de segurança/rotas validam o comportamento esperado.
