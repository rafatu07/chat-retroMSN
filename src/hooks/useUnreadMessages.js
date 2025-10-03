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
          console.log('📨 Nova mensagem detectada!')
          const message = payload.new
          
          console.log('📊 Detalhes da mensagem:', {
            sender_id: message.sender_id,
            meu_id: user.id,
            conversation_id: message.conversation_id,
            eh_minha: message.sender_id === user.id
          })
          
          // Se a mensagem não é minha, incrementar contador
          if (message.sender_id !== user.id) {
            console.log('✅ Mensagem de outro usuário! Incrementando contador...')
            
            try {
              // Buscar a conversa para determinar o outro participante
              const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .select('participant1_id, participant2_id')
                .eq('id', message.conversation_id)
                .single()

              if (convError) {
                console.error('❌ Erro ao buscar conversa:', convError)
                console.log('💡 Usando sender_id diretamente:', message.sender_id)
                
                setUnreadCounts(prev => {
                  const newCount = (prev[message.sender_id] || 0) + 1
                  const newState = { ...prev, [message.sender_id]: newCount }
                  console.log('📊 ESTADO ATUALIZADO (fallback):', newState)
                  return newState
                })
                return
              }

              if (conversation) {
                const otherUserId = conversation.participant1_id === user.id 
                  ? conversation.participant2_id 
                  : conversation.participant1_id
                
                console.log('✅ Incrementando contador para usuário:', otherUserId)
                
                setUnreadCounts(prev => {
                  const newCount = (prev[otherUserId] || 0) + 1
                  const newState = { ...prev, [otherUserId]: newCount }
                  console.log('📊 ESTADO ANTERIOR:', prev)
                  console.log('📊 ESTADO NOVO:', newState)
                  console.log('🔔 Novo contador para', otherUserId, ':', newCount)
                  return newState
                })
              } else {
                console.warn('⚠️ Conversa não encontrada, usando sender_id')
                setUnreadCounts(prev => {
                  const newCount = (prev[message.sender_id] || 0) + 1
                  const newState = { ...prev, [message.sender_id]: newCount }
                  console.log('📊 ESTADO ATUALIZADO (no conv):', newState)
                  return newState
                })
              }
            } catch (error) {
              console.error('❌ Erro ao processar mensagem não lida:', error)
              setUnreadCounts(prev => {
                const newCount = (prev[message.sender_id] || 0) + 1
                const newState = { ...prev, [message.sender_id]: newCount }
                console.log('📊 ESTADO ATUALIZADO (error):', newState)
                return newState
              })
            }
          } else {
            console.log('⏭️ É minha própria mensagem, ignorando')
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
        .select('id, participant1_id, participant2_id')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)

      if (convError) {
        console.error('❌ Erro ao buscar conversas:', convError)
        return
      }

      if (!conversations || conversations.length === 0) return

      // Para cada conversa, contar mensagens não lidas
      const counts = {}
      
      for (const conv of conversations) {
        const otherUserId = conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id
        
        // Contar apenas mensagens do outro usuário que ainda não foram lidas (read_at IS NULL)
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('sender_id', otherUserId)
          .is('read_at', null) // Apenas mensagens não lidas

        if (!error && count > 0) {
          counts[otherUserId] = count
        }
      }

      console.log('📊 Contadores de mensagens não lidas:', counts)
      setUnreadCounts(counts)
    } catch (error) {
      console.error('❌ Erro ao buscar contagens de mensagens não lidas:', error)
    }
  }

  const markAsRead = async (contactId) => {
    try {
      // Buscar a conversa entre os dois usuários
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${contactId}),and(participant1_id.eq.${contactId},participant2_id.eq.${user.id})`)
        .single()

      if (conversation) {
        // Marcar todas as mensagens do contato nesta conversa como lidas
        const { error } = await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversation.id)
          .eq('sender_id', contactId)
          .is('read_at', null)

        if (error) {
          console.error('❌ Erro ao marcar mensagens como lidas:', error)
        } else {
          console.log('✅ Mensagens marcadas como lidas no banco')
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar markAsRead:', error)
    }

    // Atualizar estado local
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

