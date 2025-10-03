import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { UserCheck, UserX, Users, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { NotificationBadge } from './NotificationBadge'

export const FriendRequests = ({ onRequestHandled }) => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)

  // Buscar solicitações ao carregar o componente (para mostrar o badge)
  useEffect(() => {
    if (user) {
      console.log('🔵 useEffect inicial - carregando badge')
      fetchRequests()
    }
  }, [user?.id]) // Dependência mais específica

  // Buscar novamente quando o dialog abrir
  useEffect(() => {
    if (open && user) {
      console.log('🟢 Dialog abriu - recarregando solicitações')
      fetchRequests()
    }
  }, [open])

  const fetchRequests = async () => {
    if (!user) {
      console.log('⚠️ fetchRequests chamado sem usuário')
      return
    }

    console.log('🔔 Buscando solicitações de amizade para:', user.id)
    
    setLoading(true)
    
    // Timeout de segurança: 8 segundos
    const timeoutId = setTimeout(() => {
      console.log('⏰ Timeout: liberando loading')
      setLoading(false)
      setRequests([]) // Mostrar vazio se demorar muito
      toast.error('A busca demorou muito. Tente novamente.')
    }, 8000)
    
    try {
      // Query otimizada: buscar apenas os dados essenciais
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, user_id, status, created_at')
        .eq('contact_id', user.id)
        .eq('status', 'pending')

      if (contactsError) {
        console.error('❌ Erro ao buscar contatos:', contactsError)
        throw contactsError
      }

      console.log('📬 Contatos pendentes:', contactsData)

      if (!contactsData || contactsData.length === 0) {
        setRequests([])
        clearTimeout(timeoutId)
        setLoading(false)
        return
      }

      // Buscar perfis dos solicitantes separadamente
      const userIds = contactsData.map(c => c.user_id)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email')
        .in('id', userIds)

      if (profilesError) {
        console.error('❌ Erro ao buscar perfis:', profilesError)
        throw profilesError
      }

      console.log('👥 Perfis encontrados:', profilesData)

      // Combinar dados
      const requestsWithProfiles = contactsData.map(contact => ({
        ...contact,
        requester: profilesData.find(p => p.id === contact.user_id)
      }))

      console.log('✅ Solicitações completas:', requestsWithProfiles)
      setRequests(requestsWithProfiles)
      
    } catch (error) {
      console.error('❌ Erro ao buscar solicitações:', error)
      toast.error('Erro ao carregar solicitações')
      setRequests([])
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  const handleRequest = async (requestId, contactId, action) => {
    setLoading(true)
    try {
      const newStatus = action === 'accept' ? 'accepted' : 'blocked'

      // Atualizar status da solicitação
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ status: newStatus })
        .eq('id', requestId)

      if (updateError) throw updateError

      if (action === 'accept') {
        // Se aceitar, também atualizar a relação reversa
        const { error: reverseError } = await supabase
          .from('contacts')
          .update({ status: 'accepted' })
          .eq('user_id', contactId)
          .eq('contact_id', user.id)

        if (reverseError) throw reverseError
      } else {
        // Se rejeitar, remover a relação reversa
        await supabase
          .from('contacts')
          .delete()
          .eq('user_id', contactId)
          .eq('contact_id', user.id)
      }

      toast.success(
        action === 'accept' 
          ? 'Solicitação aceita!' 
          : 'Solicitação rejeitada'
      )

      fetchRequests()
      onRequestHandled?.()
    } catch (error) {
      console.error('Erro ao processar solicitação:', error)
      toast.error('Erro ao processar solicitação')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <NotificationBadge count={requests.length}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      </NotificationBadge>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Solicitações de Amizade
          </DialogTitle>
          <DialogDescription>
            Gerencie suas solicitações de amizade pendentes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <div className="text-muted-foreground mb-2">Carregando solicitações...</div>
              <p className="text-xs text-muted-foreground">Isso pode demorar alguns segundos</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchRequests}
                className="mt-4"
              >
                🔄 Atualizar
              </Button>
            </div>
          ) : (
            requests.map((request) => {
              const requester = request.requester
              
              return (
                <Card key={request.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={requester.avatar_url} />
                      <AvatarFallback className="bg-purple-500 text-white">
                        {getInitials(requester.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{requester.display_name}</h4>
                      <p className="text-sm text-muted-foreground truncate">{requester.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Quer ser seu amigo
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleRequest(request.id, requester.id, 'accept')}
                        disabled={loading}
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRequest(request.id, requester.id, 'reject')}
                        disabled={loading}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
