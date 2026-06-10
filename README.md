# Portal BI

Portal de dashboards Power BI com controle de acesso por usuário, construído com **Next.js 14 (App Router)**, **Supabase**, **TypeScript**, **Tailwind CSS** e **shadcn/ui**.

## Funcionalidades

- 🔐 Login com email/senha via Supabase Auth + "Esqueci minha senha"
- 📊 Dashboards Power BI embutidos por iframe, com rodapé escondido por crop visual
- 🧭 Sidebar dinâmica: cada usuário enxerga apenas as páginas liberadas
- 🛡️ A URL de embed vive apenas no banco e é entregue pelo servidor (`/api/embed-url`) após validar sessão e permissão — nunca fica no frontend
- 👥 Área admin: gestão de usuários, permissões por página (toggles) e CRUD de páginas
- 🌑 Tema dark profissional com destaque verde `#399F39`

## Teste rápido sem Supabase (modo demo)

Quer ver o portal funcionando antes de configurar o Supabase? Crie um `.env.local` apenas com:

```
NEXT_PUBLIC_DEMO_MODE=true
```

E rode:

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` e entre com:

| Perfil | Email | Senha |
|---|---|---|
| Admin | `admin@demo.com` | `demo123` |
| Usuário | `user@demo.com` | `demo123` |

O modo demo usa dados em memória (3 páginas de exemplo apontando para o relatório público de demonstração do Power BI) e cobre todo o fluxo: login, sidebar com permissões, embed do dashboard e a área admin completa (toggles de permissão e CRUD de páginas). As alterações são perdidas ao reiniciar o servidor. **Não use em produção.**

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (anote a senha do banco).
2. No painel do projeto, abra **SQL Editor → New query**, cole todo o conteúdo de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) e clique em **Run**.
3. Em **Authentication → Sign In / Providers**, confirme que **Email** está habilitado. Se não quiser cadastro aberto, desative *Allow new users to sign up* — o admin cria os usuários pelo painel.
4. Em **Authentication → URL Configuration**:
   - **Site URL**: a URL do app na Vercel (ex.: `https://seu-portal.vercel.app`)
   - **Redirect URLs**: adicione `https://seu-portal.vercel.app/reset-password` e, para dev, `http://localhost:3000/reset-password`
5. Copie as credenciais em **Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secreta, nunca exponha no frontend)

### Primeiro usuário admin

1. **Authentication → Users → Add user → Create new user** (email + senha, marque *Auto Confirm User*).
2. O profile é criado automaticamente por trigger. Promova-o no **SQL Editor**:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'seu-email@empresa.com');
```

## 2. Deploy na Vercel

1. Suba o repositório para o GitHub (já está pronto — basta fazer merge/push da branch principal).
2. Em [vercel.com](https://vercel.com), **Add New → Project** e importe o repositório. A Vercel detecta Next.js sozinha — não mude build command nem output.
3. Antes do deploy, em **Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | chave `service_role` |

4. Clique em **Deploy**.
5. Com a URL final em mãos, volte ao Supabase e ajuste **Site URL** / **Redirect URLs** (passo 4 acima) se ainda apontam para outro endereço.

Pronto: faça login com o admin e cadastre os dashboards em **Administração → Páginas** (cole a URL "Publicar na web" do Power BI no campo de embed).

## 3. Rodar localmente (com o Supabase real)

Crie um arquivo `.env.local` na raiz (use o `.env.example` como base) com as mesmas três variáveis e rode:

```bash
npm install
npm run dev
```

> 💡 No Windows, crie/edite o `.env.local` pelo VS Code ou Bloco de Notas — não use `echo >` no PowerShell, que gera o arquivo em UTF-16 e o Next.js não lê as variáveis.

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
