# MSN Chat - Reviva a Nostalgia

Um chat online inspirado no clássico MSN Messenger, construído com React, Vite e Supabase.

## 🚀 Funcionalidades

### ✅ Implementadas
- **Autenticação completa** - Login e registro de usuários
- **Sistema de contatos** - Adicionar amigos por busca ou email
- **Solicitações de amizade** - Aceitar/rejeitar pedidos de amizade
- **Chat em tempo real** - Mensagens instantâneas usando Supabase Realtime
- **Status online/offline** - Visualização do status dos contatos
- **Funcionalidade "Chamar Atenção"** - O famoso recurso que faz a tela tremer
- **Emoticons** - Picker de emojis e conversão automática de códigos (:) → 😊)
- **Sons de notificação** - Efeitos sonoros para mensagens e atenção
- **Interface nostálgica** - Design inspirado no MSN original
- **Efeitos visuais** - Animações e transições suaves

### 🎯 Recursos Especiais
- **Efeito "Chamar Atenção"** com tremor da tela e efeitos visuais
- **Conversão automática de emoticons** (ex: :) vira 😊)
- **Sons personalizados** para diferentes tipos de notificação
- **Status em tempo real** com heartbeat automático
- **Interface responsiva** com design moderno

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Ícones**: Lucide React
- **Formatação de datas**: date-fns
- **Notificações**: react-hot-toast

## 📦 Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- Conta no Supabase

### 1. Clone o repositório
\`\`\`bash
git clone <url-do-repositorio>
cd msn-chat
\`\`\`

### 2. Instale as dependências
\`\`\`bash
pnpm install
\`\`\`

### 3. Configure o Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o script SQL em \`database-setup.sql\` no SQL Editor do Supabase
3. Configure as variáveis de ambiente:

\`\`\`bash
# .env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
\`\`\`

### 4. Execute o projeto
\`\`\`bash
pnpm run dev
\`\`\`

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais
- **profiles** - Dados dos usuários (nome, avatar, status)
- **contacts** - Relacionamentos de amizade
- **conversations** - Conversas entre usuários
- **messages** - Mensagens do chat
- **email_invites** - Convites por email

### Funcionalidades do Banco
- **RLS (Row Level Security)** configurado
- **Triggers automáticos** para criação de perfis
- **Função personalizada** para buscar/criar conversas
- **Índices otimizados** para performance

## 🎮 Como Usar

### 1. Registro/Login
- Crie uma conta ou faça login
- Seu perfil será criado automaticamente

### 2. Adicionar Contatos
- Use o botão "+" para buscar usuários ou enviar convites por email
- Aceite solicitações de amizade no ícone de notificação

### 3. Conversar
- Clique em um contato para abrir o chat
- Digite mensagens normalmente
- Use emoticons: :) :D :P <3 etc.
- Clique no raio (⚡) para "chamar atenção"

### 4. Status
- Altere seu status no menu de configurações
- Veja o status dos amigos em tempo real

## 🎨 Emoticons Suportados

| Código | Emoji | Nome |
|--------|-------|------|
| :) | 😊 | Feliz |
| :( | 😢 | Triste |
| :D | 😃 | Muito feliz |
| :P | 😛 | Língua de fora |
| ;) | 😉 | Piscadinha |
| <3 | ❤️ | Coração |
| :* | 😘 | Beijinho |
| 8) | 😎 | Legal |

*E muitos outros!*

## 🚀 Deploy

### Preparação para Deploy
\`\`\`bash
# Build da aplicação
pnpm run build

# Preview local
pnpm run preview
\`\`\`

### Opções de Deploy
- **Vercel** (recomendado para React)
- **Netlify**
- **GitHub Pages**
- **Servidor próprio**

## 🔧 Desenvolvimento

### Estrutura de Pastas
\`\`\`
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes shadcn/ui
│   ├── Login.jsx       # Tela de login
│   ├── ChatApp.jsx     # App principal
│   ├── ChatWindow.jsx  # Janela de chat
│   └── ...
├── contexts/           # Contextos React
├── hooks/              # Hooks customizados
├── lib/                # Configurações
├── styles/             # Estilos CSS
└── utils/              # Utilitários
\`\`\`

### Scripts Disponíveis
\`\`\`bash
pnpm run dev        # Servidor de desenvolvimento
pnpm run build      # Build para produção
pnpm run preview    # Preview da build
pnpm run lint       # Linting do código
\`\`\`

## 🐛 Solução de Problemas

### Problemas Comuns

1. **Erro de conexão com Supabase**
   - Verifique as variáveis de ambiente
   - Confirme se o script SQL foi executado

2. **Mensagens não aparecem em tempo real**
   - Verifique se o Realtime está habilitado no Supabase
   - Confirme as políticas RLS

3. **Sons não funcionam**
   - Alguns navegadores bloqueiam áudio automático
   - O usuário precisa interagir com a página primeiro

## 📝 Licença

Este projeto é open source e está disponível sob a licença MIT.

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Enviar pull requests

## 🎉 Créditos

Inspirado no saudoso MSN Messenger, que marcou uma geração inteira de usuários da internet.

---

**Desenvolvido com ❤️ e nostalgia**
