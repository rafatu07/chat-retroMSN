import { useEffect, useState } from 'react'
import { playAttentionSound } from '../utils/sounds'

export const AttentionEffect = ({ isActive, onComplete }) => {
  const [shakeIntensity, setShakeIntensity] = useState(0)

  useEffect(() => {
    if (!isActive) return

    // Tocar som de atenção
    playAttentionSound()

    // Criar efeito de tremor progressivo
    let intensity = 0
    const maxIntensity = 20
    const duration = 2000 // 2 segundos

    const shakeInterval = setInterval(() => {
      intensity = Math.sin((Date.now() % 200) / 200 * Math.PI * 2) * maxIntensity
      setShakeIntensity(intensity)
    }, 50)

    // Parar o efeito após a duração
    const timeout = setTimeout(() => {
      clearInterval(shakeInterval)
      setShakeIntensity(0)
      onComplete?.()
    }, duration)

    return () => {
      clearInterval(shakeInterval)
      clearTimeout(timeout)
      setShakeIntensity(0)
    }
  }, [isActive, onComplete])

  if (!isActive) return null

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        transform: `translate(${shakeIntensity}px, ${shakeIntensity * 0.5}px)`,
        transition: 'transform 0.05s ease-out'
      }}
    >
      {/* Overlay com efeito visual */}
      <div className="absolute inset-0 bg-yellow-400/20 animate-pulse" />
      
      {/* Partículas de atenção */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: '0.8s'
            }}
          >
            <span className="text-4xl">📳</span>
          </div>
        ))}
      </div>

      {/* Texto de atenção central */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-yellow-400 text-black px-8 py-4 rounded-lg shadow-2xl animate-pulse border-4 border-yellow-600">
          <div className="text-2xl font-bold text-center">
            📳 ATENÇÃO! 📳
          </div>
          <div className="text-lg text-center mt-2">
            Alguém está chamando você!
          </div>
        </div>
      </div>
    </div>
  )
}
