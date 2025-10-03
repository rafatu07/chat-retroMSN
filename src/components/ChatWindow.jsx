import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Circle, 
  Clock, 
  Minus, 
  Send, 
  Zap,
  Phone,
  Video,
  MoreHorizontal
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { AttentionEffect } from './AttentionEffect'
import { playMessageSound, playAttentionSound } from '../utils/sounds'
import { EmoticonPicker, convertEmoticons } from './EmoticonPicker'

const statusConfig = {
  online: { color: 'bg-green-500', label: 'Online', icon: Circle },
  away: { color: 'bg-yellow-500', label: 'Ausente', icon: Clock },
  busy: { color: 'bg-red-500', label: 'Ocupado', icon: Minus },
  offline: { color: 'bg-gray-500', label: 'Offline', icon: Circle }
}

export const ChatWindow = ({ contact }) => {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [conversation, setConversation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [showAttentionEffect, setShowAttentionEffect] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  useEffect(() => {
    if (contact && user) {
      initializeChat()
    }
  }, [contact, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!conversation) return

    console.log('🔌 Configurando Realtime para conversa:', conversation.id)
    
    let channel = null
    let reconnectAttempts = 0
    let isUnmounting = false
    let isConnected = false
    let lastMessageTime = Date.now()
    const MAX_RECONNECT_ATTEMPTS = 5
    let reconnectTimeout = null
    let heartbeatInterval = null

    const setupChannel = () => {
      if (isUnmounting) return

      // Limpar canal anterior
      if (channel) {
        try {
          supabase.removeChannel(channel)
        } catch (e) {
          console.warn('Erro ao remover canal:', e)
        }
      }

      console.log('📡 Criando canal Realtime...')

      // Configurar realtime para mensagens
      channel = supabase
        .channel(`messages:${conversation.id}`, {
          config: {
            broadcast: { self: false },
            presence: { key: user.id }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversation.id}`
          },
          (payload) => {
            if (isUnmounting) return
            
            lastMessageTime = Date.now()
            const newMessage = payload.new
            console.log('📨 MENSAGEM RECEBIDA VIA REALTIME:', newMessage.content)
            
            // Se a mensagem é de "chamar atenção", fazer a tela tremer
            if (newMessage.message_type === 'attention' && newMessage.sender_id !== user.id) {
              triggerAttentionEffect()
            } else if (newMessage.sender_id !== user.id) {
              playMessageSound()
            }
            
            // Adicionar mensagem à lista
            setMessages(prev => [...prev, {
              ...newMessage,
              sender: newMessage.sender_id === user.id ? profile : contact
            }])
          }
        )
        .subscribe((status) => {
          if (isUnmounting) return

          console.log('🔌 Status Realtime:', status)

          if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime CONECTADO e OUVINDO')
            isConnected = true
            reconnectAttempts = 0
            startHeartbeat()
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ ERRO no canal Realtime')
            isConnected = false
            stopHeartbeat()
            attemptReconnect()
          } else if (status === 'TIMED_OUT') {
            console.error('⏰ TIMEOUT na conexão Realtime')
            isConnected = false
            stopHeartbeat()
            attemptReconnect()
          } else if (status === 'CLOSED') {
            console.warn('🔒 Canal Realtime FECHADO')
            isConnected = false
            stopHeartbeat()
            // Reconectar após CLOSED também (pode ser inatividade)
            if (!isUnmounting) {
              attemptReconnect()
            }
          }
        })
    }

    const startHeartbeat = () => {
      stopHeartbeat()
      
      // Ping a cada 30 segundos para manter conexão viva
      heartbeatInterval = setInterval(() => {
        if (channel && !isUnmounting) {
          try {
            console.log('💓 Heartbeat')
            channel.send({
              type: 'broadcast',
              event: 'heartbeat',
              payload: { timestamp: Date.now() }
            })
            
            // Verificar se não recebemos mensagens há muito tempo (possível desconexão silenciosa)
            const timeSinceLastMessage = Date.now() - lastMessageTime
            if (timeSinceLastMessage > 120000) { // 2 minutos
              console.warn('⚠️ Sem atividade há muito tempo, reconectando...')
              attemptReconnect()
            }
          } catch (e) {
            console.error('❌ Erro no heartbeat:', e)
            attemptReconnect()
          }
        }
      }, 30000)
    }

    const stopHeartbeat = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
        heartbeatInterval = null
      }
    }

    const attemptReconnect = () => {
      if (isUnmounting || !conversation) return

      // Limpar tentativa anterior
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('❌ Máximo de reconexões atingido')
        toast.error('Conexão perdida. Recarregue a página.', {
          duration: 5000,
          icon: '⚠️'
        })
        return
      }

      reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
      
      console.log(`🔄 Reconexão ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} em ${delay}ms`)
      
      reconnectTimeout = setTimeout(() => {
        if (!isUnmounting && conversation) {
          console.log('🔄 Tentando reconectar...')
          setupChannel()
        }
      }, delay)
    }

    // Listener para quando a aba volta a ficar visível
    const handleVisibilityChange = () => {
      if (!document.hidden && !isUnmounting && conversation) {
        console.log('👁️ Aba ficou visível')
        // Só reconectar se não estiver conectado
        if (!isConnected) {
          console.log('🔄 Conexão perdida, reconectando...')
          setupChannel()
        } else {
          console.log('✅ Já está conectado, mantendo canal ativo')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    setupChannel()

    return () => {
      console.log('🔌 Limpando Realtime')
      isUnmounting = true
      
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      stopHeartbeat()
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      
      if (channel) {
        try {
          supabase.removeChannel(channel)
        } catch (e) {
          // Ignorar erros ao limpar
        }
      }
    }
  }, [conversation?.id])

  const initializeChat = async () => {
    setLoading(true)
    
    // Timeout de segurança
    const timeoutId = setTimeout(() => {
      console.warn('⏰ TIMEOUT: A inicialização do chat demorou mais de 10 segundos')
      setLoading(false)
      toast.error('A conexão está lenta. Tente recarregar a página.')
    }, 10000)
    
    try {
      console.log('💬 Inicializando chat com:', contact.display_name)
      console.log('👤 User 1:', user.id)
      console.log('👤 User 2:', contact.id)

      console.log('🔄 Chamando get_or_create_conversation...')
      
      // Buscar ou criar conversa
      const rpcPromise = supabase
        .rpc('get_or_create_conversation', {
          user1_id: user.id,
          user2_id: contact.id
        })
      
      console.log('⏳ Aguardando resposta do RPC...')
      const { data: conversationData, error: convError } = await rpcPromise
      console.log('✅ RPC respondeu!')

      if (convError) {
        console.error('❌ Erro ao criar/buscar conversa:', convError)
        console.error('Status:', convError.code)
        console.error('Detalhes:', convError.message)
        console.error('Hint:', convError.hint)
        throw convError
      }

      console.log('✅ Conversa ID:', conversationData)
      
      if (!conversationData) {
        throw new Error('RPC retornou null ou undefined')
      }

      // Buscar conversa completa
      const { data: fullConversation, error: fullError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationData)
        .single()

      if (fullError) {
        console.error('❌ Erro ao buscar conversa completa:', fullError)
        throw fullError
      }
      
      console.log('✅ Conversa completa:', fullConversation)
      setConversation(fullConversation)

      // Buscar mensagens existentes
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationData)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error('❌ Erro ao buscar mensagens:', messagesError)
        throw messagesError
      }
      
      console.log('📨 Mensagens carregadas:', messagesData?.length || 0)
      setMessages(messagesData || [])

    } catch (error) {
      console.error('❌ Erro fatal ao inicializar chat:', error)
      
      if (error.code === '409' || error.status === 409) {
        toast.error('Erro: Conversa duplicada. Por favor, execute o script de correção no banco.')
      } else if (error.message) {
        toast.error(`Erro: ${error.message}`)
      } else {
        toast.error('Erro ao carregar conversa')
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  const sendMessage = async (messageType = 'text') => {
    if (!conversation || (!newMessage.trim() && messageType === 'text')) return

    const messageContent = messageType === 'attention' ? '📳 Chamou sua atenção!' : convertEmoticons(newMessage)

    console.log('📤 ENVIANDO MENSAGEM:', {
      conversation_id: conversation.id,
      sender_id: user.id,
      content: messageContent,
      message_type: messageType
    })

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversation.id,
            sender_id: user.id,
            content: messageContent,
            message_type: messageType
          }
        ])
        .select()

      if (error) {
        console.error('❌ Erro ao inserir mensagem:', error)
        throw error
      }

      console.log('✅ Mensagem inserida no banco:', data)

      if (messageType === 'text') {
        setNewMessage('')
      } else {
        toast.success('Atenção enviada!')
      }

    } catch (error) {
      console.error('❌ Erro fatal ao enviar mensagem:', error)
      toast.error('Erro ao enviar mensagem')
    }
  }

  const triggerAttentionEffect = () => {
    setShowAttentionEffect(true)
    setIsShaking(true)
    
    // Tocar som de atenção
    playAttentionSound()

    toast('📳 Alguém está chamando sua atenção!', {
      duration: 3000,
      style: {
        background: '#fbbf24',
        color: '#000',
        fontWeight: 'bold'
      },
    })
  }

  const handleAttentionComplete = () => {
    setShowAttentionEffect(false)
    setIsShaking(false)
  }

  const handleEmoticonSelect = (emoticon) => {
    setNewMessage(prev => prev + emoticon.emoji)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  }

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return format(date, 'HH:mm', { locale: ptBR })
    } else {
      return format(date, 'dd/MM HH:mm', { locale: ptBR })
    }
  }

  const StatusIcon = statusConfig[contact?.status]?.icon || Circle

  if (!contact) return null

  return (
    <div className={`flex flex-col h-full ${isShaking ? 'animate-bounce' : ''}`}>
      {/* Header do chat */}
      <CardHeader className="border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white">
              <AvatarImage src={contact.avatar_url} />
              <AvatarFallback className="bg-purple-500 text-white">
                {getInitials(contact.display_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{contact.display_name}</h3>
              <div className="flex items-center gap-1">
                <StatusIcon className={`h-3 w-3 ${statusConfig[contact.status]?.color}`} />
                <span className="text-sm opacity-90">
                  {contact.status_message || statusConfig[contact.status]?.label}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Área de mensagens */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <div 
          ref={messagesContainerRef}
          className="h-full overflow-y-auto p-4 space-y-4"
        >
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Carregando mensagens...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="bg-blue-50 rounded-lg p-6 mx-auto max-w-sm">
                <div className="text-4xl mb-2">💬</div>
                <p className="font-medium">Início da conversa</p>
                <p className="text-sm">Envie a primeira mensagem para {contact.display_name}!</p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === user.id
              const isAttention = message.message_type === 'attention'
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isOwnMessage && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback className="bg-purple-500 text-white text-xs">
                          {getInitials(contact.display_name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`space-y-1 ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`px-4 py-2 rounded-2xl new-message ${
                        isAttention
                          ? 'bg-yellow-400 text-black msn-attention-pulse'
                          : isOwnMessage
                          ? 'bg-blue-500 text-white msn-glow'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                      <span className="text-xs text-muted-foreground px-2">
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>

      {/* Input de mensagem */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1"
          />
          <EmoticonPicker onSelect={handleEmoticonSelect} />
          <Button 
            onClick={() => sendMessage()}
            disabled={!newMessage.trim()}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => sendMessage('attention')}
            variant="outline"
            className="bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400"
            title="Chamar atenção"
          >
            <Zap className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Pressione Enter para enviar • 📳 para chamar atenção
        </p>
      </div>

      {/* Efeito de atenção */}
      <AttentionEffect 
        isActive={showAttentionEffect} 
        onComplete={handleAttentionComplete} 
      />
    </div>
  )
}