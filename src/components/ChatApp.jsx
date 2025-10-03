import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  MessageCircle, 
  Users, 
  Settings, 
  LogOut, 
  Circle, 
  Clock, 
  Minus,
  UserPlus,
  Wifi,
  WifiOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AddContact } from './AddContact'
import { FriendRequests } from './FriendRequests'
import { ChatWindow } from './ChatWindow'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useUnreadMessages } from '../hooks/useUnreadMessages'

const statusConfig = {
  online: { color: 'bg-green-500', label: 'Online', icon: Circle },
  away: { color: 'bg-yellow-500', label: 'Ausente', icon: Clock },
  busy: { color: 'bg-red-500', label: 'Ocupado', icon: Minus },
  offline: { color: 'bg-gray-500', label: 'Offline', icon: Circle }
}

export const ChatApp = () => {
  const { user, profile, signOut, updateStatus } = useAuth()
  const [contacts, setContacts] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [loading, setLoading] = useState(true)
  const { isConnected, profileStatuses } = useOnlineStatus()
  const { getUnreadCount, markAsRead, unreadCounts } = useUnreadMessages()
  
  // Log para debug - ver quando unreadCounts muda
  useEffect(() => {
    console.log('🔔 CHATAPP: unreadCounts mudou!', unreadCounts)
  }, [unreadCounts])
  
  // Log para debug - ver quando profileStatuses muda
  useEffect(() => {
    console.log('👥 CHATAPP: profileStatuses mudou!', profileStatuses)
  }, [profileStatuses])

  useEffect(() => {
    if (profile) {
      fetchContacts()
    }
  }, [profile])



  const fetchContacts = async () => {
    try {
      if (!user) return

      console.log('🔍 Buscando contatos para:', user.id)

      // Buscar contatos onde o usuário é o USER_ID (ele adicionou alguém)
      const { data: contactsAsSender, error: error1 } = await supabase
        .from('contacts')
        .select(`
          id,
          contact_id,
          status,
          created_at
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted')

      if (error1) {
        console.error('❌ Erro ao buscar contatos (sender):', error1)
        throw error1
      }

      // Buscar contatos onde o usuário é o CONTACT_ID (alguém o adicionou)
      const { data: contactsAsReceiver, error: error2 } = await supabase
        .from('contacts')
        .select(`
          id,
          user_id,
          status,
          created_at
        `)
        .eq('contact_id', user.id)
        .eq('status', 'accepted')

      if (error2) {
        console.error('❌ Erro ao buscar contatos (receiver):', error2)
        throw error2
      }

      console.log('📤 Contatos onde sou sender:', contactsAsSender)
      console.log('📥 Contatos onde sou receiver:', contactsAsReceiver)

      // Combinar os IDs dos contatos
      const allContactIds = [
        ...(contactsAsSender || []).map(c => c.contact_id),
        ...(contactsAsReceiver || []).map(c => c.user_id)
      ]

      console.log('👥 IDs de todos os contatos:', allContactIds)

      if (allContactIds.length === 0) {
        setContacts([])
        return
      }

      // Buscar perfis de todos os contatos
      const { data: profilesData, error: error3 } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, status, status_message')
        .in('id', allContactIds)

      if (error3) {
        console.error('❌ Erro ao buscar perfis:', error3)
        throw error3
      }

      console.log('✅ Perfis dos contatos:', profilesData)

      // Mapear para o formato esperado
      const formattedContacts = (profilesData || []).map(profile => ({
        id: profile.id,
        contact: profile
      }))

      setContacts(formattedContacts)
    } catch (error) {
      console.error('❌ Erro fatal ao buscar contatos:', error)
      toast.error('Erro ao carregar contatos')
    } finally {
      setLoading(false)
    }
  }



  const handleStatusChange = async (newStatus) => {
    const { error } = await updateStatus(newStatus)
    if (error) {
      toast.error('Erro ao atualizar status')
    } else {
      toast.success(`Status alterado para ${statusConfig[newStatus].label}`)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Logout realizado com sucesso!')
  }

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  }

  const handleContactClick = (contactData) => {
    setSelectedContact(contactData)
    // Marcar mensagens como lidas ao abrir o chat
    markAsRead(contactData.id)
  }

  const StatusIcon = statusConfig[profile?.status]?.icon || Circle

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
      <div className="container mx-auto p-4 h-screen flex gap-4">
        {/* Sidebar - Lista de contatos */}
        <Card className="w-80 flex flex-col backdrop-blur-sm bg-white/90" style={{ overflow: 'visible' }}>
          <CardHeader className="pb-3" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-blue-500 text-white">
                    {getInitials(profile?.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate flex items-center gap-2">
                    {profile?.display_name}
                    {isConnected ? (
                      <Wifi className="h-3 w-3 text-green-500" title="Conectado" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-red-500 animate-pulse" title="Desconectado" />
                    )}
                  </h3>
                  <div className="flex items-center gap-1">
                    <StatusIcon className={`h-3 w-3 ${statusConfig[profile?.status]?.color}`} />
                    <span className="text-sm text-muted-foreground">
                      {statusConfig[profile?.status]?.label}
                    </span>
                  </div>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleStatusChange('online')}>
                    <Circle className="mr-2 h-4 w-4 bg-green-500 rounded-full" />
                    Online
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('away')}>
                    <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                    Ausente
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('busy')}>
                    <Minus className="mr-2 h-4 w-4 text-red-500" />
                    Ocupado
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between mb-4" style={{ overflow: 'visible', position: 'relative', zIndex: 100 }}>
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Contatos ({contacts.length})
              </h4>
              <div className="flex gap-2" style={{ overflow: 'visible', position: 'relative', zIndex: 100 }}>
                <FriendRequests onRequestHandled={fetchContacts} />
                <AddContact onContactAdded={fetchContacts} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2" style={{ position: 'relative', zIndex: 1 }}>
              {contacts.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum contato ainda</p>
                  <p className="text-sm">Adicione amigos para começar a conversar!</p>
                </div>
              ) : (
                contacts.map((contact) => {
                  const contactData = contact.contact
                  // Usar status do Realtime se disponível, senão usar do banco
                  const currentStatus = profileStatuses[contactData.id]?.status || contactData.status
                  const ContactStatusIcon = statusConfig[currentStatus]?.icon || Circle
                  const unreadCount = getUnreadCount(contactData.id)
                  const hasUnread = unreadCount > 0
                  
                  return (
                    <div
                      key={contact.id}
                      className={`contact-item flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-100 ${
                        selectedContact?.id === contactData.id ? 'bg-blue-100 msn-glow' : ''
                      } ${hasUnread && selectedContact?.id !== contactData.id ? 'bg-yellow-50 border-l-4 border-yellow-500 animate-pulse' : ''}`}
                      onClick={() => handleContactClick(contactData)}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contactData.avatar_url} />
                          <AvatarFallback className="bg-purple-500 text-white">
                            {getInitials(contactData.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <ContactStatusIcon 
                          className={`absolute -bottom-1 -right-1 h-4 w-4 ${statusConfig[currentStatus]?.color} border-2 border-white rounded-full`} 
                        />
                        {hasUnread && selectedContact?.id !== contactData.id && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                            <span className="text-xs text-white font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className={`font-medium truncate ${hasUnread && selectedContact?.id !== contactData.id ? 'font-bold text-blue-600' : ''}`}>
                          {contactData.display_name}
                        </h5>
                        <p className={`text-sm truncate ${hasUnread && selectedContact?.id !== contactData.id ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                          {hasUnread && selectedContact?.id !== contactData.id ? (
                            <>💬 {unreadCount} nova{unreadCount > 1 ? 's' : ''} mensagem{unreadCount > 1 ? 'ns' : ''}</>
                          ) : (
                            contactData.status_message || statusConfig[currentStatus]?.label
                          )}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Área principal do chat */}
        <Card className="flex-1 flex flex-col backdrop-blur-sm bg-white/90">
          {selectedContact ? (
            <ChatWindow 
              contact={selectedContact} 
              onClose={() => setSelectedContact(null)} 
            />
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Bem-vindo ao MSN Chat!</h3>
                <p>Selecione um contato para começar a conversar</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
