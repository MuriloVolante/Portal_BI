-- Redefinição de senha liberada pelo admin (substitui o email do Supabase).
-- O admin libera um usuário por 24h; no login, quem informar esse email pode
-- definir uma nova senha uma única vez (a liberação é apagada no uso).
-- Leitura e escrita só pelo servidor (service role); as policies existentes
-- de profiles continuam valendo para o restante.

alter table public.profiles
  add column if not exists password_reset_until timestamptz;
