-- Tipo de cada acesso no histórico, para que "último acesso", gráfico de
-- acessos e atividade recente venham da mesma fonte:
--   open   = abriu o painel (carregou a página ou trocou de painel)
--   return = voltou para a aba do portal que já estava aberta
alter table public.access_logs
  add column if not exists kind text not null default 'open'
  check (kind in ('open', 'return'));
