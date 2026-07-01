import { useEffect, useState } from 'react'
import { api } from '../api'

const DETECTORS = [
  'vpn', 'bot', 'incognito', 'region_spoofing', 'multi_accounting', 'suspicious_velocity', 'new_device'
]

export default function Settings() {
  const [blockScore, setBlockScore] = useState(70)
  const [reviewScore, setReviewScore] = useState(40)
  const [detectors, setDetectors] = useState<Record<string, boolean>>(
    Object.fromEntries(DETECTORS.map((d) => [d, true]))
  )
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newKey, setNewKey] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-fp-surface border border-fp-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">Risk Thresholds</h2>
          <label className="block mb-3">
            <span className="text-fp-muted text-sm">Block score: {blockScore}/100</span>
            <input type="range" min="0" max="100" value={blockScore}
              onChange={(e) => setBlockScore(Number(e.target.value))}
              className="w-full" />
          </label>
          <label className="block mb-4">
            <span className="text-fp-muted text-sm">Review score: {reviewScore}/100</span>
            <input type="range" min="0" max="100" value={reviewScore}
              onChange={(e) => setReviewScore(Number(e.target.value))}
              className="w-full" />
          </label>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-fp-primary text-white rounded text-sm disabled:opacity-40">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="bg-fp-surface border border-fp-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">Detection Modules</h2>
          <div className="space-y-2">
            {DETECTORS.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={detectors[d] ?? true}
                  onChange={(e) => setDetectors({ ...detectors, [d]: e.target.checked })} />
                <span>{d}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-fp-surface border border-fp-border rounded-lg p-5">
        <h2 className="text-lg font-semibold mb-4">API Keys</h2>

        {newKey && (
          <div className="bg-fp-low/10 border border-fp-low/30 rounded p-3 mb-4">
            <div className="text-fp-low text-sm mb-1">New key (copy now, shown once):</div>
            <code className="text-xs break-all">{newKey}</code>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="Key label"
            className="bg-fp-bg border border-fp-border rounded px-3 py-2 text-sm flex-1" />
          <button onClick={createKey}
            className="px-4 py-2 bg-fp-primary text-white rounded text-sm">
            + Generate Key
          </button>
        </div>

        <div className="space-y-2">
          {apiKeys.map((k) => (
            <div key={k.id} className="flex justify-between items-center text-sm border-b border-fp-border py-2">
              <div>
                <span className="font-mono text-xs">{k.label}</span>
                <span className={`ml-2 text-xs ${k.active ? 'text-fp-low' : 'text-fp-muted'}`}>
                  {k.active ? 'active' : 'revoked'}
                </span>
              </div>
              <div className="flex gap-3 items-center">
                <span className="text-fp-muted text-xs">{new Date(k.createdAt).toLocaleDateString()}</span>
                {k.active && (
                  <button onClick={() => revoke(k.id)} className="text-fp-high text-xs hover:underline">
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
