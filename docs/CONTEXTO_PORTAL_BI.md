# Portal BI — Contexto do projeto

> Documento para contextualizar uma IA (ou uma pessoa nova) sobre o Portal BI.
> O repositório é privado; aqui está o essencial sobre o que é, para que serve,
> como funciona e o que tem de mais interessante. Versão atual: **v2.1.2**.

---

## 1. O que é

O **Portal BI** é uma plataforma web interna da **Viação Garcia** (empresa de
transporte rodoviário de passageiros) que reúne, em um único lugar, os
**dashboards de Power BI da área de Recursos Humanos**, com **controle de
acesso por usuário**.

Em vez de distribuir links soltos do Power BI, cada colaborador entra no portal
com email e senha e vê **somente os painéis que foram liberados para ele**. O
administrador decide quem vê o quê, ativa/desativa contas e acompanha quem está
usando a plataforma.

Mote da tela de entrada: *"Indicadores de RH que movem decisões."*

## 2. Para que serve

- **Centralizar** os relatórios de Power BI de RH em uma interface própria, com
  a identidade visual da empresa.
- **Proteger** os links dos relatórios: a URL real do Power BI nunca fica
  exposta no navegador antes de o servidor validar a sessão e a permissão.
- **Dar autonomia ao admin**: criar usuários, liberar painéis, trocar senhas,
  desativar ou excluir acessos, tudo pela própria interface, sem mexer no banco.
- **Medir o uso**: saber quem entra, quando entra e quais painéis são mais
  abertos.

## 3. Stack

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 14** (App Router, Server Components, Server Actions) |
| Linguagem | **TypeScript** |
| UI | **Tailwind CSS** + componentes no estilo **shadcn/ui** (Radix), ícones **lucide-react** |
| Banco e autenticação | **Supabase** (Postgres + Auth + Row Level Security) |
| Hospedagem | **Vercel** (funções na região de São Paulo, junto do banco) |
| Relatórios | **Power BI** embutido via iframe |
| Fontes | Sora (títulos) e Inter Tight (texto) |

Sem bibliotecas de gráficos: os gráficos do admin e as animações são feitos à
mão (SVG/CSS e Canvas 2D).

## 4. Destaques

### 4.1 Malha interativa (identidade visual)

A marca do portal é uma **malha orgânica animada** desenhada em **Canvas 2D**,
nas cores da empresa (verde-lima `#96D737` e ciano `#2396B4` sobre grafite
`#2D2D2D`).

- **Nós à deriva em um campo de fluxo**: cada ponto se move suavemente seguindo
  uma soma de senoides que muda com o tempo, então a malha "respira" e nunca se
  repete.
- **Ligações dinâmicas**: os pontos próximos se conectam por linhas, cuja
  opacidade depende da distância; a rede se reorganiza o tempo todo.
- **Profundidade simulada**: cada nó tem um "z" que define tamanho, brilho e cor
  (do ciano ao lima), com halos de luz pré-renderizados.
- **Regra de separação**: os nós se repelem quando ficam perto demais, então a
  malha não forma aglomerados e continua bem distribuída.
- **Interação com o mouse/toque**: ao passar o cursor, a malha gira em volta
  dele (efeito de redemoinho) e é arrastada pelo movimento; o cursor também
  ganha ligações com os pontos próximos.
- **Cuidados de desempenho e acessibilidade**: a animação pausa quando sai da
  tela ou quando a aba fica em segundo plano, limita a resolução em telas de
  alta densidade, e quem ativa "reduzir movimento" no sistema vê um quadro
  estático.

Ela aparece na tela de login (lado esquerdo no desktop, faixa no topo no
celular) e na página 404. Há ainda um **orb 3D** (poliedro em wireframe girando)
no botão central da navegação mobile, e um **logotipo em malha** como ícone do
app.

### 4.2 Gestão de acesso por usuário

- **Login em etapas** (no estilo de sistemas corporativos): primeiro o email e
  "Próximo"; o servidor então decide o próximo passo:
  - email **não cadastrado** → barra ali mesmo, com mensagem;
  - usuário **desativado** → barra com mensagem;
  - **redefinição liberada pelo admin** → abre "Crie sua nova senha" (senha +
    confirmação) e já entra direto;
  - caso normal → pede a senha.
- **Permissão por painel**: cada usuário vê só os dashboards liberados para
  ele. Na página do usuário, o admin liga/desliga cada painel com um
  interruptor, e a mudança salva na hora.
- **Papéis**: `admin` (vê todos os painéis ativos e a área administrativa) e
  `user` (vê só o que foi liberado).
- **Ações do admin sobre a conta**: editar nome e papel, definir uma nova
  senha, **liberar a redefinição pelo login por 24h** (sem email; o próprio
  usuário cria a senha na tela de login), **desativar/reativar** o acesso e
  **excluir** o usuário (com confirmação).
- **Gestão de painéis**: cadastrar dashboards (nome, endereço amigável na URL,
  link do Power BI, ícone, ordem), ativar/desativar e excluir.
- **Segurança em camadas**:
  - Row Level Security no Postgres: usuário comum só lê as próprias
    permissões; só admin altera dados.
  - A coluna com o link do Power BI (`embed_url`) **não é legível** pelos
    usuários. O link só sai do servidor por uma rota (`/api/embed-url`) que
    revalida sessão, se a página está ativa e se o usuário tem permissão.
  - Middleware protege todas as rotas, e as páginas do admin exigem papel
    `admin` no servidor.

