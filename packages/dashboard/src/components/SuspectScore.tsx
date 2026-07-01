import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SuspectScoreProps {
  score: number // 0-100
}

export default function SuspectScore({ score }: SuspectScoreProps) {
  const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
  const label =
    level === 'high' ? 'You look like a suspicious user' :
    level === 'medium' ? 'Some risk signals detected' :
    'You look like a legitimate user'
  const sublabel =
    level === 'high' ? 'We detected signals of fraud risk.' :
    level === 'medium' ? 'A few signals warrant review.' :
    'No significant fraud signals detected.'

  const color =
    level === 'high' ? 'text-destructive' :
    level === 'medium' ? 'text-amber-500' :
    'text-emerald-500'
  const ringColor =
    level === 'high' ? '#ef4444' :
    level === 'medium' ? '#eab308' :
    '#22c55e'

  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-3xl font-bold', color)}>{score}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Suspect</span>
          </div>
        </div>
        <div>
          <p className={cn('text-base font-semibold', color)}>{label}</p>
          <p className="text-sm text-muted-foreground mt-1">{sublabel}</p>
        </div>
      </CardContent>
    </Card>
  )
}
