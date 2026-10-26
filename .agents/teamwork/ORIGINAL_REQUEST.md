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

## 2026-10-20T18:37:31Z

Implementar o Portal Unificado da RBT Fundações integrando em um único projeto os módulos independentes de Gestão de Orçamentos e Medição Diária (RDP), com tela de seleção modular nas cores institucionais da RBT, autenticação única e controle de acesso modular por usuário (1 ou ambos os módulos), mantendo os sistemas desacoplados.

Working directory: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT
Integrity mode: development

## Requirements

### R1. Tela de Seleção de Módulos (Hub Pós-Login) no Padrão RBT
Criar a tela de entrada do portal (`/portal` ou `/dashboard`) com o layout dos cards conforme a referência visual:
- Cards brancos com bordas suaves, sombra elegante e cantos arredondados.
- Ícones circulares com fundo de destaque nas cores oficiais da RBT Fundações (Vermelho #BA1A1A, Preto Grafite #111827 e cinzas neutros).
- Módulo 1: **Gestão de Orçamentos** (com link "Clique para acessar").
- Módulo 2: **Medição Diária (RDP)** (com link "Clique para acessar").
- Barra superior institucional com logo oficial RBT, identificação do usuário logado e botão de Logout seguro.

### R2. Gestão de Usuários com Seleção de Acesso aos Módulos
Na criação e edição de usuários (`/dashboard/usuarios` e APIs de usuários):
- Adicionar checkboxes / seletores para definir quais módulos o usuário terá permissão de acessar:
  - `acessoOrcamento` (Módulo de Orçamentos)
  - `acessoMedicao` (Módulo de Medição Diária)
  - Permitir selecionar apenas 1 módulo ou ambos os módulos.
- Salvar e validar as permissões de acesso diretamente no banco de dados e na sessão do usuário.

### R3. Integração do Código de Medição Diária sem Acoplamento
- Trazer a estrutura e telas do aplicativo `..\Medicaodiaria\src\app` para dentro de uma rota isolada (ex: `/medicao/*`), garantindo que nenhum sistema interfira no funcionamento das tabelas ou regras de negócio do outro.
- Preservar integralmente o funcionamento atual do sistema de orçamentos e do envio de e-mails já estabilizado.

### R4. Proteção e Redirecionamento por Permissão
- Middleware e verificação de rota:
  - Se o usuário tiver acesso a apenas 1 módulo, pode ser redirecionado diretamente para esse módulo ou visualizar apenas o card habilitado no portal.
  - Se tentar acessar a rota de um módulo não liberado, exibir aviso amigável de acesso restrito e redirecionar para o portal.

## Acceptance Criteria

### Interface & Usabilidade
- [ ] O visual dos cards de seleção segue rigorosamente o layout e a tipografia da referência, adaptado para a paleta da RBT (Vermelho/Preto/Branco).
- [ ] No modal/formulário de criação de usuários, há campos para selecionar o acesso a "Orçamentos", "Medição Diária" ou ambos.

### Segurança & Controle de Acesso
- [ ] Usuário com acesso exclusivo a Orçamentos não consegue abrir as páginas de Medição Diária.
- [ ] Usuário com acesso exclusivo a Medição Diária não consegue abrir as rotas do Kanban de Orçamentos.
- [ ] Usuário com acesso a ambos os módulos pode navegar livremente e alternar entre eles a partir do portal.

### Integridade do Código
- [ ] `npx tsc --noEmit` executa sem nenhum erro de tipagem no projeto unificado.
- [ ] `npm run build` compila com sucesso todas as páginas estáticas e rotas de API.

## 2026-10-20T19:47:48Z

O usuário enviou a seguinte mensagem de incentivo e alinhamento: "pode seguir com o plano e melhora". Continue avançando com os milestones M2 a M6 com máximo capricho visual nos cards do /portal (cores RBT #BA1A1A e #111827, estilo elegante com ícone circular e botão "Clique para acessar" igual à referência visual), seletor de módulos na criação/edição de usuários e isolamento impecável da Medição Diária. Avise quando cada etapa for concluída.

## 2026-10-20T20:25:37Z

Ajuste prioritário solicitado pelo usuário:
1. Após efetuar o login, o usuário SEMPRE deve ir direto para a tela de seleção /portal.
2. Na tela /portal, deve ser exibido APENAS o card que o usuário tem permissão para acessar:
   - Se o usuário tiver acesso aos 2 módulos, exibe os 2 cards.
   - Se tiver acesso apenas a Orçamentos, exibe APENAS o card de Orçamentos (o outro card não deve aparecer ou não deve ser clicável/ocultar).
   - Se tiver acesso apenas a Medição, exibe APENAS o card de Medição Diária.
Apliquem essa regra no /portal/page.tsx e na lógica de redirecionamento.

## 2026-10-20T20:39:00Z

O usuário solicitou explicitamente que ao clicar no card de 'Medição Diária (RDP)' no /portal, o sistema abra e execute o projeto de Medição Diária que está em C:\Users\aaaaa\OneDrive - Piatec\TI_CODIGOS\T.I\Medicaodiaria.
Isso corresponde exatamente ao Milestone M4 do projeto. Avancem com a integração das páginas, componentes e rotas da Medicaodiaria para dentro do projeto sob a rota isolada /medicao/*, ou configurem o direcionamento correto para a porta/sub-aplicação da Medicaodiaria preservando a sessão unificada. Prioridade total nessa integração!