### 4.3 Gestão de atividade dos usuários

- **Registro de acesso**: toda vez que alguém abre um dashboard, o servidor
  grava uma linha em `access_logs` (quem, qual painel, quando) e atualiza o
  "último acesso" do usuário. O nome do painel fica guardado junto, então o
  histórico sobrevive mesmo se o painel for excluído.
- **Visão geral do admin** (painel inicial da administração):
  - cartões com total de usuários (e quantos entraram nas últimas 24h),
    painéis ativos/inativos e total de liberações;
  - gráfico de **acessos por dia** nas últimas 2 semanas;
  - ranking dos **painéis mais abertos** no mesmo período.
- **Lista de usuários** com **último login** e **último acesso real** (abertura
  de painel), número de painéis liberados e status (ativo/desativado).
- **Atividade recente por usuário**: na página de cada usuário, os últimos
  dashboards que ele abriu, com data e hora (fuso de Brasília).

## 5. Telas

| Tela | O que tem |
|---|---|
| **Login** | Malha interativa + formulário em etapas (email → senha ou nova senha) |
| **Portal** | Sidebar com os painéis liberados (desktop) / dock inferior com orb (celular); o relatório ocupa a tela com cabeçalho fino ("aberto às HH:MM"), botão de recarregar e de tela cheia |
| **Admin › Visão geral** | Cartões de resumo + gráficos de uso |
| **Admin › Usuários** | Tabela paginada, criar usuário, entrar na página de cada um |
| **Admin › Usuário** | Dados, senha, painéis (interruptores), atividade recente, zona de perigo |
| **Admin › Páginas** | Cadastro e edição dos dashboards |
| **Estados vazios** | Ilustrações animadas para "sem painéis", "sem permissão", "erro ao carregar" |
| **404** | Malha interativa + botão para voltar ao login |

O portal também é **instalável como app (PWA)** no celular, e o layout respeita
as áreas seguras do iPhone.

## 6. Modelo de dados (Supabase / Postgres)

```
auth.users                 ← contas (gerenciadas pelo Supabase Auth)
public.profiles            ← 1:1 com auth.users
  id, full_name, role ('user' | 'admin'), created_at,
  last_seen_at,            ← último dashboard aberto
  password_reset_until     ← até quando a redefinição pelo login está liberada
public.pages               ← dashboards cadastrados
  id, slug, label, embed_url (oculto ao cliente), icon, "order", is_active, created_at
public.user_pages          ← permissões (usuário × página), único por par
public.access_logs         ← histórico de aberturas de painel
  id, user_id, page_id, page_label, created_at
```

Uma trigger cria o `profile` automaticamente quando um usuário é criado, e uma
função `is_admin()` é usada nas políticas de RLS.

## 7. Organização do código

```
src/
  app/
    (auth)/login            ← login em etapas + server actions públicas
    (portal)/               ← área do usuário (layout com sidebar)
      dashboard/[pageSlug]  ← tela do relatório
    (admin)/admin/          ← visão geral, usuários, usuário, páginas + server actions
    api/embed-url           ← entrega a URL do Power BI após validar permissão
    not-found.tsx           ← 404
  components/
    brand/                  ← MeshField (malha), MeshCanvas (orb 3D), MeshMark (logo)
    admin/                  ← tabelas, formulários, gráficos, diálogos
    dashboard/              ← moldura do relatório, iframe, skeleton
    sidebar/, shell/        ← navegação desktop e mobile
    empty/                  ← estados vazios ilustrados
  lib/
    supabase/               ← clients (navegador, servidor, service role, middleware)
    auth/                   ← sessão e regras de redefinição de senha
    admin/overview.ts       ← agregação dos dados dos gráficos
    demo.ts                 ← modo demo com dados em memória
supabase/migrations/        ← SQL do banco (0001 init, 0002 atividade, 0003 redefinição)
```

## 8. Modo demo

Com a variável `NEXT_PUBLIC_DEMO_MODE=true`, o portal roda **sem Supabase**, com
usuários, painéis e histórico de acessos fictícios em memória. É usado para
testar telas e mudanças de layout sem tocar na produção.

## 9. Convenções do projeto

- Interface e mensagens em **português do Brasil**; datas no fuso de São Paulo.
- **Versionamento explícito**: a versão aparece no login e no rodapé do admin
  (`src/lib/version.ts`) e é incrementada a cada atualização.
- Mudanças grandes passam primeiro por uma branch de Dev (Preview na Vercel com
  modo demo); ajustes pequenos vão direto para produção.
- A aplicação está em uso: prioridade para não quebrar o que já funciona.

## 10. Histórico resumido

- **v1.x**: portal funcional com login, sidebar de painéis, admin de usuários e
  páginas, ativar/desativar/excluir usuários, último login, registro de
  acessos e PWA.
- **v2.0**: redesenho completo da interface (nova identidade visual, malha
  interativa, gráficos de uso no admin, estados vazios ilustrados, navegação
  mobile com dock).
- **v2.1**: login em etapas, redefinição de senha liberada pelo admin (sem
  email), bloqueio de email não cadastrado já na primeira etapa.
- **v2.1.2**: servidor movido para a mesma região do banco (São Paulo) e telas
  de carregamento instantâneas, para deixar a navegação mais rápida.
