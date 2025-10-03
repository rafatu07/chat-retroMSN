import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const TypingIndicator = ({ contact }) => {
  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  }

  return (
    <div className="flex gap-2 max-w-[70%] msn-bounce-in">
      <Avatar className="h-8 w-8 mt-1">
        <AvatarImage src={contact?.avatar_url} />
        <AvatarFallback className="bg-purple-500 text-white text-xs">
          {getInitials(contact?.display_name)}
        </AvatarFallback>
      </Avatar>
      
      <div className="space-y-1 flex flex-col items-start">
        <div className="px-4 py-2 rounded-2xl bg-gray-200 text-gray-900">
          <div className="typing-indicator">
            <span>•</span>
            <span>•</span>
            <span>•</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground px-2">
          {contact?.display_name} está digitando...
        </span>
      </div>
    </div>
  )
}
