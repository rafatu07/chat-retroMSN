-- Verificar e corrigir políticas RLS da tabela profiles
-- Este script garante que todos os usuários autenticados possam ler profiles

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Todos podem ver perfis públicos" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON public.profiles;

-- Criar política para SELECT (leitura de perfis)
CREATE POLICY "Usuários autenticados podem ver perfis" ON public.profiles
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Verificar se RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Listar todas as políticas atuais (para debug)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

