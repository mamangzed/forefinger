import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { api } from '@/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

const recVariant: Record<string, 'success' | 'warning' | 'destructive'> = {
  allow: 'success',
  review: 'warning',
  block: 'destructive'
}

export default function Events() {
  const [events, setEvents] = useState<any[]>([])
  const [type, setType] = useState('all')
  const [level, setLevel] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .getEvents(100, type === 'all' ? undefined : type, level === 'all' ? undefined : level)
      .then((r) => setEvents(r.events))
      .finally(() => setLoading(false))
  }, [type, level])

  const exportCsv = () => {
    const headers = ['time', 'type', 'visitorId', 'riskScore', 'recommendation', 'flags']
    const rows = events.map((e) => [
      new Date(e.createdAt).toISOString(),
      e.eventType,
      e.visitorId,
      e.riskScore,
      e.recommendation,
      e.flags?.join('|')
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fraud-events.csv'
    a.click()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fraud Events</h1>
          <p className="text-sm text-muted-foreground mt-1">Verified events with risk assessment</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="signup">Signup</SelectItem>
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Visitor</TableHead>
              <TableHead className="w-20">Score</TableHead>
              <TableHead className="w-32">Recommendation</TableHead>
              <TableHead>Flags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground h-24 text-center">Loading...</TableCell></TableRow>
            ) : events.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground h-24 text-center">No events</TableCell></TableRow>
            ) : (
              events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground text-xs">{new Date(e.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{e.eventType}</TableCell>
                  <TableCell>
                    <Link to={`/visitors/${e.visitorId}`} className="font-mono text-xs text-primary hover:underline">
                      {e.visitorId.slice(0, 20)}...
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono">{e.riskScore}</TableCell>
                  <TableCell>
                    <Badge variant={recVariant[e.recommendation] || 'secondary'}>{e.recommendation}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.flags?.join(', ')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
