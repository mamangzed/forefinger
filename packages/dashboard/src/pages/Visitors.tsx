import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api, type VisitorSummary, type VisitorListResponse } from '@/api'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

const riskVariant: Record<string, 'success' | 'warning' | 'destructive'> = {
  low: 'success',
  medium: 'warning',
  high: 'destructive'
}

export default function Visitors() {
  const [data, setData] = useState<VisitorListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [risk, setRisk] = useState('all')
  const [flag, setFlag] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .getVisitors(page, 50, risk === 'all' ? undefined : risk, flag || undefined)
      .then(setData)
      .finally(() => setLoading(false))
  }, [page, risk, flag])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visitors</h1>
        <p className="text-sm text-muted-foreground mt-1">All tracked visitor fingerprints</p>
      </div>

      <div className="flex gap-3 items-center">
        <Select value={risk} onValueChange={(v) => { setRisk(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by flag (vpn, bot, incognito...)"
            value={flag}
            onChange={(e) => { setFlag(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitor ID</TableHead>
              <TableHead className="w-20">Visits</TableHead>
              <TableHead className="w-32">Risk</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead className="w-44">Last Seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground h-24 text-center">Loading...</TableCell></TableRow>
            ) : data?.visitors.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground h-24 text-center">No visitors found</TableCell></TableRow>
            ) : (
              data?.visitors.map((v: VisitorSummary) => (
                <TableRow key={v.visitorId}>
                  <TableCell>
                    <Link to={`/visitors/${v.visitorId}`} className="font-mono text-xs text-primary hover:underline">
                      {v.visitorId.slice(0, 20)}...
                    </Link>
                  </TableCell>
                  <TableCell>{v.visitCount}</TableCell>
                  <TableCell>
                    <Badge variant={riskVariant[v.riskLevel] || 'secondary'}>
                      {v.riskScore} · {v.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {v.flags.map((f) => (
                        <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(v.lastSeen).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex gap-3 items-center">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
