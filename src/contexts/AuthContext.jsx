import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    // Timeout de segurança: se demorar mais de 15 segundos, liberar acesso
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ Timeout de segurança atingido - liberando acesso')
        setLoading(false)
      }
    }, 15000) // 15 segundos
    
    // Verificar sessão atual
    const getSession = async () => {
      console.log('🔍 Iniciando verificação de sessão...')

      try {
        // Buscar sessão do Supabase
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (error) {
          console.error('❌ Erro na sessão:', error)
          setUser(null)
          setProfile(null)
          setLoading(false)
          clearTimeout(safetyTimeout)
          return
        }
        
        console.log('📦 Sessão obtida:', session ? `Usuário: ${session.user.email}` : 'Sem sessão')
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 Buscando perfil do usuário...')
          try {
            await fetchProfile(session.user.id)
          } catch (profileError) {
            console.error('❌ Erro ao buscar perfil:', profileError)
            // Mesmo com erro no perfil, permitir acesso
            // O usuário pode estar autenticado mas sem perfil criado
          }
        }
        
        console.log('✅ Carregamento finalizado')
        if (isMounted) {
          setLoading(false)
          clearTimeout(safetyTimeout)
        }
      } catch (err) {
        if (!isMounted) return
        
        console.error('❌ Erro crítico ao verificar sessão:', err)
        console.error('💡 Limpando sessão corrompida...')
        
        // Limpar sessão corrompida
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        setLoading(false)
        clearTimeout(safetyTimeout)
      }
    }

    getSession()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )
    
    return () => {
      isMounted = false
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId) => {
    try {
      console.log('🔎 Buscando perfil para userId:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Erro ao buscar perfil:', error)
        
        // Se o perfil não existe, criar um novo
        if (error.code === 'PGRST116') {
          console.log('📝 Perfil não encontrado, criando novo...')
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{
              id: userId,
              email: user?.email || '',
              display_name: user?.email?.split('@')[0] || 'Usuário'
            }])
            .select()
            .single()

          if (createError) {
            console.error('❌ Erro ao criar perfil:', createError)
            throw createError
          }

          console.log('✅ Perfil criado:', newProfile)
          setProfile(newProfile)
          return
        }
        
        throw error
      }
      
      console.log('✅ Perfil encontrado:', data)
      setProfile(data)
    } catch (error) {
      console.error('❌ Erro fatal ao buscar perfil:', error)
      console.error('⚠️ ATENÇÃO: Execute o arquivo database-setup.sql no Supabase!')
      throw error
    }
  }

  const signUp = async (email, password, displayName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      // Atualizar status para offline antes de sair
      if (profile) {
        await supabase
          .from('profiles')
          .update({ status: 'offline' })
          .eq('id', profile.id)
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const updateProfile = async (updates) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const updateStatus = async (status, statusMessage = null) => {
    try {
      const updates = { status }
      if (statusMessage !== null) {
        updates.status_message = statusMessage
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    updateStatus,
    fetchProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
