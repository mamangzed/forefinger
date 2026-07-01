interface StatCardProps {
  label: string
  value: number | string
  color?: string
}

export default function StatCard({ label, value, color = 'text-fp-text' }: StatCardProps) {
  return (
    <div className="bg-fp-surface border border-fp-border rounded-lg p-5">
      <div className="text-fp-muted text-sm mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
    </div>
  )
}
