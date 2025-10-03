import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { Smile } from 'lucide-react'

const emoticons = [
  { code: ':)', emoji: '😊', name: 'Feliz' },
  { code: ':(', emoji: '😢', name: 'Triste' },
  { code: ':D', emoji: '😃', name: 'Muito feliz' },
  { code: ':P', emoji: '😛', name: 'Língua de fora' },
  { code: ';)', emoji: '😉', name: 'Piscadinha' },
  { code: ':o', emoji: '😮', name: 'Surpreso' },
  { code: ':|', emoji: '😐', name: 'Neutro' },
  { code: ':/', emoji: '😕', name: 'Confuso' },
  { code: '<3', emoji: '❤️', name: 'Coração' },
  { code: '</3', emoji: '💔', name: 'Coração partido' },
  { code: ':*', emoji: '😘', name: 'Beijinho' },
  { code: '8)', emoji: '😎', name: 'Legal' },
  { code: ':@', emoji: '😡', name: 'Bravo' },
  { code: ':$', emoji: '😳', name: 'Envergonhado' },
  { code: '(y)', emoji: '👍', name: 'Joinha' },
  { code: '(n)', emoji: '👎', name: 'Não curti' },
  { code: '(h)', emoji: '😍', name: 'Apaixonado' },
  { code: '(6)', emoji: '😈', name: 'Diabinho' },
  { code: '(a)', emoji: '😇', name: 'Anjinho' },
  { code: '(l)', emoji: '❤️', name: 'Amor' },
  { code: '(u)', emoji: '💔', name: 'Coração partido' },
  { code: '(k)', emoji: '💋', name: 'Beijinho' },
  { code: '(f)', emoji: '🌹', name: 'Rosa' },
  { code: '(w)', emoji: '🥀', name: 'Rosa murcha' }
]

export const EmoticonPicker = ({ onSelect }) => {
  const [open, setOpen] = useState(false)

  const handleSelect = (emoticon) => {
    onSelect?.(emoticon)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <div className="grid grid-cols-6 gap-1">
          {emoticons.map((emoticon) => (
            <Button
              key={emoticon.code}
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 hover:bg-blue-100"
              onClick={() => handleSelect(emoticon)}
              title={`${emoticon.name} (${emoticon.code})`}
            >
              <span className="text-lg">{emoticon.emoji}</span>
            </Button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
          <p>Dica: Digite os códigos diretamente na mensagem!</p>
          <p>Exemplo: :) vira 😊</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Função para converter códigos de emoticons em emojis
export const convertEmoticons = (text) => {
  let convertedText = text
  
  emoticons.forEach((emoticon) => {
    const regex = new RegExp(escapeRegExp(emoticon.code), 'g')
    convertedText = convertedText.replace(regex, emoticon.emoji)
  })
  
  return convertedText
}

// Função auxiliar para escapar caracteres especiais em regex
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
