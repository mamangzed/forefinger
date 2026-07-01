import { MapPin, Globe, Shield, Eye, ShieldOff, Fingerprint, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { LucideIcon } from 'lucide-react'

export interface VisitData {
  id: string
  ip: string | null
  country: string | null
  countryName: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  browser: string
  os: string
  device: string
  incognito: boolean
  vpn: boolean
  riskScore: number | null
  riskLevel: string | null
  flags: string[]
  createdAt: string
}

function Row({ icon: Icon, label, value, danger }: { icon: LucideIcon; label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={`h-3.5 w-3.5 ${danger ? 'text-destructive' : 'text-muted-foreground'}`} />
      <span className="text-muted-foreground">{label}</span>
      <span className={`ml-auto font-medium ${danger ? 'text-destructive' : ''}`}>{value}</span>
    </div>
  )
}

export default function VisitCard({ visit }: { visit: VisitData }) {
  const locationLabel = [visit.city, visit.countryName].filter(Boolean).join(', ') || 'Unknown location'
  const timeAgo = relativeTime(visit.createdAt)

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-[1fr_180px]">
          {/* Left: details */}
          <div className="p-4 space-y-2.5">
            <Row icon={Clock} label="When" value={`${new Date(visit.createdAt).toLocaleString()} · ${timeAgo}`} />
            <Row icon={MapPin} label="Location" value={locationLabel} />
            <Row icon={Globe} label="IP Address" value={visit.ip || '—'} />
            <Row icon={Fingerprint} label="Browser" value={visit.browser || 'Unknown'} />
            <Row icon={Eye} label="Incognito" value={visit.incognito ? 'Detected' : 'Not Detected'} danger={visit.incognito} />
            <Row icon={visit.vpn ? ShieldOff : Shield} label="VPN" value={visit.vpn ? 'Detected' : 'Not Detected'} danger={visit.vpn} />
          </div>

          {/* Right: location map placeholder */}
          <div className="bg-muted/30 relative flex items-center justify-center border-l">
            {visit.latitude != null && visit.longitude != null ? (
              <LocationDot lat={visit.latitude} lng={visit.longitude} label={locationLabel} />
            ) : (
              <div className="text-xs text-muted-foreground p-4 text-center">No location data</div>
            )}
            {visit.country && (
              <Badge variant="outline" className="absolute top-2 right-2 text-[10px] font-mono">
                {visit.country}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Minimal "map" — a stylized globe grid with a pin. Real map needs tile server;
// this renders offline and looks clean.
function LocationDot({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  // project lat/lng to 0-100 grid
  const x = ((lng + 180) / 360) * 100
  const y = ((90 - lat) / 180) * 100
  return (
    <div className="absolute inset-2 rounded overflow-hidden border border-border/50">
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '14px 14px'
        }}
      />
      <div
        className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/20"
        style={{ left: `${x}%`, top: `${y}%` }}
        title={label}
      />
      <div
        className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary animate-ping"
        style={{ left: `${x}%`, top: `${y}%` }}
      />
    </div>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}
