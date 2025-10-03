import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { ChatApp } from './components/ChatApp'
import './App.css'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Carregando...</div>
          <div className="text-white/80 text-sm mb-4">
            Sua sessão expirou! Entre novamente
          </div>
          <button
            onClick={() => {
              console.log('🧹 Limpando sessão...')
              sessionStorage.clear()
              localStorage.clear()
              window.location.reload()
            }}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors backdrop-blur-sm border border-white/30"
          >
            💬 Voltar ao Chat
          </button>
        </div>
      </div>
    )
  }

  return user ? <ChatApp /> : <Login />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </AuthProvider>
  )
}

export default App
