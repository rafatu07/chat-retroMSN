import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const useOnlineStatus = () => {
  const { user, profile, updateStatus } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState([])
  const isInitialized = useRef(false)

  useEffect(() => {
    if (!user || !profile) return

    // Evitar inicialização múltipla
    if (isInitialized.current) return
    isInitialized.current = true

    console.log('🟢 Inicializando status online para:', profile.display_name)

    // Marcar como online quando conectar (apenas uma vez)
    const setInitialStatus = async () => {
      await updateStatus('online')
      fetchOnlineUsers()
    }
    setInitialStatus()

    // Configurar heartbeat menos frequente
    const heartbeatInterval = setInterval(async () => {
      if (profile?.status === 'online') {
        console.log('💓 Heartbeat: mantendo status online')
        await updateStatus('online')
      }
    }, 60000) // A cada 60 segundos

    // NÃO escutar mudanças em tempo real para evitar loop
    // Os usuários verão atualizações ao recarregar ou quando fizerem ações

    // Cleanup
    return () => {
      console.log('🔴 Limpando status online')
      clearInterval(heartbeatInterval)
      isInitialized.current = false
    }
  }, [user?.id]) // MUDANÇA: só depende do user.id, não do profile inteiro

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

    // Remover handleVisibilityChange para evitar loops

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user?.id])

  return {
    onlineUsers,
    fetchOnlineUsers
  }
}
