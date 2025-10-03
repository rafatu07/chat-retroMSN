import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const useOnlineStatus = () => {
  const { user, profile, updateStatus } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState([])
  const [isConnected, setIsConnected] = useState(true)
  const isInitialized = useRef(false)
  const heartbeatRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  useEffect(() => {
    if (!user || !profile) return

    // Evitar inicialização múltipla
    if (isInitialized.current) return
    isInitialized.current = true

    console.log('🟢 Inicializando status online para:', profile.display_name)

    // Marcar como online quando conectar
    const setInitialStatus = async () => {
      try {
        await updateStatus('online')
        setIsConnected(true)
        fetchOnlineUsers()
      } catch (error) {
        console.error('❌ Erro ao definir status inicial:', error)
        setIsConnected(false)
        scheduleReconnect()
      }
    }
    setInitialStatus()

    // Configurar heartbeat mais frequente para manter conexão
    const startHeartbeat = () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      
      heartbeatRef.current = setInterval(async () => {
        if (profile?.status === 'online' || profile?.status === 'away' || profile?.status === 'busy') {
          console.log('💓 Heartbeat: mantendo conexão ativa')
          try {
            // Atualizar timestamp sem mudar status
            const { error } = await supabase
              .from('profiles')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', user.id)
            
            if (error) throw error
            setIsConnected(true)
          } catch (error) {
            console.error('❌ Heartbeat falhou:', error)
            setIsConnected(false)
            scheduleReconnect()
          }
        }
      }, 30000) // A cada 30 segundos
    }

    startHeartbeat()

    // Detectar quando a aba volta ao foco
    const handleFocus = async () => {
      console.log('👁️ Aba voltou ao foco, reconectando...')
      try {
        await updateStatus(profile?.status || 'online')
        setIsConnected(true)
        fetchOnlineUsers()
      } catch (error) {
        console.error('❌ Erro ao reconectar:', error)
        scheduleReconnect()
      }
    }

    // Detectar conexão de rede
    const handleOnline = () => {
      console.log('🌐 Conexão de rede restaurada')
      setIsConnected(true)
      handleFocus()
    }

    const handleOffline = () => {
      console.log('📡 Conexão de rede perdida')
      setIsConnected(false)
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      console.log('🔴 Limpando status online')
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      isInitialized.current = false
    }
  }, [user?.id])

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    console.log('🔄 Agendando reconexão em 5 segundos...')
    reconnectTimeoutRef.current = setTimeout(async () => {
      console.log('🔄 Tentando reconectar...')
      try {
        await updateStatus(profile?.status || 'online')
        setIsConnected(true)
        console.log('✅ Reconectado com sucesso!')
      } catch (error) {
        console.error('❌ Falha ao reconectar:', error)
        scheduleReconnect() // Tentar novamente
      }
    }, 5000)
  }

  const fetchOnlineUsers = async () => {
    try {
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, status, avatar_url')
        .neq('status', 'offline')
        .neq('id', user.id)

      if (error) {
        console.error('❌ Erro ao buscar usuários online:', error.message, error)
        return
      }
      
      setOnlineUsers(data || [])
    } catch (error) {
      console.error('❌ Erro fatal ao buscar usuários online:', error)
    }
  }

  // Detectar quando o usuário sai da página/fecha o navegador
  useEffect(() => {
    if (!user || !profile) return

    const handleBeforeUnload = async () => {
      // Marcar como offline ao sair
      await updateStatus('offline')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user?.id])

  return {
    onlineUsers,
    fetchOnlineUsers,
    isConnected
  }
}
