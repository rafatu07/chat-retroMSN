import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserPlus, Mail, Search, Loader2, Check, Clock, Circle } from 'lucide-react'
import toast from 'react-hot-toast'

export const AddContact = ({ onContactAdded }) => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  const searchUsers = async () => {
    const query = searchQuery.trim()
    if (!query) {
      toast.error('Digite algo para buscar')
      return
    }

    console.log('🔍 Buscando usuários com query:', query)
    setLoading(true)
    
    try {
      // Buscar usuários
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, status, avatar_url, updated_at')
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', user.id)
        .limit(50)

      console.log('📦 Resultado da busca:', { data, error })
      console.log('📊 Total de usuários encontrados:', data?.length || 0)

      if (error) {
        console.error('❌ Erro na busca:', error)
        toast.error('Erro ao buscar: ' + error.message)
        throw error
      }

      if (!data || data.length === 0) {
        console.log('⚠️ Nenhum usuário encontrado')
        setSearchResults([])
        toast(`Nenhum usuário encontrado com "${query}"`, {
          icon: 'ℹ️',
        })
        setLoading(false)
        return
      }

      console.log(`✅ ${data.length} usuário(s) encontrado(s)`)

      // Buscar contatos existentes (aceitos ou pendentes)
      const { data: existingContacts, error: contactsError } = await supabase
        .from('contacts')
        .select('contact_id, status')
        .eq('user_id', user.id)

      if (contactsError) {
        console.error('❌ Erro ao buscar contatos:', contactsError)
      }

      console.log('📋 Contatos existentes:', existingContacts)

      // Criar mapa de status dos contatos
      const contactStatusMap = {}
      existingContacts?.forEach(c => {
        contactStatusMap[c.contact_id] = c.status
      })
      
      console.log('📊 Mapa de status:', contactStatusMap)

      // Adicionar informação de status a cada usuário encontrado
      const resultsWithStatus = data.map(u => ({
        ...u,
        contactStatus: contactStatusMap[u.id] || null,
        isAlreadyContact: !!contactStatusMap[u.id]
      }))

      console.log(`✅ ${resultsWithStatus.length} usuário(s) encontrado(s) com status`)
      console.log('📊 Resultados com status:', resultsWithStatus)

      setSearchResults(resultsWithStatus)
    } catch (error) {
      console.error('❌ Erro fatal ao buscar usuários:', error)
      toast.error('Erro ao buscar usuários: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const addContact = async (contactId) => {
    setLoading(true)
    console.log('➕ Adicionando contato:', contactId)
    
    try {
      // Usar função RPC para adicionar contato (permite criar ambos os registros com segurança)
      const { data, error } = await supabase
        .rpc('add_contact_request', {
          contact_user_id: contactId
        })

      console.log('📦 Resposta da função:', data)

      if (error) {
        console.error('❌ Erro ao chamar função:', error)
        throw error
      }

      // Verificar se a função retornou sucesso
      if (data && !data.success) {
        console.error('❌ Função retornou erro:', data.error)
        throw new Error(data.error)
      }

      console.log('✅ Contato adicionado com sucesso')
      toast.success('Solicitação de amizade enviada!')
      setSearchResults([])
      setSearchQuery('')
      setOpen(false)
      onContactAdded?.()
    } catch (error) {
      console.error('❌ Erro fatal ao adicionar contato:', error)
      const errorMessage = error.message || 'Erro desconhecido'
      
      // Mensagens amigáveis
      if (errorMessage.includes('function') || errorMessage.includes('not found')) {
        toast.error('⚠️ Execute o arquivo fix-add-contact-function.sql no Supabase!')
      } else if (errorMessage.includes('já existe')) {
        toast('Este usuário já está nos seus contatos', {
          icon: '👥',
        })
      } else {
        toast.error('Erro ao enviar solicitação: ' + errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const sendEmailInvite = async () => {
    if (!inviteEmail.trim()) return

    setLoading(true)
    try {
      // Verificar se o email já está registrado
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail)
        .single()

      if (existingUser) {
        toast.error('Este usuário já está registrado. Use a busca para adicioná-lo.')
        setLoading(false)
        return
      }

      // Gerar token único para o convite
      const token = crypto.randomUUID()

      const { error } = await supabase
        .from('email_invites')
        .insert([
          {
            inviter_id: user.id,
            email: inviteEmail,
            token: token
          }
        ])

      if (error) throw error

      // Aqui você pode implementar o envio real do email
      // Por enquanto, apenas mostramos uma mensagem de sucesso
      toast.success('Convite enviado por email!')
      setInviteEmail('')
    } catch (error) {
      console.error('Erro ao enviar convite:', error)
      toast.error('Erro ao enviar convite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Contato</DialogTitle>
          <DialogDescription>
            Encontre amigos pelo nome ou email, ou convide novos usuários
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Buscar Usuários</TabsTrigger>
            <TabsTrigger value="invite">Convidar por Email</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar por nome ou email</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Digite o nome ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      searchUsers()
                    }
                  }}
                />
                <Button onClick={searchUsers} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.length === 0 && searchQuery && !loading && (
                <Alert>
                  <AlertDescription>
                    Nenhum usuário encontrado com "{searchQuery}"
                  </AlertDescription>
                </Alert>
              )}

              {searchResults.map((user) => {
                const getInitials = (name) => {
                  if (!name) return '?'
                  return name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                }
                
                const statusConfig = {
                  online: { color: 'bg-green-500', label: 'Online' },
                  away: { color: 'bg-yellow-500', label: 'Ausente' },
                  busy: { color: 'bg-red-500', label: 'Ocupado' },
                  offline: { color: 'bg-gray-500', label: 'Offline' }
                }
                
                return (
                  <Card key={user.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            {getInitials(user.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <Circle 
                          className={`absolute -bottom-1 -right-1 h-3 w-3 ${statusConfig[user.status]?.color || 'bg-gray-500'} border-2 border-white rounded-full`} 
                          fill="currentColor"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium truncate">{user.display_name || 'Usuário'}</h4>
                          {user.contactStatus === 'accepted' && (
                            <Badge variant="secondary" className="gap-1">
                              <Check className="h-3 w-3" />
                              Adicionado
                            </Badge>
                          )}
                          {user.contactStatus === 'pending' && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" />
                              Pendente
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                      
                      {!user.isAlreadyContact ? (
                        <Button 
                          size="sm" 
                          onClick={() => addContact(user.id)}
                          disabled={loading}
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          disabled
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="invite" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Convidar por Email
                </CardTitle>
                <CardDescription>
                  Envie um convite para alguém que ainda não tem conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email do amigo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="amigo@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={sendEmailInvite} 
                  disabled={loading || !inviteEmail.trim()}
                  className="w-full"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Enviar Convite
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
