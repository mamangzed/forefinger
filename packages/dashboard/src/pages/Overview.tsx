import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import { Users, Activity, Bot, ShieldAlert } from 'lucide-react'
import { api, type Stats } from '@/api'
import StatCard from '@/components/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const RISK_COLORS = { low: '#22c55e', medium: '#eab308', high: '#ef4444' }

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getStats(7).then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading || !stats) {
    return <div className="p-8 text-muted-foreground">Loading...</div>
  }

  const riskData = [
    { name: 'Low', value: stats.riskDistribution.low, fill: RISK_COLORS.low },
    { name: 'Medium', value: stats.riskDistribution.medium, fill: RISK_COLORS.medium },
    { name: 'High', value: stats.riskDistribution.high, fill: RISK_COLORS.high }
  ]

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Last 7 days of visitor activity</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Visitors" value={stats.totalVisitors.toLocaleString()} icon={Users} />
        <StatCard label="Visits Today" value={stats.uniqueToday.toLocaleString()} icon={Activity} />
        <StatCard label="Bots" value={stats.botCount.toLocaleString()} icon={Bot} tone="danger" />
        <StatCard label="High Risk" value={stats.highRiskCount.toLocaleString()} icon={ShieldAlert} tone="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visits Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem'
                }}
              />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {riskData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.topCountries} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="country" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={40} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
