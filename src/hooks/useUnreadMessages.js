import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const useUnreadMessages = () => {
  const { user } = useAuth()
  const [unreadCounts, setUnreadCounts] = useState({})
  const channelRef = useRef(null)

  useEffect(() => {
    if (!user) return

    // Buscar contagens iniciais
    fetchUnreadCounts()

    // Configurar listener para novas mensagens em tempo real
    console.log('🔔 Configurando listener de mensagens não lidas')
    
    channelRef.current = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('📨 Nova mensagem detectada:', payload)
          const message = payload.new
          
          // Se a mensagem não é minha, incrementar contador
          if (message.sender_id !== user.id) {
            // Buscar a conversa para determinar o outro participante
            const { data: conversation } = await supabase
              .from('conversations')
              .select('user1_id, user2_id')
              .eq('id', message.conversation_id)
              .single()

            if (conversation) {
              const otherUserId = conversation.user1_id === user.id 
                ? conversation.user2_id 
                : conversation.user1_id
              
              setUnreadCounts(prev => ({
                ...prev,
                [otherUserId]: (prev[otherUserId] || 0) + 1
              }))
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Status do listener de mensagens não lidas:', status)
      })

    return () => {
      console.log('🔔 Removendo listener de mensagens não lidas')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [user?.id])

  const fetchUnreadCounts = async () => {
    try {
      if (!user) return

      // Buscar todas as conversas do usuário
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

      if (convError) {
        console.error('❌ Erro ao buscar conversas:', convError)
        return
      }

      if (!conversations || conversations.length === 0) return

      // Para cada conversa, contar mensagens não lidas
      const counts = {}
      
      for (const conv of conversations) {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
        
        // Contar mensagens do outro usuário que ainda não li
        // Por enquanto, vamos considerar todas as mensagens do outro usuário como não lidas
        // Em uma implementação mais completa, você adicionaria um campo 'read' na tabela messages
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('sender_id', otherUserId)

        if (!error && count > 0) {
          counts[otherUserId] = count
        }
      }

      setUnreadCounts(counts)
    } catch (error) {
      console.error('❌ Erro ao buscar contagens de mensagens não lidas:', error)
    }
  }

  const markAsRead = (contactId) => {
    setUnreadCounts(prev => ({
      ...prev,
      [contactId]: 0
    }))
  }

  const getUnreadCount = (contactId) => {
    return unreadCounts[contactId] || 0
  }

  return {
    unreadCounts,
    getUnreadCount,
    markAsRead,
    fetchUnreadCounts
  }
}

