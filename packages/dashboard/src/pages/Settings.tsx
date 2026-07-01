import { useEffect, useState } from 'react'
import { KeyRound, Plus, Save, Copy, Check } from 'lucide-react'
import { api } from '@/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const DETECTORS = [
  { key: 'vpn', label: 'VPN / Proxy Detection' },
  { key: 'bot', label: 'Bot Detection' },
  { key: 'incognito', label: 'Incognito Detection' },
  { key: 'region_spoofing', label: 'Region Spoofing' },
  { key: 'multi_accounting', label: 'Multi-accounting' },
  { key: 'suspicious_velocity', label: 'Velocity Check' },
  { key: 'new_device', label: 'New Device' }
]

export default function Settings() {
  const [blockScore, setBlockScore] = useState(70)
  const [reviewScore, setReviewScore] = useState(40)
  const [detectors, setDetectors] = useState<Record<string, boolean>>(
    Object.fromEntries(DETECTORS.map((d) => [d.key, true]))
  )
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newKey, setNewKey] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.getSettings().then((r) => {
      if (r.settings.riskThresholds) {
        setBlockScore(r.settings.riskThresholds.block)
        setReviewScore(r.settings.riskThresholds.review)
      }
      if (r.settings.enabledDetectors) {
        setDetectors(r.settings.enabledDetectors)
      }
    })
    api.getApiKeys().then((r) => setApiKeys(r.keys))
  }, [])

  const save = async () => {
    setSaving(true)
    await api.saveSettings({
      riskThresholds: { block: blockScore, review: reviewScore },
      enabledDetectors: detectors
    })
    setSaving(false)
  }

  const createKey = async () => {
    const r = await api.createApiKey(label || undefined)
    setNewKey(r.apiKey)
    setLabel('')
    const keys = await api.getApiKeys()
    setApiKeys(keys.keys)
  }

  const revoke = async (id: string) => {
    await api.deleteApiKey(id)
    const keys = await api.getApiKeys()
    setApiKeys(keys.keys)
  }

  const copyKey = () => {
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure risk thresholds and detection modules</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Thresholds</CardTitle>
            <CardDescription>Score boundaries for risk recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Block threshold</Label>
                <span className="font-mono text-destructive">{blockScore}</span>
              </div>
              <input type="range" min="0" max="100" value={blockScore}
                onChange={(e) => setBlockScore(Number(e.target.value))}
                className="w-full accent-[hsl(var(--primary))]" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Review threshold</Label>
                <span className="font-mono text-amber-500">{reviewScore}</span>
              </div>
              <input type="range" min="0" max="100" value={reviewScore}
                onChange={(e) => setReviewScore(Number(e.target.value))}
                className="w-full accent-[hsl(var(--primary))]" />
            </div>
            <Button onClick={save} disabled={saving} size="sm">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detection Modules</CardTitle>
            <CardDescription>Toggle individual detectors on or off</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {DETECTORS.map((d) => (
              <div key={d.key} className="flex items-center justify-between py-2">
                <Label className="text-sm font-normal cursor-pointer">{d.label}</Label>
                <Switch
                  checked={detectors[d.key] ?? true}
                  onCheckedChange={(c) => setDetectors({ ...detectors, [d.key]: c })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" /> API Keys</CardTitle>
          <CardDescription>Keys used by SDK and server-sdk clients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newKey && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
              <p className="text-xs text-emerald-500">New key generated — copy it now (shown only once):</p>
              <div className="flex items-center gap-2">
                <code className="text-xs flex-1 break-all font-mono bg-background px-2 py-1 rounded">{newKey}</code>
                <Button variant="outline" size="icon" onClick={copyKey}>
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Key label (e.g. production)" />
            <Button onClick={createKey}><Plus className="h-4 w-4" /> Generate</Button>
          </div>

          <Separator />

          <div className="space-y-1">
            {apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No API keys yet</p>
            ) : (
              apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{k.label}</span>
                    <Badge variant={k.active ? 'success' : 'secondary'} className="text-[10px]">
                      {k.active ? 'active' : 'revoked'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{new Date(k.createdAt).toLocaleDateString()}</span>
                    {k.active && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => revoke(k.id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
