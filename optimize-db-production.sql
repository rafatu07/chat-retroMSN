-- ==========================================
-- OTIMIZAÇÃO PARA PRODUÇÃO - ESSENCIAL
-- ==========================================
-- Execute ANTES de fazer deploy na Vercel!

-- 1. Índice para acelerar get_or_create_conversation
CREATE INDEX IF NOT EXISTS idx_conversations_lookup 
ON conversations(participant1_id, participant2_id);

-- 2. Índice para mensagens (mais importante)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time 
ON messages(conversation_id, created_at DESC);

-- 3. Índice para sender (buscar mensagens próprias)
CREATE INDEX IF NOT EXISTS idx_messages_sender 
ON messages(sender_id);

-- 4. Atualizar estatísticas das tabelas
ANALYZE conversations;
ANALYZE messages;

-- 5. Verificar se funcionou
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename IN ('conversations', 'messages')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ✅ Pronto! Isso vai reduzir o tempo de get_or_create_conversation
-- de 10 segundos para menos de 1 segundo! ⚡

