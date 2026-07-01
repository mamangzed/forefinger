import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  tone?: 'default' | 'danger' | 'success'
}

const toneClass = {
  default: 'text-primary',
  danger: 'text-destructive',
  success: 'text-emerald-500'
}

export default function StatCard({ label, value, icon: Icon, tone = 'default' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight mt-1">{value}</p>
          </div>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-muted', toneClass[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
