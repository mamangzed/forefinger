import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const REC_COLOR: Record<string, string> = {
  allow: 'text-fp-low',
  review: 'text-fp-med',
  block: 'text-fp-high'
}

export default function Events() {
  const [events, setEvents] = useState<any[]>([])
  const [type, setType] = useState('')
  const [level, setLevel] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .getEvents(100, type || undefined, level || undefined)
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fraud Events</h1>
        <button onClick={exportCsv} className="px-4 py-2 bg-fp-primary text-white rounded text-sm">
          Export CSV
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={type} onChange={(e) => setType(e.target.value)} className="bg-fp-surface border border-fp-border rounded px-3 py-2 text-sm">
          <option value="">All Types</option>
          <option value="payment">Payment</option>
          <option value="login">Login</option>
          <option value="signup">Signup</option>
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="bg-fp-surface border border-fp-border rounded px-3 py-2 text-sm">
          <option value="">All Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="bg-fp-surface border border-fp-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-fp-bg">
            <tr>
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Visitor</th>
              <th className="text-left p-3">Score</th>
              <th className="text-left p-3">Recommendation</th>
              <th className="text-left p-3">Flags</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-fp-muted">Loading...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-fp-muted">No events</td></tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-t border-fp-border hover:bg-fp-bg">
                  <td className="p-3 text-fp-muted text-xs">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="p-3">{e.eventType}</td>
                  <td className="p-3">
                    <Link to={`/visitors/${e.visitorId}`} className="text-fp-primary hover:underline font-mono text-xs">
                      {e.visitorId.slice(0, 16)}...
                    </Link>
                  </td>
                  <td className="p-3">{e.riskScore}</td>
                  <td className={`p-3 ${REC_COLOR[e.recommendation]}`}>{e.recommendation}</td>
                  <td className="p-3 text-xs text-fp-muted">{e.flags?.join(', ')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
