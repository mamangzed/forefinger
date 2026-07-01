import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Shield, Cpu, Monitor, Globe, Activity } from 'lucide-react'
import { api } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

interface VisitorDetail {
  visitor: {
    visitorId: string
    riskScore: number
    riskLevel: string
    flags: string[]
    visitCount: number
    firstSeen: string
    lastSeen: string
    linkedAccounts: string[]
    signals: any
  }
  visits: any[]
  events: any[]
}

const flagVariant: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  vpn: 'destructive',
  bot: 'destructive',
  incognito: 'warning',
  region_spoofing: 'destructive',
  multi_accounting: 'warning',
  suspicious_velocity: 'warning',
  new_device: 'warning'
}

export default function VisitorDetail() {
  const { id } = useParams()
  const [data, setData] = useState<VisitorDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) api.getVisitor(id).then(setData).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>
  if (!data) return <div className="p-8 text-muted-foreground">Not found</div>

  const { visitor } = data
  const signals = visitor.signals?.stable || {}
  const volatile = visitor.signals?.volatile || {}

  const detailRow = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div key={label} className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground flex items-center gap-2">{icon}{label}</span>
      <span className="text-sm font-mono">{value}</span>
    </div>
  )

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link to="/visitors"><ArrowLeft className="h-4 w-4" /> Back to visitors</Link>
      </Button>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Visitor</h1>
          <Badge variant={visitor.riskLevel === 'high' ? 'destructive' : visitor.riskLevel === 'medium' ? 'warning' : 'success'}>
            {visitor.riskScore}/100 · {visitor.riskLevel}
          </Badge>
        </div>
        <p className="text-xs font-mono text-muted-foreground break-all">{visitor.visitorId}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Visits</p>
          <p className="text-xl font-semibold mt-1">{visitor.visitCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">First Seen</p>
          <p className="text-sm font-medium mt-1">{new Date(visitor.firstSeen).toLocaleDateString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Last Seen</p>
          <p className="text-sm font-medium mt-1">{new Date(visitor.lastSeen).toLocaleDateString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Linked Accounts</p>
          <p className="text-xl font-semibold mt-1">{visitor.linkedAccounts.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4" /> Active Flags</CardTitle>
        </CardHeader>
        <CardContent>
          {visitor.flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flags — visitor looks clean</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {visitor.flags.map((f) => (
                <Badge key={f} variant={flagVariant[f] || 'secondary'}>{f}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Cpu className="h-4 w-4" /> Stable Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {detailRow(<Monitor className="h-3.5 w-3.5" />, 'Platform', signals.platform)}
            {detailRow(<Cpu className="h-3.5 w-3.5" />, 'CPU Cores', signals.cpuCores)}
            {detailRow(<Cpu className="h-3.5 w-3.5" />, 'Memory', signals.deviceMemory ? `${signals.deviceMemory} GB` : '—')}
            {detailRow(<Monitor className="h-3.5 w-3.5" />, 'Screen', `${signals.screenWidth}×${signals.screenHeight}`)}
            {detailRow(<Monitor className="h-3.5 w-3.5" />, 'GPU', signals.gpuRenderer?.slice(0, 40) || '—')}
            {detailRow(<Globe className="h-3.5 w-3.5" />, 'Timezone', signals.timezone)}
            {detailRow(<Globe className="h-3.5 w-3.5" />, 'Languages', (signals.languages || []).join(', '))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> Volatile Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {detailRow(<Activity className="h-3.5 w-3.5" />, 'Canvas', String(volatile.canvasHash).slice(0, 24) + '...')}
            {detailRow(<Activity className="h-3.5 w-3.5" />, 'Audio', String(volatile.audioHash).slice(0, 24) + '...')}
            {detailRow(<Activity className="h-3.5 w-3.5" />, 'WebGL exts', volatile.webglExts?.length || 0)}
            {detailRow(<Activity className="h-3.5 w-3.5" />, 'Fonts', volatile.fonts?.length || 0)}
            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground">{volatile.fonts?.join(', ')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visit History ({data.visits.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-72 overflow-auto">
            {data.visits.slice(0, 30).map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                <div className="flex items-center gap-3">
                  {v.riskScore != null && <span className="font-mono">{v.riskScore}</span>}
                  {v.flags?.length > 0 && (
                    <span className="text-xs text-muted-foreground">{v.flags.join(', ')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
