import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const useOnlineStatus = () => {
  const { user, profile, updateStatus } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState([])
  const [isConnected, setIsConnected] = useState(true)
  const [profileStatuses, setProfileStatuses] = useState({})
  const isInitialized = useRef(false)
  const heartbeatRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const channelRef = useRef(null)

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
        
        // Adicionar próprio status ao profileStatuses
        setProfileStatuses(prev => ({
          ...prev,
          [user.id]: {
            status: 'online',
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            updated_at: new Date().toISOString()
          }
        }))
        
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
        } else if (profile?.status === 'offline') {
          // Se estiver offline, parar o heartbeat
          console.log('⏸️ Status offline, pausando heartbeat')
        }
      }, 45000) // A cada 45 segundos (menos que o timeout de 60s)
    }

    startHeartbeat()

    // Configurar Realtime para escutar mudanças de status
    const setupRealtimeListener = () => {
      console.log('📡 Configurando listener Realtime para status')
      
      channelRef.current = supabase
        .channel('profile-status-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles'
          },
          (payload) => {
            console.log('🔄 Mudança de status detectada:', payload.new)
            const updatedProfile = payload.new
            
            // Verificar se é o próprio usuário
            if (updatedProfile.id === user.id) {
              console.log('✅ Meu próprio status mudou para:', updatedProfile.status)
            } else {
              console.log('👤 Status de outro usuário mudou:', updatedProfile.display_name, '→', updatedProfile.status)
            }
            
            // Atualizar estado local de status
            setProfileStatuses(prev => {
              const newState = {
                ...prev,
                [updatedProfile.id]: {
                  status: updatedProfile.status,
                  display_name: updatedProfile.display_name,
                  avatar_url: updatedProfile.avatar_url,
                  updated_at: updatedProfile.updated_at
                }
              }
              console.log('📊 profileStatuses atualizado:', newState)
              return newState
            })
            
            // Se mudou para offline, remover dos onlineUsers
            if (updatedProfile.status === 'offline') {
              setOnlineUsers(prev => prev.filter(u => u.id !== updatedProfile.id))
            } else {
              // Adicionar ou atualizar nos onlineUsers
              setOnlineUsers(prev => {
                const exists = prev.find(u => u.id === updatedProfile.id)
                if (exists) {
                  return prev.map(u => 
                    u.id === updatedProfile.id 
                      ? { ...u, status: updatedProfile.status }
                      : u
                  )
                } else {
                  return [...prev, {
                    id: updatedProfile.id,
                    display_name: updatedProfile.display_name,
                    avatar_url: updatedProfile.avatar_url,
                    status: updatedProfile.status
                  }]
                }
              })
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Status Realtime (profiles):', status)
        })
    }

    setupRealtimeListener()

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

    // Detectar quando a aba perde o foco por muito tempo
    let blurTimeout = null
    const handleBlur = () => {
      console.log('👁️ Aba perdeu o foco')
      // Após 2 minutos sem foco, marcar como away
      blurTimeout = setTimeout(async () => {
        if (profile?.status === 'online') {
          console.log('⏰ Marcando como ausente por inatividade')
          try {
            await updateStatus('away')
          } catch (error) {
            console.error('❌ Erro ao marcar como ausente:', error)
          }
        }
      }, 120000) // 2 minutos
    }

    const handleFocusAgain = async () => {
      if (blurTimeout) {
        clearTimeout(blurTimeout)
        blurTimeout = null
      }
      await handleFocus()
    }

    // Detectar conexão de rede
    const handleOnline = () => {
      console.log('🌐 Conexão de rede restaurada')
      setIsConnected(true)
      handleFocusAgain()
    }

    const handleOffline = () => {
      console.log('📡 Conexão de rede perdida')
      setIsConnected(false)
    }

    window.addEventListener('focus', handleFocusAgain)
    window.addEventListener('blur', handleBlur)
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
      if (blurTimeout) {
        clearTimeout(blurTimeout)
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      window.removeEventListener('focus', handleFocusAgain)
      window.removeEventListener('blur', handleBlur)
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

    const handleBeforeUnload = async (e) => {
      // Marcar como offline ao sair (usar forma síncrona)
      console.log('🚪 Usuário saindo, marcando como offline')
      try {
        // Usar fetch síncrono com keepalive para garantir que a requisição seja enviada
        await supabase
          .from('profiles')
          .update({ status: 'offline', updated_at: new Date().toISOString() })
          .eq('id', user.id)
      } catch (error) {
        console.error('❌ Erro ao marcar offline:', error)
      }
    }

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        console.log('👁️ Aba ficou oculta')
      } else {
        console.log('👁️ Aba ficou visível novamente')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id])

  return {
    onlineUsers,
    fetchOnlineUsers,
    isConnected,
    profileStatuses
  }
}
