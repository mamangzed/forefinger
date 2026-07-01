import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Eye, Globe, MapPin, Clock } from 'lucide-react'
import { api } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SuspectScore from '@/components/SuspectScore'
import VisitCard, { type VisitData } from '@/components/VisitCard'

interface VisitorDetailResponse {
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
  visits: VisitData[]
  events: any[]
  summary: {
    totalVisits: number
    weeklyVisits: number
    incognitoSessions: number
    distinctIps: number
    distinctLocations: number
    firstSeen: string
    lastSeen: string
  }
}

export default function VisitorDetail() {
  const { id } = useParams()
  const [data, setData] = useState<VisitorDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) api.getVisitor(id).then(setData).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>
  if (!data) return <div className="p-8 text-muted-foreground">Not found</div>

  const { visitor, summary } = data

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link to="/visitors"><ArrowLeft className="h-4 w-4" /> Back to visitors</Link>
      </Button>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Visitor ID</span>
          <code className="text-sm font-mono">{visitor.visitorId}</code>
        </div>
      </div>

      {/* Suspect score */}
      <SuspectScore score={visitor.riskScore} />

      {/* Weekly summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Weekly visit summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryStat label="You visited" value={`${summary.weeklyVisits} times`} icon={Clock} />
            <SummaryStat label="Incognito" value={`${summary.incognitoSessions} session${summary.incognitoSessions === 1 ? '' : 's'}`} icon={Eye} />
            <SummaryStat label="IP address" value={`${summary.distinctIps} IP${summary.distinctIps === 1 ? '' : 's'}`} icon={Globe} />
            <SummaryStat label="Geolocation" value={`${summary.distinctLocations} location${summary.distinctLocations === 1 ? '' : 's'}`} icon={MapPin} />
          </div>
        </CardContent>
      </Card>

      {/* Recent visits — per-visit cards like FingerprintJS */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-3">Your recent visits</h2>
        <div className="space-y-3">
          {data.visits.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No visits recorded</CardContent></Card>
          ) : (
            data.visits.slice(0, 30).map((v) => (
              <VisitCard key={v.id} visit={v} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  )
}
