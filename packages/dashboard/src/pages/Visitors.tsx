import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type VisitorSummary, type VisitorListResponse } from '../api'

const RISK_COLOR: Record<string, string> = {
  low: 'text-fp-low',
  medium: 'text-fp-med',
  high: 'text-fp-high'
}

export default function Visitors() {
  const [data, setData] = useState<VisitorListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [risk, setRisk] = useState('')
  const [flag, setFlag] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .getVisitors(page, 50, risk || undefined, flag || undefined)
      .then(setData)
      .finally(() => setLoading(false))
  }, [page, risk, flag])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Visitors</h1>

      <div className="flex gap-3 mb-4">
        <select
          value={risk}
          onChange={(e) => { setRisk(e.target.value); setPage(1) }}
          className="bg-fp-surface border border-fp-border rounded px-3 py-2 text-sm"
        >
          <option value="">All Risk</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          placeholder="Filter by flag (vpn, bot, incognito...)"
          value={flag}
          onChange={(e) => { setFlag(e.target.value); setPage(1) }}
          className="bg-fp-surface border border-fp-border rounded px-3 py-2 text-sm flex-1"
        />
      </div>

      <div className="bg-fp-surface border border-fp-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-fp-bg">
            <tr>
              <th className="text-left p-3">Visitor ID</th>
              <th className="text-left p-3">Visits</th>
              <th className="text-left p-3">Risk</th>
              <th className="text-left p-3">Flags</th>
              <th className="text-left p-3">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-fp-muted">Loading...</td></tr>
            ) : data?.visitors.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-fp-muted">No visitors found</td></tr>
            ) : (
              data?.visitors.map((v: VisitorSummary) => (
                <tr key={v.visitorId} className="border-t border-fp-border hover:bg-fp-bg">
                  <td className="p-3">
                    <Link to={`/visitors/${v.visitorId}`} className="text-fp-primary hover:underline font-mono text-xs">
                      {v.visitorId.slice(0, 16)}...
                    </Link>
                  </td>
                  <td className="p-3">{v.visitCount}</td>
                  <td className={`p-3 ${RISK_COLOR[v.riskLevel]}`}>
                    {v.riskScore} ({v.riskLevel})
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {v.flags.map((f) => (
                        <span key={f} className="text-xs bg-fp-bg px-2 py-0.5 rounded">{f}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-fp-muted text-xs">
                    {new Date(v.lastSeen).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex gap-2 mt-4 items-center">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-fp-surface border border-fp-border rounded text-sm disabled:opacity-40"
          >
            ‹ Prev
          </button>
          <span className="text-fp-muted text-sm">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="px-3 py-1 bg-fp-surface border border-fp-border rounded text-sm disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  )
}
