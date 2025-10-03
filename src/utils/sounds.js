// Utilitários para sons e efeitos do MSN Chat

export const playNotificationSound = () => {
  try {
    // Criar um som de notificação usando Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    // Criar um som de "ding" simples
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    console.log('Não foi possível reproduzir som:', error)
  }
}

export const playAttentionSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    // Som mais dramático para "chamar atenção"
    const oscillator1 = audioContext.createOscillator()
    const oscillator2 = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator1.connect(gainNode)
    oscillator2.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Duas frequências para criar um som mais rico
    oscillator1.frequency.setValueAtTime(1000, audioContext.currentTime)
    oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime)
    
    // Modulação para criar efeito de "tremor"
    oscillator1.frequency.setValueAtTime(1000, audioContext.currentTime)
    oscillator1.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1)
    oscillator1.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2)
    oscillator1.frequency.setValueAtTime(1100, audioContext.currentTime + 0.3)
    
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    
    oscillator1.start(audioContext.currentTime)
    oscillator2.start(audioContext.currentTime)
    oscillator1.stop(audioContext.currentTime + 0.5)
    oscillator2.stop(audioContext.currentTime + 0.5)
  } catch (error) {
    console.log('Não foi possível reproduzir som de atenção:', error)
  }
}

export const playMessageSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    // Som suave para mensagens normais
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(500, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(700, audioContext.currentTime + 0.05)
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
  } catch (error) {
    console.log('Não foi possível reproduzir som de mensagem:', error)
  }
}
