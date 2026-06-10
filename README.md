# Portal BI

Portal de dashboards Power BI com controle de acesso por usuário, construído com **Next.js 14 (App Router)**, **Supabase**, **TypeScript**, **Tailwind CSS** e **shadcn/ui**.

## Funcionalidades

- 🔐 Login com email/senha via Supabase Auth + "Esqueci minha senha"
- 📊 Dashboards Power BI embutidos por iframe, com rodapé escondido por crop visual
- 🧭 Sidebar dinâmica: cada usuário enxerga apenas as páginas liberadas
- 🛡️ A URL de embed vive apenas no banco e é entregue pelo servidor (`/api/embed-url`) após validar sessão e permissão — nunca fica no frontend
- 👥 Área admin: gestão de usuários, permissões por página (toggles) e CRUD de páginas
- 🌑 Tema dark profissional com destaque verde `#399F39`

## Setup

### 1. Dependências

```bash
npm install
```

### 2. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Rode a migration `supabase/migrations/0001_init.sql` no SQL Editor (ou via `supabase db push`).
3. Em **Authentication → Providers**, mantenha Email habilitado.

### 3. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # usado apenas no servidor
```

### 4. Primeiro admin

Crie um usuário (Authentication → Users → Add user) e promova-o:

```sql
update public.profiles set role = 'admin' where id = '<uuid-do-usuario>';
```

### 5. Rodar

```bash
npm run dev
```

Acesse `http://localhost:3000`, faça login com o admin e cadastre as páginas em **Administração → Páginas**.

## Modelo de segurança

| Tabela | Leitura | Escrita |
|---|---|---|
| `pages` | autenticados (sem a coluna `embed_url`) | apenas admin (via server actions com service role) |
| `user_pages` | o próprio usuário / admin | apenas admin |
| `profiles` | o próprio usuário / admin | apenas admin |

A coluna `pages.embed_url` tem o `SELECT` revogado para `anon`/`authenticated` (privilégio em nível de coluna). A única forma de obtê-la é pela rota `/api/embed-url`, que valida a sessão e a permissão antes de responder.

## Estrutura

```
src/
├── app/
│   ├── (auth)/login              # tela de login
│   ├── (portal)/dashboard/[pageSlug]  # página dinâmica por relatório
│   ├── (admin)/admin             # visão geral, usuários, páginas
│   └── api/embed-url             # entrega autenticada da URL do iframe
├── components/                   # ui (shadcn), sidebar, dashboard, admin
├── lib/supabase                  # clients (browser, server, service role)
├── hooks/                        # useUser, useAllowedPages
└── middleware.ts                 # proteção de rotas
```
