import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import { api, type Stats } from '../api'
import StatCard from '../components/StatCard'

const RISK_COLORS = { low: '#22c55e', medium: '#eab308', high: '#ef4444' }

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getStats(7).then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading || !stats) return <div className="text-fp-muted">Loading...</div>

  const riskData = [
    { name: 'Low', value: stats.riskDistribution.low, color: RISK_COLORS.low },
    { name: 'Medium', value: stats.riskDistribution.medium, color: RISK_COLORS.medium },
    { name: 'High', value: stats.riskDistribution.high, color: RISK_COLORS.high }
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Overview <span className="text-fp-muted text-sm font-normal">(Last 7 days)</span></h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Visitors" value={stats.totalVisitors.toLocaleString()} />
        <StatCard label="Visits Today" value={stats.uniqueToday.toLocaleString()} />
        <StatCard label="Bots" value={stats.botCount.toLocaleString()} color="text-fp-high" />
        <StatCard label="High Risk" value={stats.highRiskCount.toLocaleString()} color="text-fp-high" />
      </div>

      <div className="bg-fp-surface border border-fp-border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Visits Over Time</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={stats.timeseries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-fp-surface border border-fp-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Risk Distribution</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {riskData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-fp-surface border border-fp-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Top Countries</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.topCountries} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
              <YAxis dataKey="country" type="category" stroke="#94a3b8" fontSize={12} width={40} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
              <Bar dataKey="count" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
