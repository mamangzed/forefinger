import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

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

export default function VisitorDetail() {
  const { id } = useParams()
  const [data, setData] = useState<VisitorDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) api.getVisitor(id).then(setData).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-fp-muted">Loading...</div>
  if (!data) return <div className="text-fp-muted">Not found</div>

  const { visitor } = data
  const signals = visitor.signals?.stable || {}
  const volatile = visitor.signals?.volatile || {}

  return (
    <div>
      <Link to="/visitors" className="text-fp-primary text-sm mb-4 inline-block">‹ Back</Link>
      <h1 className="text-2xl font-bold mb-2 font-mono break-all">{visitor.visitorId}</h1>
      <div className="flex gap-4 mb-6 text-sm text-fp-muted">
        <span>Risk: <strong className="text-fp-text">{visitor.riskScore}/100 ({visitor.riskLevel})</strong></span>
        <span>Visits: <strong className="text-fp-text">{visitor.visitCount}</strong></span>
        <span>First: <strong className="text-fp-text">{new Date(visitor.firstSeen).toLocaleString()}</strong></span>
        <span>Last: <strong className="text-fp-text">{new Date(visitor.lastSeen).toLocaleString()}</strong></span>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Section title="Stable Signals">
          <dl className="text-sm space-y-1">
            {Object.entries(signals).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-fp-muted">{k}</dt>
                <dd className="font-mono">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Volatile Signals">
          <dl className="text-sm space-y-1">
            <div className="flex justify-between"><dt className="text-fp-muted">canvasHash</dt><dd className="font-mono text-xs">{String(volatile.canvasHash).slice(0, 24)}...</dd></div>
            <div className="flex justify-between"><dt className="text-fp-muted">audioHash</dt><dd className="font-mono text-xs">{String(volatile.audioHash).slice(0, 24)}...</dd></div>
            <div className="flex justify-between"><dt className="text-fp-muted">userAgent</dt><dd className="font-mono text-xs">{String(volatile.userAgent).slice(0, 40)}</dd></div>
            <div><dt className="text-fp-muted mb-1">fonts ({volatile.fonts?.length})</dt><dd className="text-xs text-fp-muted">{volatile.fonts?.join(', ')}</dd></div>
          </dl>
        </Section>
      </div>

      <Section title="Active Flags" className="mb-6">
        <div className="flex gap-2 flex-wrap">
          {visitor.flags.length === 0 ? (
            <span className="text-fp-muted text-sm">No flags</span>
          ) : (
            visitor.flags.map((f) => (
              <span key={f} className="px-3 py-1 bg-fp-high/20 text-fp-high rounded text-sm">{f}</span>
            ))
          )}
        </div>
      </Section>

      <Section title={`Visit Timeline (${data.visits.length})`} className="mb-6">
        <div className="space-y-2 max-h-96 overflow-auto">
          {data.visits.slice(0, 50).map((v) => (
            <div key={v.id} className="flex justify-between text-sm border-b border-fp-border py-2">
              <span className="text-fp-muted">{new Date(v.createdAt).toLocaleString()}</span>
              <span>Risk: {v.riskScore ?? 'N/A'}</span>
              <span className="text-fp-muted text-xs">{v.flags?.join(', ')}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Linked Accounts (${visitor.linkedAccounts.length})`}>
        {visitor.linkedAccounts.length === 0 ? (
          <span className="text-fp-muted text-sm">No linked accounts</span>
        ) : (
          <div className="space-y-1">
            {visitor.linkedAccounts.map((a) => (
              <div key={a} className="text-sm font-mono">{a}</div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-fp-surface border border-fp-border rounded-lg p-5 ${className}`}>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  )
}
