# Diretriz: Hub Modular de Sub-aplicações (Next.js & RBT)

## 1. Princípio do Desacoplamento de Módulos
Ao integrar múltiplas aplicações distintas (ex: Orçamentos e Medição Diária) sob o mesmo teto de deploy:
- As rotas e regras de negócio de cada módulo devem permanecer estritamente isoladas (ex: `/dashboard` ou `/orcamentos/*` vs `/medicao/*`).
- Não misture tabelas de negócio diretamente a menos que haja necessidade comprovada; compartilhe apenas a entidade de autenticação/sessão (`User`, `Session`).
- Nunca altere configurações de infraestrutura compartilhada (como transporte SMTP Office 365) sem validar a compatibilidade entre ambos os módulos.

## 2. Identidade Visual RBT Fundações
- **Vermelho Carmim Principal:** `#BA1A1A` ou `#DC2626`
- **Preto Grafite:** `#111827` / `#0F172A`
- **Superfícies:** Branco puro com cantos arredondados (`rounded-2xl` a `rounded-3xl`), sombra suave (`shadow-md` a `shadow-xl`) e bordas neutras sutis (`border-slate-200`).
- **Cards de Seleção Modular:** Inspirados no portal corporativo com ícone circular destacado, título evidente, descrição sucinta e link de ação ("Clique para acessar").

## 3. Controle de Acesso Modular (RBAC Granular)
- O modelo de usuário deve possuir flags booleanas claras:
  - `acessoOrcamento Boolean @default(true)`
  - `acessoMedicao Boolean @default(false)`
- O cadastro de usuários deve dispor de caixas de seleção explícitas permitindo liberar 1 módulo específico ou ambos.
- O Middleware de proteção deve impedir que usuários acessem rotas de módulos não autorizados em seu perfil.
