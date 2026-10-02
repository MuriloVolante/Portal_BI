# Portal BI

Portal de dashboards Power BI com controle de acesso por usuário, construído com **Next.js 14 (App Router)**, **Supabase**, **TypeScript**, **Tailwind CSS** e **shadcn/ui**.

## Funcionalidades

- 🔐 Login com email/senha via Supabase Auth + "Esqueceu a senha?" liberado pelo admin (24h, uso único, sem email)
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
2. No painel do projeto, abra **SQL Editor → New query** e rode, em ordem, cada arquivo de [`supabase/migrations/`](supabase/migrations/) (cole o conteúdo e clique em **Run**). Em projetos já em produção, rode apenas as migrations que ainda não foram aplicadas.
3. Em **Authentication → Sign In / Providers**, confirme que **Email** está habilitado. Se não quiser cadastro aberto, desative *Allow new users to sign up* — o admin cria os usuários pelo painel.
4. Em **Authentication → URL Configuration**:
   - **Site URL**: a URL do app na Vercel (ex.: `https://seu-portal.vercel.app`)
   - A redefinição de senha **não usa email**: o admin libera o usuário em Usuários → Senha, e ele cria a nova senha em "Esqueceu a senha?" no login.
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
5. Com a URL final em mãos, volte ao Supabase e ajuste a **Site URL** (passo 4 acima) se ainda aponta para outro endereço.

Pronto: faça login com o admin e cadastre os dashboards em **Administração → Páginas** (cole a URL "Publicar na web" do Power BI no campo de embed).

## 3. Rodar localmente (com o Supabase real)

Crie um arquivo `.env.local` na raiz (use o `.env.example` como base) com as mesmas três variáveis e rode:

```bash
npm install
npm run dev
```

> 💡 No Windows, crie/edite o `.env.local` pelo VS Code ou Bloco de Notas — não use `echo >` no PowerShell, que gera o arquivo em UTF-16 e o Next.js não lê as variáveis.

## Exportação do Banco de Horas (Excel)

No painel com slug **`banco-horas`**, o cabeçalho ganha o botão **Exportar**:
modal com Cargo, Filial, Gerência e Local (caixas de seleção) e saldo maior ou
igual a (horas decimais) → `.xlsx` gerado no servidor a partir do SQL Server.

- Rotas: `GET /api/banco-horas/opcoes` (valores das caixas de seleção),
  `GET /api/banco-horas/export?cargo=&filial=&gerencia=&local=&saldoMin=` (planilha)
  e `POST /api/banco-horas/diagnostico` (teste de conexão, só admin).
  Opções e exportação exigem acesso ao painel `banco-horas` (mesma regra do embed).
- **View e colunas** ficam em `src/lib/bancoHoras/source.ts` (`VIEW`, `COLUMNS`).
  Todos os filtros entram como parâmetro na consulta.
- **Auditoria**: toda exportação (ok, sem dados, erro, acesso negado), falha ao
  carregar os filtros e teste de conexão vai para `export_logs`
  (migration `0004`), com filtros, linhas, duração, código do erro e detalhe
  técnico. Admin → **Exportações** mostra o histórico e o teste de conexão
  etapa por etapa (configuração → DNS → porta → login → leitura da view), com
  o IP de saída e um botão para copiar o relatório para a TI.

### Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Exemplo | Obrigatória |
|---|---|---|
| `MSSQL_SERVER` | `sql.empresa.com.br` ou IP público | sim |
| `MSSQL_DATABASE` | `RH` | sim |
| `MSSQL_USER` | `portal_bi_leitura` | sim |
| `MSSQL_PASSWORD` | — | sim |
| `MSSQL_PORT` | `1433` (padrão) | não |
| `MSSQL_ENCRYPT` | `true` (padrão); `false` se o servidor não usa TLS | não |
| `MSSQL_TRUST_SERVER_CERTIFICATE` | `true` para certificado autoassinado | não |

Marque o ambiente **Production** e faça um **Redeploy** depois de salvar
(variáveis novas só valem para deploys novos). Use um login SQL **somente
leitura**, com `SELECT` apenas na view. O SQL Server precisa aceitar conexões
vindas da internet (Vercel, região `gru1`, IPs dinâmicos).

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
