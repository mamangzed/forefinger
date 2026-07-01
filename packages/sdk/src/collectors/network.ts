// Network + WebRTC leak detection
export interface NetworkInfo {
  webrtcLocalIps: string[]
  connectionType: string
}

export async function collectNetwork(): Promise<NetworkInfo> {
  const localIps = await detectWebrtcLeak()
  const connectionType = getConnectionType()
  return { webrtcLocalIps: localIps, connectionType }
}

// Detect local IP via WebRTC ICE candidates (VPN/proxy leak)
function detectWebrtcLeak(): Promise<string[]> {
  return new Promise((resolve) => {
    const ips: string[] = []
    try {
      const RTCPC = window.RTCPeerConnection ||
        (window as unknown as { webkitRTCPeerConnection: typeof RTCPeerConnection })
          .webkitRTCPeerConnection
      if (!RTCPC) return resolve([])

      const pc = new RTCPC({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          pc.close()
          resolve([...new Set(ips)])
          return
        }
        const ipMatch = /([0-9]{1,3}\.){3}[0-9]{1,3}|[a-f0-9]{1,4}:[a-f0-9:]+/i.exec(
          e.candidate.candidate
        )
        if (ipMatch && !ips.includes(ipMatch[0])) {
          ips.push(ipMatch[0])
        }
      }
      // Trigger candidate gathering
      pc.createDataChannel('')
      pc.createOffer()
        .then((o) => pc.setLocalDescription(o))
        .catch(() => resolve([]))

      // Timeout fallback
      setTimeout(() => {
        pc.close()
        resolve([...new Set(ips)])
      }, 2000)
    } catch {
      resolve([])
    }
  })
}

function getConnectionType(): string {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string } }
  return nav.connection?.effectiveType ?? 'unknown'
}
