import { Badge } from '@/components/ui/badge'

export const NotificationBadge = ({ count, children }) => {
  return (
    <div style={{ 
      position: 'relative', 
      display: 'inline-block',
      isolation: 'isolate'
    }}>
      {children}
      {count > 0 && (
        <Badge 
          variant="destructive"
          style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            zIndex: 99999,
            pointerEvents: 'none',
            minWidth: '20px',
            height: '20px',
            padding: '0 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
            border: '2px solid white',
          }}
        >
          {count}
        </Badge>
      )}
    </div>
  )
}

